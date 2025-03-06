import {getConstants} from "../services/baseServices.mjs";
import {
    STORAGE_NAME_PREFIX
} from "../services/constantKeys.mjs";

export function createStorageNameResolver(services) {
    let constants = getConstants(services);
    return {
        resolve(name) {
            let prefix = constants[STORAGE_NAME_PREFIX];
            if (prefix) {
                return prefix + "_" + name;
            }
            return name;
        }
    }
}