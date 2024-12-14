import {getEmitter} from "../services/services.mjs";
import {EventQueue} from "velor-utils/utils/EventQueue.mjs";

export function createEventQueueInstance(services) {
    let emitter = getEmitter(services);
    return new EventQueue(emitter);
}