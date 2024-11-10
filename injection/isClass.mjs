
export function isClass(value) {
    return typeof value === 'function' && /^class\s/.test(value.toString());
}
