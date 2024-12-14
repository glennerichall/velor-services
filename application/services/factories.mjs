import {
    s_emitter,
    s_envNameResolver
} from "./serviceKeys.mjs";
import {createEnvNameResolver} from "../factories/createEnvNameResolver.mjs";
import {Emitter} from "velor-utils/utils/Emitter.mjs";

export const factories = {
    [s_envNameResolver] : createEnvNameResolver,
    [s_emitter] : Emitter,
}