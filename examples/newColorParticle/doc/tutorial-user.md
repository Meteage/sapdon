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

> 当前版本已移除旧演示物品（它们依赖旧的脚本轨迹管线）。触发统一用指令 `/sapdon:mfx`。

---

## 3. 方式二：用指令触发

| 指令 | 作用 |
|------|------|
| `/sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]` | 播放一个 mfx 配方 |
| `/sapdon:mfx_list` | 列出全部 mfx 配方 |

示例：
```
/sapdon:mfx ring          # 旋转光环
/sapdon:mfx cubebreathe   # 呼吸立方（棱线径向往返）
/sapdon:mfx sine          # 单粒子沿 X 轴往返
/sapdon:mfx uni_spiral    # 螺旋上升（全能表达式）
/sapdon:mfx uni_lissajous # 利萨如
/sapdon:mfx starfield     # 星空爆发
/sapdon:mfx_list          # 查看全部配方
```

---

## 4. mfx 参数详解

```
/sapdon:mfx <preset> [radius] [turns] [life] [count] [color] [pos]
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `preset` | 枚举（必填） | — | 配方名（`/sapdon:mfx_list` 查看） |
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
/sapdon:mfx cubebreathe life 400

# 螺旋上升调半径与圈数
/sapdon:mfx uni_spiral radius 3 life 200

# 输出全部配方
/sapdon:mfx_list
```

完整配方表、五种模型（universal / cubebreath / dynamic / stream / shape_* / sine / uni）与一键进制，见 `doc/mfx-cheatsheet.md`。