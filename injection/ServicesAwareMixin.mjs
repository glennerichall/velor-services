export const ServicesAwareMixin = (Parent, services) => class extends Parent {

    constructor(...args) {
        super(...args);
    }

    get isServiceAware() {
        return true;
    }

    get services() {
        return services;
    }
}