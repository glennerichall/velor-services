import {getProvider} from "./baseServices.mjs";
import {
    s_emitter,
    s_envNameResolver,
    s_eventQueue,
    s_logger
} from "./serviceKeys.mjs";
import {
    getInstanceBinder,
    isServiceAware
} from "../../injection/ServicesContext.mjs";
import winston from "winston";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

export function getEnvNameResolver(serviceAware) {
    return getProvider(serviceAware)[s_envNameResolver]();
}


export function setLogger(holder, logger) {
    getInstanceBinder(holder).setInstance(s_logger, logger);
}

export function getLogger(servicesAware) {
    let logger = getInstanceBinder(servicesAware)
        .getInstance(s_logger);

    if (!logger) {
        if (isServiceAware(servicesAware)) {
            try {
                logger = getProvider(servicesAware)[s_logger]();
            } catch (e) {
            }
        }
    }

    if (!logger) {
        if (process.env.LOG_LEVEL) {
            logger = winston.createLogger({
                level: process.env.LOG_LEVEL,
                transports: [new winston.transports.Console()],
                format: winston.format.simple(),
            })
        } else {
            logger = noOpLogger
        }
    }

    return logger;
}

export function getEmitter(services) {
    return getProvider(services)[s_emitter]();
}

export function getEventQueue(services) {
    return getProvider(services)[s_eventQueue]();
}
