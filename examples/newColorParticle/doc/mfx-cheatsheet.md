# newColorParticle — mfx 效果速查表

本文是对 `/colorparticle:mfx`（Molang 全能粒子家族）全部效果与机制的梳理，另含高自定义单粒子命令 `/colorparticle:uni`。

## 入口
全表（仅 mfx 家族）：`/colorparticle:mfx <preset> [radius] [turns] [life] [count] [color] [pos]`
单 uni 粒子：`/colorparticle:uni "<curve>" [life] [color] [size] [sizemode] [fademode] [colormode] [pos]`
形状雕塑：`/colorparticle:sculpt <shape> "<动画DSL>" [mode move|scale] [radius] [count] [color] [size] [life]`（`/colorparticle:sculpt_help`）

## 通用契约（所有配方一致，脚本只 `spawnParticle` 传参）

| 变量 | 含义 |
|------|------|
| `colormode` | 0 solid / 1 gradient / 2 cycle / 3 rainbow / 4 heat |
| `cr/cg/cb` + `c2r/c2g/c2b` | 主色 / 渐变尾色 |
| `sizemode` | 0 const / 1 bloom / 2 fade |
| `life` | 粒子寿命（游戏刻，默认 120 = 6s） |
| `fademode` | 0 out / 1 inout / 2 none |

## 五种运动/发射模型（kind）

| kind | 粒子 | 机制 |
|------|------|------|
| `universal` | mfx_universal | 脚本铺形状点 + parametric（emitter_age）轨迹 |
| `cubebreath` | mfx_edgebreathe | 脚本在每棱点放独立发射器，各沿径向往返 |
| `dynamic` / `stream` | mfx_dynamic / mfx_stream | 物理 / 持续发射 |
| `shape_disc/sphere/box` | mfx_shape_* | 原生随机分布爆发 |
| `sine` / `uni` | mfx_sine / mfx_uni | 单粒子 / 全能表达式 |

## 配方（27 个）

### universal（12）
| preset | 形状 | motion | 备注 |
|--------|------|--------|------|
| ring | ring | 1 spin | 旋转光环 |
| sphere | sphere | 4 breathe | 呼吸球体 |
| spiral | helix | 3 spiral | 上升螺旋 |
| heart | heart | 4 | 心动爱心 |
| lissajous | lissajous | 1 | 3D 利萨如 |
| rose | rose | 1 | 玫瑰线 |
| torus | torus | 1 | 参数环面 |
| cone | sphere | 6 cone | 喷锥 |
| bounce | ring | 8 bounce | 弹跳盘 |
| orbit | ring | 9 orbit | 流转轨道 |
| heat | sphere | 2 rise | 余烬(白热) |
| sprite | sphere | 0 | 序列帧火苗 |

### 呼吸立方（1）
| preset | 粒子 | 备注 |
|--------|------|------|
| cubebreathe | mfx_edgebreathe | 脚本沿棱线放 N 个发射器，粒子沿径向往返 → 整体缩放 |

### A-2 伴生（5）
| preset | 粒子 | 备注 |
|--------|------|------|
| gust | mfx_dynamic | 喷发气流（重力+碰撞） |
| spring | mfx_stream | 喷泉（持续） |
| halo | mfx_shape_disc | 光环爆发 |
| snowstorm | mfx_shape_box | 雪片风暴 |
| starfield | mfx_shape_sphere | 星空爆发 |

### 验证（1）
| preset | 粒子 | 备注 |
|--------|------|------|
| sine | mfx_sine | 单粒子 parametric + emitter_age 沿 X 往返 |

