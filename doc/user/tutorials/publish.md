# 构建与发布

从「本地能跑」到「别人能装」的最后一公里。构建模式怎么选、`.mcaddon` 怎么打、发出去之前检查什么。

> 前置：[快速入门](../quick-start.md)。字段细节见 [build.config](../config/build-config.md)、[mod.info](../config/mod-info.md)。

---

## 1. 先选构建模式

| 模式 | 什么时候用 | 做了什么 |
|------|-----------|---------|
| `dev` | 日常开发 | 跑 `main.ts` 生成 JSON、打包脚本（带 sourcemap，不压缩）、同步到游戏 |
| `prod` | 出包前 | 同上，但脚本 terser 压缩、无 sourcemap |
| `debug` | 只改 JSON 试效果 | **跳过 `main.ts`**，把现有 `dev/` 直接同步进游戏 |

⚠️ `debug` 不会重新生成任何东西。`main.ts` 改了却用 `debug`，看到的一定是旧产物。

```bash
# 在项目目录下，一次性构建、不启动热更新
sapdon compile
```

日常开发用 `sapdon build .`（会启动 HMR，改文件自动重建）。**出包前必须用 `compile` 或把
`buildMode` 改成 `prod` 再构建一次**，否则打进 `.mcaddon` 的是带 sourcemap 的开发版。

---

## 2. 打包成 .mcaddon

```bash
cd my_addon
sapdon compile     # 先构建
sapdon pack        # 再打包
```

输出：`dev/<项目名>.mcaddon`。

`pack` 做的事很简单：把 `dev/<项目名>_BP` 和 `dev/<项目名>_RP` 两个目录按原结构 zip 起来。
所以有两个前提：

- **必须在项目目录下执行**，项目名取自当前目录名
- `dev/` 里两个包必须已经存在，`pack` 不会替你构建

产物结构：

```
my_addon.mcaddon (zip)
├── my_addon_BP/
│   ├── manifest.json
│   ├── items/ blocks/ entities/ recipes/
│   └── scripts/index.js
└── my_addon_RP/
    ├── manifest.json
    ├── textures/
    └── entity/ models/ sounds/
```

> `.mcaddon` 不要改名成 `.zip` 再解压后单独安装 —— 双包靠 manifest 里的 `dependencies` 交叉绑定，
> 拆开装容易只装到一半。

---

## 3. 发出去之前的检查清单

### 3.1 UUID 必须是这一份自己的

首次构建时框架会往 `mod.info` **写回** `bp` / `rp` 两个 UUID：

```json
{
  "name": "my_addon",
  "authors": ["YourName"],
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "description": "我的模组",
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

**拷贝别人的项目、或复制一份自己改的时候，必须删掉这两行让它重新生成。**
Minecraft 按 `header.uuid` 认包、不看文件夹名：两个包 UUID 相同 = 引擎眼里是同一个包，
表现为脚本互相抢组件注册、方块 tick 时报 `TypeError: not a function`，而且**不报错、不提示**。

改完 `mod.info` 要**删掉 `dev/*/manifest.json` 再构建**，否则框架复用旧 manifest，等于白改。

### 3.2 版本号与最低引擎版本

- `version` 必须是三段数字 `major.minor.patch`，会直接写进 manifest
- `min_engine_version` 决定谁能装：写高了低版本玩家直接看不到包
- `versionType`（`release` / `beta`）决定构建同步到哪个游戏目录，**与玩家能否安装无关**

### 3.3 依赖版本

`build.config` 的 `dependencies` 会被写进 `manifest.json`，且 **manifest 只在文件不存在时才生成**。
改完依赖先删 `dev/<name>_BP/manifest.json`。

依赖版本写得太新，玩家的游戏版本对不上时脚本整份不加载（游戏里表现为「包装了但什么都没发生」）。

### 3.4 产物抽查

打完包至少确认三件事：

```bash
# 1. 两个包都在
ls dev/my_addon_BP dev/my_addon_RP

# 2. 脚本确实被打进去了、且是压缩后的
ls -lh dev/my_addon_BP/scripts/index.js

# 3. 打开一个生成的 JSON 看关键字段（别只看「构建成功」）
cat dev/my_addon_BP/items/my_ingot.json
```

构建成功 ≠ 产物正确。真实事故里最常见的两种是：`dev/` 里全是上一次的旧文件、方块因为贴图缺失被整份丢弃。

---

## 4. 分发方式

| 方式 | 做法 |
|------|------|
| 直接发给玩家 | 发 `.mcaddon`，双击导入 |
| 发布到市场 | 需要额外走 Microsoft 的合作伙伴流程，与 sapdon 无关 |
| 自己多端同步 | 直接把 `dev/<name>_BP`、`_RP` 拷进游戏的 `development_behavior_packs` / `development_resource_packs` |

导入后如果创造菜单里没有内容：先确认**两个包都启用**了，再看脚本是否报错（内容日志）。

---

## 5. 常见问题

| 现象 | 原因 |
|------|------|
| `dev/` 里没有 `.mcaddon` | 没先 `compile`，或当前目录不是项目根 |
| 打出来的包游戏里不生效 | `buildMode` 还是 `debug`，产物是旧的 |
| 玩家装了但没反应 | 依赖模块版本高于玩家游戏版本，脚本整份不加载 |
| 两个不同的包互相干扰 | UUID 撞了，见 3.1 |
| 打包体积异常大 | 用了 `dev` 模式（带 sourcemap），换 `prod` 重新构建 |

---

## 下一步

- [build.config 参考](../config/build-config.md) — 全部字段
- [mod.info 参考](../config/mod-info.md) — 元数据与 UUID
- [FAQ](../faq.md) §3–§5 — 构建输出、产物不更新、同步路径
