import {isClass} from "./isClass.mjs";
import {getGlobalContext} from "velor-utils/utils/global.mjs";
import {mergeDefaultServicesOptions} from "../application/services/mergeDefaultServicesOptions.mjs";

let __id__ = 0;

export const SCOPE_SINGLETON = 'singleton';
export const SCOPE_PROTOTYPE = 'prototype';
export const SCOPE_REQUEST = 'request';
export const ENV_NAME_PREFIX = Symbol('env_name_prefix');

let instanceUuid = 0;
let kUuid = Symbol('uuid');
let kKey = Symbol('key');
let kServices = Symbol('services');
let kHolder = Symbol('instance-holder');
let kEnv = Symbol('services-env');
let kFactories = Symbol('services-factories');
let kClasses = Symbol('services-classes');
let kConstants = Symbol('services-constants');
let kScopes = Symbol('services-scopes');
let kServicesFlag = Symbol('is-services');
let kBuilder = Symbol('services-builder');
let kProxyTarget = Symbol('services-proxy-target');
// let kServicesAware = Symbol('services-aware');

// --------------------------------------------------------------------------------------------
// Public functions
// --------------------------------------------------------------------------------------------

export function getUuid(instance) {
    return instance[kUuid];
}

export function getEnvironment(servicesAware) {
    return getServices(servicesAware)[kEnv];
}

export function getConstants(servicesAware) {
    return getServices(servicesAware)[kConstants];
}

export function getFactories(servicesAware) {
    return getServices(servicesAware)[kFactories];
}

export function getProvider(servicesAware) {
    return createServiceProvider(servicesAware);
}

export function isServiceAware(serviceAware) {
    return !!(getServiceDirect(serviceAware) ||
        getServiceBound(serviceAware) ||
        getServiceProperty(serviceAware));
}

export function createAppServicesInstance(options = {}) {
    options = mergeDefaultServicesOptions(options ?? {});

    let {
        env = {},
        factories = {},
        constants = {},
        classes = {},
        type = 'none',
        scopes = {}
    } = options;

    let id = ++__id__;
    constants = {...constants};
    env = {...env};
    factories = {...factories};
    classes = {...classes};

    let rootServices = {
        get [kServicesFlag]() {
            return true;
        },
        get type() {
            return type;
        },
        [kConstants]: constants,
        [kClasses]: classes,
        [kEnv]: env,
        [kFactories]: factories,
        [kUuid]: id
    };

    let factoryScopes = Object.keys(factories)
        .map(key => findScopeNameHintForKey(rootServices, key));

    let scopeNames = [...new Set([SCOPE_SINGLETON, ...factoryScopes, ...Object.keys(scopes)])]
        .filter(name => name !== SCOPE_PROTOTYPE);

    // let services = new ServiceContext(rootServices);

    for (let name of scopeNames) {
        let options = {
            storeProvider: scopes[name]
        };
        createScope(rootServices, name, options);
    }

    // return services;

    return rootServices;
}

export function getServices(serviceAware) {
    if (serviceAware !== undefined) {
        let services = getServiceDirect(serviceAware) ??
            getServiceBound(serviceAware) ??
            getServiceProperty(serviceAware) ??
            getServiceArguments(serviceAware);

        if (!services) {
            throw new Error(`serviceAware must be a ServicesContext or an object aware of services`);
        }
        return services;
    } else {
        return getGlobalServices();
    }
}

export function getInstanceBinder(holder) {
    return {
        setInstance(key, instance) {
            setHolderInstance(holder, key, instance);
            return this;
        },
        getInstances() {
            return getHolderInstances(holder);
        },
        getInstance(key) {
            let instances = this.getInstances();
            return instances[key];
        },
        setInstancesTo(other) {
            let instances = this.getInstances();
            for (let key in instances) {
                setHolderInstance(other, key, instances[key]);
            }
            const symbols = Object.getOwnPropertySymbols(instances);
            for (let key of symbols) {
                setHolderInstance(other, key, instances[key]);
            }
            return this;
        }
    };
}

export function getServiceBuilder(serviceAware) {
    // let services = getServices(serviceAware);
    // let builder = services instanceof ServiceContext ?
    //     services[kBuilder] :
    //     createServiceBuilder(serviceAware);

    let builder = createServiceBuilder(serviceAware);

    // builder.extend = () => {
    //     let childInstance = new ServiceContext(services);
    //     getInstanceBinder(services).setInstancesTo(childInstance)
    //     return getServiceBuilder(childInstance);
    // };

    return builder;
}

