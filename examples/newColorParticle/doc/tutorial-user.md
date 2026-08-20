# 多彩粒子（newColorParticle）上手教程

欢迎使用 **多彩粒子** 示例附加包。本包以 **mfx（Molang 粒子家族）** 为核心：**脚本只负责生成初始形状并传参，粒子的移动 / 缩放 / 颜色 / 大小 / 淡出全部由粒子 JSON 里的 Molang 或发射器自驱动**——高性能、最省 CPU。

完整配方速查见 `doc/mfx-cheatsheet.md`。

## 目录

1. [环境准备与构建](#1-环境准备与构建)
2. [方式一：用演示物品触发](#2-方式一用演示物品触发)
3. [方式二：用指令触发](#3-方式二用指令触发)
4. [mfx 参数详解](#4-mfx-参数详解)
5. [进阶玩法示例](#5-进阶玩法示例)

---

## 1. 环境准备与构建

前置：**Minecraft 基岩版（≥1.20.20）**、Node.js、sapdon 全局 CLI。

```powershell
cd D:\Projects\sapdon\examples\newColorParticle
npm i              # 首次同步依赖与框架库
npm run build      # 构建附加包（生成 dev/newColorParticle_BP / _RP）
```

进入世界 → 编辑 → 行为包 / 资源包，加载 BP/RP 两个包。

---

## 2. 方式一：用演示物品触发

> 当前版本已移除旧演示物品（它们依赖旧的脚本轨迹管线）。触发统一用指令 `/colorparticle:mfx`。

---

## 3. 方式二：用指令触发

| 指令 | 作用 |
|------|------|
| `/colorparticle:mfx <preset> [radius] [turns] [life] [count] [color] [pos]` | 播放一个 mfx 配方 |
| `/colorparticle:mfx_list` | 列出全部 mfx 配方 |

示例：
```
/colorparticle:mfx ring          # 旋转光环
/colorparticle:mfx cubebreathe   # 呼吸立方（棱线径向往返）
/colorparticle:mfx sine          # 单粒子沿 X 轴往返
/colorparticle:mfx uni_spiral    # 螺旋上升（全能表达式）
/colorparticle:mfx uni_lissajous # 利萨如
/colorparticle:mfx starfield     # 星空爆发
/colorparticle:mfx_list          # 查看全部配方
```

---

## 4. mfx 参数详解

```
/colorparticle:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `preset` | 枚举（必填） | — | 配方名（`/colorparticle:mfx_list` 查看） |
| `radius` | 数值 | 配方默认 | 半径 |
| `turns` | 数值 | 配方默认 | 旋转圈数 |
| `life` | 整数 | `120` | 粒子寿命（游戏刻，20=1 秒） |
| `count` | 整数 | 全部 | 抽样粒子数 |
| `color` | 字符串 | 配方默认 | 覆盖主色（命名色 / `R,G,B`） |
| `pos` | 坐标 | 施法者位置 | 中心落点 |

**cap 提性能**：粒子由发射器/Molang 自驱动，脚本不逐帧，天然流畅合理。

---

## 5. 进阶玩法示例

```
# 呼吸立方，寿命拉长到 20 秒
/colorparticle:mfx cubebreathe life 400

# 螺旋上升调半径与圈数
/colorparticle:mfx uni_spiral radius 3 life 200

# 输出全部配方
/colorparticle:mfx_list
```

### 高级：自定义单 uni 粒子
`/colorparticle:uni` 用 DSL 自定义**单粒子**三轴运动，可再加颜色/大小/淡出/发射。**DSL 必须用双引号包裹**（裸 token 里的 `=`,`;`,`(` 会被指令报"意外的字符"）。

DSL 两种形式（可混用）：
- **词条式**：`x:sin(A=3,B=4)` — 函数 `lin/sqr/sin/cos/exp/expd/abs/ln`
- **数字式**：`x:2(5,1,0)` — type 0..7（0线性 1平方 2sin 3cos 4exp 5exp⁻ 6abs 7ln）
- `;` 分轴，`+` 同轴叠加（≤3 项），D 偏移 `;D=1` 或末尾 `$1`

```
/colorparticle:uni "x:sin(A=3,B=4);z:cos(A=3,B=4)"          # 圆周
/colorparticle:uni "x:2(5,1,0)+3(1,2,0);y:1(1,1,0);z:3(1,8,0)$1"   # 螺旋上升（数字式）
/colorparticle:uni "x:sin(A=5,B=2)" life 200 color "255,180,60" size 0.3 sizemode 0 fademode 1
/colorparticle:uni_help                                  # 查看 DSL 语法
```
语法速查与函数表见 `doc/mfx-cheatsheet.md`。

### 形状雕塑：sculpt（已有形状枚举 + uni 动画 DSL，可整体缩放）
`/colorparticle:sculpt` 用**已有形状枚举**摆点阵，再用 uni 运动 DSL 让整形状整体动。`mode move`=叠加平移/旋转；`mode scale`=整体径向缩放（立方体/球体呼吸、单轴压扁都行）：

```
/colorparticle:sculpt ring "x:sin(A2,B4);z:sin(A2,B4)"               # 旋转铁环（move）
/colorparticle:sculpt cube "x:sin(A0.3,B3);y:sin(A0.3,B3);z:sin(A0.3,B3)" mode scale   # 立方体整体呼吸缩放
/colorparticle:sculpt heart "y:sin(A0.4,B3)" mode scale              # 爱心单轴压扁拉伸
/colorparticle:sculpt_help
```
形状枚举见 `doc/mfx-cheatsheet.md`（sphere/cube/ring/helix/heart/torus/rose/lissajous/mobius/spirograph/superflower/sierpinski 等）。

完整配方表、五种模型（universal / cubebreath / dynamic / stream / shape_* / sine / uni）与一键进制，见 `doc/mfx-cheatsheet.md`。