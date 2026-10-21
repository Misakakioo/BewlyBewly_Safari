// Safari 构建插件（在 Node 中由 vite.config.content.ts 导入）：页面专属样式编译成单独文件，由清单按地址注入，
// adaptedStyles/index.ts 里对这些 scss 的动态导入改为返回空样式，不再并入每个页面都加载的 style.css。
import path from 'node:path'

import { compile } from 'sass'
import type { Plugin } from 'vite'

import { getSafariPageStyleFileName, SAFARI_PAGE_STYLES } from './pageStyles'

export function safariPageStyles(adaptedStylesDir: string): Plugin {
  const sources = [...new Set(SAFARI_PAGE_STYLES.flatMap(style => style.sources))]
  const sourcePaths = new Set(sources.map(source => path.join(adaptedStylesDir, `${source}.scss`)))

  return {
    name: 'bewly-safari-page-styles',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      const [file, query = ''] = id.split('?')
      if (sourcePaths.has(file) && !query.includes('inline'))
        return ''
    },
    generateBundle() {
      for (const source of sources) {
        this.emitFile({
          type: 'asset',
          fileName: `pageStyles/${getSafariPageStyleFileName(source)}`,
          source: compile(path.join(adaptedStylesDir, `${source}.scss`), { style: 'compressed' }).css,
        })
      }
    },
  }
}
