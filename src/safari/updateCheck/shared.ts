import browser from 'webextension-polyfill'

// 本仓库以签名 App（make ship）安装，含登录修复；检查本仓库的 Release，而不是 IgnatAi401/BewlyCat-Safari
// 的临时扩展压缩包（装上会出现两个 BewlyCat，且没有登录修复）。尚无 Release 时接口返回 404，视为没有新版本。
export const SAFARI_REPO_URL = 'https://github.com/Misakakioo/BewlyBewly_Safari'
export const SAFARI_RELEASES_URL = `${SAFARI_REPO_URL}/releases`
export const SAFARI_LATEST_RELEASE_API = 'https://api.github.com/repos/Misakakioo/BewlyBewly_Safari/releases/latest'

export const UPDATE_GET_STATE_MESSAGE = 'bewly-safari:update:get-state'
export const UPDATE_CHECK_NOW_MESSAGE = 'bewly-safari:update:check-now'

// 与上游 settings 分开存放，避免改动上游设置结构。
export const UPDATE_CACHE_KEY = 'safariUpdateCheck'
export const UPDATE_PREFS_KEY = 'safariUpdatePrefs'

export const UPDATE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000

export interface SafariRelease {
  version: string
  tag: string
  name: string
  url: string
  summary: string
}

export interface SafariUpdateCache {
  // 最近一次成功检查的时间，0 表示从未成功。
  checkedAt: number
  nextCheckAt?: number
  latest?: SafariRelease
}

export interface SafariUpdatePrefs {
  enabled: boolean
  ignoredVersion?: string
  snoozedUntil?: number
}

export interface SafariUpdateState {
  enabled: boolean
  currentVersion: string
  checkedAt?: number
  latest?: SafariRelease
  hasUpdate: boolean
  // 有新版本且未被忽略、未在稍后提醒期内。
  shouldNotify: boolean
  failed?: boolean
}

// 标签 vX.Y.Z-safari.N 对应扩展版本号 X.Y.Z.N。
export function parseSafariTag(tag: unknown): string | undefined {
  if (typeof tag !== 'string')
    return undefined
  const match = /^v?(\d+)\.(\d+)\.(\d+)-safari\.(\d+)$/.exec(tag.trim())
  return match ? match.slice(1).map(Number).join('.') : undefined
}

export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0)
      return diff > 0 ? 1 : -1
  }
  return 0
}

export function normalizePrefs(value: unknown): SafariUpdatePrefs {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    enabled: record.enabled !== false,
    ignoredVersion: typeof record.ignoredVersion === 'string' ? record.ignoredVersion : undefined,
    snoozedUntil: typeof record.snoozedUntil === 'number' ? record.snoozedUntil : undefined,
  }
}

export async function readPrefs(): Promise<SafariUpdatePrefs> {
  const stored = await browser.storage.local.get(UPDATE_PREFS_KEY)
  return normalizePrefs(stored[UPDATE_PREFS_KEY])
}

export async function updatePrefs(patch: Partial<SafariUpdatePrefs>): Promise<SafariUpdatePrefs> {
  const prefs = { ...await readPrefs(), ...patch }
  await browser.storage.local.set({ [UPDATE_PREFS_KEY]: prefs })
  return prefs
}

export interface SafariUpdateCopy {
  title: string
  description: string
  view: string
  ignore: string
  later: string
  settingTitle: string
  settingDesc: string
  checkNow: string
  checking: string
  upToDate: string
  available: string
  failed: string
  currentVersion: string
}

export function getSafariUpdateCopy(locale: string): SafariUpdateCopy {
  const normalized = locale.toLowerCase()
  if (normalized === 'cmn-tw' || normalized === 'jyut' || normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk')) {
    return {
      title: 'BewlyCat Safari 版有新版本 v{version}',
      description: '在專案資料夾執行 git pull && make ship，然後重新啟動 Safari。',
      view: '查看更新',
      ignore: '忽略此版本',
      later: '稍後提醒',
      settingTitle: '檢查 Safari 版更新',
      settingDesc: '定期檢查 GitHub 上的新 Release，有新版本時在 B 站頁面提示。',
      checkNow: '立即檢查',
      checking: '檢查中…',
      upToDate: '目前已是最新版本',
      available: '有新版本 v{version}',
      failed: '檢查失敗，請稍後再試',
      currentVersion: '目前版本 v{version}',
    }
  }
  if (normalized === 'cmn-cn' || normalized.startsWith('zh')) {
    return {
      title: 'BewlyCat Safari 版有新版本 v{version}',
      description: '在项目目录运行 git pull && make ship，然后重启 Safari。',
      view: '查看更新',
      ignore: '忽略此版本',
      later: '稍后提醒',
      settingTitle: '检查 Safari 版更新',
      settingDesc: '定期检查 GitHub 上的新 Release，有新版本时在 B 站页面提示。',
      checkNow: '立即检查',
      checking: '检查中…',
      upToDate: '当前已是最新版本',
      available: '有新版本 v{version}',
      failed: '检查失败，请稍后再试',
      currentVersion: '当前版本 v{version}',
    }
  }
  return {
    title: 'BewlyCat for Safari v{version} is available',
    description: 'Run git pull && make ship in the project folder, then restart Safari.',
    view: 'View update',
    ignore: 'Skip this version',
    later: 'Remind me later',
    settingTitle: 'Check for Safari updates',
    settingDesc: 'Periodically check GitHub for new releases and show a notice on Bilibili pages.',
    checkNow: 'Check now',
    checking: 'Checking…',
    upToDate: 'You are up to date',
    available: 'v{version} is available',
    failed: 'Check failed. Try again later.',
    currentVersion: 'Current version v{version}',
  }
}

export function formatCopy(text: string, version: string) {
  return text.replace('{version}', version)
}
