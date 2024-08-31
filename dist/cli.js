"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const jsdom_1 = require("jsdom");
const _1 = require(".");
const format_1 = require("./format");
function main() {
    var _a;
    let input;
    let format = 'default';
    let args = process.argv.slice(2);
    if (((_a = args[0]) !== null && _a !== void 0 ? _a : '') === '--html') {
        format = 'html';
        args = args.slice(1);
    }
    if (args.length) {
        input = args.join(' ');
    }
    else {
        input = (0, fs_1.readFileSync)(0, 'utf-8');
    }
    const jsdom = new jsdom_1.JSDOM(input);
    const doc = jsdom.window.document;
    const options = {};
    if (format === 'html') {
        options.format = format_1.htmlFormatOptions;
    }
    const condensed = (0, _1.condense)(doc.documentElement, options);
    console.log(condensed);
}
main();
