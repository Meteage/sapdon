# newColorParticle — mfx 效果速查表

本文是对 `/sapdon:mfx`（Molang 全能粒子家族）全部效果与机制的梳理。

## 入口
```
/sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
/sapdon:mfx_list      # 列出所有配方
/sapdon:particle_clear
```

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