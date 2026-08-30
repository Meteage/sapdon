# digitCircuit — 使用指导手册

Minecraft 基岩版数字电路 Addon（sapdon 框架示例）。实现导线、逻辑门、信号源、位宽总线、可编程芯片与寄存器的即时逻辑电路。

> 技术实现见 `DESIGN.md`；本手册聚焦**怎么用**。

---

## 1. 方块总览

| 分类 | 方块 | 用途 |
|---|---|---|
| 信号源 | `sapdon:on_signal` / `sapdon:off_signal` | 恒 1 / 恒 0 |
| 开关 | `sapdon:switch` | 手动切换 0/1（调试工具点击切换） |
| 导线 | `sapdon:wire` | 连接信号，瞬时传播，可分支 |
| 逻辑门 | `sapdon:and_gate` / `or_gate` / `not_gate` | 与 / 或 / 非（可旋转） |
| 显示灯 | `sapdon:display` | 有信号即亮 |
| 位宽器件 | `sapdon:splitter` / `sapdon:merger` | 分线（N→N-1 直通 + 1 分出）/ 合并（N+1） |
| 寄存器 | `sapdon:register` | 1bit 电平锁存（W=1 写 D，W=0 保持） |
| 可编程芯片 | `sapdon:chip` | 装载逻辑记录后按输入数值输出结果 |
| 端口 | `sapdon:input_port` / `sapdon:output_port` | 电路对外接口（`sapdon:num` 状态 0~9 控制数字贴图，可旋转组合多位端口号） |

## 2. 工具

| 工具 | 功能 |
|---|---|
| `sapdon:debug_tool`（木棍） | 点击开关切换、点击导线打印网络信息、点击门打印各面信号、点击导线/方块间切换导线连接面 |
| `sapdon:logic_tool`（铁锭，即"电路存储芯片"） | 点输入端口→保存电路逻辑；点芯片→装载逻辑 |
| `sapdon:guidebook`（书，游戏内手册） | 右键打开游戏内指导手册（简介/方块/工具/搭建/芯片/命令，可翻页跳分类） |

## 3. 门朝向约定

- 门可旋转（`minecraft:cardinal_direction`）。
- 模型朝北（yaw=0）时：**东=输出**，其余三个水平面=输入；NOT 门输入面=西。
- 输出 `east` 随旋转而变化：朝北东出、朝西北出、朝南西出、朝东南出。

## 4. 电路搭建步骤

1. **布线**：放导线、信号源/开关/门，导线会自动连通（点击放置会按点击面连接）。
2. **接端口**：电路的每个外部输入/输出接 `sapdon:input_port` / `sapdon:output_port` 方块（手持 `debug_tool` 点击循环切换端口号 0~9），可旋转朝向拼出多位端口号。
3. **调试**：用 `debug_tool` 点击各器件查看信号与位宽。
4. **保存为逻辑**：手持 `logic_tool` 点**任意一个输入端口** → 自动编译电路 → 消耗工具并返还一个绑定 `uuid` 的新工具（携带真值表/拓扑）。
5. **装入芯片**：手持已绑定的 `logic_tool` 右键 `sapdon:chip` → 芯片按逻辑工作（**南=输入，北=输出**）。
6. **取回**：潜行右键已加载芯片 → 取回绑定的 `logic_tool`。

## 5. 可编程芯片（chip）

- 未加载贴图 `chip-unload`，已加载 `chip`。
- 输入端（南面）按记录把数值逐位分配给各输入端子；输出端（北面）汇总为数值 `outMask`。
- 两种记录模式（由编译自动选择）：
  - **table**（输入端子 ≤8）：真值表查表，`outMask = table[inMask]`。
  - **topo**（输入端子 >8）：直接保存电路拓扑，运行时逐位驱动 + 固定点仿真，支持寄存器（初始 store=0），不受 2^n 真值表限制。

## 6. 命令一览（斜杠命令）

| 命令 | 说明 |
|---|---|
| `sapdon:logic_list` | 列出已保存逻辑 |
| `sapdon:logic_info <ref>` | 查看某 uuid/名称的真值表 |
| `sapdon:logic_test <ref> <mask>` | 手动测试：输入掩码→输出 |
| `sapdon:logic_dump [radius]` | 转储附近电路状态到诊断日志 |
| `sapdon:logic_log <on\|off>` | 开关运行期位宽/分线/合线诊断日志 |
| `sapdon:logic_export <ref>` | 打印逻辑记录全文（可复制分享） |
| `sapdon:logic_stage <text>` | 把记录文本片段追加到导入暂存区（多次粘贴） |
| `sapdon:logic_stage_clear` | 清空导入暂存区 |
| `sapdon:logic_import [name]` | 合并暂存区解析为逻辑记录（保留原 uuid） |
| `sapdon:logic_item <ref>` | 把记录绑定到手持的 `logic_tool` |
| `sapdon:logic_clear <all\|ref>` | 删除记录（all=清空全部） |

### 分享 / 导入电路

由于记录文本可能超过聊天输入长度，采用"分段暂存再合并"：

```
sapdon:logic_export <ref>            # 拿到分块打印的 JSON
# 复制到别处 / 发给别人
sapdon:logic_stage <第1段>           # 逐段粘贴（可多条）
sapdon:logic_stage <第2段>
...
sapdon:logic_import <name>          # 合并成记录，保留原 uuid
sapdon:logic_item <uuid>             # 绑到手持 logic_tool
# 右键 chip 即可装载
```

## 7. 位宽与数值语义

- 信号以"网络（net）"为单位传播，每个 net 携带位宽与数值。
- `netValue` 取网络上所有驱动组件的**最大值**（布尔视角：>0 视为通）。
- `on/off/switch/门/端口` = 1 bit；分线器直通输出 = `max(0, 输入位宽-1)`，分出 = 1；合并器输出 = 输入位宽 + 1；芯片输出 = 逻辑记录的输出位宽。

## 8. 寄存器（1bit 电平锁存）

- 朝北时：北=W（写使能 1bit）、西=D（待写值）、东=Q（锁存输出）。
- `W=1` → 写入 `store=D`；`W=0` → 保持；`Q ≡ store`。
- Minecraft 无自动 tick，时钟靠开关等交互触发传播推进；store 随电路保存/加载持久化，拨动开关不丢失。

## 9. 调试与排障

- 运行时诊断：`setRuntimeLog(true)`（`sapdon:logic_log on`）开启 `[rt]` 行，写入 `<APPDATA>\Minecraft Bedrock\logs\ContentLog*.txt`。
- `debug_tool` 点击导线/门/分线器可即时查看各面信号与位宽。
- 常见问题：
  - 门输出恒 0/恒 1 → 检查 AND/OR 未用输入面是否接常数（topo 记录中 AND 第三面须接 `on_signal`、OR 接 `off_signal`）。
  - 芯片输出恒 0 → 先确认记录存在（`logic_info`）、输入值、输出三分离排查。
  - 端口不识别 → 确认用的是 `sapdon:input_port`/`sapdon:output_port` 方块而非普通方块。

## 10. 构建与部署

```
cd examples/digitCircuit
npm run build        # 输出到 dev/
```

部署：把 `dev/digitCircuit_BP`、`dev/digitCircuit_RP` 拷贝到游戏 dev 包目录（`%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\`）。
