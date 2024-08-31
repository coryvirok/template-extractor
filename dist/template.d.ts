import type { FormatOptions } from './format';
export type NodeParams = {
    attrs: Map<string, string>;
    children: (string | NodeParams)[];
};
export declare class Placeholder {
    value?: string | undefined;
    inline: boolean;
    constructor(value?: string | undefined);
}
export declare class Template {
    name: string;
    tagName: string;
    inline: boolean;
    referenceCount: number;
    attributes: Map<string, Placeholder>;
    children: (Placeholder | Template)[];
    private formatBody;
    private formatCall;
    private formatParam;
    private formatText;
    constructor(name: string, tagName: string, attributes: Map<string, Placeholder>, children: (Placeholder | Template)[], formatOptions: FormatOptions);
    private get sortedAttrs();
    getNumParams(): number;
    getCall(paramCounter?: number, paramReplacements?: Map<number, string>): string;
    getBody(paramCounter?: number, paramReplacements?: Map<number, string>): string;
    getUsage(params: NodeParams): string;
    private flattenParams;
}
