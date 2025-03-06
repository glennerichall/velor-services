import {
    s_emitter,
    s_envNameResolver,
    s_eventQueue,
    s_localStorage,
    s_storageNameResolver
} from "./serviceKeys.mjs";
import {createEnvNameResolver} from "../factories/createEnvNameResolver.mjs";
import {Emitter} from "velor-utils/utils/Emitter.mjs";
import {createEventQueueInstance} from "../factories/createEventQueueInstance.mjs";
import {createStorageNameResolver} from "../factories/createStorageNamesResolver.mjs";

export const factories = {
    [s_envNameResolver]: createEnvNameResolver,
    [s_storageNameResolver]: createStorageNameResolver,
    [s_emitter]: Emitter,
    [s_eventQueue]: createEventQueueInstance,
    [s_localStorage]: createLocalStorageInstance,
}