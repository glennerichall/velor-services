import {baseFactories} from "./baseFactories.mjs";

export function mergeDefaultServicesOptions(options = {}) {
    let {
        factories = {},
    } = options;

    return {
        ...options,

        factories: {
            ...baseFactories,
            ...factories,
        },
    }
}