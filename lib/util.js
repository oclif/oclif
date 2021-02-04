"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
function castArray(input) {
    if (input === undefined)
        return [];
    return Array.isArray(input) ? input : [input];
}
exports.castArray = castArray;
function uniqBy(arr, fn) {
    return arr.filter((a, i) => {
        const aVal = fn(a);
        return !arr.find((b, j) => j > i && fn(b) === aVal);
    });
}
exports.uniqBy = uniqBy;
function compact(a) {
    return a.filter((a) => Boolean(a));
}
exports.compact = compact;
function sortBy(arr, fn) {
    function compare(a, b) {
        a = a === undefined ? 0 : a;
        b = b === undefined ? 0 : b;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length === 0 && b.length === 0)
                return 0;
            const diff = compare(a[0], b[0]);
            if (diff !== 0)
                return diff;
            return compare(a.slice(1), b.slice(1));
        }
        if (a < b)
            return -1;
        if (a > b)
            return 1;
        return 0;
    }
    return arr.sort((a, b) => compare(fn(a), fn(b)));
}
exports.sortBy = sortBy;
exports.template = (context) => (t) => _.template(t || '')(context);
