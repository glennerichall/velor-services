import {
    ENV_NAME_PREFIX,
    getConstants as _getConstants,
    getEnvironment as _getEnvironment,
    getFactories as _getFactories,
    getProvider as _getProvider,
    getServices
} from "../../injection/ServicesContext.mjs";
import {getEnvNameResolver} from "./services.mjs";
import {
    ENV_DEVELOPMENT,
    ENV_PRODUCTION,
    ENV_STAGING,
    ENV_TEST
} from "velor-utils/env.mjs";

export function getNodeEnv(services) {
    return getEnvironment(services).NODE_ENV;
}

export function isProduction(services) {
    return getNodeEnv(services) === ENV_PRODUCTION;
}

export function isDevelopment(services) {
    return getNodeEnv(services) === ENV_DEVELOPMENT;
}

export function isTest(services) {
    return getNodeEnv(services) === ENV_TEST;
}

export function isStaging(services) {
    return getNodeEnv(services) === ENV_STAGING;
}

export function getEnvName(serviceAware, name) {
    return getEnvNameResolver(serviceAware).resolve(name);
}

export function setEnvPrefix(serviceAware, prefix) {
    getConstants(serviceAware)[ENV_NAME_PREFIX] = prefix;
}

export function getEnvValue(serviceAware, name, defaultValue) {
    let fullName = getEnvName(serviceAware, name);
    let value = getEnvironment(serviceAware)[fullName];
    if (value === undefined) {
        value = defaultValue;
    }
    return value;
}

export function getEnvValueArray(serviceAware, name, separator = ";") {
    let fullName = getEnvName(serviceAware, name);
    let value = getEnvironment(serviceAware)[fullName];
    if (value === undefined) {
        value = "";
    }
    // user may want to have empty values, so we will not ignore empty
    // values.
    value = value.split(separator);
    return value;
}

export function getEnvValueIndirect(serviceAware, varName, defaultValue) {
    let varValue = getEnvValue(serviceAware, varName);
    if (varValue) {
        return getEnvValue(serviceAware, varValue, defaultValue);
    }
    return defaultValue;
}

export function getEnvValues(serviceAware, ...names) {
    let resolver = getEnvNameResolver(serviceAware);
    const env = getEnvironment(serviceAware);
    return names.map(name => resolver.resolve(name))
        .map(fullName => env[fullName]);
}

export function getEnvironment(serviceAware) {
    return _getEnvironment(serviceAware);
}

export function getEnv(serviceAware) {
    return getEnvironment(serviceAware);
}

export function getConstants(serviceAware) {
    return _getConstants(serviceAware);
}

export function getFactories(serviceAware) {
    let services = getServices(serviceAware);
    let factories = _getFactories(services);
    return Object.keys(factories)
        .reduce((acc, key) => {
            acc[key] = (...args) => factories[key](services, ...args);
            return acc;
        }, {})
}

export function getProvider(serviceAware) {
    return _getProvider(serviceAware);
}