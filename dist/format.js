"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlFormatOptions = exports.defaultFormatOptions = void 0;
exports.defaultFormatOptions = {
    formatName: (templateNum, inline) => (inline ? `X${templateNum}` : `T${templateNum}`),
    formatCall: (templateName, params) => `${templateName}(${params.join(',')})`,
    formatDefinition: (templateName, templateBody) => `${templateName}: ${templateBody}`,
    formatBody: (tagName, attributes, formatChildren) => {
        const parts = [tagName];
        if (attributes.size) {
            parts.push('[');
            const sortedAttrs = Array.from(attributes.keys()).sort();
            parts.push(sortedAttrs
                .map((attr) => {
                const val = attributes.get(attr);
                return `${attr}=${val}`;
            })
                .join(' '));
            parts.push(']');
        }
        parts.push('{');
        parts.push(formatChildren());
        parts.push('}');
        return parts.join('');
    },
    formatText: (val) => `"${val}"`,
    formatParam: (paramNum) => `$${paramNum}`,
};
exports.htmlFormatOptions = Object.assign(Object.assign({}, exports.defaultFormatOptions), { formatCall: (templateName, params) => `{${exports.defaultFormatOptions.formatCall(templateName, params)}}`, formatBody: (tagName, attributes, formatChildren) => {
        const parts = [`<${tagName}`];
        if (attributes.size) {
            const sortedAttrs = Array.from(attributes.keys()).sort();
            parts.push(' ', sortedAttrs
                .map((attr) => {
                const val = attributes.get(attr);
                return `${attr}=${val}`;
            })
                .join(' '));
        }
        const childrenPart = formatChildren();
        if (childrenPart.length) {
            parts.push('>', childrenPart, `</${tagName}>`);
        }
        else {
            parts.push('/>');
        }
        return parts.join('');
    }, formatText: (val, type) => (type === 'param' ? `"${val}"` : val) });
