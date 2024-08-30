import { defaultFormatOptions } from './format'
import { Placeholder, Template } from './template'

import type { FormatOptions } from './format'
import type { NodeParams } from './template'

export type TemplateExtractorOptions = {
  optimize?: OptimizationOptions
  format?: FormatOptions
  ignoreRoot?: boolean
}

type OptimizationOptions = (
  | {
      level: 'format-only'
    }
  | {
      level: 'full'
    }
  | {
      level: 'none'
    }
  | {
      level: 'granular'
      inlineStatic?: boolean
      inlineShortTemplates?: boolean
    }
) & { preserveEmptyWhitespace?: boolean }

export function condense(root: HTMLElement, options?: TemplateExtractorOptions) {
  const templateExtractor = new TemplateExtractor(root, options)
  return templateExtractor.toString()
}

export function condenseFragment(fragment: DocumentFragment, options?: TemplateExtractorOptions) {
  const document = fragment.ownerDocument
  const wrapper = document.createElement('div')

  Array.from(fragment.children).forEach((child) => wrapper.appendChild(child))

  return condense(wrapper, { ...options, ignoreRoot: true })
}

export class TemplateExtractor {
  private definitions: string[]
  private usage: string
  private templates = new Map<string, Template>()
  private nodeMap = new Map<Node, Template>()
  private nodeParams = new Map<Node, NodeParams>()
  private reverseNodeLookup = new Map<Template, Node[]>()
  private formatOptions: NonNullable<TemplateExtractorOptions['format']>

  constructor(
    private root: HTMLElement,
    options?: TemplateExtractorOptions
  ) {
    const ignoreRoot = options?.ignoreRoot
    this.formatOptions = options?.format ?? defaultFormatOptions

    const rootTemplate = this.buildNodeTemplate(
      root,
      !(options?.optimize?.preserveEmptyWhitespace ?? false)
    ) as Template
    this.optimize(options?.optimize ?? { level: 'full' })

    this.definitions = this.buildDefinitions(ignoreRoot ? [rootTemplate] : [])

    if (ignoreRoot) {
      const usage: string[] = []
      for (const child of root.childNodes) {
        if (child.nodeType === child.TEXT_NODE) {
          const textContent = child.textContent ?? ''
          const preserveEmptyWS = options?.optimize?.preserveEmptyWhitespace
          if (!preserveEmptyWS || textContent.trim().length) {
            usage.push(textContent)
          }
        } else {
          usage.push(this.getUsage(child))
        }
      }
      this.usage = usage.join('')
    } else {
      this.usage = this.getUsage(root)
    }
  }

  toString() {
    if (this.definitions.length) {
      return [...this.definitions, '', this.usage].join('\n')
    }
    return this.usage
  }

  getUsage(node: Node, params?: NodeParams) {
    const template = this.nodeMap.get(node)
    params = params ?? this.nodeParams.get(node)

    if (template === undefined) {
      throw new Error('Missing node template')
    }

    if (params === undefined) {
      throw new Error('Missing node params')
    }

    return template.getUsage(params)
  }

  private buildDefinitions(ignoreTemplates?: Template[]) {
    const ignoreLookup = new Set<Template>(ignoreTemplates ?? [])
    const parts: string[] = []

    for (const template of this.templates.values()) {
      if (template.inline || ignoreLookup.has(template)) {
        continue
      }

      const definitionEntry = this.formatOptions.formatDefinition(template.name, template.getBody())
      parts.push(definitionEntry)
    }
    return parts
  }

  private buildNodeTemplate(node: Node, stripWhitespace: boolean) {
    const isText = node.nodeType === node.TEXT_NODE
    const isElement = node.nodeType === node.ELEMENT_NODE

    if (
      (!isText && !isElement) ||
      (stripWhitespace && isText && !node.textContent?.trim().length)
    ) {
      return null
    }

    if (isText) {
      return new Placeholder()
    }

    const hash = this.hashNode(node)
    const element = node as HTMLElement

    let template = this.templates.get(hash)
    if (!template) {
      const attrs = new Map<string, Placeholder>()
      for (const attr of element.attributes) {
        attrs.set(attr.name, new Placeholder())
      }

      const children: (Placeholder | Template)[] = []
      for (const child of element.childNodes) {
        const childTemplateOrPlaceholder = this.buildNodeTemplate(child, stripWhitespace)
        if (childTemplateOrPlaceholder !== null) {
          children.push(childTemplateOrPlaceholder)
        }
      }

      const templateName = this.formatOptions.formatName(this.templates.size + 1, false)

      template = new Template(
        templateName,
        element.tagName.toLowerCase(),
        attrs,
        children,
        this.formatOptions
      )

      this.templates.set(hash, template)
    } else {
      template.referenceCount++
    }

    const params = this.paramsFromNode(node, stripWhitespace)
    if (params) {
      this.nodeParams.set(node, params)
    }
    this.nodeMap.set(node, template)

    const reverseFound = this.reverseNodeLookup.get(template)
    if (reverseFound) {
      reverseFound.push(node)
    } else {
      this.reverseNodeLookup.set(template, [node])
    }

    return template
  }

