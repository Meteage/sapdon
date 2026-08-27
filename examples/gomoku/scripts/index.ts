import { world, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const N = 16;
const board = new Int8Array(N * N);   // 0 空 / 1 黑 / 2 白
let turn = 1;                         // 1 黑先 / 2 白
let gameOver = false;
let result = "";

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

// 打印过 (row,col) 的四条线（横/竖/两斜）的 5 格邻域，用于核对棋盘数组状态
function dumpLines(row: number, col: number): void {
    const lines = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const names = ["横", "竖", "↘", "↗"];
    for (let d = 0; d < 4; d++) {
        const [dr, dc] = lines[d];
        let cells = "";
        for (let s = -4; s <= 4; s++) {
            const r = row + dr * s, c = col + dc * s;
            if (r < 0 || r >= N || c < 0 || c >= N) { cells += "x"; continue; }
            cells += String(board[r * N + c]);
        }
        console.warn(`[gomoku] ${names[d]} @(${row},${col}): ${cells}`);
    }
}

function openGame(player: Player): void {
    const form = new ActionFormData()
        .title("sapdon_ui:gomoku")
        .body(statusText());

    // DEBUG: 全白子棋盘（验证白子渲染/对齐），调 false 恢复正常
    const DEBUG_ALL_WHITE = false;
    for (let i = 0; i < N * N; i++) form.button(DEBUG_ALL_WHITE ? "2" : String(board[i]));
    form.button("restart");

    form.show(player).then((r) => {
        world.sendMessage(`[gomoku] canceled=${r.canceled} selection=${r.selection}`);
        console.warn(`[gomoku] response canceled=${r.canceled} selection=${r.selection}`);
        if (r.canceled) return;
        const sel = r.selection!;

        if (sel === N * N) {                      // 重开
            board.fill(0);
            turn = 1;
            gameOver = false;
            result = "";
            console.warn("[gomoku] restart");
            openGame(player);
            return;
        }
        if (gameOver) { openGame(player); return; }

        if (sel < 0 || sel >= N * N) { openGame(player); return; }   // 越界防御
        if (board[sel] !== 0) { openGame(player); return; }   // 已落子

        board[sel] = turn;
        const row = Math.floor(sel / N), col = sel % N;
        world.sendMessage(`[gomoku] place sel=${sel} row=${row} col=${col} stone=${turn}`);
        console.warn(`[gomoku] place sel=${sel} row=${row} col=${col} stone=${turn}`);

        const win = checkWin(row, col);
        console.warn(`[gomoku] checkWin(${row},${col})=${win}`);
        if (!win) dumpLines(row, col);

        if (win) {
            gameOver = true;
            result = turn === 1 ? "黑方胜利！" : "白方胜利！";
            console.warn(`[gomoku] WIN: ${result}`);
            openGame(player);
            return;
        }
        if (!board.includes(0)) {
            gameOver = true;
            result = "平局！";
            console.warn("[gomoku] DRAW");
            openGame(player);
            return;
        }

        turn = turn === 1 ? 2 : 1;
        console.warn(`[gomoku] turn -> ${turn}`);
        openGame(player);
    });
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId !== "minecraft:stick") return;
    if (event.source.typeId !== "minecraft:player") return;
    openGame(event.source as Player);
});