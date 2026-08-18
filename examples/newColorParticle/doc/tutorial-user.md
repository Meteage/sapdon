# 多彩粒子（newColorParticle）上手教程

欢迎使用 **多彩粒子** 示例附加包！它会在游戏里生成各种绚丽多彩的粒子效果——缩放方体、旋转光环、螺旋上升、呼吸球体、心动爱心、星系、三叶纽结、洛伦兹吸引子、谢尔宾斯基分形…… 你可以用**手持物品右键**，也可以直接输入**指令**来触发这些特效，还能自由组合「形状 × 运动 × 颜色」。

本教程面向普通玩家/使用者，带你从构建到上手完整走一遍。

## 目录

1. [效果概览](#1-效果概览)
2. [环境准备与构建](#2-环境准备与构建)
3. [方式一：用演示物品触发](#3-方式一用演示物品触发)
4. [方式二：用指令触发](#4-方式二用指令触发)
5. [可选参数详解](#5-可选参数详解)
6. [进阶玩法示例](#6-进阶玩法示例)
7. [附录：可用枚举全集](#7-附录可用枚举全集)

---

## 1. 效果概览

本包内置 **16 个预设效果**，每个效果由 1~5 层粒子叠加而成。你可以在游戏中随时用 `/sapdon:particle_list` 查看全部可用内容，用 `/sapdon:particle_clear` 一键清空。

| 常见预设 | 观感 |
|---------|------|
| `scale_sp` 缩放正方体 | 蓝色方体呼吸缩放 + 残影 |
| `spin_sp` 旋转正方体 | 橙色方体匀速旋转 |
| `ring` 旋转光环 | 双层交叉光环反向旋转 |
| `helix` 螺旋上升 | 螺旋粒子沿轴旋升、色相循环 |
| `sphere` 呼吸球体 | 绿色→青色渐变呼吸球 |
| `heart` 心动爱心 | 红色→粉色心跳起伏 |
| `galaxy` 星系 | 渐变球 + 光环 + 三色星点环绕 |

还有参数环面、三叶纽结、洛伦兹吸引子、超公式花、3D 利萨如、莫比乌斯带、旋轮线、谢尔宾斯基分形、波动球面等数学特效。

---

## 2. 环境准备与构建

### 2.1 前置要求

- **Minecraft（基岩版）** 已安装（需 ≥ 1.20.20）
- **Node.js**（含 npm）
- **sapdon 全局 CLI**（`npm i -g sapdon`）

### 2.2 构建

在终端进入示例目录，依次执行：

```powershell
cd D:\Projects\sapdon\examples\newColorParticle
npm i              # 首次：安装并同步依赖与框架库
npm run build      # 构建附加包（等价于 sapdon build ./）
```

构建完成后会生成（或更新）两个包：

```
dev/newColorParticle_BP/   行为包
dev/newColorParticle_RP/   资源包
```

### 2.3 加载到游戏

1. 打开 Minecraft，进入「世界 → 编辑 → 行为包 / 资源包」。
2. 分别把上面的 **行为包（BP）** 和 **资源包（RP）** 应用到你的世界。
3. 进入游戏，打开创造模式物品栏，在「物品」分类即可找到演示物品。

---

## 3. 方式一：用演示物品触发

这是最直观的触发方式。在创造菜单「物品」分类下，能找到 7 个名为「粒子演示：xxx」的物品，**拿在手里右键**即可触发对应效果。

| 物品显示名 | 物品标识符 | 对应预设 |
|-----------|-----------|---------|
| 粒子演示：缩放正方体 | `sapdon:demo_scale_sp` | `scale_sp` |
| 粒子演示：旋转正方体 | `sapdon:demo_spin_sp` | `spin_sp` |
| 粒子演示：旋转光环 | `sapdon:demo_ring` | `ring` |
| 粒子演示：螺旋上升 | `sapdon:demo_helix` | `helix` |
| 粒子演示：呼吸球体 | `sapdon:demo_sphere` | `sphere` |
| 粒子演示：心动爱心 | `sapdon:demo_heart` | `heart` |
| 粒子演示：星系 | `sapdon:demo_galaxy` | `galaxy` |

> **小技巧**：普通物品右键默认不会触发「使用」事件，本包给这些演示物品配了「食物 + 使用修饰」组件，让它们可以被右键使用，从而在脚本里发射粒子。

---

## 4. 方式二：用指令触发

指令方式更灵活，可以自由组合形状、运动、颜色和参数。所有指令都要用 `/` 开头输入。

### 4.1 指令总表

| 指令 | 作用 |
|------|------|
| `/sapdon:particle <预设> [参数...]` | 播放一个预设效果 |
| `/sapdon:particle_shape <形状> <运动> [参数...]` | 自由组合「形状 × 运动」生成粒子 |
| `/sapdon:particle_list` | 列出所有预设 / 形状 / 运动 / 颜色 |
| `/sapdon:particle_clear` | 清除当前所有粒子 |

### 4.2 完整签名

```
/sapdon:particle <effect> [color] [duration] [trail] [spin] [radius] [pos]
```

```
/sapdon:particle_shape <shape> <motion> [color] [color2] [duration] [trail] [spin] [radius] [turns] [p1] [p2] [pos]
```

### 4.3 基础示例

```text
/sapdon:particle galaxy                          # 播放"星系"预设
/sapdon:particle heart red pink                  # 心动爱心，改成红→粉渐变
/sapdon:particle sphere 60 20                    # 呼吸球体，时长60秒、残影20刻
/sapdon:particle_shape superflower spin_breathe pink purple   # 超公式花 呼吸旋转 粉紫渐变
/sapdon:particle_shape knot spin_turns gold purple            # 三叶纽结 双圈旋转 金紫渐变
/sapdon:particle_list                            # 查看全部可用内容
/sapdon:particle_clear                           # 清空画面上的粒子
```

> **提示**：指令里的尖括号 `<...>` 表示必填参数，方括号 `[...]` 表示可选参数。可选参数可以省略，程序会使用默认值。

---

## 5. 可选参数详解

### 5.1 通用参数（两类指令都可用）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `color` | 字符串 | 蓝 `blue` | 粒子主色 |
| `duration` | 数值 | `10` | 效果持续时间（秒） |
| `trail` | 整数 | `2` | 残影长度（游戏刻），越大轨迹越长 |
| `spin` | 数值 | `0` | 粒子自旋速率 |
| `radius` | 数值 | `1.5` | 形状半径（相对大小） |
| `pos` | 坐标 | 施法者位置 | 粒子中心落点坐标 |

### 5.2 `particle_shape` 专用参数

`particle_shape` 追加了 4 个高级参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `motion` | 枚举（必填） | — | 粒子运动方式（见附录运动表） |
| `color2` | 字符串 | 无 | 渐变色尾色；传 `cycle` 则做 RGB 循环 |
| `turns` | 数值 | `1` | 旋转圈数 |
| `p1` | 数值 | 依形状 | 形状高级参数（见 5.4） |
| `p2` | 数值 | 依形状 | 形状高级参数（见 5.4） |

### 5.3 颜色写法

`color` / `color2` 支持三种写法：

| 写法 | 示例 | 说明 |
|------|------|------|
| 命名色 | `red`、`gold`、`cyan` | 内置 12 种颜色（见附录颜色表） |
| RGB 值 | `255,0,128` | 用英文逗号分隔的 0~255 三通道 |
| 关键字 | `cycle` | RGB 循环渐变（红→绿→蓝→红） |

**渐变逻辑**：同时提供 `color` 和 `color2` 时，粒子色随时间在两者间渐变；`color2` 设成 `cycle` 则主色参与循环。

### 5.4 形状的高级参数（p1 / p2）

部分数学形状可用 `p1` / `p2` 微调形态：

| 形状 | p1 含义 | p2 含义 |
|------|---------|---------|
| `fib_sphere` | 点数（默认 240） | — |
| `knot` | 纽结 p（默认 2） | 纽结 q（默认 3） |
| `rose` | 瓣数 k（默认 5） | — |
| `lissajous` | X 频率（默认 3） | Y 频率（默认 2） |
| `superflower` | 对称瓣数 m（默认 4） | 形状参数 n1（默认 0.3） |
| `sierpinski` | 迭代点数（默认 700） | — |

> **注意**：`pos` 允许坐标格式（如 `100 64 100`），也支持相对坐标（`~ ~ ~`）。指令由**命令方块**执行时会以方块中心为默认位置。

---

## 6. 进阶玩法示例

把形状 × 运动 × 渐变组合，能做出很多炫酷效果：

```text
# 波纹涌动：斐波那契球 + 行波
/sapdon:particle_shape fib_sphere wave cyan purple

# 星环公转 + 自转
/sapdon:particle_shape lissajous spin green cyan

# 热浪抖动：谢尔宾斯基分形随机抖动
/sapdon:particle_shape sierpinski jitter red orange

# 慢速旋转光环（半径放大）
/sapdon:particle_shape ring spin_turns blue purple 20 1 0 0 3

# 持续很久的洛伦兹吸引子流
/sapdon:particle_shape path:lorenz flow cycle      120 3
```

> **提示**：特效太多可以用 `/sapdon:particle_clear` 一键清屏；想了解某预设内部由哪些层组成，可查看本示例的 `scripts/effects.ts`。

---

## 7. 附录：可用枚举全集

你可以用 `/sapdon:particle_list` 在游戏内随时查看到以下全部内容。

### 7.1 预设列表（16 个）

| 预设 id | 中文名 | 预设 id | 中文名 |
|---------|--------|---------|--------|
| `scale_sp` | 缩放正方体 | `torus` | 参数环面 |
| `spin_sp` | 旋转正方体 | `knot` | 三叶纽结 |
| `ring` | 旋转光环 | `attractor` | 洛伦兹吸引子 |
| `helix` | 螺旋上升 | `superflower` | 超公式花 |
| `sphere` | 呼吸球体 | `lissajous` | 3D 利萨如 |
| `heart` | 心动爱心 | `mobius` | 莫比乌斯带 |
| `galaxy` | 星系 | `spirograph` | 旋轮线 |
| — | — | `sierpinski` | 谢尔宾斯基分形 |
| — | — | `wave_sphere` | 波动球面 |

### 7.2 形状列表

**普通形状**：`sphere`、`cube`、`ring`、`ring_tilt`、`ring_tilt2`、`helix`、`heart`、`star`、`fib_sphere`、`torus`、`knot`、`rose`、`lissajous`、`mobius`、`spirograph`、`superflower`、`sierpinski`

**路径轨迹**（`path:` 前缀）：`path:lorenz`、`path:rossler`、`path:thomas`、`path:aizawa`、`path:dejong`、`path:henon`

### 7.3 运动列表（12 个）

`still`（静止）、`spin`（旋转）、`spin_rev`（反转）、`spin_turns`（多圈旋转）、`pulse`（脉冲缩放）、`heartbeat`（心动）、`spin_breathe`（旋转呼吸）、`rise`（上升）、`flow`（沿路径流动）、`wave`（行波）、`phase`（相位呼吸）、`jitter`（随机抖动）

### 7.4 颜色表（12 个命名色）

| 名称 | RGB | 名称 | RGB |
|------|-----|------|-----|
| `blue` | 0.3, 0.7, 0.999 | `purple` | 0.75, 0.35, 0.999 |
| `orange` | 0.999, 0.7, 0.1 | `red` | 0.999, 0.25, 0.25 |
| `green` | 0.3, 0.999, 0.4 | `cyan` | 0.25, 0.85, 0.999 |
| `yellow` | 0.999, 0.999, 0.3 | `pink` | 0.999, 0.45, 0.75 |
| `gold` | 0.999, 0.85, 0.1 | `silver` | 0.7, 0.7, 0.7 |
| `white` | 0.999, 0.999, 0.999 | `black` | 0.05, 0.05, 0.05 |

另支持自定义 RGB（如 `255,128,0`）与 `cycle` 关键字。

---

### 下一步

- 浏览源码理解实现：`scripts/effects.ts`（预设/形状/运动）、`scripts/particles.ts`（粒子调度器）、`scripts/mathfx.ts`（数学光效）
- 想改默认效果，直接编辑 `scripts/effects.ts` 中 `PRESETS` 表后重新 `npm run build`