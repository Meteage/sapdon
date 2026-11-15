import { world, system, Player, Entity } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// 落子在**交叉点**：16 格 ⇒ 17 条格线 ⇒ 17×17 = 289 个点
const N = 17;
const board = new Int8Array(N * N);   // 0 空 / 1 黑 / 2 白
let turn = 1;                         // 1 黑先 / 2 白
let gameOver = false;
let result = "";

/** 已摆放的棋盘（西北角方块坐标）；棋子会同步到每一块棋盘上 */
type BoardOrigin = { x: number; y: number; z: number };
const boards: BoardOrigin[] = [];
/** 场上所有棋子实体（重开时清场用） */
const stoneEntities: Entity[] = [];

/** 四个象限方块 → 相对西北角的 (dx, dz) */
const QUADRANTS: Record<string, [number, number]> = {
    "gomoku:board_nw": [0, 0],
    "gomoku:board_ne": [1, 0],
    "gomoku:board_sw": [0, 1],
    "gomoku:board_se": [1, 1],
};

function statusText(): string {
    if (gameOver) return result;
    return turn === 1 ? "轮到黑方 ●" : "轮到白方 ○";
}

function checkWin(row: number, col: number): boolean {
    const stone = board[row * N + col];
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
        let cnt = 1;
        for (let s = 1; s < 5; s++) {
            const r = row + dr * s, c = col + dc * s;
            if (r < 0 || r >= N || c < 0 || c >= N || board[r * N + c] !== stone) break;
            cnt++;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - dr * s, c = col - dc * s;
            if (r < 0 || r >= N || c < 0 || c >= N || board[r * N + c] !== stone) break;
            cnt++;
        }
        if (cnt >= 5) return true;
    }
    return false;
}

/* ───────────────────────── 世界棋盘（2×2 多方块）与棋子模型 ───────────────────────── */

const FACE_OFFSETS: Record<string, [number, number, number]> = {
    Up: [0, 1, 0],
    Down: [0, -1, 0],
    North: [0, 0, -1],
    South: [0, 0, 1],
    East: [1, 0, 0],
    West: [-1, 0, 0],
};

function samePos(a: BoardOrigin, b: { x: number; y: number; z: number }): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** 手持「五子棋棋盘」右键：沿视线取指向的方块面，在贴合面的一格摆下 2×2 棋盘 */
function placeBoard(player: Player): void {
    const hit = player.getBlockFromViewDirection({ maxDistance: 8 });
    if (!hit) { player.sendMessage("§7[棋盘] 请对着方块或地面右键"); return; }
    const off = FACE_OFFSETS[hit.face] ?? [0, 1, 0];
    const origin = {
        x: hit.block.location.x + off[0],
        y: hit.block.location.y + off[1],
        z: hit.block.location.z + off[2],
    };
    const dim = player.dimension;

    // 四格都放得下才落盘（空气 / 可替换方块）
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const cell = dim.getBlock({ x: origin.x + dx, y: origin.y, z: origin.z + dz });
        if (cell && !cell.isAir && cell.typeId !== "minecraft:water" &&
            !cell.typeId.startsWith("minecraft:grass") && cell.typeId !== "minecraft:short_grass") {
            player.sendMessage("§c[棋盘] 那里放不下 2×2 棋盘（有方块挡着）");
            return;
        }
    }

    for (const [id, [dx, dz]] of Object.entries(QUADRANTS)) {
        dim.setBlockType({ x: origin.x + dx, y: origin.y, z: origin.z + dz }, id);
    }
    if (!boards.some((b) => samePos(b, origin))) boards.push(origin);
    player.sendMessage(`§a[棋盘] 棋盘已摆放（当前共 ${boards.length} 块）`);
    syncBoard(origin, dim);   // 把当前棋局画到新棋盘上
}

/** 清掉一块棋盘上的全部棋子（按位置范围匹配，棋盘被拆时也用它） */
function clearStonesAt(origin: BoardOrigin): void {
    for (let i = stoneEntities.length - 1; i >= 0; i--) {
        const loc = stoneEntities[i].location;
        // 交叉点落在 0..2m 区间（含边缘），范围放宽到 ±0.1 兜住浮点误差
        if (loc.x >= origin.x - 0.1 && loc.x <= origin.x + 2.1 && loc.z >= origin.z - 0.1 && loc.z <= origin.z + 2.1) {
            try { stoneEntities[i].remove(); } catch { /* 已不存在 */ }
            stoneEntities.splice(i, 1);
        }
    }
}

/** 把当前棋局同步到一块（新摆的）棋盘上 */
function syncBoard(origin: BoardOrigin, dim: any): void {
    for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
            const v = board[row * N + col];
            if (v === 0) continue;
            spawnStoneEntity(dim, origin, row, col, v === 1 ? "gomoku:stone_black" : "gomoku:stone_white");
        }
    }
}

/** UI 格位 (row, col) → 世界坐标：col → +X、row → +Z，格位 0.125m */
function spawnStoneEntity(dim: any, origin: BoardOrigin, row: number, col: number, typeId: string): void {
    try {
        const e = dim.spawnEntity(typeId, {
            // 交叉点坐标：2m 宽 ÷ 16 格 = 0.125m 一个点（col/row = 0..16）
            x: origin.x + col / 8,
            // 棋子是 1.6 单位的立方体（底面在 y=0），贴着棋盘板面（方块底部 1/16 m 处）
            y: origin.y + 0.0625,
            z: origin.z + row / 8,
        });
        stoneEntities.push(e);
    } catch { /* 维度不匹配等场景忽略 */ }
}

