import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'

import { condense } from '.'
import { htmlFormatOptions } from './format'

import type { TemplateExtractorOptions } from '.'

function main() {
  let input: string
  let format = 'default'

  let args = process.argv.slice(2)

  if ((args[0] ?? '') === '--html') {
    format = 'html'
    args = args.slice(1)
  }

  if (args.length) {
    input = args.join(' ')
  } else {
    input = readFileSync(0, 'utf-8')
  }

  const jsdom = new JSDOM(input)
  const doc = jsdom.window.document

  const options: TemplateExtractorOptions = {}
  if (format === 'html') {
    options.format = htmlFormatOptions
  }

  const condensed = condense(doc.documentElement, options)
  console.log(condensed)
}

main()
