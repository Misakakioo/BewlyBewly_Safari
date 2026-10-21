// Run with: node --test scripts/safari/request-login.test.mjs
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
// eslint-disable-next-line test/no-import-node-test -- Use Node's runner without adding a test dependency.
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsup')] }))

async function loadModule(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    define: { '__SAFARI__': 'true', 'process.env.FIREFOX': 'false' },
    plugins: [{
      name: 'browser-test-double',
      setup(builder) {
        builder.onResolve({ filter: /^webextension-polyfill$/ }, () => ({ path: 'browser', namespace: 'mock' }))
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: 'export default globalThis.safariTestBrowser',
        }))
      },
    }],
  })
  const source = `${result.outputFiles[0].text}\n//# sourceURL=${entry}.bundled.js`
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

function setPageCookie(cookie) {
  globalThis.document = { cookie }
}

test('Safari falls back only for logged-out reads, never for logged-in or write failures', async (t) => {
  let fallbackCalls = 0
  globalThis.safariTestBrowser = {
    runtime: {
      sendMessage: async () => {
        fallbackCalls++
        return { fallback: true }
      },
    },
  }
  t.after(() => {
    delete globalThis.safariTestBrowser
    delete globalThis.document
  })
  const { requestSafariApiInPage } = await loadModule('src/safari/pageRequest.ts')
  const message = { contentScriptQuery: 'getVideoInfo', bvid: 'BVtest' }
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Network failed')
  })

  // Logged out: the background's cookieless answer is equivalent, so fall back.
  setPageCookie('')
  assert.deepEqual(await requestSafariApiInPage('getVideoInfo', message), { fallback: true })
  assert.equal(fallbackCalls, 1)

  // Logged in: the background would answer "logged out", so surface the error instead.
  setPageCookie('DedeUserID=123')
  await assert.rejects(requestSafariApiInPage('getVideoInfo', message))
  assert.equal(fallbackCalls, 1)

  // Requests that omit cookies anyway may still fall back while logged in.
  assert.deepEqual(await requestSafariApiInPage('getVideoInfo', { ...message, bewlyNoCookie: true }), { fallback: true })
  assert.equal(fallbackCalls, 2)

  // Writes never fall back: the server may already have applied them.
  setPageCookie('')
  await assert.rejects(requestSafariApiInPage('saveToWatchLater', { contentScriptQuery: 'saveToWatchLater', aid: 1, csrf: 'x' }))
  assert.equal(fallbackCalls, 2)

  fetchMock.mock.mockImplementation(async () => new Response('invalid JSON', { headers: { 'Content-Type': 'application/json' } }))
  await assert.rejects(requestSafariApiInPage('getVideoInfo', message))
  assert.equal(fallbackCalls, 2)

  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestSafariApiInPage('getVideoInfo', message, controller.signal), { name: 'AbortError' })
  assert.equal(fallbackCalls, 2)
})

test('Safari keys cached responses by the page DedeUserID, so switching accounts misses the cache', async (t) => {
  globalThis.safariTestBrowser = { runtime: { sendMessage: async () => ({}) } }
  t.after(() => {
    delete globalThis.safariTestBrowser
    delete globalThis.document
  })
  const { requestSafariApiInPage } = await loadModule('src/safari/pageRequest.ts')
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ code: 0, data: { isLogin: true, mid: 1 } })))
  const message = { contentScriptQuery: 'getUserInfo' }

  setPageCookie('DedeUserID=1')
  await requestSafariApiInPage('getUserInfo', message)
  await requestSafariApiInPage('getUserInfo', message)
  assert.equal(fetchMock.mock.callCount(), 1)

  setPageCookie('DedeUserID=2')
  await requestSafariApiInPage('getUserInfo', message)
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('Safari tells tabs to re-check login after cookie changes, throttled', async (t) => {
  let cookieChanged
  let scheduled
  let delay
  let now = 1_000_000
  let notified = 0
  globalThis.safariTestBrowser = {
    cookies: { onChanged: { addListener: (listener) => { cookieChanged = listener } } },
  }
  t.after(() => {
    delete globalThis.safariTestBrowser
  })
  t.mock.method(globalThis, 'setTimeout', (callback, ms) => {
    scheduled = callback
    delay = ms
    return 1
  })
  t.mock.method(Date, 'now', () => now)
  const { setupSafariLoginStateWatcher } = await loadModule('src/safari/loginStateWatcher.ts')
  setupSafariLoginStateWatcher(() => {
    notified++
  })

  // Nothing is sent until a cookie actually changes (no broadcast on background start).
  assert.equal(notified, 0)
  cookieChanged()
  assert.equal(delay, 1000)
  const first = scheduled
  cookieChanged()
  assert.equal(scheduled, first, 'changes while a notice is pending are merged')
  now = 1_001_000
  first()
  assert.equal(notified, 1)

  now = 1_002_000
  cookieChanged()
  assert.equal(delay, 4000, 'at most one notice every 5 seconds')
  scheduled()
  assert.equal(notified, 2)
})
