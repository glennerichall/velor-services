import {getLogger} from "./services.mjs";
import {
    getClasses,
    getConstants,
    getEnv,
    getEnvironment,
    getEnvName,
    getEnvValue,
    getEnvValueIndirect,
    getEnvValues,
    getFactories,
    getNodeEnv,
    getProvider,
    isDevelopment,
    isProduction,
    isStaging,
    setEnvPrefix
} from "./baseServices.mjs";
import {getServiceBinder} from "./ServicesContext.mjs";

export function getBaseServicesProvider(policy = {}) {
    return {
        ...policy,
        getLogger,
        getNodeEnv,
        isProduction,
        isDevelopment,
        isStaging,
        getEnvName,
        getClasses,
        setEnvPrefix,
        getEnvValue,
        getEnvValueIndirect,
        getEnvValues,
        getEnvironment,
        getEnv,
        getConstants,
        getFactories,
        getProvider,
        getServiceBinder
    };
}