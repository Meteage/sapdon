# MC 像素贴图考试（Exam）

验证 AI 是否真正掌握了 `tools/MC_PIXEL_GUIDE.md` 的原版像素风格知识。**总分 ≥ 90 过关**。

## 流程

```
1. 学习   阅读 tools/MC_PIXEL_GUIDE.md（两套风格 / 色板表 / 配方 / 检查清单 / PS 陷阱）
2. 看题   powershell -ExecutionPolicy Bypass -File tools/exam.ps1 -List
3. 读题   powershell -ExecutionPolicy Bypass -File tools/exam.ps1 -Show <id>
4. 作答   噪声题用 make_noise_texture.ps1、形状题用 draw_textures.ps1，
         输出 16x16 PNG 到 exam/answers/<id>.png
5. 评分   powershell -ExecutionPolicy Bypass -File tools/exam.ps1 -Grade <id> [-Answer <path>]
```

## 题库（exam/questions.json）

| id | 题 | 类型 | 参考 |
|---|---|---|---|
| q1_stone | 石头 | 噪声（平滑灰低对比） | 原版 stone.png |
| q2_cobblestone | 圆石 | 噪声（粗噪高对比） | 原版 cobblestone.png |
| q3_dirt | 泥土 | 噪声（橙棕+颗粒） | 原版 dirt.png |
| q4_water | 水 | 噪声（高频细噪蓝） | 原版 water_still.png |
| q5_iron | 铁块 | 噪声（亮浅灰平滑） | 原版 iron_block.png |
| q6_redstone_lamp | 红石灯(亮) | 噪声（发光高对比） | 原版 redstone_lamp_on.png |
| q7_wrench | 扳手图标 | 形状（C形开口+手柄+三阶明暗） | res wrench.png |

## 评分维度（对照参考贴图量化）

- **色相**（权重 30）：彩色目标 = 圆形色相距离；灰色目标 = 必须灰（否则按饱和度扣）
- **饱和度**（权重 10）
- **对比度**（权重 20）：亮度范围（最亮-最暗）与参考的比值差
- **粗糙度**（权重 20）：相邻像素亮度差均值（纹理颗粒感）
- **台阶数**（权重 10）：唯一颜色数（容差式）
- **形态**（仅形状题，权重 50）：填充轮廓匹配 + 颜色接近度

硬性检查：唯一颜色 < 3 视为无效纹理，直接 0 分。

## 校准说明

`exam/answers/q1_stone.png ... q7_wrench.png` 是**标准答案**（按指南配方生成，全部 ≥90 分）。
改评分公式/生成器后必须重新校准：重跑标准答案生成命令（见下），全部应 PASS；
错误作答（改色相/纯色/空白）必须 FAIL。

```powershell
# 标准答案再生成（校准用）
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q1_stone.png -BaseColor "#7F7F7F" -Contrast 0.15 -Roughness 0.2 -Levels 4 -Seed 42
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q2_cobblestone.png -BaseColor "#6E6D6D" -Contrast 0.4 -Roughness 0.55 -Levels 6 -Seed 7
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q3_dirt.png -BaseColor "#966C4A" -Contrast 0.4 -Roughness 0.55 -Speckle 0.04 -Levels 6 -Seed 3
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q4_water.png -BaseColor "#7183FD" -Contrast 0.2 -Roughness 0.95 -Levels 8 -Seed 11
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q5_iron.png -BaseColor "#DCDCDC" -Contrast 0.25 -Roughness 0.15 -Levels 8 -Seed 5
powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out exam/answers/q6_redstone_lamp.png -BaseColor "#E6994A" -Contrast 0.7 -Roughness 0.95 -Levels 4 -Seed 9
Copy-Item res\textures\items\wrench.png exam\answers\q7_wrench.png -Force
```
