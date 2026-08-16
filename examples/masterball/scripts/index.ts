import { GameMode, ItemStack, MolangVariableMap, Player, world } from "@minecraft/server";
import type { Dimension, Entity, Vector3 } from "@minecraft/server";

// ---- 常量 ----
const STRUCTURE_PREFIX = "masterball_space_"; // 磁盘结构名前缀（重启后仍可释放）
const LORE_ID = "mb_id:"; // Lore 键：被捕捉实体的 ID
const LORE_NAME = "mb_name:"; // Lore 键：实体的名称
const LORE_TYPE = "mb_type:"; // Lore 键：实体的类型
const LORE_HEALTH = "mb_health:"; // Lore 键：实体的血量

// 不可捕捉目标（精确匹配）
const UNCATCHABLE_EXACT = new Set([
    "minecraft:player",
    "minecraft:armor_stand",
    "minecraft:item",
    "minecraft:xp_orb",
]);

// 不可捕捉目标（前缀匹配：各种抛掷物 / 箭）
const UNCATCHABLE_PREFIXES = [
    "minecraft:arrow",
    "minecraft:snowball",
    "minecraft:egg",
    "minecraft:ender_pearl",
    "minecraft:ender_eye",
    "minecraft:fireball",
    "minecraft:llama_spit",
    "minecraft:shulker_bullet",
    "minecraft:trident",
];

// ---- 状态 ----
// 玩家 -> 待释放实体 ID 的 FIFO 队列。
// 入队发生在 beforeEvents.itemUse（先于抛掷物生成/命中，贴脸投掷也不丢时序）；
// 出队有两个消费点（互斥，各自只消费一次）：
//   1. entitySpawn 时按投掷者 owner 取出，绑定到 boundByProjectile（首选路径）；
//   2. 命中时若未绑定（owner 不可用），回退按玩家 FIFO 出队。
// 重启后 caught 球 Lore 仍带 mb_id，重新入队即可正常释放；投出的球若永远不命中，
// 会残留一条队列/绑定项，由下一次命中消费掉（可接受）。
const pendingByPlayer = new Map<string, string[]>();

// 投掷物 ID -> 目标实体 ID 的绑定（在 spawn 时写入、命中时消费删除）。
// 不用投掷物 dynamic property：球命中即被 remove_on_hit 移除，命中回调里实体已
// 失效，getDynamicProperty 会抛 InvalidEntityError；而 .id 是缓存属性可安全读取。
const boundByProjectile = new Map<string, string>();

// 已解析过一次的投掷物 ID（一次性守卫）：一个球只允许触发一次「释放/捕捉/掉球」。
// 同一 tick 可能同时触发 projectileHitEntity 与 projectileHitBlock，或球二次命中
// 刚释放出的生物，没有守卫会重复掉球（如释放时掉两个球）甚至把刚释放的生物再抓回去。
const resolvedProjectiles = new Set<string>();

// ---- 工具函数 ----

// 数字替换为字母，保证结构名合法且不超长
function replaceNumbersWithLetters(str: string): string {
    const numberToLetter: Record<string, string> = {
        "0": "a", "1": "b", "2": "c", "3": "d", "4": "e",
        "5": "f", "6": "g", "7": "h", "8": "i", "9": "j",
    };
    return str.replace(/[0-9]/g, (match) => numberToLetter[match]);
}

// 由实体 ID 推导磁盘结构名（实体 ID 为负数大整数，取负后转字母）
function structureNameFor(entityId: string): string {
    return STRUCTURE_PREFIX + replaceNumbersWithLetters(String(-Number(entityId)));
}

// 从 Lore 提取被捕捉实体的 ID（结构化解析，替代硬编码下标）
function readLoreEntityId(stack: ItemStack): string | undefined {
    const line = stack.getLore().find((l) => l.startsWith(LORE_ID));
    return line ? line.substring(LORE_ID.length) : undefined;
}

// 出队该玩家最早一次待释放的实体 ID
function takePendingRelease(playerId: string): string | undefined {
    const list = pendingByPlayer.get(playerId);
    if (!list || list.length === 0) {
        pendingByPlayer.delete(playerId);
        return undefined;
    }
    const entityId = list.shift();
    if (list.length === 0) pendingByPlayer.delete(playerId);
    return entityId;
}

// 解析本次命中的目标：优先取 spawn 时绑定的目标，回退到该玩家队列。
// 只读 projectile.id（缓存属性），命中回调里抛掷物已被 remove_on_hit 移除，
// 不得调用 getDynamicProperty 等需有效实体的 API。
function resolveTarget(sourceId: string, projectile: Entity): string | undefined {
    const bound = boundByProjectile.get(projectile.id);
    if (bound) {
        boundByProjectile.delete(projectile.id);
        return bound;
    }
    return takePendingRelease(sourceId);
}

