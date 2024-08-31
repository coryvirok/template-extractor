import type { FormatOptions } from './format';
import type { NodeParams } from './template';
export type TemplateExtractorOptions = {
    optimize?: OptimizationOptions;
    format?: FormatOptions;
    ignoreRoot?: boolean;
};
type OptimizationOptions = ({
    level: 'format-only';
} | {
    level: 'full';
} | {
    level: 'none';
} | {
    level: 'granular';
    inlineStatic?: boolean;
    inlineShortTemplates?: boolean;
}) & {
    preserveEmptyWhitespace?: boolean;
};
export declare function condense(root: HTMLElement, options?: TemplateExtractorOptions): string;
export declare function condenseFragment(fragment: DocumentFragment, options?: TemplateExtractorOptions): string;
export declare class TemplateExtractor {
    private root;
    private definitions;
    private usage;
    private templates;
    private nodeMap;
    private nodeParams;
    private reverseNodeLookup;
    private formatOptions;
    constructor(root: HTMLElement, options?: TemplateExtractorOptions);
    toString(): string;
    getUsage(node: Node, params?: NodeParams): string;
    private buildDefinitions;
    private buildNodeTemplate;
    private paramsFromNode;
    private hashNode;
    private optimize;
    private inlineSharedPlaceholders;
    private inlineShortReferences;
    private renameTemplates;
}
export {};