export function getServiceBinder(serviceAware) {
    let services = getServices(serviceAware);

    return {
        makeServiceAware(instance) {
            instance[kServices] = services;
            return this;
        },
        autoWire(instance) {
            this.makeServiceAware(instance);
            if (typeof instance.initialize === 'function') {
                let result = instance.initialize();
                if (result instanceof Promise) {
                    result.catch(e => console.error(e))
                }
            }
            return this;
        },
        createInstance(classOrKey, ...args) {
            let instance;
            if (isInstanceKey(classOrKey)) {
                const factory = getFactoryForKey(services, classOrKey);
                if (typeof factory === "function") {
                    instance = factory(services, ...args);
                    instance[kKey] = classOrKey;
                } else {
                    throw new Error(`Provide a factory function for key ${classOrKey?.toString()}`);
                }
            } else if (isClass(classOrKey)) {
                instance = new classOrKey(...args);
            } else {
                throw new Error("Provide a class or an instance key");
            }
            instance[kUuid] = ++instanceUuid;
            this.autoWire(instance);
            return instance;
        },
        addScope(instance, scopeName, options) {
            if (!isServiceAware(instance)) {
                this.autoWire(instance);
            }
            createScope(instance, scopeName, options);
            return this;
        },
        // extend(instance, ...args) {
        //     return this.createInstance(instance.constructor, ...args);
        // }
    }
}

export function getGlobalServices() {
    let services = getGlobalContext()[kServices];
    if (!services) {
        // create a new global services
        services = createAppServicesInstance();
        getGlobalContext()[kServices] = services;
    }
    return services;
}

export function getScopeNames(serviceAware) {
    return Object.keys(getScopes(serviceAware));
}

export function isInstanceOf(servicesAware, clazz) {
    return (isServiceAware(servicesAware) &&
            unpackProxy(servicesAware) instanceof clazz) ||
        servicesAware instanceof clazz;
}

export function getClasses(servicesAware) {
    return {...getServices(servicesAware)[kClasses]};
}

export function areSame(instance1, instance2) {
    return (unpackProxy(instance1) ?? instance1) ===
        (unpackProxy(instance2) ?? instance2);
}

export function isProxy(instance) {
    return !!instance[kProxyTarget];
}

// export const ServiceAwareMixin = Parent => class extends Parent {
//     constructor(...args) {
//         super(...args);
//     }
//
//     get [kServicesAware]() {
//         return true;
//     }
//
//     get isServiceAware() {
//         return this[kServicesAware];
//     }
// }
//
// export const ServiceAware = ServiceAwareMixin(class {
// });

// --------------------------------------------------------------------------------------------
// Private functions
// --------------------------------------------------------------------------------------------

function unpackProxy(servicesAware) {
    return servicesAware[kProxyTarget];
}

function createServiceBuilder(serviceAware) {
    let services = getServices(serviceAware);

    return {
        done() {
            return services;
        },
        addScope(name, options) {
            createScope(services, name, options);
            return this;
        },
        addScopes(scopes) {
            for (let key in scopes) {
                this.addScope(key, scopes[key]);
            }
            return this;
        },
        clearScope(scopeName) {
            if (scopeName === SCOPE_SINGLETON) {
                throw new Error('Clearing singleton scope is not allowed');
            }
            let scope = getScope(services, scopeName);
            scope.instances = {};
        },
        addFactory(name, definition) {
            services[kFactories][name] = definition;
            return this;
        },
        addFactories(factories) {
            for (let key in factories) {
                this.addFactory(key, factories[key]);
            }
            return this;
        },
        addConstant(name, value) {
            services[kConstants][name] = value;
            return this;
        },
        addConstants(constants) {
            for (let key in constants) {
                this.addConstant(key, constants[key]);
            }
            return this;
        },
        addClass(name, clazz) {
            services[kClasses][name] = clazz;
            return this;
        },
        addClasses(classes) {
            for (let key in classes) {
                this.addClass(key, classes[key]);
            }
            return this;
        },
        addEnv(name, value) {
            services[kEnv][name] = value;
            return this;
        },
        addEnvs(env) {
            for (let key in env) {
                this.addEnv(key, env[key]);
            }
            return this;
        },
    }
}

