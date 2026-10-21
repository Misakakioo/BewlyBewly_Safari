// Safari：后台页的请求不带当前标签页（及其用户场景）的 B 站登录 Cookie，nav 会返回未登录，
// 收藏、历史、动态等也都是空的。Safari 版改在内容脚本里执行同一套接口逻辑：请求从 B 站页面发出，
// 属于第一方请求，自动带上该页面的 Cookie。APP 客户端请求仍走后台（依赖后台专属的请求头规则）。
import { API_COLLECTION } from '~/background/messageListeners/api'
import { apiListenerFactory } from '~/background/utils'
import { sendAbortableApiMessage, sendMessage } from '~/utils/messaging'

let handleInPage: ReturnType<typeof apiListenerFactory> | undefined

export async function requestSafariApiInPage(type: string, message: Record<string, any>, signal?: AbortSignal) {
  handleInPage ??= apiListenerFactory(Object.assign({}, ...API_COLLECTION))
  try {
    return await handleInPage(message, undefined, signal)
  }
  catch (error) {
    // 网络层失败（如某接口不允许页面跨域）时退回后台请求，至少保留未登录可用的数据。
    // 上游请求层将异常包装成 Error，原始类型保留在 originalError 字符串中。
    const isNetworkError = error instanceof TypeError
      || (error instanceof Error && 'originalError' in error
        && typeof error.originalError === 'string' && error.originalError.startsWith('TypeError:'))
    if (!isNetworkError || signal?.aborted)
      throw error
    return signal ? sendAbortableApiMessage(type, message, signal) : sendMessage(type, message)
  }
}
