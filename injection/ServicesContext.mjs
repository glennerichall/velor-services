import {isClass} from "./isClass.mjs";
import {getGlobalContext} from "velor-utils/utils/global.mjs";
import {baseFactories} from "./baseFactories.mjs";

let __id__ = 0;

export const SCOPE_SINGLETON = 'singleton';
export const SCOPE_INSTANCE = 'instance';
export const SCOPE_PROTOTYPE = 'prototype';
export const SCOPE_REQUEST = 'request';
export const ENV_NAME_PREFIX = Symbol('env_name_prefix');

let instanceUuid = 0;
let uuidSymbol = Symbol('uuid');
let keySymbol = Symbol('key');
let servicesSymbol = Symbol('services');

export function getUuid(instance) {
    return instance[uuidSymbol];
}

export function isInstanceKey(key) {
    return typeof key === 'string';
}

export function isServiceAware(serviceAware) {
    return serviceAware instanceof ServicesContext ||
        serviceAware && serviceAware[servicesSymbol] instanceof ServicesContext ||
        serviceAware?.services instanceof ServicesContext;
}

export function mergeDefaultServicesOptions(options = {}) {
    let {
        factories = {},
    } = options;

    return {
        ...options,

        factories: {
            ...baseFactories,
            ...factories,
        },
    }
}

export function createAppServicesInstance(options, type) {
    options = mergeDefaultServicesOptions(options ?? {});
    return new ServicesContext(options, type);
}

export function getAppServices(type) {
    let contexts = getGlobalContext()[servicesSymbol];
    if (contexts) {
        if (type !== undefined) {
            return contexts[type];
        } else {
            let types = Object.keys(contexts);
            if (types.length > 0) {
                return contexts[types[0]];
            }
        }
    }
}

export function getServices(serviceAware) {
    if (serviceAware !== undefined) {
        if (serviceAware instanceof ServicesContext) {
            return serviceAware;
        } else if (serviceAware[servicesSymbol] instanceof ServicesContext) {
            return serviceAware[servicesSymbol];
        } else if (serviceAware?.services instanceof ServicesContext) {
            return serviceAware.services;
        } else {
            throw new Error(`serviceAware must be a ServicesContext or an object aware of services`);
        }
    } else {
        return getAppServices();
    }
}

export function getServiceBinder(serviceAware) {
    return {
        makeServiceAware(instance) {
            instance[servicesSymbol] = getServices(serviceAware);
            return instance;
        },
        autoWire(instance) {
            instance = this.makeServiceAware(instance);
            if (typeof instance.initialize === 'function') {
                let result = instance.initialize();
                if (result instanceof Promise) {
                    result.catch(e => console.error(e))
                }
            }
            return instance;
        },
        createInstance(classOrKey, ...args) {
            let instance;
            if (isInstanceKey(classOrKey)) {
                const factory = serviceAware.getFactoryForKey(classOrKey);
                if (typeof factory === "function") {
                    instance = factory(serviceAware, ...args);
                    instance[keySymbol] = classOrKey;
                } else {
                    throw new Error(`Provide a factory function for key ${classOrKey}`);
                }
            } else if (isClass(classOrKey)) {
                instance = new classOrKey(...args);
            } else {
                throw new Error("Provide a class or an instance key");
            }
            instance[uuidSymbol] = ++instanceUuid;
            return this.autoWire(instance);
        },
        clone(instance, ...args) {
            return this.createInstance(instance.constructor, ...args);
        }
    }
}


export class ServicesContext {
    #id;
    #type;
    #constants;
    #commutators;
    #env;
    #factories;
    #scopes;
    #classes;

    constructor(options, type) {
        if (options) {
            this.copy(options);
        }
        this.#type = type;
    }

    get id() {
        return this.#id;
    }

    get type() {
        return this.#type;
    }

    get constants() {
        return this.#constants;
    }

    get commutators() {
        return this.#commutators;
    }

