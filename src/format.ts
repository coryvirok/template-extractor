export type FormatOptions = {
  formatName: (templateNum: number, inline?: boolean) => string
  formatCall: (templateName: string, params: string[]) => string
  formatDefinition: (templateName: string, templateBody: string) => string
  formatBody: (
    tagName: string,
    attributes: Map<string, string>,
    formatChildren: () => string
  ) => string
  formatText: (val: string, type: 'param' | 'content') => string
  formatParam: (paramNum: number) => string
}

export const defaultFormatOptions: FormatOptions = {
  formatName: (templateNum, inline) => (inline ? `X${templateNum}` : `T${templateNum}`),
  formatCall: (templateName, params) => `${templateName}(${params.join(',')})`,
  formatDefinition: (templateName, templateBody) => `${templateName}: ${templateBody}`,
  formatBody: (tagName, attributes, formatChildren) => {
    const parts: string[] = [tagName]
    if (attributes.size) {
      parts.push('[')
      const sortedAttrs = Array.from(attributes.keys()).sort()
      parts.push(
        sortedAttrs
          .map((attr) => {
            const val = attributes.get(attr) as string
            return `${attr}=${val}`
          })
          .join(' ')
      )
      parts.push(']')
    }

    parts.push('{')
    parts.push(formatChildren())
    parts.push('}')

    return parts.join('')
  },
  formatText: (val) => `"${val}"`,
  formatParam: (paramNum) => `$${paramNum}`,
}

export const htmlFormatOptions: FormatOptions = {
  ...defaultFormatOptions,
  formatCall: (templateName, params) =>
    `{${defaultFormatOptions.formatCall(templateName, params)}}`,
  formatBody: (tagName, attributes, formatChildren) => {
    const parts: string[] = [`<${tagName}`]
    if (attributes.size) {
      const sortedAttrs = Array.from(attributes.keys()).sort()
      parts.push(
        ' ',
        sortedAttrs
          .map((attr) => {
            const val = attributes.get(attr) as string
            return `${attr}=${val}`
          })
          .join(' ')
      )
    }
    const childrenPart = formatChildren()
    if (childrenPart.length) {
      parts.push('>', childrenPart, `</${tagName}>`)
    } else {
      parts.push('/>')
    }

    return parts.join('')
  },
  formatText: (val, type) => (type === 'param' ? `"${val}"` : val),
}
