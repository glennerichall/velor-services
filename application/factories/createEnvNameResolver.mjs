import {ENV_NAME_PREFIX} from "../../injection/ServicesContext.mjs";
import {getConstants} from "../services/baseServices.mjs";

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