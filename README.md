# BewlyCat / BewlyBewly for Safari · B站（bilibili）美化扩展 Safari 版

在 macOS 的 **Safari** 上使用 **BewlyBewly / BewlyCat**：一个哔哩哔哩（bilibili，B站）网页美化与增强扩展，重新设计首页、顶栏、播放页、动态、收藏、历史等页面，支持深色模式和 Dock 栏。

本仓库是**非官方的 Safari 适配版**，与哔哩哔哩无关。扩展的功能来自 BewlyBewly 和 BewlyCat 的作者与贡献者，Safari 适配主要来自 IgnatAi401。详见下方「来源」。

<p align="center"><img width="200" alt="BewlyCat icon" src="./assets/icon-512.png"></p>

## 来源

本项目是以下项目的下游，代码与提交历史完整保留：

| 项目 | 说明 |
| --- | --- |
| [BewlyBewly/BewlyBewly](https://github.com/BewlyBewly/BewlyBewly)（hakadao） | 原始项目，MIT 许可。2025 年 2 月发布 v0.41.1 后存档，不再维护。 |
| [keleus/BewlyCat](https://github.com/keleus/BewlyCat) | 基于 BewlyBewly 持续维护的版本（Chrome / Edge / Firefox），本仓库的功能代码来自这里。功能介绍见其 [README](https://github.com/keleus/BewlyCat#readme)。 |
| [IgnatAi401/BewlyCat-Safari](https://github.com/IgnatAi401/BewlyCat-Safari) | BewlyCat 的 Safari 适配与性能优化（请求头规则、登录检测、样式、图片加载等），本仓库基于它的 `safari` 分支。改动见 [CHANGELOG-safari.md](CHANGELOG-safari.md)。 |
| [Jingyuan-Zheng/BewlyBewly_Safari](https://github.com/Jingyuan-Zheng/BewlyBewly_Safari) | 本仓库 fork 自此。它提供 Safari 版 BewlyBewly v0.41.1 的安装包，`main` 分支保留了那份代码。 |

当前版本：BewlyCat **v1.8.1**（Safari 修订号 `1.8.1.1`）。

## 本仓库的改动

- **修复 Safari 中显示未登录**：之前 BewlyCat 顶栏显示「登录」，收藏、历史、动态都是空的，而 B 站原页面正常。原因是 Safari 扩展后台发出的请求不带网页上的 B 站登录 Cookie。现在 Safari 版改在 B 站页面内发出这些请求（[`src/safari/pageRequest.ts`](src/safari/pageRequest.ts)），每个 Safari 用户场景（Profile）使用各自的登录状态。
- **长期安装**：`make ship` 用免费 Apple ID 的开发证书签名，安装为 `/Applications/BewlyCat.app`。重启 Safari 后扩展依然保留，不需要每次勾选「允许未签名的扩展」或重新添加临时扩展。

## 安装（从源码构建）

需要：macOS、Safari 18.4 或更高版本（已在 Safari 27 测试）、Xcode、Node.js、[pnpm](https://pnpm.io)，以及一个 Apple ID（免费即可）。

1. **创建开发证书（只需一次）**：打开 Xcode → 设置 → Apple Accounts，登录 Apple ID；点 **Personal Team** → **Manage Certificates…** → 左下角 **+** → **Apple Development**。
2. **构建并安装**（把 `com.yourname.BewlyCat` 换成你自己的标识）：

   ```bash
   git clone https://github.com/Misakakioo/BewlyBewly_Safari.git
   cd BewlyBewly_Safari
   pnpm install
   make ship BUNDLE_ID=com.yourname.BewlyCat
   ```

3. **在 Safari 中启用**：Safari → 设置 → 扩展，勾选 **BewlyCat**；点「编辑网站…」允许 `bilibili.com` 和 `hdslb.com`。如果使用多个用户场景，在「管理用户场景…」中逐个启用。
4. **重启 Safari**，打开 [bilibili.com](https://www.bilibili.com/)。

### 更新

```bash
git pull
make ship BUNDLE_ID=com.yourname.BewlyCat
```

然后重启 Safari：Safari 会一直使用启动时加载的版本。

扩展内的「新版本」提示检查本仓库的 [Releases](https://github.com/Misakakioo/BewlyBewly_Safari/releases)（目前还没有发布 Release，所以不会提示）。

### 不用 Xcode 的临时方式

运行 `pnpm install && pnpm build-safari`，然后在 Safari → 设置 → 开发者 中勾选「允许未签名的扩展」，点「添加临时扩展…」，选择 `extension-safari` 文件夹（里面有 `manifest.json`）。临时扩展在 Safari 退出后会被移除，需要重新添加。

## 已知问题

- iframe 内的页面保持 B 站原样式，视频卡片「在抽屉中打开」和通知抽屉不可用（Safari 版不向 iframe 注入脚本）。
- Safari 版的问题请不要反馈到 BewlyCat 上游。

## 许可

- BewlyBewly 使用 MIT 许可；BewlyCat 在 MIT 基础上附加了限制：**禁止将本扩展封装、转换或打包为独立客户端、桌面应用或移动应用并发布或分发**。完整条款见 [LICENSE](LICENSE)。
- Safari 只能通过一个 macOS 容器 App 加载扩展，`make ship` 生成的 App 只用于在你自己的 Mac 上加载扩展。**请勿把它作为客户端分发，也不要上架 App Store。**

---

## English

**BewlyCat / BewlyBewly for Safari** – a bilibili (哔哩哔哩) website redesign extension for Safari on macOS. This is an unofficial Safari build, not affiliated with bilibili.

- **Origin:** [BewlyBewly](https://github.com/BewlyBewly/BewlyBewly) (original, archived Feb 2025) → [keleus/BewlyCat](https://github.com/keleus/BewlyCat) (maintained successor, source of all features) → [IgnatAi401/BewlyCat-Safari](https://github.com/IgnatAi401/BewlyCat-Safari) (Safari adaptation) → this repo, forked from [Jingyuan-Zheng/BewlyBewly_Safari](https://github.com/Jingyuan-Zheng/BewlyBewly_Safari).
- **What this repo adds:** a fix for BewlyCat showing you as logged out in Safari (Safari's extension background requests don't carry bilibili's login cookies, so requests are now made from the page), and `make ship`, which signs the Safari container app with a free Apple Development certificate so the extension survives Safari restarts.
- **Install:** create an Apple Development certificate in Xcode (Settings → Apple Accounts → Personal Team → Manage Certificates → + → Apple Development), then run `pnpm install && make ship BUNDLE_ID=com.yourname.BewlyCat`, enable BewlyCat in Safari → Settings → Extensions, allow `bilibili.com` and `hdslb.com`, and restart Safari.
- **License:** MIT (BewlyBewly) plus BewlyCat's additional terms: do not package or distribute it as a standalone client or app. The container app built here is only for loading the extension in your own Safari; don't distribute it or publish it to the App Store.
