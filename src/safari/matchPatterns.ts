// 清单匹配模式的公共工具。manifest 生成脚本会在 Node 中导入，只能使用相对路径且不能依赖扩展 API。

// 主站多语言页面在路径前加语言段（如 /ja/video/...），与 src/utils/bilibiliLocale.ts 的列表保持一致。
export const BILIBILI_LOCALE_PATH_SEGMENTS = ['en', 'th', 'vi', 'id', 'ja', 'zh-hant', 'zh-hans', 'ar', 'pt', 'es', 'tr', 'ru', 'ms']

export const MAIN_SITE_ORIGIN_MATCH = '*://www.bilibili.com'

export function withLocalePaths(matches: string[]) {
  return matches.flatMap(match => [
    match,
    ...BILIBILI_LOCALE_PATH_SEGMENTS.map(locale => `${MAIN_SITE_ORIGIN_MATCH}/${locale}${match.slice(MAIN_SITE_ORIGIN_MATCH.length)}`),
  ])
}

// 与浏览器的匹配规则一致：`*` 协议只匹配 http/https；路径部分（含查询参数）中的 `*` 匹配任意字符。
// 本项目的模式不使用通配子域名。
export function matchesPattern(pattern: string, url: string): boolean {
  const match = /^(\*|https?):\/\/([^/]+)(\/.*)$/.exec(pattern)
  if (!match)
    return false
  const [, scheme, host, path] = match
  const escape = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const source = `^${scheme === '*' ? 'https?' : scheme}://${escape(host)}${escape(path).replace(/\*/g, '.*')}$`
  try {
    const { protocol, host: urlHost, pathname, search } = new URL(url)
    return new RegExp(source).test(`${protocol}//${urlHost}${pathname}${search}`)
  }
  catch {
    return false
  }
}
