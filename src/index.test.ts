import { JSDOM } from 'jsdom'

import { condense, condenseFragment } from '.'

describe('condense()', () => {
  it('should condense a simple HTML document', () => {
    const html = `<html><body><div class="foo">hello</div><div class="foo">world</div></body></html>`

    const element = parseHTML(html)
    const output = condense(element)

    const expected = `T1: div[class="foo"]{$1}

html{head{}body{T1("hello")T1("world")}}`

    expect(output).toEqual(expected)
  })
})

describe('condenseFragment()', () => {
  it('should condense a simple HTML fragment with a single top-level node', () => {
    const html = `<div>hello world</div>`

    const fragment = parseHTMLFragment(html)
    const output = condenseFragment(fragment)

    const expected = `div{"hello world"}`
    expect(output).toEqual(expected)
  })
  it('should condense a simple HTML fragment with multiple top-level nodes', () => {
    const html = `<div>hello</div><div>world</div>`

    const fragment = parseHTMLFragment(html)
    const output = condenseFragment(fragment)

    const expected = `div{"hello"}div{"world"}`
    expect(output).toEqual(expected)
  })
})

function parseHTML(html: string): HTMLElement {
  const dom = new JSDOM(html)
  const { document } = dom.window
  return document.documentElement
}

function parseHTMLFragment(html: string): DocumentFragment {
  return JSDOM.fragment(html)
}
