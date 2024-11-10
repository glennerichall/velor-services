import {ENV_NAME_PREFIX} from "./ServicesContext.mjs";
import {getConstants} from "./baseServices.mjs";

export function createEnvNameResolver(services) {
    let constants = getConstants(services);
    return {
        resolve(name) {
            let prefix = constants[ENV_NAME_PREFIX];
            if (prefix) {
                return prefix + "_" + name;
            }
            return name;
        }
    }
}