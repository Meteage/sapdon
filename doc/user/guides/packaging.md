# 把模组打成 .mcaddon 发给别人

目标：手上有一个双击就能导入的 `.mcaddon`，别人装完能玩，不会和你别的包撞车。

判断成了没有：`dev/<目录名>.mcaddon` 存在，解压后能看到 `_BP` 和 `_RP` 两个目录，装进游戏后包里内容都在。

## 1. 先决定用哪种构建

`sapdon build` 和 `sapdon compile` 的差别只有一个：前者构建完会启动 HMR，继续监听文件改动；后者构建一次就退出。

日常开发用 `build`：

```bash
cd my_addon
sapdon build .
```

出包前用 `compile`，并且把 `build.config` 里的 `buildOptions.buildMode` 改成 `prod`：

```json
{
  "formatVersion": 2,
  "buildOptions": {
    "buildMode": "prod"
  }
}
```

三档的行为：

| 值 | 做了什么 |
|---|---|
| `dev` | 跑 `main.ts` 生成 JSON，脚本打包带 sourcemap，不压缩 |
| `prod` | 同上，脚本用 terser 压缩，不带 sourcemap |
| `debug` | 跳过 `main.ts`，把现有 `dev/` 直接同步进游戏 |

`debug` 不会重新生成任何东西。改了 `main.ts` 却用 `debug` 构建，看到的必然是上一次的产物。

```bash
cd my_addon
sapdon compile
```

## 2. 打包

```bash
sapdon pack
```

输出在 `dev/<当前目录名>.mcaddon`。这个命令做的事很简单：把 `dev/<当前目录名>_BP` 和 `dev/<当前目录名>_RP` 按原结构压成一个 zip。所以它有两个前提：当前目录必须是项目根，`dev/` 里两个包必须已经存在。`pack` 不会替你构建。

包名取自当前目录名，不是 `mod.info` 里的 `name`。目录改过名，产物名跟着变。

## 3. 发出去之前，检查四件事

### UUID 是自己这一份的

首次构建时框架会往 `mod.info` 写回 `bp`、`rp` 两个 UUID：

```json
{
  "name": "my_addon",
  "version": "1.0.0",
  "min_engine_version": "1.19.50",
  "bp": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rp": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

拷贝别人的项目、或者复制一份自己改的时候，把这两行删掉重新构建。Minecraft 按 manifest 里的 `header.uuid` 认包，两个包 UUID 相同，引擎就当它们是同一个包：脚本会互相顶掉组件注册，方块 tick 时报 `TypeError: not a function`，而且没有任何提示。

改完 `mod.info` 要删掉 `dev/*/manifest.json` 再构建，否则框架复用旧 manifest。

### 版本号与最低引擎版本

`version` 必须是 `major.minor.patch` 三段数字，会原样写进 manifest。`min_engine_version` 决定谁能装，写高了低版本玩家在列表里根本看不到包。

`versionType` 是 `release` 还是 `beta`，只影响同步到哪个游戏目录，和玩家能不能装无关。

### 依赖版本

`buildOptions.dependencies` 会写进 `manifest.json`，而这个文件只在不存在时生成。改完依赖，先删 `dev/<项目名>_BP/manifest.json`。

依赖版本写得比玩家的游戏版本高，脚本会整份不加载。游戏里看起来就是包装上了，什么都没发生。

### 产物本身

构建成功不等于产物正确。打完包至少看三个地方：

```bash
ls dev/my_addon_BP dev/my_addon_RP        # 两个包都在
ls -lh dev/my_addon_BP/scripts/index.js   # 脚本打进去了，prod 模式下体积明显变小
cat dev/my_addon_BP/items/my_ingot.json   # 打开一个产物看关键字段
```

真实事故里最常见的是两种：`dev/` 里混着上一次的旧文件，和方块因为贴图缺失被整份丢掉。

## 4. 分发

直接发 `.mcaddon` 给对方，双击导入即可。别把 `.mcaddon` 改名成 `.zip` 拆开单独装，两个包靠 manifest 的 dependencies 交叉绑定，拆开容易只装到一半。

自己多端同步，也可以直接把 `dev/<项目名>_BP`、`dev/<项目名>_RP` 拷进游戏的 `development_behavior_packs`、`development_resource_packs`。

导入后创造菜单里没有内容，先确认两个包都启用了，再看内容日志里脚本有没有报错。

## 5. 出问题了

| 现象 | 原因 |
|---|---|
| `dev/` 里没有 `.mcaddon` | 没先 `compile`，或者当前目录不是项目根 |
| 打出来的包装进游戏不生效 | `buildMode` 还是 `debug`，产物是旧的 |
| 别人装了没反应 | 依赖模块版本高于对方的游戏版本，脚本没加载 |
| 两个不同的包互相干扰 | UUID 撞了，见上一节 |
| 包体积异常大 | 用 `dev` 模式构建的，带 sourcemap，换 `prod` 重来 |

## 相关

字段含义见 [build.config](../config/build-config.md) 和 [mod.info](../config/mod-info.md)。构建报成功但产物没更新，见 [FAQ](../faq.md) §4。
