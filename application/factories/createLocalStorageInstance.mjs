import {getStorageNameResolver} from "../services/services.mjs";
import {LocalStorage} from "velor-utils/utils/LocalStorage.mjs";

export function createLocalStorageInstance(services) {
    let resolver = getStorageNameResolver(services);
    let storage = new LocalStorage();

    return {
        getValue(key, defaultValue) {
            key = resolver.resolve(key);
            return storage.getValue(key, defaultValue);
        },

        setValue(key, value) {
            key = resolver.resolve(key);
            storage.setValue(key, value);
        },

        removeValue(key) {
            key = resolver.resolve(key);
            storage.removeValue(key);
        },

        clear() {
            storage.clear();
        }
    };
}