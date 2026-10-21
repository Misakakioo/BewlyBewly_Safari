// 页面专属样式由清单按「首次加载的地址」注入（见 ./pageStyles.ts）。B 站站内无刷新跳到另一类页面时
// （adaptedStyles 会切换 <html> 上的页面类名），清单样式不会跟着换：这时补一个 <link> 加载该页样式，
// 回到清单已覆盖的页面类型时移除。<link> 放在 <html> 最前，B 站自己的同优先级样式仍然胜出。
import browser from 'webextension-polyfill'

import { matchesPattern } from './matchPatterns'
import type { SafariPageStyle } from './pageStyles'
import { getSafariPageStylePaths, SAFARI_PAGE_STYLES } from './pageStyles'

// 内容脚本在 document_start 执行，此时的地址就是清单匹配时的地址。
const initialUrl = location.href

// 当前页面类名对应、但不在清单为 url 注入范围内的样式；不需要补加载时返回 undefined。
export function getSafariFallbackPageStyle(classList: Pick<DOMTokenList, 'contains'>, url: string): SafariPageStyle | undefined {
  const style = SAFARI_PAGE_STYLES.find(entry => classList.contains(entry.className))
  return style && !style.matches.some(pattern => matchesPattern(pattern, url)) ? style : undefined
}

export function setupSafariPageStyleFallback() {
  if (!__SAFARI__ || window !== window.top)
    return

  const root = document.documentElement
  let active: SafariPageStyle | undefined
  let links: HTMLLinkElement[] = []

  const sync = () => {
    const wanted = getSafariFallbackPageStyle(root.classList, initialUrl)
    if (wanted === active)
      return
    links.forEach(link => link.remove())
    links = (wanted ? getSafariPageStylePaths(wanted) : []).map((path) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = browser.runtime.getURL(path)
      link.dataset.bewlySafariPageStyle = wanted!.className
      return link
    })
    root.prepend(...links)
    active = wanted
  }

  sync()
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
}
