import {isClass} from "./isClass.mjs";
import {getGlobalContext} from "velor-utils/utils/global.mjs";
import {mergeDefaultServicesOptions} from "./mergeDefaultServicesOptions.mjs";

let __id__ = 0;

export const SCOPE_SINGLETON = 'singleton';
export const SCOPE_PROTOTYPE = 'prototype';
export const SCOPE_REQUEST = 'request';
export const ENV_NAME_PREFIX = Symbol('env_name_prefix');

let instanceUuid = 0;
let uuidSymbol = Symbol('uuid');
let keySymbol = Symbol('key');
let servicesSymbol = Symbol('services');
let holderSymbol = Symbol('services-holder');
let envSymbol = Symbol('services-env');
let factoriesSymbol = Symbol('services-factories');
let classesSymbol = Symbol('services-classes');
let constantsSymbol = Symbol('services-constants');
let scopesSymbol = Symbol('services-scopes');
let isServiceSymbol = Symbol('services-type');

export function getUuid(instance) {
    return instance[uuidSymbol];
}

export function getEnvironment(servicesAware) {
    return getServices(servicesAware)[envSymbol];
}

export function getFactories(servicesAware) {
    return getServices(servicesAware)[factoriesSymbol];
}

export function getConstants(servicesAware) {
    return getServices(servicesAware)[constantsSymbol];
}

export function getProvider(servicesAware) {
    return createServiceProvider(servicesAware);
}

function isService(serviceAware) {
    return !!serviceAware && serviceAware[isServiceSymbol];
}

function hasServiceBound(serviceAware) {
    return !!serviceAware && isService(serviceAware[servicesSymbol]);
}

function hasServiceProperty(serviceAware) {
    return isService(serviceAware?.services);
}

export function isServiceAware(serviceAware) {
    return isService(serviceAware) ||
        hasServiceBound(serviceAware) ||
        hasServiceProperty(serviceAware);
}

export function createAppServicesInstance(options, type = 'none') {
    options = mergeDefaultServicesOptions(options ?? {});
    let {
        env = {},
        factories = {},

        constants = {},
        id = 'context',
        classes = {},
    } = options;

    id = id + "::" + ++__id__;
    constants = {...constants};
    let scopes = {
        [SCOPE_SINGLETON]: {},
        [SCOPE_REQUEST]: {}
    };
    env = {...env};
    factories = {...factories};
    classes = {...classes};

    return {
        get [isServiceSymbol]() {
            return true;
        },
        get id() {
            return id;
        },
        get type() {
            return type;
        },
        [scopesSymbol]: scopes,
        [constantsSymbol]: constants,
        [classesSymbol]: classes,
        [envSymbol]: env,
        [factoriesSymbol]: factories
    };
}

function getServicesOrNot(servicesAware) {
    if (isServiceAware(servicesAware)) {
        return getServices(servicesAware);
    }
    return null;
}

export function getServices(serviceAware) {
    if (serviceAware !== undefined) {
        if (isService(serviceAware)) {
            return serviceAware;
        } else if (hasServiceProperty(serviceAware)) {
            return serviceAware[servicesSymbol];
        } else if (hasServiceProperty(serviceAware)) {
            return serviceAware.services;
        } else {
            throw new Error(`serviceAware must be a ServicesContext or an object aware of services`);
        }
    } else {
        return getGlobalServices();
    }
}

export function clearScope(serviceAware, scope) {
    if (scope === SCOPE_SINGLETON) {
        throw new Error('Clearing singleton scope is not allowed');
    }
    let scopes = getServices(serviceAware)[scopesSymbol];
    scopes[scope] = {};
}

export function cloneWithScope(services, scope) {
    let scopeHolder = {};
    return {
        get [isServiceSymbol]() {
            return true;
        },

        get [scopesSymbol]() {
            const scopes = services[scopesSymbol];
            return {
                ...scopes,
                [scope]: scopeHolder
            };
        },

        get [constantsSymbol]() {
            return services[constantsSymbol];
        },

        get [classesSymbol]() {
            return services[classesSymbol];
        },

        get [envSymbol]() {
            return services[envSymbol];
        },

        get [factoriesSymbol]() {
            return services[factoriesSymbol];
        }
    };
}

function setInstance(serviceHolder, key, instance) {
    if (!serviceHolder[holderSymbol]) {
        serviceHolder[holderSymbol] = {};
    }
    serviceHolder[holderSymbol][key] = instance;
}

function getInstance(serviceHolder, key) {
    let holder = serviceHolder[holderSymbol];
    if (holder) {
        return holder[key];
    }
    return undefined;
}

export function getInstanceBinder(holder) {
    return {
        setInstance(instance, key) {
            setInstance(holder, key, instance);
            return this;
        }
    };
}


export function getServiceBinder(serviceAware) {
    let services = getServices(serviceAware);
    return {
        makeServiceAware(instance) {
            instance[servicesSymbol] = services;
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
                const factory = getFactoryForKey(services, classOrKey);
                if (typeof factory === "function") {
                    instance = factory(services, ...args);
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

function isInstanceKey(key) {
    return typeof key === 'string';
}

function getGlobalServices(type) {
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

function createServiceProvider(serviceAware) {
    return new Proxy({}, {
        get(target, key, receiver) {
            return (...args) => {

                // if the object holds an instance of the required key
                // then provide it
                let instance = getInstance(serviceAware, key);
                if (instance !== undefined) {
                    return instance;
                }

                let services = getServices(serviceAware);

                // if not find the scope of the key
                const scope = getScopeForKey(services, key);

                // ensure the scope exists
                let scopes = services[scopesSymbol];
                if (scope !== SCOPE_PROTOTYPE && !scopes[scope]) {
                    throw new Error(`Define scope "${scope}" in ServicesContext`);
                }

                // find the instance in any of the existing scopes
                for (let s in scopes) {
                    instance = scopes[s][key];
                    if (instance) {
                        // this should not occur, but if it is not already a service aware
                        // make it.
                        if (!isServiceAware(instance)) {
                            instance = getServiceBinder(services).makeServiceAware(instance);
                        }
                        break;
                    }
                }

                // no instance found in scopes, just create a new instance
                if (instance === undefined) {
                    instance = getServiceBinder(services).createInstance(key, ...args);
                    // instance = services.onCreateInstance(instance, key, services, receiver);

                    // for prototype scope, a new instance is created on each call
                    // consequently we do not save the instance in scopes
                    if (scope !== SCOPE_PROTOTYPE) {
                        scopes[scope][key] = instance;
                    }
                }

                return instance;
            }
        }
    });
}

function getScopeForKey(services, key) {
    let definition = services[factoriesSymbol][key];
    let scope;
    if (typeof definition === 'object') {
        scope = definition.scope;
    }
    return scope ?? SCOPE_SINGLETON;
}

function getFactoryForKey(services, key) {
    let definition = services[factoriesSymbol][key];
    let clazz = services[classesSymbol][key];
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
