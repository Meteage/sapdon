import { test } from "node:test";
import assert from "node:assert";

// 与 examples/gomoku/scripts/index.ts 中的棋盘/判定逻辑保持一致（副本）
const N = 16;
const makeBoard = () => new Int8Array(N * N);

function checkWin(board, row, col) {
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

test("横向五连判胜", () => {
    const b = makeBoard();
    for (let c = 2; c <= 6; c++) b[4 * N + c] = 1;
    assert.equal(checkWin(b, 4, 4), true, "中间子应判胜");
    assert.equal(checkWin(b, 4, 2), true, "左端子应判胜");
    assert.equal(checkWin(b, 4, 6), true, "右端子应判胜");
});

test("纵向五连判胜", () => {
    const b = makeBoard();
    for (let r = 3; r <= 7; r++) b[r * N + 8] = 2;
    assert.equal(checkWin(b, 5, 8), true);
});

test("斜向(↘)五连判胜", () => {
    const b = makeBoard();
    for (let i = 0; i < 5; i++) b[(5 + i) * N + (3 + i)] = 1;
    assert.equal(checkWin(b, 7, 5), true);
});

test("斜向(↗)五连判胜", () => {
    const b = makeBoard();
    for (let i = 0; i < 5; i++) b[(10 - i) * N + (4 + i)] = 2;
    assert.equal(checkWin(b, 8, 6), true);
});

test("四连不判胜", () => {
    const b = makeBoard();
    for (let c = 2; c <= 5; c++) b[4 * N + c] = 1;
    assert.equal(checkWin(b, 4, 3), false);
});

test("六连判胜", () => {
    const b = makeBoard();
    for (let c = 1; c <= 6; c++) b[9 * N + c] = 1;
    assert.equal(checkWin(b, 9, 3), true);
});

test("异色子不参与计数", () => {
    const b = makeBoard();
    for (let c = 2; c <= 5; c++) b[4 * N + c] = 1;
    b[4 * N + 6] = 2;                 // 6 号位是白子，不算黑子连
    assert.equal(checkWin(b, 4, 4), false);
});

test("边界安全（贴近棋盘边）", () => {
    const b = makeBoard();
    for (let r = 0; r < 5; r++) b[r * N + 0] = 1;   // 左上角竖着五连
    assert.equal(checkWin(b, 0, 0), true);
    assert.equal(checkWin(b, 4, 0), true);
    assert.doesNotThrow(() => checkWin(b, 0, 0));
});