"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = exports.Placeholder = void 0;
class Placeholder {
    constructor(value) {
        this.value = value;
        this.inline = false;
    }
}
exports.Placeholder = Placeholder;
class Template {
    constructor(name, tagName, attributes, children, formatOptions) {
        this.name = name;
        this.tagName = tagName;
        this.inline = false;
        this.referenceCount = 1;
        this.attributes = new Map();
        this.children = [];
        this.formatBody = formatOptions.formatBody;
        this.formatCall = formatOptions.formatCall;
        this.formatParam = formatOptions.formatParam;
        this.formatText = formatOptions.formatText;
        for (const [name, val] of attributes) {
            this.attributes.set(name, val);
        }
        for (const child of children) {
            if (typeof child === 'string') {
                this.children.push(new Placeholder(child));
            }
            else {
                this.children.push(child);
            }
        }
    }
    get sortedAttrs() {
        return Array.from(this.attributes.keys()).sort();
    }
    getNumParams() {
        let counter = Array.from(this.attributes.values()).filter((attr) => !attr.inline).length;
        for (const child of this.children) {
            if (child instanceof Placeholder) {
                if (!child.inline) {
                    counter++;
                }
            }
            else {
                counter += child.getNumParams();
            }
        }
        return counter;
    }
    getCall(paramCounter, paramReplacements) {
        paramCounter = paramCounter !== null && paramCounter !== void 0 ? paramCounter : 1;
        if (this.inline) {
            return this.getBody(paramCounter, paramReplacements);
        }
        const params = new Array(this.getNumParams()).fill('').map((_, i) => {
            const replacement = paramReplacements === null || paramReplacements === void 0 ? void 0 : paramReplacements.get(i + paramCounter);
            let val;
            if (replacement !== undefined) {
                val = this.formatText(replacement, 'param');
            }
            else {
                val = this.formatParam(i + paramCounter);
            }
            return val;
        });
        return this.formatCall(this.name, params);
    }
    getBody(paramCounter, paramReplacements) {
        var _a, _b;
        paramCounter = paramCounter !== null && paramCounter !== void 0 ? paramCounter : 1;
        const attrs = new Map();
        for (const name of this.sortedAttrs) {
            const val = this.attributes.get(name);
            if (val.inline) {
                attrs.set(name, this.formatText((_a = val.value) !== null && _a !== void 0 ? _a : '', 'param'));
            }
            else {
                const replacement = paramReplacements === null || paramReplacements === void 0 ? void 0 : paramReplacements.get(paramCounter);
                let val;
                if (replacement !== undefined) {
                    val = this.formatText(replacement, 'param');
                }
                else {
                    val = this.formatParam(paramCounter);
                }
                attrs.set(name, val);
                paramCounter++;
            }
        }
        const childParts = [];
        for (const child of this.children) {
            const isTemplate = child instanceof Template;
            if (isTemplate) {
                if (child.inline) {
                    childParts.push(child.getBody(paramCounter, paramReplacements));
                }
                else {
                    childParts.push(child.getCall(paramCounter, paramReplacements));
                }
                paramCounter += child.getNumParams();
            }
            else {
                if (child.inline) {
                    childParts.push(this.formatText((_b = child.value) !== null && _b !== void 0 ? _b : '', 'content'));
                }
                else {
                    const replacement = paramReplacements === null || paramReplacements === void 0 ? void 0 : paramReplacements.get(paramCounter);
                    let val;
                    if (replacement !== undefined) {
                        val = this.formatText(replacement, 'content');
                    }
                    else {
                        val = this.formatParam(paramCounter);
                    }
                    childParts.push(val);
                    paramCounter++;
                }
            }
        }
        return this.formatBody(this.tagName, attrs, () => childParts.join(''));
    }
    getUsage(params) {
        const flattenedParams = this.flattenParams(params);
        const numParams = this.getNumParams();
        if (flattenedParams.length !== numParams) {
            throw new Error(`Expected ${numParams} but received ${flattenedParams.length}`);
        }
        if (!this.inline) {
            const params = flattenedParams.map((val) => this.formatText(val, 'param'));
            return this.formatCall(this.name, params);
        }
        const replacements = new Map();
        for (let i = 0; i < flattenedParams.length; ++i) {
            replacements.set(i + 1, flattenedParams[i]);
        }
        return this.getBody(1, replacements);
    }
    flattenParams(params) {
        var _a;
        const flattenedParams = [];
        for (const attr of this.sortedAttrs) {
            const val = params.attrs.get(attr);
            if (!((_a = this.attributes.get(attr)) === null || _a === void 0 ? void 0 : _a.inline)) {
                flattenedParams.push(val);
            }
        }
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            if (child instanceof Template) {
                const val = params.children[i];
                flattenedParams.push(...child.flattenParams(val));
            }
            else {
                if (!child.inline) {
                    const val = params.children[i];
                    flattenedParams.push(val);
                }
            }
        }
        return flattenedParams;
    }
}
exports.Template = Template;
