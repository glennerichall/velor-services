import {factories as defaultFactories} from "./factories.mjs";

export function mergeDefaultServicesOptions(options = {}) {
    let {
        factories = {},
    } = options;

    return {
        ...options,

        factories: {
            ...defaultFactories,
            ...factories,
        },
    }
}