### uni 全能表达式（8）
`x = Σ Aᵢ·fₑₙ(Bᵢ·t+Cᵢ) + D`，t=`emitter_age`；f：0 线性 / 1 平方 / 2 sin / 3 cos / 4 exp / 5 exp⁻ / 6 abs / 7 ln；sin/cos 为角度制。
| preset | X | Y | Z |
|--------|---|---|---|
| uni_linear | t | 0 | 0 |
| uni_sine | 5·sin(t) | 0 | 0 |
| uni_cos | 5·cos(t) | 0 | 0 |
| uni_parabolic | 0.5·t² | 0 | 0 |
| uni_mix | 2t+3·sin(2t) | 0 | 0 |
| uni_sinpar | 3·sin(t)+0.5·t² | 0 | 0 |
| uni_spiral | sin(18t)·R | t | cos(18t)·R |
| uni_lissajous | sin(3t) | sin(2t) | sin(5t) |

## 关键经验（已沉淀 AGENTS.md）
- Molang 变量名统一小写（`variable.A0` → 查 `variable.a0`）。
- `particle_motion_parametric` 位置逐帧移动用 **`variable.emitter_age`**；用 `particle_age` 做 sin 相位常不振荡。sin/cos 为**角度制**。
- 脚本 `spawnParticle`（手动发射）parametric 未必可靠；改用发射器驱动 + `emitter_local_space`。
- Molang 无 `math.log`，自然对数用 `math.ln`。

---

## 高自定义单粒子：`/colorparticle:uni`

> 每股只出生 **1 个** `mfx_uni` 粒子，三轴运动由 **DSL（关键字式）** 完全自定义，另带颜色/大小/淡出/发射可选参数。

### 语法
```
/colorparticle:uni "<curve>" [life <刻>] [color <名|R,G,B>] [size <浮点>] [sizemode <0|1|2>] [fademode <0|1|2>] [colormode <0..4>] [pos <坐标>]
```
**`<curve>` 必须用双引号 `"..."` 整体包裹**——否则裸 token 里的 `=`,`;`,`(`,`)` 会被指令 tokenizer 当作保留符报"意外的字符"。

`<curve>` 支持**两种形式**（可混用），`;` 分轴、`+` 同轴叠加（**最多 3 项**）、每项 `x = A·f(B·t + C)`（t=`emitter_age`）：

**① 词条式**：`<轴>:<函数>(<A=,B=,C=>)`
| 函数 | type | 表达式 |
|------|------|--------|
| `lin` | 0 | `A·(B·t+C)` |
| `sqr` | 1 | `A·(B·t+C)²` |
| `sin` | 2 | `A·sin((B·t+C)·rad2deg)` |
| `cos` | 3 | `A·cos((B·t+C)·rad2deg)` |
| `exp` | 4 | `A·exp(B·t+C)` |
| `expd` | 5 | `A·exp(−(B·t+C))` |
| `abs` | 6 | `A·abs(B·t+C)` |
| `ln`  | 7 | `A·ln(B·t+C+1)` |

系数 `A=/B=/C=`（也兼容紧凑 `A3`），省略默认 `0`。

**② 数字式**：`<轴>:<type>(<A,B,C>)`，`type 0..7` 对应上表；括号内按 `A,B,C` 裸数字，**部分缺省补 0**（`2(5,1)` = A=5,B=1,C=0；最多 3 个，支持负/小数）。

**D 全局偏移**（三轴整体加，共两种写法）：`;D=0.5` / `;D0.5` / 末尾 `$0.5`。

### 可选参数（默认值）
| 参数 | 默认 | 说明 |
|------|------|------|
| `life` | 120 | 寿命（游戏刻，20=1s） |
| `color` | blue | 主色；`color2` 走 gradient |
| `size` | 0.16 | 初始大小 |
| `sizemode` | 2 | 0 const / 1 bloom / 2 fade（保留经典缩小） |
| `fademode` | 2 | 0 out / 1 inout / 2 none |
| `colormode` | 0 | 0 solid / 1 gradient / 2 cycle / 3 rainbow / 4 heat |

