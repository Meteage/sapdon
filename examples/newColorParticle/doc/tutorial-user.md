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
| `/sapdon:particle_math <数学表达式> [参数...]` | 用一条数学表达式自由生成粒子（最灵活） |
| `/sapdon:mfx <配方> [参数...]` | Molang 全能粒子（数学在粒子内，性能最好） |
| `/sapdon:particle_list` | 列出所有预设 / 形状 / 运动 / 颜色 / 数学模式 |
| `/sapdon:mfx_list` | 列出所有 Molang 配方 |
| `/sapdon:particle_clear` | 清除当前所有粒子 |

### 4.2 完整签名

```
/sapdon:particle <effect> [color] [duration] [trail] [spin] [radius] [pos]
```

```
/sapdon:particle_math <expr> [mode] [count] [duration] [trail] [dt] [radius] [color]
```

### 4.3 基础示例

```text
/sapdon:particle galaxy                          # 播放"星系"预设
/sapdon:particle heart red pink                  # 心动爱心，改成红→粉渐变
/sapdon:particle sphere 60 20                    # 呼吸球体，存续60刻、残影20刻

# 数学表达式粒子（expr 含空格/分号，需用双引号或引号括起来）
/sapdon:particle_math "x=sin(t*6.28)*r;y=cos(t*6.28)*r;z=t*2*r" count 300
/sapdon:particle_math "x=sin(t*6.28)*r;y=cos(t*6.28)*r;z=0" count 200 radius 3 cyan

# Molang 全能粒子（配方 + 可选参数覆盖）
/sapdon:mfx ring                             # 旋转光环
/sapdon:mfx heart radius 2 life 100          # 心动爱心 放大、寿命100刻
/sapdon:mfx spiral radius 3 turns 2 color red

/sapdon:particle_list                        # 查看全部可用内容
/sapdon:mfx_list                             # 查看 Molang 配方
/sapdon:particle_clear                       # 清空画面上的粒子
```

> **提示**：指令里的尖括号 `<...>` 表示必填参数，方括号 `[...]` 表示可选参数。可选参数可以省略，程序会使用默认值。

---

## 5. 可选参数详解

### 5.1 `particle` 通用参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `color` | 字符串 | 蓝 `blue` | 粒子主色 |
| `duration` | 整数 | `60` | 效果存续时间（游戏刻，20 刻 = 1 秒） |
| `trail` | 整数 | `1` | 残影长度（游戏刻），越大轨迹越长 |
| `spin` | 数值 | `0` | 粒子自旋速率 |
| `radius` | 数值 | `1.5` | 形状半径（相对大小） |
| `pos` | 坐标 | 施法者位置 | 粒子中心落点坐标 |

### 5.2 `particle_math` 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `expr` | 字符串（必填） | — | 数学表达式，多条 `变量=公式` 用 `;` 分隔 |
| `mode` | 枚举 | `param` | `param`：沿 t 铺曲线；`surface`：用 i/n 铺曲面 |
| `count` | 整数 | `120` | 采样粒子总数 |
| `duration` | 整数 | `60` | 效果存续时间（游戏刻，20 刻 = 1 秒） |
| `trail` | 整数 | `1` | 残影长度（游戏刻） |
| `dt` | 数值 | `0.01` | t 的采样步长（越小越密，受 count 上限约束） |
| `radius` | 数值 | `1.5` | 半径（表达式里的 `r` 即此值） |
| `color` | 字符串 | 蓝 `blue` | 整组缺省色（expr 输出 `red/green/blue` 时自动逐点覆盖） |

> **性能提示**：两指令的 `duration`、`trail` 均以**游戏刻(tick)**计（20 刻 = 1 秒）。`particle_math` 每刻会重刷所有点，`count` 越大越密集也越卡；默认值已偏低，按需再往上调。

### 5.3 Molang 全能粒子（`mfx`）

`mfx` 是**单个预烘焙的 Molang 粒子**：脚本只算好每个粒子的初始位置并传参，粒子的**轨迹 / 颜色渐变 / 大小演化 / 旋转 / 淡出**全部由粒子 JSON 里的 Molang 表达式用 `variable.particle_age` 自己计算，不再逐 tick 重刷——性能最优，最适合成品特效。

