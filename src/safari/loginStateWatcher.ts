import browser from 'webextension-polyfill'

import { CONTENT_SCRIPT_MATCHES } from '~/constants/contentScript'

import { readSafariLoginSnapshot, setSafariLoginSnapshot } from './account'

// Safari 的 cookies.onChanged 触发时不带 changeInfo，且 cookies API 读不到 B 站 Cookie；
// 改为在 Cookie 变化后请求 nav 接口，比较登录账号是否变化。
const CHECK_DELAY_MS = 1000
const MIN_CHECK_INTERVAL_MS = 5000

async function hasBilibiliTabs() {
  try {
    return (await browser.tabs.query({ url: [...CONTENT_SCRIPT_MATCHES] })).length > 0
  }
  catch {
    return false
  }
}

export function setupSafariLoginStateWatcher(onLoginStateChanged: () => void) {
  let lastSnapshot: string | undefined
  let lastCheckAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  async function check() {
    timer = null
    lastCheckAt = Date.now()
    // Safari 会为任意网站的 Cookie 变化触发事件；没有 B 站页面时无需检查，
    // 但缓存的账号可能已过期，下次接口请求时重新确认。
    if (!await hasBilibiliTabs()) {
      setSafariLoginSnapshot(undefined)
      return
    }
    const current = await readSafariLoginSnapshot()
    setSafariLoginSnapshot(current)
    if (current === undefined)
      return
    if (current !== lastSnapshot)
      onLoginStateChanged()
    lastSnapshot = current
  }

  browser.cookies.onChanged.addListener(() => {
    if (timer !== null)
      return
    timer = setTimeout(check, Math.max(CHECK_DELAY_MS, lastCheckAt + MIN_CHECK_INTERVAL_MS - Date.now()))
  })
}