    get provider() {
        const self = this;
        return new Proxy({}, {
            get(target, key, receiver) {
                return (...args) => {
                    const scope = self.getScopeForKey(key);
                    let instance;

                    if (scope !== SCOPE_PROTOTYPE && !self.scopes[scope]) {
                        throw new Error(`Define scope "${scope}" in ServicesContext`);
                    }
                    for (let s in self.scopes) {
                        instance = self.scopes[s][key];
                        if (instance) {
                            if (!isServiceAware(instance)) {
                                instance = getServiceBinder(self).makeServiceAware(instance);
                            }
                            break;
                        }
                    }

                    if (instance === undefined) {
                        if (scope === SCOPE_INSTANCE) {
                            throw new Error(`Provide the instance for "${key}" or set its scope and provide a factory function`);
                        }
                        // create a lazy instance, that is, an instance that will be factory created only once
                        // a [Symbol] has been call. This is mandatory to resolve circular dependencies
                        // while injecting instances in builders.
                        // instance = new Proxy({}, {
                        //     get(target, key, receiver) {
                        //         if (!target.instance) {
                        //             target.instance = factory(self);
                        //         }
                        //         let value = target.instance[key];
                        //
                        //         if (typeof value === 'function' && !value.__bound) {
                        //             // FIXME find a way to properly check if we need to rebind the function.
                        //             value = value.bind(target.instance);
                        //             value.__bound = true; // Mark the method as bound
                        //         }
                        //
                        //         return value;
                        //     }
                        // });

                        instance = getServiceBinder(self).createInstance(key, ...args);
                        instance = self.onCreateInstance(instance, key, self, receiver);

                        // for prototype scope, a new instance is created on each call
                        // consequently we do not save the instance in scopes
                        if (scope !== SCOPE_PROTOTYPE) {
                            self.scopes[scope][key] = instance;
                        }
                    }

                    return instance;
                }
            }
        });
    }

    get env() {
        return this.#env;
    }

    get factories() {
        return this.#factories;
    }

    get scopes() {
        return this.#scopes;
    }

    get classes() {
        return this.#classes;
    }

    getScopeForKey(key) {
        let definition = this.#factories[key];
        let scope;
        if (typeof definition === 'object') {
            scope = definition.scope ?? SCOPE_SINGLETON;
        } else if (typeof definition === 'function') {
            scope = SCOPE_SINGLETON;
        } else {
            scope = SCOPE_INSTANCE;
        }
        return scope;
    }

    getFactoryForKey(key) {
        let definition = this.#factories[key];
        let clazz = this.#classes[key];
        let factory;
        if (clazz && definition) {
            throw new Error(`Provide a class or a factory for "${key}" not both`);
        } else if (!clazz && !definition) {
            throw new Error(`Provide a factory or a class for "${key}"`);
        }
        if (typeof definition === 'object') {
            if (typeof definition.factory === 'function') {
                factory = definition.factory;
            } else if (isClass(definition.clazz)) {
                factory = (_, ...args) => new definition.clazz(...args);
            }
        } else if (typeof definition === 'function') {
            if (isClass(definition)) {
                factory = (_, ...args) => new definition(...args);
            } else {
                factory = definition;
            }
        } else if (isClass(clazz)) {
            factory = (_, ...args) => new clazz(...args);
        }
        return factory;
    }

    copy(services) {
        let {
            env = {},
            factories = {},
            scopes = {
                singleton: {}
            },
            commutators = {},
            constants = {},
            id = 'context',
            classes = {},
            onCreateInstance = instance => instance
        } = services;

        this.#type = services.type;

        this.#id = id + "::" + ++__id__;
        this.#constants = {...constants};
        this.#scopes = {...scopes};
        this.#env = {...env};
        this.#factories = {...factories};
        this.#commutators = {...commutators};
        this.#classes = {...classes};
        this.onCreateInstance = onCreateInstance;

        if (!this.#scopes[SCOPE_INSTANCE]) {
            this.#scopes[SCOPE_INSTANCE] = {}
        }

        return this;
    }

    merge(services) {

        this.#constants = {
            ...this.constants,
            ...services.constants
        };

        this.#commutators = {
            ...this.commutators,
            ...services.commutators
        };

        this.#env = {
            ...this.env,
            ...services.env
        };

        this.#factories = {
            ...this.#factories,
            ...services.factories
        };

        this.#scopes = {
            ...this.#scopes,
            ...services.scopes
        };

        if (!this.#scopes[SCOPE_INSTANCE]) {
            this.#scopes[SCOPE_INSTANCE] = {}
        }

        this.#classes = {
            ...this.#classes,
            ...services.classes
        };

        return this;
    }

    clone(services) {
        let instance = new ServicesContext(this, this.type);
        if (services) {
            instance.merge(services);
        }
        return instance;
    }
}
