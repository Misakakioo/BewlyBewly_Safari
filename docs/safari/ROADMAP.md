# BewlyCat-Safari 维护路线图

本仓库是 [keleus/BewlyCat](https://github.com/keleus/BewlyCat) 的非官方 Safari 适配版，面向自己和其他 Safari 用户。**以构建产物分发**：每个版本发布 GitHub Release 并附上构建好的扩展压缩包（不做 App），用户下载解压后作为 Safari 临时扩展加载，无需安装依赖或编译；构建产物不提交进 Git。扩展内置新版本提示。

## 1. 仓库与分支

| 名称 | 作用 | 规则 |
| --- | --- | --- |
| `origin` | `IgnatAi401/BewlyCat-Safari`，本仓库 | 可推送 |
| `upstream` | `keleus/BewlyCat`，上游 | 只拉取，不推送 |
| `main` | 上游 `main` 的镜像 | 只用 GitHub「Sync fork」或 `git merge --ff-only upstream/main` 更新，不在其上提交 |
| `safari` | Safari 版开发分支，设为 GitHub 默认分支，用户拉取的就是它 | 只追加提交，**禁止 rebase 和强制推送**；开启分支保护 |
| 功能分支 | `feat/xxx`、`fix/xxx`，从 `safari` 拉出 | 完成并实测后合并回 `safari` |

`safari` 分支的最新提交应始终可构建、可用；未测完的改动留在功能分支。

旧仓库 `IgnatAi401/BewlyCat-Safari-Local`（把构建产物提交在仓库里）在本仓库首个 Release 实测通过后归档，简介注明迁移到本仓库。

## 2. 只用本仓库的 Agent 指导文档

- `AGENTS.md`、`CLAUDE.md` 是本仓库自有版本。`.gitattributes` 中设为 `merge=ours`，合并上游时自动保留我们的版本（已实测）。
- `merge=ours` 依赖本地 Git 配置，**每次新克隆后执行一次**：`git config merge.ours.driver true`。没配置时上游改动这两个文件会产生冲突，此时用 `git checkout --ours AGENTS.md CLAUDE.md` 解决。
- 上游的 `docs/agent-*.md`、`docs/CONTRIBUTING*.md` 等文件保留不删（删除会在上游每次修改时产生冲突），由 `AGENTS.md` 声明不作为本仓库规则。

## 3. 代码组织

- Safari 专属逻辑集中放在 `src/safari/`（新文件，上游不会改动，几乎不产生冲突）。
- 上游文件中只保留最少的接入点，并用 `__SAFARI__` 包裹，例如 `if (__SAFARI__) applySafariSettingsFixes(record)`；接入点放在函数开头或结尾，不穿插在上游逻辑中间。
- 上游大文件（尤其 `src/inject/index.ts`、`src/logic/storage.ts`）不直接改写原有逻辑；确需改动时在下方清单登记。
- Safari 专属资源放在 `assets/` 下并以 `-safari` 结尾，如 `assets/rules-safari.json`。
- 查看 Safari 版相对上游的全部改动：`git diff <上游标签> safari`。

### 接入点清单

每个改动了上游文件的位置都登记在此，同步上游出现冲突时按此表核对。

| 上游文件 | 位置 | 用途 |
| --- | --- | --- |
| `.gitattributes` | 末尾 | `AGENTS.md`、`CLAUDE.md`、`README.md` 使用 `merge=ours` |
| `README.md` | 全文 | 改写为 Safari 版说明（`merge=ours`，上游 README 改动不合入） |
| `vite.config.ts` | `replace()` | 定义 `__SAFARI__`（内容脚本、页面脚本） |
| `vite.config.content.ts` | `css` 选项 | `scopeSafariHostSelectors()`：Safari 把清单注入的 `style.css` 也应用到页面所有 Shadow DOM，将通用 `:host` 限定为 `:host(#bewly)` |
| `tsup.config.ts` | `define` | 定义 `__SAFARI__`（后台） |
| `src/global.d.ts` | 顶部 | 声明 `__SAFARI__` |
| `src/manifest.ts` | `getManifest()` 末尾 | `applySafariManifest()`：版本号、注入范围、权限、规则集、最低 Safari 18.4 |
| `src/logic/storage.ts` | `settings` 的 `normalize` 末尾 | `applySafariSettingsFixes()`：关闭抽屉打开方式、通知抽屉与依赖 iframe 脚本的沉浸式模式 |
| `src/composables/useDark.ts` | `syncBilibiliTheme()` 末尾 | 主题切换转交页面脚本 |
| `src/inject/index.ts` | `COMMENT_SHADOW_STYLE_PATCHES` 末尾、`bili-comment-user-info` 更新回调开头、`message` 监听之前 | 评论区主题色样式（用户名样式单独注入，不进通用样式表，以免跳过性别/楼主/IP 属地处理）；注册 Safari 消息桥（派发 `global.themeChange`）；`deferSafariHiddenHomepageFeed()`：BewlyCat 首页接管期间暂缓被隐藏的原首页的信息流请求（原首页会连续加载 10 页推荐），切回原版首页时再发出；`updateCommentReplyTree()` 之前新增 `updateCommentReplyTreeAfterRender()`，评论组件增强回调中的 3 处调用改用它：`coalesceSafariCommentReplyTreeUpdate()` 把同一楼层同帧的重复重算合并到下一帧；`updateCommentReplyTree()` 开头 `noteSafariCommentReplyTreeUpdate()` 记录本帧已重算；`observeCommentReplyTreeLayout()` 的 ResizeObserver 回调中，本帧已重算过的楼层不再安排重算（尺寸变化来自重算自身写入的缩进） |
| `src/background/index.ts` | 末尾；`syncPreventMobileRedirectRule()` 的 `updateDynamicRules` 参数 | `setupSafariUpdateCheck()`；`adaptSafariRuleUpdate()` 改写规则 |
| `src/background/utils.ts` | `doCachedRequest()` 中 `accountId` 赋值一行 | Safari 在页面内执行请求，没有 `cookies` API：缓存键取页面上的 `DedeUserID` |
| `src/background/appClient.ts` | `syncAppClientHeaderRules()` 的 `updateSessionRules` 参数 | `adaptSafariRuleUpdate()`：Safari 不支持正则 `\|` 和 `sec-ch-ua*` 请求头 |
| `src/background/loginStateWatcher.ts` | `setupLoginStateWatcher()` 开头 | `setupSafariLoginStateWatcher()`：Safari 的 `cookies.onChanged` 不带 changeInfo，后台也看不到 B 站 Cookie；节流后通知各标签页，由标签页按页面 Cookie 自行校正 |
| `src/contentScripts/index.ts` | `onDOMLoaded()` 末尾 | `stopSafariLiveBadgeAnimation()`：动态页「正在直播」角标的逐帧动画停在第一帧（该动画让空闲 CPU 多占约 14 个百分点）；`hideSafariPageScrollbar()`：隐藏播放页等页面的文档滚动条，避免「始终显示滚动条」时把界面往左挤；`mountSafariUpdateBanner()` |
| `src/components/Settings/About/About.vue` | `about-maintenance` 开头；`checkGitHubRelease()` 开头；「浏览器云同步」「版本提醒」设置组与链接/贡献者卡片的 `v-if`；版本号链接 `href` | 「BewlyCat Safari」设置组（检查更新开关、立即检查）；不检查上游 Release（不显示 NEW 标记）；隐藏上游「新版本提醒」开关、依赖 Chrome 账号的「浏览器云同步」、上游 GitHub/作者主页/贡献者链接；版本号改链到本仓库 Releases |
| `src/components/Settings/PluginComponentsAndPages/Home/Home.vue` | 「沉浸式模式」设置组的 `v-if` | 隐藏 Safari 不支持的沉浸式模式设置 |
| `src/components/Settings/searchCatalog.ts` | 「首页」「关于」条目列表 | 设置搜索中不出现已隐藏的「沉浸式模式」「浏览器云同步」「版本提醒」 |
| `src/contentScripts/views/Home/components/VersionReminder.vue` | `shouldShowReminder` 开头 | 隐藏上游首页「新版本说明」按钮，只保留 Safari 版自己的更新提示 |
| `src/components/Picture.vue`、`src/components/LazyPicture.vue` | 模板中的 `<source>` 与 `<img :src>`；`LazyPicture` 的 `imageSrc` 与 `isCurrentImage()` 的 `src` 比较 | `getSafariPictureImageSrc()`：不渲染 `<source>`，`<img>` 直接加载 AVIF。WebKit 增删 `src`/`srcset` 时立即重新选源，原写法同一张图会请求 3～4 次 |
| `src/contentScripts/features/scrollBridge.ts` | `handleViewportScroll()` 中同步 `window.scrollTo` 之前 | 首页滚动时不再每帧把位置同步到文档，停止滚动后同步一次（每帧同步占滚动时主线程约 12%） |
| `src/contentScripts/views/App.vue` | `scrollViewportRef` 的 `watch` 回调开头 | `hideSafariScrollViewportScrollbar()`：主界面滚动容器的 `scrollbar-gutter: stable` 在 Safari「始终显示滚动条」时一直占位、把界面往左挤，隐藏滚动条并取消预留宽度 |
| `src/components/SearchBar/SearchBar.vue` | 模板根元素 `#search-wrap` 的 `@mousedown` | `keepSafariSearchInputFocus()`：Safari 点击链接/按钮不获得焦点，按下鼠标时输入框失焦、下拉框收起，搜索记录、热搜、联想词和清空按钮点击无效；在这些区域按下时保持输入框焦点 |

各接入点同时有对应的 `import` 行；对应实现均在 `src/safari/`。

## 4. 版本号与 Release

- 版本跟随上游：同步上游 `vX.Y.Z` 后发布 `vX.Y.Z-safari.1`；上游不变、只修 Safari 问题时序号加 1（`-safari.2`…）。Release 标题写作 `vX.Y.Z（Safari 第 N 版）`。
- 扩展版本号：`package.json` 的 `version` 保持上游原值（改它会在每次同步时冲突）。Safari 修订号单独放在 `src/safari/version.ts`（如 `SAFARI_REVISION = 1`），由 `src/manifest.ts` 在 Safari 构建时拼成 `manifest.version = "X.Y.Z.N"`。
- 每个 Release 附一个构建压缩包 `BewlyCat-Safari-vX.Y.Z-safari.N.zip`：压缩包根目录直接是 `manifest.json`（macOS 解压后得到同名文件夹，用户直接选它）。`extension-safari/` 和 `*.zip` 已在 `.gitignore` 中，不提交。
- Release 说明里写：基于的上游版本及上游更新要点链接、Safari 部分的新增与修复、已知问题、升级步骤。同样内容记入 `CHANGELOG-safari.md`。
- 发布：在要打标签的提交上重新构建并实测，然后：
  1. `pnpm build-safari`
  2. `(cd extension-safari && zip -r -X ../BewlyCat-Safari-vX.Y.Z-safari.N.zip . -x '*.DS_Store')`
  3. `git tag vX.Y.Z-safari.N && git push origin safari --tags`
  4. `gh release create vX.Y.Z-safari.N BewlyCat-Safari-vX.Y.Z-safari.N.zip --title 'vX.Y.Z（Safari 第 N 版）' --notes-file <说明文件>`

  只有正式 Release 会触发用户的更新提示，草稿和预发布（pre-release）不会。

## 4.1 新版本提示（扩展内）

上游的「刷新提示」是商店自动更新后提醒刷新页面，依赖 `scripting` 权限，Safari 版不可用，也不能发现新版本。Safari 版自行实现：

- 后台定时（启动时及每 12 小时，结果缓存在 `storage.local`）请求 `https://api.github.com/repos/IgnatAi401/BewlyCat-Safari/releases/latest`，取 `tag_name` 解析出 `X.Y.Z.N`，与 `browser.runtime.getManifest().version` 比较。GitHub 未登录接口限 60 次/小时/IP，此频率足够。
- 有新版本时，在 B 站页面由内容脚本显示提示条：新版本号、更新摘要、「查看更新」（打开 Release 页）、「忽略此版本」、「稍后提醒」。不自动下载或安装。
- 设置中提供「检查更新」开关（默认开）和「立即检查」按钮；请求失败静默忽略（1 小时后才自动重试），不影响扩展其他功能。开关、忽略的版本和稍后提醒时间存在 `storage.local` 的 `safariUpdatePrefs`，不进入上游 `settings`。
- 代码放在 `src/safari/updateCheck/`；接入点：后台入口一行启动、内容脚本一行挂载提示条、设置页一个开关，登记到接入点清单。
- 临时扩展无法自动更新：提示条只引导用户按第 7 节手动升级。

## 5. 同步上游

1. `git fetch upstream --tags`；更新 `main`：`git switch main && git merge --ff-only upstream/main && git push`（或在 GitHub 点「Sync fork」）。
2. `git switch safari && git merge <上游新标签>`，提交信息 `merge: 同步上游 vX.Y.Z`。
3. 解决冲突时对照「接入点清单」；上游新增的功能要判断在 Safari 下是否可用（是否依赖 iframe、抽屉、`scripting` 权限等），不可用的在 `src/safari/` 里关闭。
4. `pnpm install --frozen-lockfile`，`pnpm typecheck`，`pnpm build-safari`。
5. 按第 6 节测试清单在 Safari 中实测，通过后重置 `SAFARI_REVISION` 为 1，按第 4 节发布 Release。

## 6. 推送前测试清单

在 Safari 中移除旧临时扩展、重新添加 `extension-safari/` 后逐项检查：

- [ ] 首页、视频页、番剧页、稍后再看、历史记录
- [ ] 搜索、动态（t.bilibili.com）、个人空间、消息中心
- [ ] 登录、退出登录、接口请求（Origin/Referer 规则生效）
- [ ] 深色/浅色主题切换，B 站原生区域跟随
- [ ] 评论区：树状回复、用户名与链接主题色
- [ ] 设置页：抽屉相关选项已强制关闭
- [ ] 新版本提示：把本地版本号临时调低，确认提示条出现、链接正确、「忽略此版本」生效

### 6.1 性能测试

改动可能影响性能时（图片加载、滚动、观察器、全局样式等），用 `scripts/safari/perf.mjs` 在 safaridriver 自动化窗口中对比改动前后。它按场景（首页、视频页、搜索、个人空间、热门）采集加载时间、空闲与滚动时标签页进程的 CPU、帧率与卡顿帧、主线程长任务、DOM 规模、滚动时请求数和内存，结果写入输出目录的 `summary.md`。

1. 首次使用：Safari 设置 → 开发者 → 勾选「允许远程自动化」。
2. `pnpm build-safari`，然后 `node scripts/safari/perf.mjs --install`：重启自动化 Safari 并安装 `extension-safari/`。在弹出的自动化窗口中点一下页面 →「停止会话」→ 点工具栏带 ⚠️ 的 BewlyCat 图标 →「始终允许」，不要退出 Safari。
3. `node scripts/safari/perf.mjs --variants ext --runs 3`：多轮取中位数；`--scenarios home,video` 只测部分场景。
4. 需要不装扩展的对照组时：`node scripts/safari/perf.mjs --variants base --restart-safari --runs 3`（会退出自动化 Safari，之后要重新执行第 2 步）。
5. 定位热点：加 `--sample` 用 macOS `sample` 采集空闲和滚动阶段的调用栈，再用 `node scripts/safari/summarize-sample.mjs <输出目录>/*.sample.txt` 汇总时间去向（JS、样式、布局、合成等）和最耗时的 DOM 接口调用。采样会拖慢页面，帧率等指标以不加 `--sample` 的结果为准。

登录态测试：自动化 Safari 的 Cookie 只在单个会话内有效。先单独运行 `safaridriver -p 4444`，再用 `node scripts/safari/perf.mjs --variants ext --login --keep-session --scenarios video,moments,history` 打开扫码登录页，用手机 B 站 App 扫码（不要点击窗口，否则会话停止），登录后各场景在同一会话中运行；结束时打印会话 ID，之后用 `--session <ID>` 复用。同一会话中进程内存会累积，内存列不可比。

注意：自动化 Safari 是独立的临时实例，没有登录态，新装的扩展只在该实例退出前有效；自动化实例保留的扩展副本读取的是安装时的文件，重新构建后必须重新执行第 2 步。

## 7. 用户如何使用与更新

写进 README 的用户步骤：

README 保持简短（参照旧仓库 `BewlyCat-Safari-Local` 的写法），只写：

**首次安装**

1. 在 Release 页下载 `BewlyCat-Safari-<版本>.zip`（不是 Source code）并解压。
2. Safari → 设置 → 高级 → 勾选「显示网页开发者功能」；设置 → 开发者 → 勾选「允许未签名的扩展」→「添加临时扩展…」，选择解压后包含 `manifest.json` 的文件夹。
3. 在设置 → 扩展中启用，并允许访问 `bilibili.com` 和 `hdslb.com`。

**接收更新**

- 扩展会在 B 站页面提示新版本；下载新压缩包，在 Safari 中移除旧临时扩展后重新添加。

**限制**

- 临时扩展在 Safari 退出后通常会被移除，需要重新添加。
- 其余已知问题（iframe 内保持原样式、抽屉打开方式不可用等）写在 `CHANGELOG-safari.md`，不进 README。

## 8. 许可证、署名与沟通

- 保留上游 `LICENSE` 原文与版权声明，不修改。上游禁止封装为桌面应用或独立客户端分发，因此不做 Xcode App 封装或上架。
- README 开头注明「非官方 Safari 适配版，基于 keleus/BewlyCat」并附链接，不以上游作者名义发布。
- Safari 专属问题在本仓库 Issues 处理，提供模板（Safari 版本、macOS 版本、仓库标签或提交号、出问题的网址）；上游通用问题引导到上游仓库。
- 不向上游提交本仓库专属文件（`AGENTS.md`、`CLAUDE.md`、`docs/safari/`、`src/safari/`）；通用修复想贡献上游时，单独从上游 `main` 拉分支提 PR。

## 9. 落地步骤

- [x] Fork 上游为 `IgnatAi401/BewlyCat-Safari`，配置 `upstream` 远程
- [x] 以 `v1.8.1` 为基础创建 `safari` 分支，写入自有 `AGENTS.md`、`CLAUDE.md`、本路线图和 `merge=ours` 规则
- [ ] 推送 `safari`，在 GitHub 设为默认分支并开启分支保护（禁止强推）
- [x] 应用旧仓库的 `patches/safari.patch`（构建通过，待 Safari 实测）
- [x] 将 Safari 逻辑重构到 `src/safari/`，更新接入点清单
- [x] 实现新版本提示（第 4.1 节）与 `src/safari/version.ts` 版本号拼接
- [x] 改写 README（安装、更新、已知限制）、新增 `CHANGELOG-safari.md` 和 Issue 模板
- [ ] 发布 Release `v1.8.1-safari.1`（附构建压缩包），实测通过后归档 `BewlyCat-Safari-Local`
- [ ] 同步上游最新版本（当前上游 `main` 已领先 `v1.8.1`）
