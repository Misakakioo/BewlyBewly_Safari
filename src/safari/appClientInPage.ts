// Safari：后台发出的 APP 请求带的是扩展自身的 Origin（safari-web-extension://…），B 站 WAF 直接
// 返回 412；而带 env / app-key / x-bili-aurora-zone 这类自定义头会让 POST 变成非简单请求，浏览器
// 先发 OPTIONS 预检，预检同样被拦（Safari 的 declarativeNetRequest 不作用于 CORS 预检），并且 B 站
// 的 access-control-allow-headers 白名单里也没有这几个头。
//
// 登录类接口（扫码授权、token 刷新）的鉴权全在 query 或表单签名里，不依赖那些头，因此改在 B 站
// 页面内发出：Origin 是网页自身，请求保持「简单请求」不触发预检，B 站正常返回，且响应头
// access-control-allow-origin 回显页面 Origin，响应体可以直接读。思路与 src/safari/pageRequest.ts 一致。
import type { AppClientEndpoint, AppClientRequest } from '~/constants/appClient'
import { signAppParams } from '~/utils/appSign'

interface InPageEndpointConfig {
  url: string
  /** 参数放在表单中；否则放在 query 中 */
  form?: boolean
}

const IN_PAGE_ENDPOINTS: Partial<Record<AppClientEndpoint, InPageEndpointConfig>> = {
  qrcodeAuthCode: { url: 'https://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code' },
  qrcodePoll: { url: 'https://passport.bilibili.com/x/passport-tv-login/qrcode/poll' },
  refreshTokenV3: { url: 'https://passport.bilibili.com/api/v3/oauth2/refresh_token', form: true },
  refreshTokenV2: { url: 'https://passport.bilibili.com/api/v2/oauth2/refresh_token', form: true },
}

const REQUEST_TIMEOUT = 15_000

export function canRequestAppClientInPage(endpoint: AppClientEndpoint): boolean {
  return Object.hasOwn(IN_PAGE_ENDPOINTS, endpoint)
}

/**
 * 在页面上下文里请求 APP 登录类接口。
 * 网络层失败（被拦、超时）统一返回 code -1，调用方据此退回后台请求；
 * 接口自身的错误（含 HTTP 状态码）不退回，避免重复提交。
 */
export async function requestAppClientInPage(
  endpoint: AppClientEndpoint,
  params: AppClientRequest['params'],
): Promise<any> {
  const target = IN_PAGE_ENDPOINTS[endpoint]
  if (!target)
    return { code: -400, message: `Unknown in-page APP client endpoint: ${endpoint}` }

  // 每次请求重新签名，保证 ts 有效
  const signedParams = new URLSearchParams(signAppParams(params ?? {}))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new DOMException('APP client request timed out', 'TimeoutError')), REQUEST_TIMEOUT)

  try {
    const response = await fetch(target.form ? target.url : `${target.url}?${signedParams}`, {
      method: 'POST',
      credentials: 'omit',
      signal: controller.signal,
      // 只保留表单的 Content-Type：自定义头会触发预检，而预检在 Safari 里必被拦。
      headers: target.form
        ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
        : {},
      body: target.form ? signedParams : undefined,
    })

    if (!response.ok)
      return { code: -response.status, message: `HTTP ${response.status}` }
    return await response.json()
  }
  catch (error) {
    return { code: -1, message: error instanceof Error ? error.message : String(error) }
  }
  finally {
    clearTimeout(timeout)
  }
}
