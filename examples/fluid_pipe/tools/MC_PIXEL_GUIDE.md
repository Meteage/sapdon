# MC 像素贴图速成指南（Agent 版）

本指南教 Agent 快速画出**原版 Minecraft 质感**的 16x16 像素贴图，无需看到图片。
数据来源：实测 bedrock-samples 1.21.130 原版资源包（`view_texture.ps1 -Palette` 分析调色板）。

---

## 1. 两套风格：方块面 ≠ 物品图标

| | 方块面（block face） | 物品图标（item icon） |
|---|---|---|
| 背景 | **不透明** | 透明 |
| 描边 | **无描边**（靠噪声明暗和世界光照定型） | **深色描边**（~#181818） |
| 光照 | 无方向性，靠环境光遮蔽（face_dimming） | **左上光源**（顶部/左侧高光） |
| 明暗结构 | 同一色相 3~8 级亮度噪声 | 每部件 3~4 级明暗（高光/主体/阴影） |
| 代表 | stone/cobblestone/dirt/iron_block | iron_pickaxe 的镐头+木柄 |

> 反例教训：我们把泵/罐/阀画成了"物品图标风"（描边+平涂），放到方块面上显得突兀；方块面应是无描边噪声纹理。

## 2. 原版实测调色板（照抄这些色相与跨度）

| 材质 | 色板（十六进制，实测） | 特点 |
|---|---|---|
| stone | #686868 #747474 #7F7F7F #8F8F8F | 4 级，跨度仅 ~14%，低频平滑 |
| cobblestone | #525252 #616161 #6E6D6D #888788 #A6A6A6 #B5B5B5 | 6 级，跨度 ~3.5x，粗噪+缝隙 |
| dirt | #593D29 #745844 #79553A #966C4A #B9855C | 4 级，橙棕同色相，掺灰石子噪点 |
| planks_oak | #67502C #7E6237 #967441 #9F844D #AF8F55 #B8945F #C29D62 | 7 级，同色相渐进 |
| iron_block | #B1B0B0 ~ #F2F2F2 | 11 级，很亮、低对比、平滑（金属） |
| glass 边框 | #7BAEB7 #8BC1CD #A8D0D9 #D0EAE9 | 青白调 4 级，其余透明 |
| water | #7081FD ~ #89B4FD（50+ 级） | 高饱和蓝，**高频细噪**（cell≈1） |
| redstone_lamp_on | #3B2015 #946931 #E6994A #F6DAB4 | 4 级高对比（发光） |

**风格铁律**：
1. **同一色相**——一个材质只用一条色相，只变明度（饱和度基本固定）
2. **无描边**（方块面）；**无平滑渐变**——明暗量化成 3~8 个明确台阶
3. **噪声而非图案**——每像素随机明暗抖动；粗糙材质（cobble/dirt）噪声粗+跨度大，平滑材质（iron/stone）噪声细+跨度小，水=高频细噪
4. 饱和度低~中（水除外）；发光物可高对比
5. 16x16、硬像素过渡，不做抗锯齿

## 3. 快速生成法（推荐）：`tools/make_noise_texture.ps1`

按配方参数程序化生成原版质感噪声纹理，免手绘：

```
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 `
  -Out res/textures/blocks/my_block.png `
  -BaseColor "#966C4A" -Contrast 0.45 -Roughness 0.55 -Speckle 0.04 -Seed 3
```

| 参数 | 含义 | 参考配方 |
|---|---|---|
| `-BaseColor` | 材质主色（中亮度） | 见 §2 表 |
| `-Contrast` | **明度跨度**（生成结果的最亮-最暗范围，直接对应原版实测 range） | stone 0.15 / cobble 0.4 / dirt 0.4 / iron 0.25 / water 0.2 / lamp 0.7 |
| `-Roughness` | 噪声频率 0~1（越大约细碎） | stone 0.2 / cobble 0.55 / dirt 0.55 / iron 0.15 / water 0.95 / lamp 0.95 |
| `-Levels` | **跨度内的明暗台阶数**（低对比材质也能出 N 个台阶） | stone 4 / cobble 6 / dirt 6 / iron 8 / water 8 / lamp 4 |
| `-Speckle` | 零星亮/暗点比例 | dirt 0.03（碎石/颗粒感） |
| `-Seed` | 随机种子（同种子同结果） | 任意整数 |