### 示例
```
# 词条式
/colorparticle:uni "x:sin(A=3,B=4);z:cos(A=3,B=4)"                        # 平面圆周
/colorparticle:uni "x:sin(A=3,B=4);z:cos(A=3,B=4);y:lin(A=1);D=0.5"        # 螺旋上升
/colorparticle:uni "x:sin(A=5,B=1)+sqr(A=0.5);y:lin(A=2)"                 # 弹簧震荡
# 数字式（等价）
/colorparticle:uni "x:2(5,1,0)+3(1,2,0);y:1(1,1,0);z:3(1,8,0)$1"          # 螺旋上升
/colorparticle:uni "x:2(3,4);z:3(3,4)"                                   # 平面圆周（部分缺省补0）
# 加视觉参数
/colorparticle:uni "x:sin(A=3,B=4);z:cos(A=3,B=4)" life 200 color "255,180,60" size 0.3 sizemode 0 fademode 1
```
游戏内 `/colorparticle:uni_help` 可随时打印语法。

---

## 形状雕塑：`/colorparticle:sculpt`

**形状 = 已有形状枚举**（脚本 `getShapePoints` 铺锚点），**动画 = uni 粒子运动 DSL**（复用 `parseCurve`）。两种 `mode`：
- `move`（默认）：每个粒子在形状锚点出生，叠加同一动画曲线 → 整个形状整体飞行/旋转，不散架。
- `scale`：所有粒子在**形状中心**出生，`px/py/pz`=锚点向量，位置 = `锚点 × (1 + 动画曲线)` → **整个形状沿各自方向径向缩放**（三轴独立，可整体脉冲，也可单轴压扁/拉伸）。

```
/colorparticle:sculpt <shape> "<动画DSL>" [mode move|scale] [radius] [count] [color] [size] [life]
```

| 形状枚举 | 说明 |
|---------|------|
| `sphere`/`cube`/`ring` | 球面 / 立方棱线 / 圆环 |
| `ring_tilt`/`ring_tilt2` | 倾斜圆环（±x 倾 30°） |
| `helix` | 螺旋上升线 |
| `heart` | 心形轮廓 |
| `star` | 小球面点簇 |
| `fib_sphere` | 斐波那契均匀球面 |
| `torus` | 参数环面（甜甜圈） |
| `knot` | 纽结 (p/q=2/3) |
| `rose`/`lissajous` | 玫瑰线 / 3D 利萨如 |
| `mobius`/`spirograph` | 莫比乌斯带 / 内旋轮线 |
| `superflower`/`sierpinski` | 超公式球面 / 谢尔宾斯基四面体 |

- `animDsl` 是 uni 曲线（见上节函数表），**必须双引号包裹**；省略轴 = 0。`mode scale` 时曲线为缩放增量（`乘锚点`)。
- 参数默认：`mode move`、`radius 1.5`、`count` 取形状全部点、`colormode 3`(彩虹)、`sizemode 2`(fade)、`fademode 1`(inout)、`size 0.08`、`life 120`；落点默认施法者/命令方块。
- **命令参数总数上限 8**（sculpt 已占满：2 必选 + 6 可选），故 `sizemode/fademode/colormode/pos` 未开放，用默认。

### 示例
```
# move：整体平移/旋转
/colorparticle:sculpt ring "x:sin(A2,B4);z:sin(A2,B4)"          # 旋转铁环
/colorparticle:sculpt heart "y:sin(A1,B4)"                     # heart move 上下浮动
/colorparticle:sculpt helix "y:lin(A1);x:sin(A1,B2)"             # 螺旋上浮旋转
# scale：整体（径向）缩放
/colorparticle:sculpt cube "x:sin(A0.3,B3);y:sin(A0.3,B3);z:sin(A0.3,B3)" mode scale   # 立方体整体呼吸缩放
/colorparticle:sculpt sphere "y:sin(A0.4,B3)" mode scale          # 单轴压扁拉伸(椭球呼吸)
/colorparticle:sculpt heart "x:sin(A0.2,B4);z:sin(A0.2,B4)" mode scale color "255,120,180"
```
游戏内 `/colorparticle:sculpt_help` 打印语法。

> `scale` 时把"锚点向量×曲线"作为位置，形状中心不变、各点沿径向往复 → 整体放大/缩小/压扁，不散架。想只放大不缩小，动画用 `A0.5` 之类只在正侧摆动即可。