// 是否可被捕捉：排除黑名单，且必须带血量组件
function isCatchable(entity: Entity): boolean {
    if (UNCATCHABLE_EXACT.has(entity.typeId)) return false;
    if (UNCATCHABLE_PREFIXES.some((prefix) => entity.typeId.startsWith(prefix))) return false;
    return entity.getComponent("health") !== undefined;
}

// 生成掉落的大师球
function spawnBall(dimension: Dimension, location: Vector3, typeId: string): void {
    dimension.spawnItem(new ItemStack(typeId, 1), location);
}

// 在指定位置爆发一圈粒子（basic 类粒子引用 variable.direction，必须传入方向变量）
function burstParticles(dimension: Dimension, location: Vector3, particle: string, count: number, spread: number): void {
    const vars = new MolangVariableMap();
    vars.setVector3("variable.direction", { x: 0, y: 1, z: 0 });
    for (let i = 0; i < count; i++) {
        dimension.spawnParticle(particle, {
            x: location.x + (Math.random() - 0.5) * spread,
            y: location.y + (Math.random() - 0.5) * spread + 0.5,
            z: location.z + (Math.random() - 0.5) * spread,
        }, vars);
    }
}

// 创造模式投掷不消耗物品，不掉落球模拟消耗
function isCreative(source: Entity | undefined): boolean {
    return source instanceof Player && source.getGameMode() === GameMode.creative;
}

// 消耗手持的捕捉球（创造模式原版投掷不扣物品，这里手动扣）。
// 只处理手持栏位且必须是捕捉球；捕捉球堆叠上限为 1，直接清空槽位即可。
function consumeHeldBall(player: Player): void {
    const container = player.getComponent("inventory")?.container;
    if (!container) return;
    const slot = player.selectedSlotIndex;
    const stack = container.getItem(slot);
    if (!stack || stack.typeId !== "sapdon:caught_masterball") return;
    container.setItem(slot);
}

// ---- 捕捉与释放 ----

// 捕捉：传送到高空 -> 按碰撞盒体积保存结构 -> 移除实体 -> 掉落「捕捉到的大师球」
function capture(target: Entity, dimension: Dimension, dropLocation: Vector3): void {
    if (!isCatchable(target)) {
        spawnBall(dimension, dropLocation, "sapdon:uncaught_masterball");
        return;
    }

    // 收服粒子：红石粉色粒子爆开（贴合大师球配色）
    burstParticles(dimension, dropLocation, "minecraft:redstone_wire_dust_particle", 20, 1.5);

    // 先传送到高空，避免保存结构时与场景方块重叠
    const hideLocation: Vector3 = { x: dropLocation.x, y: dropLocation.y + 100, z: dropLocation.z };
    target.teleport(hideLocation, {});

    // 按实体碰撞盒大小计算保存区域（大实体不再被 1x1 裁剪；类型声明缺失，结构上取 width/height）
    const box = target.getComponent("collision_box") as { width?: number; height?: number } | undefined;
    const width = Math.max(1, Math.ceil(box?.width ?? 1));
    const height = Math.max(1, Math.ceil(box?.height ?? 1));
    const sx = Math.floor(hideLocation.x);
    const sy = Math.floor(hideLocation.y);
    const sz = Math.floor(hideLocation.z);
    const structureName = structureNameFor(target.id);

    try {
        dimension.runCommand(
            `structure save ${structureName} ${sx} ${sy} ${sz} ${sx + width - 1} ${sy + height - 1} ${sz + width - 1} true disk false`
        );
    } catch (error) {
        console.warn(`[masterball] 结构保存失败: ${error}`);
        spawnBall(dimension, dropLocation, "sapdon:uncaught_masterball");
        return;
    }

    // 结构保存成功后再读取实体数据并移除（remove 后属性不可访问）
    const name = target.nameTag;
    const typeId = target.typeId;
    const entityId = target.id;
    const health = target.getComponent("health")?.currentValue ?? 1;
    target.remove();

    const masterball = new ItemStack("sapdon:caught_masterball", 1);
    masterball.nameTag = `大师球(${typeId})`;
    masterball.setLore([
        `${LORE_NAME}${name}`,
        `${LORE_TYPE}${typeId}`,
        `${LORE_ID}${entityId}`,
        `${LORE_HEALTH}${health}`,
    ]);
    dimension.spawnItem(masterball, dropLocation);
}