```
/sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `preset` | 枚举（必填） | — | 配方名（`/sapdon:mfx_list` 查看） |
| `radius` | 数值 | 配方默认 | 半径（也用作 wave/cone 振幅） |
| `turns` | 数值 | 配方默认 | 旋转圈数（spin/spiral/orbit） |
| `life` | 整数 | `120` | 粒子寿命（游戏刻，20=1 秒） |
| `count` | 整数 | 全部 | 抽样粒子数（超过则均匀抽稀） |
| `color` | 字符串 | 配方默认 | 覆盖主色（命名色 / `R,G,B`） |
| `pos` | 坐标 | 施法者位置 | 中心落点 |

**内置配方（12 个）**：
- 基础：`ring`(旋转光环)、`sphere`(呼吸球体)、`spiral`(上升螺旋)、`heart`(心动爱心)、`lissajous`(3D利萨如)、`rose`(玫瑰线)、`torus`(参数环面)
- A-1 新增：`cone`(喷锥)、`bounce`(弹跳盘)、`orbit`(流转轨道)、`heat`(余烬/白热)、`sprite`(序列帧火苗)

**配方驱动的能力矩阵**（差异靠 `variable.*` 分支选择）：

| 能力轴 | 可选分支（Molang 三元） |
|--------|------------------------|
| 轨迹 `motion` | `0`still `1`spin `2`rise `3`spiral `4`breathe `5`wave `6`cone `7`wobble `8`bounce `9`orbit |
| 颜色 `colormode` | `0`solid `1`gradient `2`cycle `3`rainbow `4`heat |
| 大小 `sizemode` | `0`const `1`bloom `2`fade |
| 淡出 `fadeMode` | `0`out `1`inout `2`none |
| 序列帧 `maxframe` | `1`=静态；`N`=N 帧动画（配合起始 UV） |

> 现有 `billboard.uv` 已改为 flipbook 驱动：`maxframe=1` 时等价静态帧（现有配方外观不变），`maxframe>1` 时做序列帧动画。

> **与 `particle_math` 的关系（双方案）**：`mfx` = 作者期把公式烘焙进 Molang，数学在粒子内、性能最好，适合成品特效；`particle_math` = 运行期任意表达式，数学在脚本，最灵活。日常用 `mfx`，要完全自定义形状再上 `particle_math`。重力/碰撞/原生随机分布/持续发射属互斥模型，将由后续伴生粒子（`mfx_dynamic`/`mfx_shape_*`/`mfx_stream`）补齐。

### 5.4 数学表达式（DSL）语法

参考 Java 模组 **AnotherColorBlock** 的表达式风格。你只需把「粒子的位置写成含 `t` 的方程」。

**内置变量 / 常量：**

| 名称 | 含义 |
|------|------|
| `t` | 进度，0→1 |
| `i` | 粒子序号 |
| `n` | 粒子总数 |
| `r` | 半径（`radius` 参数） |
| `PI` / `E` / `TAU` | 常量 π / 自然常数 / 2π |

**输出变量：** 必须给出 `x,y,z`（相对中心的位置）；可选 `red,green,blue`（0~1，逐粒子着色）。

**支持的函数：** `sin cos tan asin acos atan atan2 sqrt abs floor ceil round exp log ln pow min max sign mod clamp deg rad`

**语法要点：**
- 赋值用 `=`，多条用 `;` 分隔，可定义中间变量再复用：`a=5;u=floor(t/78.5)/25;x=a*cos(u);...`
- 支持 `+ - * / ^ %`、括号、一元负号；**隐式乘**（`2PI`、`3t`、`2(x+1)` 自动视为乘法）
- 前缀 `^` 为幂运算，右结合（`2^3^2 = 2^(3^2)`）

### 5.5 颜色写法（`particle` 的 `color` 参数）

| 写法 | 示例 | 说明 |
|------|------|------|
| 命名色 | `red`、`gold`、`cyan` | 内置 12 种颜色（见附录颜色表） |
| RGB 值 | `255,0,128` | 用英文逗号分隔的 0~255 三通道 |
| 关键字 | `cycle` | RGB 循环渐变（仅 `particle` 预设指令支持） |

`particle_math` 的 `color` 参数只接受命名色 / RGB 固态色；如需逐点渐变，直接在表达式里写 `red,green,blue` 输出（见 5.3）。

> **注意**：表达式里的位置 `x,y,z` 会自动乘上 `radius`（通过 `r` 参与），也可在表达式内自定尺度。指令由**命令方块**执行时，粒子以方块中心为原点。

---

## 6. 进阶玩法示例

把数学形状 × 运动 × 颜色写成表达式，能做出很多炫酷效果：

```text
# 圆形螺旋（t 控制 3 圈 + 上升）
/sapdon:particle_math "x=sin(t*6.28)*r;y=cos(t*6.28)*r;z=t*2*r" count 300