  private paramsFromNode(node: Node, stripWhitespace: boolean) {
    const isElement = node.nodeType === node.ELEMENT_NODE

    if (!isElement) {
      return null
    }

    const element = node as HTMLElement
    const params: NodeParams = {
      attrs: new Map(Array.from(element.attributes).map((attr) => [attr.name, attr.value])),
      children: [],
    }

    for (const child of element.childNodes) {
      if (child.nodeType === child.TEXT_NODE) {
        if (!stripWhitespace || child.textContent?.trim().length) {
          params.children.push(child.textContent ?? '')
        }
      } else {
        const childParams = this.paramsFromNode(child, stripWhitespace)
        if (childParams) {
          params.children.push(childParams)
        }
      }
    }

    return params
  }

  private hashNode(node: Node): string {
    const isText = node.nodeType === node.TEXT_NODE
    const isElement = node.nodeType === node.ELEMENT_NODE

    if (!isText && !isElement) {
      return ''
    }

    if (isText) {
      return '$'
    }

    const element = node as Element
    const sortedAttrs = Array.from(element.attributes)
      .map((attr) => attr.name)
      .sort()

    return [
      element.tagName,
      '[',
      sortedAttrs
        .map((attr) => {
          return `${attr}=$}`
        })
        .join(' '),
      ']',
      '{',
      Array.from(element.childNodes)
        .map((child) => this.hashNode(child))
        .join(''),
      '}',
    ].join('')
  }

  private optimize(options: OptimizationOptions) {
    switch (options.level) {
      case 'none':
        return
      case 'format-only':
        // If we just want to format, inline every template
        // Formatting means we end up with a single template definition that has no
        // placeholders and calls no templates. Everything is expanded/inlined.
        for (const template of this.templates.values()) {
          template.inline = true
        }
        break
      case 'full':
        options = {
          level: 'granular',
          inlineStatic: true,
          inlineShortTemplates: true,
        }
      // esline-disable-next-line no-fallthrough
      case 'granular':
        if (options.inlineStatic) {
          this.inlineSharedPlaceholders()
        }
        if (options.inlineShortTemplates) {
          this.inlineShortReferences()
        }
        break
    }

    this.renameTemplates()
  }

  private inlineSharedPlaceholders() {
    for (const [template, nodes] of this.reverseNodeLookup) {
      if (nodes.length === 1) {
        continue
      }

      const firstNode = nodes[0]
      const firstParams = this.nodeParams.get(firstNode) as NodeParams

      // Look for attributes that have the same value in every node in the group
      for (const attr of firstParams.attrs.keys()) {
        const uniqVals = new Set(
          nodes.map((node) => {
            const nodeParams = this.nodeParams.get(node) as NodeParams
            return nodeParams.attrs.get(attr) as string
          })
        )

        // If there is only 1 unique val, it means they all share the same val, so let's
        // inline the attribute's placeholder.
        if (uniqVals.size === 1) {
          const placeholder = template.attributes.get(attr) as Placeholder
          placeholder.inline = true
          placeholder.value = firstParams.attrs.get(attr)
        }
      }

      // Do the same for children but instead of using attribute name, we will
      // use child position as the key.
      for (let i = 0; i < firstParams.children.length; ++i) {
        // Don't attempt to inline Template children, only Placeholders
        if (typeof firstParams.children[i] !== 'string') {
          continue
        }

        const nthChild = nodes.map((node) => {
          const nodeParams = this.nodeParams.get(node) as NodeParams
          return nodeParams.children[i] as string
        })
        const uniqVals = new Set<string>(nthChild)

        if (uniqVals.size === 1) {
          const placeholder = template.children[i] as Placeholder
          placeholder.inline = true
          placeholder.value = nthChild[0]
        }
      }
    }
  }

  private inlineShortReferences() {
    // Look for templates where the inlined size is shorter than the non-inlined size
    for (const template of this.templates.values()) {
      const body = template.getBody()

      // Definition line looks like:
      // T1: <...>
      const definitionSize = template.name.length + 2 + body.length

      // Calls look like:
      // T1($1,$2)
      const callSize = template.getCall().length

      // Calculate the size of each instance of the template call + the definition size
      const templatizedSize = definitionSize + callSize * template.referenceCount

      // Calculate the size of inlining each instance of the template's usage
      const inlinedSize = definitionSize * template.referenceCount

      // Inline the template if it results in an overall smaller size
      if (inlinedSize < templatizedSize) {
        template.inline = true
      }
    }
  }

  private renameTemplates() {
    // Go through all templates and rename based on if they're inlined.
    // The default formatter uses the format X# for inlined and T# for non-inlined templates.

    const seen = new Set<Template>()
    const result: Template[] = []

    function traverse(template: Template) {
      // First, visit all children
      for (const child of template.children) {
        if (child instanceof Template && !seen.has(child)) {
          traverse(child)
        }
      }
      // Then add the current node
      result.push(template)
      seen.add(template)
    }

    // Create an array containing all templates, in depth first order
    const rootTemplate = this.nodeMap.get(this.root) as Template
    traverse(rootTemplate)

    // Verify the number of ordered templates matches the number in this.templates
    if (result.length !== this.templates.size) {
      throw new Error('Wrong number of ordered templates')
    }

    let inlineCounter = 0
    let nonInlineCounter = 0
    for (let i = 0; i < result.length; ++i) {
      const template = result[i]
      if (template.inline) {
        inlineCounter++
        template.name = this.formatOptions.formatName(inlineCounter, true)
      } else {
        nonInlineCounter++
        template.name = this.formatOptions.formatName(nonInlineCounter, false)
      }
    }
  }
}