// class ServiceContext {
//     #id;
//     #parent;
//     #localServices = {
//         get [kServicesFlag]() {
//             return true;
//         },
//         [kClasses]: {},
//         [kEnv]: {},
//         [kConstants]: {},
//         [kFactories]: {},
//         [kScopes]: {},
//     };
//
//     constructor(parent) {
//         this.#parent = parent;
//         this.#id = __id__++;
//     }
//
//     get [kUuid]() {
//         return this.#id;
//     }
//
//     get [kServicesFlag]() {
//         return true;
//     }
//
//     get [kBuilder]() {
//         let builder = createServiceBuilder(this.#localServices);
//         bindReplaceResult(builder, 'done', () => {
//             return this;
//         });
//         return builder;
//     }
//
//     get [kClasses]() {
//         return Object.freeze({
//             ...this.#parent[kClasses],
//             ...this.#localServices[kClasses]
//         });
//     }
//
//     get [kScopes]() {
//         return Object.freeze({
//             ...this.#parent[kScopes],
//             ...this.#localServices[kScopes]
//         });
//     }
//
//     get [kConstants]() {
//         return Object.freeze({
//             ...this.#parent[kConstants],
//             ...this.#localServices[kConstants]
//         });
//     }
//
//     get [kFactories]() {
//         return Object.freeze({
//             ...this.#parent[kFactories],
//             ...this.#localServices[kFactories]
//         });
//     }
//
//     get [kEnv]() {
//         return Object.freeze({
//             ...this.#parent[kEnv],
//             ...this.#localServices[kEnv]
//         });
//     }
// }

function getServiceDirect(serviceAware) {
    return serviceAware && serviceAware[kServicesFlag] && serviceAware;
}

function getServiceBound(serviceAware) {
    return !!serviceAware && getServiceDirect(serviceAware[kServices]);
}

function getServiceProperty(serviceAware) {
    return getServiceDirect(serviceAware?.services);
}

function isArguments(obj) {
    return obj?.toString() === '[object Arguments]';
}

function getServiceArguments(serviceAware) {
    if (isArguments(serviceAware)) {
        return serviceAware[serviceAware.length - 1];
    }
    return undefined;
}

class Scope {
    #getStore;
    #holder;
    #name;

    constructor(name, holder, storeProviderOrStoreObject = {}) {
        this.#holder = holder;
        this.#name = name;

        if (typeof storeProviderOrStoreObject === 'function') {
            let provider = storeProviderOrStoreObject;
            this.#getStore = provider;
        } else {
            let store = storeProviderOrStoreObject;
            this.#getStore = () => store;
        }
    }

    get name() {
        return this.#name;
    }

    get holder() {
        return this.#holder;
    }

    getStore() {
        return this.#getStore();
    }

    get(key) {
        return this.getStore()[key];
    }

    set(key, value) {
        return this.getStore()[key] = value;
    }

    setAll(instances) {
        for (let key in instances) {
            this.set(key, instances[key]);
        }
    }
}

function createScope(holder, name,
                     {
                         instances = {},
                         storeProvider
                     } = {}) {

    if (holder && !holder[kScopes]) {
        // add a private scope property to the scope holder
        holder[kScopes] = {};
    }

    let scope = new Scope(name, holder, storeProvider);

    // add the newly created scope to the scopes of the scope holder
    if (holder && !holder[kScopes][name]) {
        holder[kScopes][name] = scope;
    }

    // add any new instances
    scope.setAll(instances);

    return scope;
}

function getServicesNoThrow(servicesAware) {
    if (isServiceAware(servicesAware)) {
        return getServices(servicesAware);
    }
    return null;
}

function setHolderInstance(holder, key, instance) {
    if (!holder) {
        return;
    }
    if (!holder[kHolder]) {
        holder[kHolder] = {};
    }
    holder[kHolder][key] = instance;
}

function getHolderInstances(holder) {
    return {
        ...holder[kHolder]
    };
}

function getHolderInstance(holder, key) {
    if (!holder || !holder[kHolder]) {
        return;
    }
    return holder[kHolder][key];
}

function isInstanceKey(key) {
    return typeof key === 'string' || typeof key === "symbol";
}

