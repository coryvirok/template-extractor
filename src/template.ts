import type { FormatOptions } from './format'

export type NodeParams = { attrs: Map<string, string>; children: (string | NodeParams)[] }

export class Placeholder {
  inline = false
  constructor(public value?: string) {}
}

export class Template {
  inline = false
  referenceCount = 1
  attributes = new Map<string, Placeholder>()
  children: (Placeholder | Template)[] = []

  private formatBody: FormatOptions['formatBody']
  private formatCall: FormatOptions['formatCall']
  private formatParam: FormatOptions['formatParam']
  private formatText: FormatOptions['formatText']

  constructor(
    public name: string,
    public tagName: string,
    attributes: Map<string, Placeholder>,
    children: (Placeholder | Template)[],
    formatOptions: FormatOptions
  ) {
    this.formatBody = formatOptions.formatBody
    this.formatCall = formatOptions.formatCall
    this.formatParam = formatOptions.formatParam
    this.formatText = formatOptions.formatText

    for (const [name, val] of attributes) {
      this.attributes.set(name, val)
    }
    for (const child of children) {
      if (typeof child === 'string') {
        this.children.push(new Placeholder(child))
      } else {
        this.children.push(child)
      }
    }
  }

  private get sortedAttrs() {
    return Array.from(this.attributes.keys()).sort()
  }

  getNumParams() {
    let counter = Array.from(this.attributes.values()).filter((attr) => !attr.inline).length
    for (const child of this.children) {
      if (child instanceof Placeholder) {
        if (!child.inline) {
          counter++
        }
      } else {
        counter += child.getNumParams()
      }
    }
    return counter
  }

  getCall(paramCounter?: number, paramReplacements?: Map<number, string>) {
    paramCounter = paramCounter ?? 1
    if (this.inline) {
      return this.getBody(paramCounter, paramReplacements)
    }

    const params = new Array(this.getNumParams()).fill('').map((_, i) => {
      const replacement = paramReplacements?.get(i + paramCounter)
      let val
      if (replacement !== undefined) {
        val = this.formatText(replacement, 'param')
      } else {
        val = this.formatParam(i + paramCounter)
      }
      return val
    })
    return this.formatCall(this.name, params)
  }

  getBody(paramCounter?: number, paramReplacements?: Map<number, string>): string {
    paramCounter = paramCounter ?? 1
    const attrs = new Map<string, string>()
    for (const name of this.sortedAttrs) {
      const val = this.attributes.get(name) as Placeholder
      if (val.inline) {
        attrs.set(name, this.formatText(val.value ?? '', 'param'))
      } else {
        const replacement = paramReplacements?.get(paramCounter)
        let val: string

        if (replacement !== undefined) {
          val = this.formatText(replacement, 'param')
        } else {
          val = this.formatParam(paramCounter)
        }
        attrs.set(name, val)
        paramCounter++
      }
    }

    const childParts: string[] = []
    for (const child of this.children) {
      const isTemplate = child instanceof Template
      if (isTemplate) {
        if (child.inline) {
          childParts.push(child.getBody(paramCounter, paramReplacements))
        } else {
          childParts.push(child.getCall(paramCounter, paramReplacements))
        }
        paramCounter += child.getNumParams()
      } else {
        if (child.inline) {
          childParts.push(this.formatText(child.value ?? '', 'content'))
        } else {
          const replacement = paramReplacements?.get(paramCounter)
          let val
          if (replacement !== undefined) {
            val = this.formatText(replacement, 'content')
          } else {
            val = this.formatParam(paramCounter)
          }
          childParts.push(val)
          paramCounter++
        }
      }
    }

    return this.formatBody(this.tagName, attrs, () => childParts.join(''))
  }

  getUsage(params: NodeParams) {
    const flattenedParams = this.flattenParams(params)
    const numParams = this.getNumParams()

    if (flattenedParams.length !== numParams) {
      throw new Error(`Expected ${numParams} but received ${flattenedParams.length}`)
    }

    if (!this.inline) {
      const params = flattenedParams.map((val) => this.formatText(val, 'param'))
      return this.formatCall(this.name, params)
    }

    const replacements = new Map<number, string>()
    for (let i = 0; i < flattenedParams.length; ++i) {
      replacements.set(i + 1, flattenedParams[i])
    }

    return this.getBody(1, replacements)
  }

  private flattenParams(params: NodeParams) {
    const flattenedParams: string[] = []

    for (const attr of this.sortedAttrs) {
      const val = params.attrs.get(attr) as string
      if (!this.attributes.get(attr)?.inline) {
        flattenedParams.push(val)
      }
    }

    for (let i = 0; i < this.children.length; ++i) {
      const child = this.children[i]
      if (child instanceof Template) {
        const val = params.children[i] as NodeParams
        flattenedParams.push(...child.flattenParams(val))
      } else {
        if (!child.inline) {
          const val = params.children[i] as string
          flattenedParams.push(val)
        }
      }
    }

    return flattenedParams
  }
}
