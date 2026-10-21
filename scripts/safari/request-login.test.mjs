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

test('Safari falls back for wrapped network errors, but not invalid JSON or cancellation', async (t) => {
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
  })
  const { requestSafariApiInPage } = await loadModule('src/safari/pageRequest.ts')
  const message = { contentScriptQuery: 'getVideoInfo', bvid: 'BVtest' }
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Network failed')
  })
  assert.deepEqual(await requestSafariApiInPage('getVideoInfo', message), { fallback: true })
  assert.equal(fallbackCalls, 1)

  fetchMock.mock.mockImplementation(async () => new Response('invalid JSON', { headers: { 'Content-Type': 'application/json' } }))
  await assert.rejects(requestSafariApiInPage('getVideoInfo', message))
  assert.equal(fallbackCalls, 1)

  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestSafariApiInPage('getVideoInfo', message, controller.signal), { name: 'AbortError' })
  assert.equal(fallbackCalls, 1)
})

test('Safari broadcasts the first valid login snapshot and subsequent account changes', async (t) => {
  let cookieChanged
  let scheduled
  let snapshot
  let broadcasts = 0
  globalThis.safariTestBrowser = {
    tabs: { query: async () => [{ id: 1 }] },
    cookies: { onChanged: { addListener: (listener) => { cookieChanged = listener } } },
  }
  t.after(() => {
    delete globalThis.safariTestBrowser
  })
  t.mock.method(globalThis, 'setTimeout', (callback) => {
    scheduled = callback
    return 1
  })
  t.mock.method(globalThis, 'clearTimeout', () => {})
  t.mock.method(globalThis, 'fetch', async () => ({ json: async () => snapshot }))
  const { setupSafariLoginStateWatcher } = await loadModule('src/safari/loginStateWatcher.ts')
  setupSafariLoginStateWatcher(() => {
    broadcasts++
  })

  async function change(value) {
    snapshot = value
    cookieChanged()
    await scheduled()
  }
  await change({ code: -500 })
  assert.equal(broadcasts, 0)
  await change({ code: 0, data: { isLogin: true, mid: 123 } })
  assert.equal(broadcasts, 1)
  await change({ code: 0, data: { isLogin: true, mid: 123 } })
  assert.equal(broadcasts, 1)
  await change({ code: 0, data: { isLogin: true, mid: 456 } })
  assert.equal(broadcasts, 2)
  await change({ code: -101 })
  assert.equal(broadcasts, 3)
})
