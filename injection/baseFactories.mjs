import {s_envNameResolver} from "./serviceKeys.mjs";
import {createEnvNameResolver} from "./createEnvNameResolver.mjs";

export const baseFactories = {
    [s_envNameResolver] : createEnvNameResolver,
}