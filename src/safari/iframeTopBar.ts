// Safari 版不向 iframe 注入内容脚本。原版页面在 BewlyCat 的 iframe 中打开时（顶栏切到「BiliBili」），
// IframePage 会给 iframe 加上 remove-top-bar 类，但 iframe 里没有对应样式，B 站原版顶栏会和
// BewlyCat 顶栏叠在一起。iframe 与外层同源，由外层补上隐藏原版顶栏的样式。
import REMOVE_TOP_BAR_CSS from '~/styles/removeTopBar.scss?inline'

const STYLE_ID = 'bewly-safari-iframe-top-bar'

export function ensureSafariIframeTopBarStyle(doc: Document) {
  if (!__SAFARI__ || doc.getElementById(STYLE_ID))
    return

  const bewlyRoot = document.getElementById('bewly') ?? document.documentElement
  const topBarHeight = getComputedStyle(bewlyRoot).getPropertyValue('--bew-top-bar-height').trim() || '64px'
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = `:root{--bew-top-bar-height:${topBarHeight}}\n${REMOVE_TOP_BAR_CSS}`
  ;(doc.head ?? doc.documentElement).appendChild(style)
}