function getScopes(serviceAware) {
    let servicesScopes = getServices(serviceAware)[kScopes];

    // This should not occur, for future use only.
    // Get scopes declared directly on serviceAware instance
    let ownScopes = serviceAware[kScopes] ?? {};

    return {
        ...servicesScopes,
        ...ownScopes
    };
}

function getScope(services, name) {
    return getScopes(services)[name];
}

function provideInstance(serviceAware, key, args) {
    // local holder instances are prioritized
    let instance = getHolderInstance(serviceAware, key);
    if (instance) return instance;

    let services = getServices(serviceAware);

    // second shot, maybe we set an instance directly on services.
    instance = getHolderInstance(services, key);
    if (instance) return instance;

    // if not, find the scope of the key
    const scopeNameHint = findScopeNameHintForKey(services, key);

    // ensure the scope exists
    let scope = getScope(serviceAware, scopeNameHint);

    if (scopeNameHint === SCOPE_PROTOTYPE) {
        // Create a volatile scope for prototypes.
        // This scope will not be retained on function return.
        scope = createScope(null, SCOPE_PROTOTYPE);
    }

    if (!scope) {
        throw new Error(`Define scope "${scopeNameHint}" in ServicesContext`);
    }

    // find the instance in scopes
    let scopes = getScopes(services);
    for (let scopeName in scopes) {
        let scope = scopes[scopeName];
        instance = scope.get(key);
        if (instance) {
            // this should not occur, but if it is not already a service aware make it.
            if (!isServiceAware(instance)) {
                getServiceBinder(services).makeServiceAware(instance);
            }
            break;
        }
    }

    // no instance found in scopes, just create a new instance
    if (instance === undefined) {
        instance = getServiceBinder(services).createInstance(key, ...args);
        // for prototype scope, a new instance is created on each call
        // consequently we do not save the instance in scopes
        if (scopeNameHint !== SCOPE_PROTOTYPE) {
            scope.set(key, instance);
        }
    }

    return instance;
}

// function makeServiceAwareProxy(instance, serviceAware) {
//     return new Proxy(instance, {
//         has(target, prop) {
//             if (prop === Symbol.hasInstance) {
//                 return true;
//             }
//             return prop in instance;
//         },
//
//         ownKeys(target) {
//             return Object.keys(instance);
//         },
//
//         get(target, prop, receiver) {
//             if (prop === Symbol.toStringTag ||
//                 prop === Symbol.iterator ||
//                 prop === Symbol.hasInstance) {
//                 return instance[prop];
//
//             } else if (prop === kProxyTarget) {
//                 return instance;
//
//             } else if (prop === kServices) {
//                 return getServices(serviceAware);
//
//             } else if (prop in instance) {
//                 const value = Reflect.get(instance, prop, receiver);
//                 if (typeof value === "function") {
//                     if (prop !== "constructor") {
//                         if (!value.hasOwnProperty('prototype')) {
//
//                             // All methods in original instance are now bound to the current proxy instance.
//                             // This imposes that no private #property is declared in instance classes.
//                             return value.bind(receiver);
//                         }
//                     }
//                 }
//                 return value;
//             }
//             return undefined;
//         },
//
//         set(target, prop, value, receiver) {
//             Reflect.set(instance, prop, value);
//             return true; // Indicates success
//         },
//     });
// }

function createServiceProvider(serviceAware) {
    return new Proxy({}, {
        get(target, key, receiver) {
            return (...args) => {
                let instance = provideInstance(serviceAware, key, args);
                // let proxy = Object.create(instance);
                // proxy[kServices] = getServices(serviceAware);
                // return proxy;

                // if (instance[kServicesAware]) {
                //     return makeServiceAwareProxy(instance, serviceAware);
                // } else {
                //     return instance;
                // }

                return instance;

            }
        }
    });
}

function findScopeNameHintForKey(services, key) {
    let definition = getFactories(services)[key];
    let scope;
    if (typeof definition === 'object') {
        scope = definition.scope;
    }
    return scope ?? SCOPE_SINGLETON;
}

function getFactoryForKey(services, key) {
    let definition = getFactories(services)[key];
    let clazz = getClasses(services)[key];
    let factory;
    if (clazz && definition) {
        throw new Error(`Provide a class or a factory for "${key?.toString()}" not both`);
    } else if (!clazz && !definition) {
        throw new Error(`Provide a factory or a class for "${key?.toString()}"`);
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
