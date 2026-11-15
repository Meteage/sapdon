# 发布清单（4.x，多包）

发布顺序固定为：**utils → ui → core → runtime → 根包 `sapdon`**。
根包 `package.json` 的 `dependencies` 指向这四个包；子包没上架前发根包，用户安装会解析失败。

---

## 0. 前置检查

```bash
npm whoami                 # 应为 meteage
npm org ls sapdon          # 能列出成员 = 有 @sapdon scope 的发布权限
```

- `npm org ls sapdon` 返回 **404** → 组织不存在：先在 npmjs.com 创建 `sapdon` org，把自己加为 owner；
- 返回 **403** → token 没有 org 权限：换一个对 `@sapdon/*` 有 read+write 的 token，或直接 `npm login`；
- 返回成员列表 → 可以发布。

> 当前 `~/.npmrc` 里的 token 能通过 `npm whoami`，但读取 org/profile 返回 403，说明它可能是**限包粒度的 token**。
> 发布前请确认它对 `@sapdon/*` 有写权限，否则第一步 `npm publish @sapdon/utils` 就会失败。

## 1. 构建 + 自检

```bash
npm run build
npm run pub:packages:dry
```

dry-run 应该看到 4 个包：

| 包 | 版本 | 约体积 |
|---|---|---|
| `@sapdon/utils` | 4.0.0 | 9.7 kB |
| `@sapdon/ui` | 4.0.0 | 41.4 kB |
| `@sapdon/core` | 4.0.0 | 162.9 kB |
| `@sapdon/runtime` | 4.0.0 | 31.9 kB |

每个包只应包含 `index.js` / `index.d.ts` / `package.json` 三个文件。

## 2. 发布子包

```bash
npm run pub:packages
# 需要 2FA 时带验证码（已发布的包会自动跳过，OTP 过期可直接重跑）：
npm run pub:packages -- --otp=123456
```

会按 `packages.json` 的顺序执行 `npm publish --access public`；`--dry-run` 现在用 `npm pack --dry-run`，
只看 tarball，不会因为版本已存在而报错。

## 3. 发布根包

```bash
npm run pub
```

等价于 `npm run build && npm publish`。根包会带上 `prod/**`（含 `prod/cli` 与 `prod/templates`），
并把四个子包声明为依赖。

## 4. 发布后验证

```bash
npm view @sapdon/utils version    # 4.0.0
npm view @sapdon/ui version       # 4.0.0
npm view @sapdon/core version     # 4.0.0
npm view @sapdon/runtime version  # 4.0.0
npm view sapdon version           # 4.0.0
npm view sapdon dependencies      # 四个 @sapdon/* 都应是 4.0.0
```

再做一次真实安装冒烟（临时目录）：

```bash
mkdir /tmp/sapdon-smoke && cd /tmp/sapdon-smoke
npm init -y
npm i -D sapdon@4.0.0
node -e "import('@sapdon/core').then(m=>console.log(typeof m.ItemAPI))"
node -e "import('@sapdon/ui').then(m=>console.log(typeof m.SapdonFormUI))"
```

## 5. 收尾

- 确认 git tag `v4.0.0` 指向发布提交；
- 若有改动，重新 `npm run build` 后再发（`prod/` 不随源码自动更新）；
- 72 小时内可 `npm unpublish <pkg>@4.0.0` 撤回（超过后只能发新版本）。

---

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| `E404` / `Scope not found` | `@sapdon` org 不存在 | 创建 org + 加 owner |
| `E403` | token 对 scope 无写权限 | 换 token / `npm login` |
| `EOTP` | 账号开启 2FA | 输入 OTP，或用 Automation/Bypass 2FA token |
| 根包安装后找不到 core | 子包未先发布 | 按顺序重发 |
| `构建协议不匹配` | 项目 core 与 CLI 版本不一致 | 同步升级到同一版本 |

### 为什么 scoped 包失败是 404 而不是 403

npm 对 `@scope/name` 在**scope 不存在**或**当前 token 没有该 scope 的写权限**时统一返回 `404 Not Found - PUT ...`，
不能用 403 来区分。看到 `@sapdon/utils@4.0.0 could not be found or you do not have permission` 时，按下面顺序排查：

1. 浏览器打开 `https://www.npmjs.com/org/sapdon`：
   - 是你能管理的组织 → 进第 2 步；
   - 提示不存在 → 打开 `https://www.npmjs.com/org/create` 创建 `sapdon`（公开包免费）；
   - 是别人的组织 → 不能发 `@sapdon/*`，需要换 scope（会牵涉改名，先停下来确认）。
2. `npm login` 后跑 `npm org ls sapdon`：能列出成员才算有权限。
3. 检查 token：npmjs.com → Access Tokens → 该 token 的 **Packages and scopes** 必须包含 `@sapdon`，
   权限为 **Read and write**；只授权了 `sapdon` 这个无 scope 包的 token 发不了 `@sapdon/*`。
4. 重新跑 `npm run pub:packages`。

`publish-packages.cjs` 在第一个包失败时就会停止，不会出现「utils 发出去了、core 没发」的半成品状态。
