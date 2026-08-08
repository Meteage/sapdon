# 预生成逻辑记录工具

本目录存放**已生成、可直接导入**的逻辑电路记录，以及生成它们的脚本。

## 4 位全加器（4-bit full adder）

- `gen_4bit_adder.mjs`：生成器（Node 脚本，无框架依赖）。运行：`node tools/gen_4bit_adder.mjs`
- `4bit_adder.json.txt`：完整记录 JSON（8819 字符，含 `mode=topo`）
- `4bit_adder_import.txt`：可直接复制的导入指令序列（45 条 `sapdon:logic_stage` + 末尾 `sapdon:logic_import 4bit-adder`）

### 使用流程（游戏内）
1. 逐条复制 `4bit_adder_import.txt` 里的 `sapdon:logic_stage <片段>` 粘贴执行（暂存区累计）
2. 最后执行 `sapdon:logic_import 4bit-adder` → 得到 uuid
3. 执行 `sapdon:logic_item <uuid>`（手持 `sapdon:logic_tool`）→ 绑定物品
4. 用该物品右键芯片放置，芯片即按 4 位加法工作

### 接口约定
- 输入 `inVal = A | (B << 4)`：bit0..3 = A0..A3，bit4..7 = B0..B3
- 输出 `outMask = S | (Cout << 4)`：bit0..3 = S0..S3，bit4 = Cout
- 行波进位全加器：`S = A ⊕ B ⊕ Cin`，`Cout = A·B | Cin·(A⊕B)`，每 bit 13 门（NOT×4 + AND×6 + OR×3）
- 已验证：全部 256 组 `A∈0..15 × B∈0..15` 与软件加法结果一致

### 架构说明（拓扑记录格式）
- 引擎 `buildTopoModel` 只读 `comp.k/t/f/p` 与 `comp.nets[面]`（值为 net 数组下标字符串）；`loc` 由 `k` 解析，故省略 `x/y/z/directs` 缩小体积
- gate 输入面：`not=west`（朝北），`and/or=其余三个水平面`；未用面必须接常量——AND 的第三面接 `on_signal`、OR 的第三面接 `off_signal`，否则组合输出恒 0/恒 1
- nets `terms` 只列驱动方 `[compKey, "east"]`