验证流程：生成 → `view_texture.ps1 <png> -Palette` 看色板是否同色相、跨度是否符合预期 → 调整参数。

## 4. 手绘法（需要形状时）：`tools/draw_textures.ps1`

设备图标/符号类（泵、阀门、扳手）用"调色板 + 16x16 ASCII 地图"手绘（脚本自带行宽校验）。要点：
- 剪影先行：深描边 `a` + 主体 `b` + 左上高光 `c` + 右下阴影 `d`（物品图标风）
- 参考真实形状语义：扳手=C 形开口环+渐细手柄；阀门=手轮阀体（中性）+ 顶面白箭头（单阀/三通统一用 v3t_* 单箭头贴图，白标于噪声板底，与泵 input/output 符号同风格）
- 状态差异靠色相/亮度表达（关=灰、开=青/红），形状共用

## 4b. 参考 emoji 矢量图标（Agent 的"眼睛"看图标）：`tools/icon_ref.mjs`

想知道某个物品长什么样？emoji 图标本身就是它的矢量符号，SVG 是**文本**，可以下载并光栅化成像素图再查看：

```
node tools/icon_ref.mjs 1f527 -s 64 -o E:/Temp/opencode/wrench_ref.png   # 🔧（U+1F527）
node tools/icon_ref.mjs "🔧" -s 16                                        # 直接传 emoji 字符，16x16 块级版
powershell -ExecutionPolicy Bypass -File tools/view_texture.ps1 <png>     # 用 ASCII 查看器"看"它
```

- 数据源：Twemoji CDN（`cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/<hex>.svg`），无依赖。
- 实现：SVG path 解析（M/L/H/V/C/S/Q/T + 相对坐标 + Z）→ 贝塞尔压平 → 扫描线 even-odd 填充 → 纯 Node PNG 编码（zlib+CRC）→ 盒式降采样；`-stylize` 对剪影做**选择性描边**（外描边 + 左上内缘高光 + 右下内缘阴影，从基色派生四色调）。
- **手绘工作流**（推荐，AI 手绘而非直接使用生成图）：
  1. `node tools/icon_ref.mjs 1f527 -s 16 -o ref.png` 取 emoji 剪影
  2. 用脚本把剪影转成角色字母网格（`a`=描边 `b`=基色 `c`=高光 `d`=阴影）——例：PowerShell 读像素，按色值映射输出 16 行字母串
  3. 把字母网格写进 `draw_textures.ps1` 的 ASCII 地图（这就是"AI 手绘"），调色板取 MC 金属四色
  4. `draw_textures.ps1` 生成 → 与参考逐行对比填充（0 差异即对齐）
- 例：🔧 扳手已按此法手绘（大 C 形环头开口朝左上 + 右下 45° 柄，16/16 行与剪影一致）。

## 5. 检查清单（画完自查）

- [ ] 背景不透明（方块面）or 透明（物品图标）？
- [ ] 色板是否单一色相族？（`-Palette` 输出应同 H 值 ±15°）
- [ ] 明暗是否 3~8 个明确台阶、无平滑渐变？
- [ ] 跨度是否符合材质（粗糙 3x+ / 平滑 <1.5x / 发光 4x）？
- [ ] 无描边（方块面）？有描边+左上高光（图标）？
- [ ] 与同材质的原版贴图对比：色板是否接近（可 `view_texture.ps1 原版路径 -Palette` 对照）？
- [ ] `npm run build` 后 dev/ 产物贴图已同步？

## 6. PowerShell 陷阱（写生成脚本必读）

- **`[Math]::Min/Max` 混传 int/double 会被绑定到 Int64 重载并截断**：`[Math]::Min(1, 0.5)` 返回 0 而非 0.5！clamp 用比较：`if ($x -gt 1) { $x = 1 } elseif ($x -lt 0) { $x = 0 }`
- `.ps1` 无 BOM 按 ANSI 解析：注释必须纯 ASCII；`param()` 必须是首条语句
- 长表达式拆步计算（`$t = $l * $Levels; $f = [Math]::Floor($t); $band = $f / $Levels`），避免单行复合表达式的解析怪癖
- 命令必须带 workdir（相对路径依赖 cwd）
- 字符串插值 `$var:` 会被当驱动器引用，用 `${var}:` 或 `-f` 格式化
- 调色板分析用 `view_texture.ps1 -Palette`，输出格式 `#RRGGBB alpha=NN x数量`（排序后第一个=主色）
