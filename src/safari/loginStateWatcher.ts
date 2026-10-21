import browser from 'webextension-polyfill'

// Safari 的 cookies.onChanged 不带 changeInfo，任意网站的 Cookie 变化都会触发；后台的请求和 cookies API
// 也看不到 B 站登录 Cookie，后台无法自己判断登录态。后台只节流后通知各 B 站标签页，
// 由标签页按页面上的 DedeUserID 自行校正（reconcileLocalLoginState），需要时在页面内请求 nav。
const NOTIFY_DELAY_MS = 1000
const MIN_NOTIFY_INTERVAL_MS = 5000

export function setupSafariLoginStateWatcher(notifyTabs: () => void) {
  let lastNotifiedAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  browser.cookies.onChanged.addListener(() => {
    if (timer !== null)
      return
    timer = setTimeout(() => {
      timer = null
      lastNotifiedAt = Date.now()
      notifyTabs()
    }, Math.max(NOTIFY_DELAY_MS, lastNotifiedAt + MIN_NOTIFY_INTERVAL_MS - Date.now()))
  })
}
