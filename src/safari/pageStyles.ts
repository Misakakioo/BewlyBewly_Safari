// Safari：页面专属样式（src/styles/adaptedStyles/pages/*.scss）原本被单文件构建全部打进 style.css，
// 每个页面都加载全部 19 份（约 220KB，含几乎全部 `[class*=…]` 选择器，任何 class 变化都会让样式失效范围扩大）。
// 现在每份样式编译成单独文件，只在对应地址经清单注入：与原来同为清单注入样式，层级与注入时机不变。
// className 与 adaptedStyles/index.ts 加在 <html> 上的类名一致；matches 覆盖该文件里判断页面的正则。
// manifest 生成脚本会在 Node 中导入，只能使用相对路径且不能依赖扩展 API。
import { BILIBILI_LOCALE_PATH_SEGMENTS, MAIN_SITE_ORIGIN_MATCH, withLocalePaths } from './matchPatterns'

export const SAFARI_PAGE_STYLE_DIR = 'dist/contentScripts/pageStyles'

export interface SafariPageStyle {
  className: string
  // 相对 src/styles/adaptedStyles 的 scss 路径（不含扩展名），按顺序注入。
  sources: string[]
  matches: string[]
}

const www = (path: string) => `${MAIN_SITE_ORIGIN_MATCH}${path}`

export const SAFARI_PAGE_STYLES: SafariPageStyle[] = [
  {
    className: 'homePage',
    sources: ['pages/homePage'],
    matches: [
      ...withLocalePaths([www('/'), www('/?*'), www('/index.html*')]),
      ...BILIBILI_LOCALE_PATH_SEGMENTS.map(locale => www(`/${locale}`)),
    ],
  },
  { className: 'notificationsPage', sources: ['pages/notificationsPage'], matches: ['*://message.bilibili.com/*'] },
  { className: 'momentsPage', sources: ['pages/momentsPage'], matches: ['*://t.bilibili.com/*', www('/opus/*')] },
  { className: 'historyPage', sources: ['pages/historyPage'], matches: [www('/history*'), www('/account/history*')] },
  { className: 'watchLaterPage', sources: ['pages/watchLaterPage'], matches: [www('/watchlater*')] },
  { className: 'notePage', sources: ['pages/notePage'], matches: ['*://space.bilibili.com/v/note-list*'] },
  { className: 'userSpacePage', sources: ['pages/userSpacePage'], matches: ['*://space.bilibili.com/*'] },
  { className: 'searchPage', sources: ['pages/searchPage'], matches: ['*://search.bilibili.com/*'] },
  { className: 'videoPage', sources: ['pages/videoPage'], matches: [www('/video/*'), www('/list/*'), www('/medialist/play/*')] },
  { className: 'animePlaybackAndMoviePage', sources: ['pages/animePlayback&MoviePage'], matches: [www('/bangumi/play/*')] },
  { className: 'animePage', sources: ['pages/animePage'], matches: [www('/anime*'), www('/guochuang*')] },
  {
    className: 'channelPage',
    sources: ['pages/channelPage'],
    matches: ['/tv*', '/movie*', '/variety*', '/mooc*', '/documentary*'].map(www),
  },
  { className: 'articlesPage', sources: ['pages/articlesPage'], matches: [www('/read*')] },
  { className: 'topicPage', sources: ['pages/topicPage'], matches: [www('/v/topic/detail*')] },
  { className: 'error404Page', sources: ['pages/error404Page'], matches: [www('/404*')] },
  { className: 'creativeCenterPage', sources: ['forceDark', 'pages/creativeCenterPage'], matches: ['*://member.bilibili.com/platform*'] },
  { className: 'accountSettingsPage', sources: ['pages/accountSettingsPage'], matches: ['*://account.bilibili.com/*'] },
  { className: 'premiumPage', sources: ['pages/premiumPage'], matches: ['*://account.bilibili.com/big*'] },
  { className: 'loginPage', sources: ['pages/loginPage'], matches: ['*://passport.bilibili.com/login*'] },
]

// 输出文件名：取 scss 文件名，去掉文件名里的 `&`。
export function getSafariPageStyleFileName(source: string) {
  return `${source.split('/').pop()!.replace(/&/g, 'And')}.css`
}

export function getSafariPageStylePaths(style: SafariPageStyle) {
  return style.sources.map(source => `${SAFARI_PAGE_STYLE_DIR}/${getSafariPageStyleFileName(source)}`)
}
