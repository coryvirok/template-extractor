"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateExtractor = void 0;
exports.condense = condense;
exports.condenseFragment = condenseFragment;
const format_1 = require("./format");
const template_1 = require("./template");
function condense(root, options) {
    const templateExtractor = new TemplateExtractor(root, options);
    return templateExtractor.toString();
}
function condenseFragment(fragment, options) {
    const document = fragment.ownerDocument;
    const wrapper = document.createElement('div');
    Array.from(fragment.children).forEach((child) => wrapper.appendChild(child));
    return condense(wrapper, Object.assign(Object.assign({}, options), { ignoreRoot: true }));
}
class TemplateExtractor {
    constructor(root, options) {
        var _a, _b, _c, _d, _e, _f;
        this.root = root;
        this.templates = new Map();
        this.nodeMap = new Map();
        this.nodeParams = new Map();
        this.reverseNodeLookup = new Map();
        const ignoreRoot = options === null || options === void 0 ? void 0 : options.ignoreRoot;
        this.formatOptions = (_a = options === null || options === void 0 ? void 0 : options.format) !== null && _a !== void 0 ? _a : format_1.defaultFormatOptions;
        const rootTemplate = this.buildNodeTemplate(root, !((_c = (_b = options === null || options === void 0 ? void 0 : options.optimize) === null || _b === void 0 ? void 0 : _b.preserveEmptyWhitespace) !== null && _c !== void 0 ? _c : false));
        this.optimize((_d = options === null || options === void 0 ? void 0 : options.optimize) !== null && _d !== void 0 ? _d : { level: 'full' });
        this.definitions = this.buildDefinitions(ignoreRoot ? [rootTemplate] : []);
        if (ignoreRoot) {
            const usage = [];
            for (const child of root.childNodes) {
                if (child.nodeType === child.TEXT_NODE) {
                    const textContent = (_e = child.textContent) !== null && _e !== void 0 ? _e : '';
                    const preserveEmptyWS = (_f = options === null || options === void 0 ? void 0 : options.optimize) === null || _f === void 0 ? void 0 : _f.preserveEmptyWhitespace;
                    if (!preserveEmptyWS || textContent.trim().length) {
                        usage.push(textContent);
                    }
                }
                else {
                    usage.push(this.getUsage(child));
                }
            }
            this.usage = usage.join('');
        }
        else {
            this.usage = this.getUsage(root);
        }
    }
    toString() {
        if (this.definitions.length) {
            return [...this.definitions, '', this.usage].join('\n');
        }
        return this.usage;
    }
    getUsage(node, params) {
        const template = this.nodeMap.get(node);
        params = params !== null && params !== void 0 ? params : this.nodeParams.get(node);
        if (template === undefined) {
            throw new Error('Missing node template');
        }
        if (params === undefined) {
            throw new Error('Missing node params');
        }
        return template.getUsage(params);
    }
    buildDefinitions(ignoreTemplates) {
        const ignoreLookup = new Set(ignoreTemplates !== null && ignoreTemplates !== void 0 ? ignoreTemplates : []);
        const parts = [];
        for (const template of this.templates.values()) {
            if (template.inline || ignoreLookup.has(template)) {
                continue;
            }
            const definitionEntry = this.formatOptions.formatDefinition(template.name, template.getBody());
            parts.push(definitionEntry);
        }
        return parts;
    }
    buildNodeTemplate(node, stripWhitespace) {
        var _a;
        const isText = node.nodeType === node.TEXT_NODE;
        const isElement = node.nodeType === node.ELEMENT_NODE;
        if ((!isText && !isElement) ||
            (stripWhitespace && isText && !((_a = node.textContent) === null || _a === void 0 ? void 0 : _a.trim().length))) {
            return null;
        }
        if (isText) {
            return new template_1.Placeholder();
        }
        const hash = this.hashNode(node);
        const element = node;
        let template = this.templates.get(hash);
        if (!template) {
            const attrs = new Map();
            for (const attr of element.attributes) {
                attrs.set(attr.name, new template_1.Placeholder());
            }
            const children = [];
            for (const child of element.childNodes) {
                const childTemplateOrPlaceholder = this.buildNodeTemplate(child, stripWhitespace);
                if (childTemplateOrPlaceholder !== null) {
                    children.push(childTemplateOrPlaceholder);
                }
            }
            const templateName = this.formatOptions.formatName(this.templates.size + 1, false);
            template = new template_1.Template(templateName, element.tagName.toLowerCase(), attrs, children, this.formatOptions);
            this.templates.set(hash, template);
        }
        else {
            template.referenceCount++;
        }
        const params = this.paramsFromNode(node, stripWhitespace);
        if (params) {
            this.nodeParams.set(node, params);
        }
        this.nodeMap.set(node, template);
        const reverseFound = this.reverseNodeLookup.get(template);
        if (reverseFound) {
            reverseFound.push(node);
        }
        else {
            this.reverseNodeLookup.set(template, [node]);
        }
        return template;
    }
    paramsFromNode(node, stripWhitespace) {
        var _a, _b;
        const isElement = node.nodeType === node.ELEMENT_NODE;
        if (!isElement) {
            return null;
        }
        const element = node;
        const params = {
            attrs: new Map(Array.from(element.attributes).map((attr) => [attr.name, attr.value])),
            children: [],
        };
        for (const child of element.childNodes) {
            if (child.nodeType === child.TEXT_NODE) {
                if (!stripWhitespace || ((_a = child.textContent) === null || _a === void 0 ? void 0 : _a.trim().length)) {
                    params.children.push((_b = child.textContent) !== null && _b !== void 0 ? _b : '');
                }
            }
            else {
                const childParams = this.paramsFromNode(child, stripWhitespace);
                if (childParams) {
                    params.children.push(childParams);
                }
            }
        }
        return params;
    }
    hashNode(node) {
        const isText = node.nodeType === node.TEXT_NODE;
        const isElement = node.nodeType === node.ELEMENT_NODE;
        if (!isText && !isElement) {
            return '';
        }
        if (isText) {
            return '$';
        }
        const element = node;
        const sortedAttrs = Array.from(element.attributes)
            .map((attr) => attr.name)
            .sort();
        return [
            element.tagName,
            '[',
            sortedAttrs
                .map((attr) => {
                return `${attr}=$}`;
            })
                .join(' '),
            ']',
            '{',
            Array.from(element.childNodes)
                .map((child) => this.hashNode(child))
                .join(''),
            '}',
        ].join('');
    }
    optimize(options) {
        switch (options.level) {
            case 'none':
                return;
            case 'format-only':
                // If we just want to format, inline every template
                // Formatting means we end up with a single template definition that has no
                // placeholders and calls no templates. Everything is expanded/inlined.
                for (const template of this.templates.values()) {
                    template.inline = true;
                }
                break;
            case 'full':
                options = {
                    level: 'granular',
                    inlineStatic: true,
                    inlineShortTemplates: true,
                };
            // esline-disable-next-line no-fallthrough
            case 'granular':
                if (options.inlineStatic) {
                    this.inlineSharedPlaceholders();
                }
                if (options.inlineShortTemplates) {
                    this.inlineShortReferences();
                }
                break;
        }
        this.renameTemplates();
    }
    inlineSharedPlaceholders() {
        for (const [template, nodes] of this.reverseNodeLookup) {
            if (nodes.length === 1) {
                continue;
            }
            const firstNode = nodes[0];
            const firstParams = this.nodeParams.get(firstNode);
            // Look for attributes that have the same value in every node in the group
            for (const attr of firstParams.attrs.keys()) {
                const uniqVals = new Set(nodes.map((node) => {
                    const nodeParams = this.nodeParams.get(node);
                    return nodeParams.attrs.get(attr);
                }));
                // If there is only 1 unique val, it means they all share the same val, so let's
                // inline the attribute's placeholder.
                if (uniqVals.size === 1) {
                    const placeholder = template.attributes.get(attr);
                    placeholder.inline = true;
                    placeholder.value = firstParams.attrs.get(attr);
                }
            }
            // Do the same for children but instead of using attribute name, we will
            // use child position as the key.
            for (let i = 0; i < firstParams.children.length; ++i) {
                // Don't attempt to inline Template children, only Placeholders
                if (typeof firstParams.children[i] !== 'string') {
                    continue;
                }
                const nthChild = nodes.map((node) => {
                    const nodeParams = this.nodeParams.get(node);
                    return nodeParams.children[i];
                });
                const uniqVals = new Set(nthChild);
                if (uniqVals.size === 1) {
                    const placeholder = template.children[i];
                    placeholder.inline = true;
                    placeholder.value = nthChild[0];
                }
            }
        }
    }
    inlineShortReferences() {
        // Look for templates where the inlined size is shorter than the non-inlined size
        for (const template of this.templates.values()) {
            const body = template.getBody();
            // Definition line looks like:
            // T1: <...>
            const definitionSize = template.name.length + 2 + body.length;
            // Calls look like:
            // T1($1,$2)
            const callSize = template.getCall().length;
            // Calculate the size of each instance of the template call + the definition size
            const templatizedSize = definitionSize + callSize * template.referenceCount;
            // Calculate the size of inlining each instance of the template's usage
            const inlinedSize = definitionSize * template.referenceCount;
            // Inline the template if it results in an overall smaller size
            if (inlinedSize < templatizedSize) {
                template.inline = true;
            }
        }
    }
    renameTemplates() {
        // Go through all templates and rename based on if they're inlined.
        // The default formatter uses the format X# for inlined and T# for non-inlined templates.
        const seen = new Set();
        const result = [];
        function traverse(template) {
            // First, visit all children
            for (const child of template.children) {
                if (child instanceof template_1.Template && !seen.has(child)) {
                    traverse(child);
                }
            }
            // Then add the current node
            result.push(template);
            seen.add(template);
        }
        // Create an array containing all templates, in depth first order
        const rootTemplate = this.nodeMap.get(this.root);
        traverse(rootTemplate);
        // Verify the number of ordered templates matches the number in this.templates
        if (result.length !== this.templates.size) {
            throw new Error('Wrong number of ordered templates');
        }
        let inlineCounter = 0;
        let nonInlineCounter = 0;
        for (let i = 0; i < result.length; ++i) {
            const template = result[i];
            if (template.inline) {
                inlineCounter++;
                template.name = this.formatOptions.formatName(inlineCounter, true);
            }
            else {
                nonInlineCounter++;
                template.name = this.formatOptions.formatName(nonInlineCounter, false);
            }
        }
    }
}
exports.TemplateExtractor = TemplateExtractor;
