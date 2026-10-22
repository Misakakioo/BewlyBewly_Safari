// Safari：后台页的请求不带当前标签页（及其用户场景）的 B 站登录 Cookie，nav 会返回未登录，
// 收藏、历史、动态等也都是空的。Safari 版改在内容脚本里执行同一套接口逻辑：请求从 B 站页面发出，
// 属于第一方请求，自动带上该页面的 Cookie。APP 客户端请求仍走后台（依赖后台专属的请求头规则）。
import { API_COLLECTION } from '~/background/messageListeners/api'
import type { APIType } from '~/background/utils'
import { apiListenerFactory } from '~/background/utils'
import { parseDedeUserID } from '~/logic/loginStatus'
import { sendAbortableApiMessage, sendMessage } from '~/utils/messaging'

let fullApi: Record<string, APIType> | undefined
let handleInPage: ReturnType<typeof apiListenerFactory> | undefined

// 上游请求层将异常包装成 Error，原始类型保留在 originalError 字符串中。
function isNetworkError(error: unknown) {
  return error instanceof TypeError
    || (error instanceof Error && 'originalError' in error
      && typeof error.originalError === 'string' && error.originalError.startsWith('TypeError:'))
}

// 后台请求不带登录 Cookie，只有结果与登录无关时才能退回：GET 请求，且本页未登录或请求本就不带 Cookie。
// 已登录时退回会把失败显示成「未登录」或空列表；写操作可能已在服务器执行，退回会重复提交。
function canFallBackToBackground(type: string, message: Record<string, any>) {
  const api = fullApi?.[type]
  const isGet = typeof api === 'object' && api._fetch.method.toLowerCase() === 'get'
  const isLoggedIn = parseDedeUserID(globalThis.document?.cookie ?? '') !== undefined
  return isGet && (!isLoggedIn || message.bewlyNoCookie === true || api._fetch.credentials === 'omit')
}

export async function requestSafariApiInPage(type: string, message: Record<string, any>, signal?: AbortSignal) {
  fullApi ??= Object.assign({}, ...API_COLLECTION) as Record<string, APIType>
  handleInPage ??= apiListenerFactory(fullApi)
  try {
    return await handleInPage(message, undefined, signal)
  }
  catch (error) {
    // 网络层失败（如某接口不允许页面跨域）时，匿名读取退回后台请求。
    if (!isNetworkError(error) || signal?.aborted || !canFallBackToBackground(type, message))
      throw error
    return signal ? sendAbortableApiMessage(type, message, signal) : sendMessage(type, message)
  }
}
