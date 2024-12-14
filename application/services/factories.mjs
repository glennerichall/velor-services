import {
    s_emitter,
    s_envNameResolver,
    s_eventQueue
} from "./serviceKeys.mjs";
import {createEnvNameResolver} from "../factories/createEnvNameResolver.mjs";
import {Emitter} from "velor-utils/utils/Emitter.mjs";
import {EventQueue} from "velor-utils/utils/EventQueue.mjs";

export const factories = {
    [s_envNameResolver] : createEnvNameResolver,
    [s_emitter] : Emitter,
    [s_eventQueue] : EventQueue,
}