# 平面心形线
/sapdon:particle_math "c=16*sin(t)^3;u=13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t);x=c*r;y=-u*r;z=0" count 200

# 3D 环面（用 i/n 做第二维铺面）
/sapdon:particle_math "a=i/n*6.28;b=(i%40)/40*6.28;x=(1+0.4*cos(b))*cos(a)*r;y=0.4*sin(b)*r;z=(1+0.4*cos(b))*sin(a)*r" mode surface count 400

# 波浪曲面
/sapdon:particle_math "x=(i/n*2-1)*r;y=sin(t*6.28+i)*r;z=(t*2-1)*r" mode surface count 400

# 渐变着色的螺旋（表达式同时输出 red/green/blue）
/sapdon:particle_math "x=sin(t*6.28)*r;y=cos(t*6.28)*r;z=t*2*r;red=0.5+0.5*sin(t*6);green=0.3;blue=0.9" count 300
```

> **提示**：表达式越精细、`count` 越大，粒子越密集——记得控制数量避免卡顿。特效太多可用 `/sapdon:particle_clear` 一键清屏。想了解预设效果的内部公式，可参考本示例 `scripts/effects.ts`。

---

## 7. 附录：可用枚举全集

你可以用 `/sapdon:particle_list` 在游戏内随时查看到以下全部内容。

### 7.1 预设列表（16 个）

这些预设由 `/sapdon:particle <预设>` 触发，其内部形状/运动见 7.2 / 7.3。

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

### 7.2 数学模式（`particle_math` 的 `mode`）

| 模式 | 说明 |
|------|------|
| `param` | 沿 `t:0→1` 铺出曲线（默认） |
| `surface` | 用 `i/n` 做第二维，铺满曲面 |

> **说明**：旧指令 `/sapdon:particle_shape` 因超出引擎 8 参数上限从未生效，已由更灵活的 `/sapdon:particle_math` 取代。下方形状/运动/颜色表供 `/sapdon:particle` 预设参考；写自由形状请直接用 `particle_math` 表达式。

### 7.3 形状列表

**普通形状**：`sphere`、`cube`、`ring`、`ring_tilt`、`ring_tilt2`、`helix`、`heart`、`star`、`fib_sphere`、`torus`、`knot`、`rose`、`lissajous`、`mobius`、`spirograph`、`superflower`、`sierpinski`

**路径轨迹**（`path:` 前缀）：`path:lorenz`、`path:rossler`、`path:thomas`、`path:aizawa`、`path:dejong`、`path:henon`

### 7.4 运动列表（12 个）

`still`（静止）、`spin`（旋转）、`spin_rev`（反转）、`spin_turns`（多圈旋转）、`pulse`（脉冲缩放）、`heartbeat`（心动）、`spin_breathe`（旋转呼吸）、`rise`（上升）、`flow`（沿路径流动）、`wave`（行波）、`phase`（相位呼吸）、`jitter`（随机抖动）

### 7.5 颜色表（12 个命名色）

| 名称 | RGB | 名称 | RGB |
|------|-----|------|-----|
| `blue` | 0.3, 0.7, 0.999 | `purple` | 0.75, 0.35, 0.999 |
| `orange` | 0.999, 0.7, 0.1 | `red` | 0.999, 0.25, 0.25 |
| `green` | 0.3, 0.999, 0.4 | `cyan` | 0.25, 0.85, 0.999 |
| `yellow` | 0.999, 0.999, 0.3 | `pink` | 0.999, 0.45, 0.75 |
| `gold` | 0.999, 0.85, 0.1 | `silver` | 0.7, 0.7, 0.7 |
| `white` | 0.999, 0.999, 0.999 | `black` | 0.05, 0.05, 0.05 |

另支持自定义 RGB（如 `255,128,0`）；`particle` 指令还支持 `cycle` 关键字做 RGB 轮换。

---

### 下一步

- 浏览源码理解实现：`scripts/expr.ts`（数学表达式解析器，可 `node --experimental-strip-types test/expr.test.mjs` 单测）、`scripts/mathexpress.ts`（表达式铺点）、`scripts/effects.ts`（预设/形状/运动）、`scripts/particles.ts`（粒子调度器）、`scripts/mathfx.ts`（数学光效）
- 想改默认效果，直接编辑 `scripts/effects.ts` 中 `PRESETS` 表后重新 `npm run build`