# 大师球 更新日志

## 1.0.1 (2026-08-16)

### 玩法调整
- 开放收服限制：除玩家外的一切实体均可收服（移除盔甲架/掉落物/抛掷物等黑名单与血量组件限制）

## 1.0.0 (2026-08-16)

### 框架与工程
- 迁移 TypeScript：`main.mjs` → `main.ts`，`scripts/index.js` → `scripts/index.ts`，新增 `tsconfig.json`，`build.config` 同步调整（`useJs: false`）
- 新增 `npm run typecheck`（tsc strict 检查）

### 修复
- **贴脸释放被误判为捕捉**：待释放入队从 `afterEvents.itemUse` 移至 `beforeEvents.itemUse`（先于抛掷物生成与命中）
- **释放掉两个球**：新增每球一次性解析守卫（`resolvedProjectiles`）；blockHit 分支只掉一个空球
- **重启后无法释放 / 磁盘结构泄漏**：改用玩家维度 FIFO 队列 + 抛掷物生成时绑定目标，重启后 Lore 重新入队即可正常释放
- **释放不出生物**：移除加载前的防御性 `structure delete`（会把待加载结构删掉）
- **命中已移除实体报 InvalidEntityError**：绑定落地点从投掷物 dynamic property 改为内存 Map（命中回调只读缓存属性）

### 玩法调整
- 捕捉目标黑名单：玩家 / 盔甲架 / 掉落物 / 经验球 / 各类抛掷物 / 无血量组件实体不再被捕捉
- 结构保存区域按实体碰撞盒体积计算（大实体不再被 1x1 裁剪）
- Lore 结构化存储（`mb_id:`/`mb_name:`/`mb_type:`/`mb_health:`）
- 新增收服粒子（红石粉红爆开）与释放粒子（白烟）
- 大师球新增火免组件（物品 `format_version` 提升至 1.21.90 以启用 `minecraft:fire_resistant`）
- 合成表：钻石 → 末影珍珠
- 创造模式投掷释放也会消耗手持捕捉球（手动扣减，只限手持槽位）