// 释放：加载结构还原实体 -> 删除结构 -> 掉落空大师球。
// 注意：加载前绝不能先删结构（原防御性清理会在正常路径把待加载的结构删掉，
// 导致 load 失败、生物永远放不出来）。创造模式的消耗由调用方先扣手持捕捉球。
function releaseFrom(entityId: string, dimension: Dimension, dropLocation: Vector3): void {
    const structureName = structureNameFor(entityId);

    try {
        dimension.runCommand(
            `structure load ${structureName} ${Math.floor(dropLocation.x)} ${Math.floor(dropLocation.y)} ${Math.floor(dropLocation.z)} 0_degrees none true false false`
        );
    } catch (error) {
        console.warn(`[masterball] 结构加载失败: ${error}`);
        return;
    }

    try {
        dimension.runCommand(`structure delete ${structureName}`);
    } catch (error) {
        console.warn(`[masterball] 结构删除失败: ${error}`);
    }

    // 释放粒子：白色烟雾腾起
    burstParticles(dimension, dropLocation, "minecraft:white_smoke_particle", 16, 1.2);

    spawnBall(dimension, dropLocation, "sapdon:uncaught_masterball");
}

// ---- 事件监听 ----

// 使用大师球：捕捉球把目标实体 ID 入队；空球清空该玩家待释放状态。
// 必须用 beforeEvents：它在「使用动作执行之前」触发，先于抛掷物生成与命中，
// 否则贴脸投掷时命中事件先于 itemUse 广播，待释放队列为空，释放会被误判为捕捉。
world.beforeEvents.itemUse.subscribe((event) => {
    const typeId = event.itemStack.typeId;
    if (typeId === "sapdon:caught_masterball") {
        const entityId = readLoreEntityId(event.itemStack);
        if (!entityId) return;
        const list = pendingByPlayer.get(event.source.id) ?? [];
        list.push(entityId);
        pendingByPlayer.set(event.source.id, list);
    } else if (typeId === "sapdon:uncaught_masterball") {
        // 空球不产生待释放状态；此前未命中的捕捉球残留一并清掉
        pendingByPlayer.delete(event.source.id);
    }
});

// 抛掷物生成：按投掷者 owner 从队列出队，把目标实体 ID 绑定到 boundByProjectile。
// 优先路径：每个球在生成瞬间拿到自己的目标，连发多球互不错位。
// owner 在低版本运行时可能拿不到，此时跳过绑定，由命中时的回退路径兜底。
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    if (entity.typeId !== "sapdon:projectile_masterball") return;

    const owner = (entity.getComponent("projectile") as { owner?: Entity } | undefined)?.owner;
    if (!owner || owner.typeId !== "minecraft:player") return;

    const entityId = takePendingRelease(owner.id);
    if (entityId) boundByProjectile.set(entity.id, entityId);
});

// 命中实体：有目标则释放；否则执行捕捉。
// 一次性守卫：同一投掷物只处理第一次命中（防双事件/二次命中重复掉球、重复捕捉）。
world.afterEvents.projectileHitEntity.subscribe((event) => {
    const source = event.source;
    const projectile = event.projectile;
    if (!source || !projectile || projectile.typeId !== "sapdon:projectile_masterball") return;
    if (source.typeId !== "minecraft:player") return;
    if (resolvedProjectiles.has(projectile.id)) return;
    resolvedProjectiles.add(projectile.id);

    const dimension = source.dimension;
    const hitEntity = event.getEntityHit().entity;
    if (!hitEntity) return;
    const dropLocation = hitEntity.location;

    const targetId = resolveTarget(source.id, projectile);
    if (targetId) {
        // 创造模式投掷不消耗物品，手动扣掉手持的捕捉球再释放
        if (source instanceof Player && isCreative(source)) consumeHeldBall(source);
        releaseFrom(targetId, dimension, dropLocation);
    } else {
        capture(hitEntity, dimension, dropLocation);
    }
});

// 命中方块：若有待释放目标则释放，并掉落空大师球。
// 一次性守卫：与命中实体互斥，同一投掷物只允许一条路径生效。
world.afterEvents.projectileHitBlock.subscribe((event) => {
    const source = event.source;
    const projectile = event.projectile;
    if (!source || !projectile || projectile.typeId !== "sapdon:projectile_masterball") return;
    if (resolvedProjectiles.has(projectile.id)) return;
    resolvedProjectiles.add(projectile.id);

    const targetId = resolveTarget(source.id, projectile);
    if (targetId) {
        // 释放路径内部已掉落空球，这里不再掉，避免一次砸方块掉两个球；
        // 创造模式先扣手持捕捉球
        if (source instanceof Player && isCreative(source)) consumeHeldBall(source);
        releaseFrom(targetId, event.dimension, event.location);
    } else {
        // 空球砸方块：掉一个空球替代被消耗的球
        spawnBall(event.dimension, event.location, "sapdon:uncaught_masterball");
    }
});