function clearAllStones(): void {
    for (const e of stoneEntities) { try { e.remove(); } catch { /* 已不存在 */ } }
    stoneEntities.length = 0;
}

/* ───────────────────────── 对局 UI ───────────────────────── */

// 诊断开关：排查时改成 true，输出会进内容日志（[Scripting][warning]-[gomoku] ...）
const DEBUG = false;
function dbg(...args: unknown[]): void {
    if (DEBUG) console.warn("[gomoku]", ...args);
}

function openGame(player: Player): void {
    dbg("openGame", player.name, "boards=", boards.length);
    const form = new ActionFormData()
        .title("sapdon_ui:gomoku")
        .body(statusText());

    for (let i = 0; i < N * N; i++) form.button(String(board[i]));
    form.button("restart");

    form.show(player).then((r) => {
        dbg("result canceled=", r.canceled, "selection=", r.selection);
        if (r.canceled) return;
        const sel = r.selection!;

        if (sel === N * N) {                      // 重开
            board.fill(0);
            turn = 1;
            gameOver = false;
            result = "";
            clearAllStones();
            openGame(player);
            return;
        }
        if (gameOver) { dbg("gameOver, reopen"); openGame(player); return; }

        if (sel < 0 || sel >= N * N) { dbg("out of range", sel); openGame(player); return; }   // 越界防御
        if (board[sel] !== 0) { dbg("occupied", sel); openGame(player); return; }   // 已落子

        board[sel] = turn;
        const row = Math.floor(sel / N), col = sel % N;
        dbg("place sel=", sel, "row=", row, "col=", col, "stone=", turn);

        // 棋子模型同步到每一块棋盘
        if (boards.length) {
            const dim = player.dimension;
            const typeId = turn === 1 ? "gomoku:stone_black" : "gomoku:stone_white";
            for (const b of boards) spawnStoneEntity(dim, b, row, col, typeId);
        }

        const win = checkWin(row, col);
        if (win) {
            gameOver = true;
            result = turn === 1 ? "黑方胜利！" : "白方胜利！";
            openGame(player);
            return;
        }
        if (!board.includes(0)) {
            gameOver = true;
            result = "平局！";
            openGame(player);
            return;
        }

        turn = turn === 1 ? 2 : 1;
        openGame(player);
    });
}

/* ───────────────────────── 事件入口 ───────────────────────── */

// 点击棋盘方块 → 打开对局 UI
// ⚠️ 普通方块空手右键**不会**触发 playerInteractWithBlock（只有容器/按钮这类有交互的方块才触发），
//    所以必须用方块自定义组件：id 与 main.ts 写进方块 JSON 的 BOARD_COMPONENT_ID 一致。
//    注册必须在 system.beforeEvents.startup 里做（世界加载前），运行中注册无效。
const BOARD_COMPONENT_ID = "gomoku:board_interact";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent(BOARD_COMPONENT_ID, {
        onPlayerInteract: (e) => {
            const player = e.player;
            const block = e.block;
            if (!player || !block) return;
            dbg("interact", player.name, block.typeId);
            // 世界重载后内存里的 boards 会清空：点到哪块棋盘，就按象限反推出西北角补登记，
            // 否则重进世界后落子不会同步到已存在的棋盘上
            const quad = QUADRANTS[block.typeId];
            if (quad) {
                const origin = {
                    x: block.location.x - quad[0],
                    y: block.location.y,
                    z: block.location.z - quad[1],
                };
                if (!boards.some((b) => samePos(b, origin))) {
                    boards.push(origin);
                    dbg("adopt board", JSON.stringify(origin));
                }
            }
            // 手持棋盘道具时是在摆放另一块棋盘，不打断
            const held = player.getComponent("minecraft:inventory")?.container?.getItem(player.selectedSlotIndex);
            if (held?.typeId === "gomoku:board") return;
            // 交互事件里直接开表单容易被判定为"界面已打开"，延后一拍
            system.run(() => openGame(player));
        },
    });
});

// 破坏任意一块象限 → 整盘 2×2 一起拆掉，并把该盘上的棋子全部销毁
world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const id = ev.brokenBlockPermutation?.type?.id ?? ev.block?.typeId;
    const quad = id ? QUADRANTS[id] : undefined;
    if (!quad || !ev.block) return;
    const origin = {
        x: ev.block.location.x - quad[0],
        y: ev.block.location.y,
        z: ev.block.location.z - quad[1],
    };
    dbg("break board", id, JSON.stringify(origin));

    // 其余三块直接置空（被拆的那块引擎已处理，会正常掉落自己的道具）
    const dim = ev.dimension ?? ev.player.dimension;
    for (const [blockId, [dx, dz]] of Object.entries(QUADRANTS)) {
        const loc = { x: origin.x + dx, y: origin.y, z: origin.z + dz };
        try {
            const b = dim.getBlock(loc);
            if (b && b.typeId === blockId) b.setType("minecraft:air");
        } catch { /* 区块未加载等场景忽略 */ }
    }

    clearStonesAt(origin);                       // 棋子全部销毁
    const idx = boards.findIndex((b) => samePos(b, origin));
    if (idx >= 0) boards.splice(idx, 1);         // 从同步列表移除
});

// 手持棋盘道具右键 → 摆放 2×2 棋盘
world.afterEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack?.typeId === "gomoku:board") {
        dbg("use board kit");
        placeBoard(ev.source);
    }
});

// 木棍：不开棋盘也能随时进入对局（棋子仍会同步到已摆放的棋盘上）
world.afterEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack?.typeId === "minecraft:stick") openGame(ev.source);
});
