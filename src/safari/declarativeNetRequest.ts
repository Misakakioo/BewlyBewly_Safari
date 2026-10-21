import type browser from 'webextension-polyfill'

// Safari 的 declarativeNetRequest 不支持正则中的 `|`，也不认识 sec-ch-ua* 请求头。
const SAFARI_UNSUPPORTED_HEADERS = /^sec-ch-ua/i
// 拆出的规则放在专用 id 段：SPLIT_RULE_ID_BASE + 原 id × 10 + 序号（1~9）。上游规则 id 远小于该段，
// 不会重叠；删除时也只删除本段中的 id。
const SPLIT_RULE_ID_BASE = 900_000
const MAX_RULES_PER_SOURCE = 10

type Rule = browser.DeclarativeNetRequest.Rule
type UpdateRuleOptions = browser.DeclarativeNetRequest.UpdateDynamicRulesOptionsType

function getSafariSplitRuleId(id: number, index: number): number {
  return index === 0 ? id : SPLIT_RULE_ID_BASE + id * MAX_RULES_PER_SOURCE + index
}

export function expandRegexAlternation(regex: string): string[] {
  const match = /\((?:\?:)?([^()|]*\|[^()]*)\)/.exec(regex)
  if (!match)
    return [regex]
  const before = regex.slice(0, match.index)
  const after = regex.slice(match.index + match[0].length)
  return match[1].split('|').flatMap(option => expandRegexAlternation(`${before}${option}${after}`))
}

function toSafariRules(rule: Rule): Rule[] {
  const requestHeaders = rule.action.requestHeaders?.filter(header => !SAFARI_UNSUPPORTED_HEADERS.test(header.header))
  const action = requestHeaders ? { ...rule.action, requestHeaders } : rule.action
  const regexFilters = rule.condition.regexFilter ? expandRegexAlternation(rule.condition.regexFilter) : [undefined]
  if (regexFilters.length > MAX_RULES_PER_SOURCE)
    console.error(`[BewlyCat] Safari rule ${rule.id} expands to ${regexFilters.length} patterns; only the first ${MAX_RULES_PER_SOURCE} are applied.`)
  return regexFilters.slice(0, MAX_RULES_PER_SOURCE).map((regexFilter, index) => ({
    ...rule,
    id: getSafariSplitRuleId(rule.id, index),
    action,
    condition: regexFilter ? { ...rule.condition, regexFilter } : rule.condition,
  }))
}

// 非 Safari 构建原样返回；Safari 中把规则改写为可接受的形式。
export function adaptSafariRuleUpdate<T extends UpdateRuleOptions>(options: T): T {
  if (!__SAFARI__)
    return options
  const removeRuleIds = options.removeRuleIds?.flatMap(id =>
    Array.from({ length: MAX_RULES_PER_SOURCE }, (_, index) => getSafariSplitRuleId(id, index)),
  )
  return {
    ...options,
    ...(removeRuleIds ? { removeRuleIds } : {}),
    ...(options.addRules ? { addRules: options.addRules.flatMap(toSafariRules) } : {}),
  }
}
