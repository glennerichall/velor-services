import {getConstants} from "../services/baseServices.mjs";
import {ENV_NAME_PREFIX} from "../services/constantKeys.mjs";

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