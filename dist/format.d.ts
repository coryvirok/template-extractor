export type FormatOptions = {
    formatName: (templateNum: number, inline?: boolean) => string;
    formatCall: (templateName: string, params: string[]) => string;
    formatDefinition: (templateName: string, templateBody: string) => string;
    formatBody: (tagName: string, attributes: Map<string, string>, formatChildren: () => string) => string;
    formatText: (val: string, type: 'param' | 'content') => string;
    formatParam: (paramNum: number) => string;
};
export declare const defaultFormatOptions: FormatOptions;
export declare const htmlFormatOptions: FormatOptions;
