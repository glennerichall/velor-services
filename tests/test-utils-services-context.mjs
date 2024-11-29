import {
    cloneWithScope,
    createAppServicesInstance,
    getInstanceBinder,
    getServiceBinder,
    isServiceAware,
    SCOPE_PROTOTYPE,
    SCOPE_REQUEST,
    SCOPE_SINGLETON,
} from "../injection/ServicesContext.mjs";
import sinon from "sinon";
import {getProvider} from "../injection/baseServices.mjs";

import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";

// Example classes for testing
class SingletonClass {
    constructor() {
        this.name = 'singletonClass';
    }
}

class PrototypeClass {
    constructor() {
        this.name = 'prototypeClass';
    }
}

class InstanceClass {
    constructor() {
        this.name = 'instanceClass';
    }
}

class AutoWiredClass {
    constructor() {
        this.name = 'autoWiredClass';
    }

    initialize() {
        this.initialized = true;
    }
}


class ClassWithCtorArgs {

    constructor(arg1, arg2) {
        this.arg1 = arg1;
        this.arg2 = arg2;
    }

    initialize() {
        this.initialized = true;
    }
}

const {
    expect,
    test
} = setupTestContext()

test.describe('ServicesContext and Provider (Scope Management) with Dependency Injection', function () {
    let servicesContext, anInstance;

    test.beforeEach(function () {
        anInstance = {}
        // Initialize a new ServicesContext with factories and scopes
        servicesContext = createAppServicesInstance({
            scopes: {
                [SCOPE_SINGLETON]: {
                    anInstance
                }
            },
            factories: {
                singletonService: {
                    factory: () => new SingletonClass(),
                    scope: SCOPE_SINGLETON
                },
                prototypeService: {
                    factory: () => new PrototypeClass(),
                    scope: SCOPE_PROTOTYPE
                },
                requestService: {
                    factory: () => new InstanceClass(),
                    scope: SCOPE_REQUEST
                },
                factoryFromClass: ClassWithCtorArgs
            }
        });
    });

    test.describe('Provider Scope Management', function () {
        test('should return the same instance for a singleton-scoped service from provider', function () {
            const singletonService1 = getProvider(servicesContext).singletonService();
            const singletonService2 = getProvider(servicesContext).singletonService();

            // Should return the same instance
            expect(singletonService1).to.equal(singletonService2);
            expect(singletonService1.name).to.equal('singletonClass');
        });

        test('should return a new instance for a prototype-scoped service from provider', function () {
            const prototypeService1 = getProvider(servicesContext).prototypeService();
            const prototypeService2 = getProvider(servicesContext).prototypeService();

            // Should return different instances
            expect(prototypeService1).to.not.equal(prototypeService2);
            expect(prototypeService1.name).to.equal('prototypeClass');
        });


    });

    test.describe('getServiceBinder for Auto-Wiring and Instance Creation', function () {
        test('should auto-wire a class instance and call initialize method if present', function () {
            const binder = getServiceBinder(servicesContext);

            // Auto-wire an instance of AutoWiredClass
            const instance = binder.createInstance(AutoWiredClass);

            // Should call the initialize method
            expect(instance.name).to.equal('autoWiredClass');
            expect(instance.initialized).to.be.true;
        });

        test('should make instance services aware', () => {
            const binder = getServiceBinder(servicesContext);
            let unawareInstance = {};

            expect(isServiceAware(unawareInstance)).to.be.false;
            binder.makeServiceAware(unawareInstance);
            expect(isServiceAware(unawareInstance)).to.be.true;

            expect(isServiceAware(anInstance)).to.be.false;
            expect(() => getProvider(servicesContext).anInstance()).to.throw(Error, /Provide a factory or a class for "anInstance"/);

            const instance = binder.createInstance(AutoWiredClass);
            expect(isServiceAware(instance)).to.be.true;

        })


        test('should throw an error when attempting to create an instance for a missing service', function () {
            const binder = getServiceBinder(servicesContext);

            // No factory for 'undefinedService'
            expect(() => binder.createInstance('undefinedService')).to.throw(Error, /Provide a factory or a class for "undefinedService"/);
        });

        test('should pass the ServicesContext instance to the factory function', function () {
            let factorySpy = sinon.spy((services) => {
                return {name: 'singletonService'}; // Return a simple service object
            });

            // Initialize ServicesContext with the factorySpy as the factory for the singletonService
            servicesContext = createAppServicesInstance({
                factories: {
                    singletonService: {
                        factory: factorySpy,
                        scope: SCOPE_SINGLETON
                    }
                }
            });

            // Retrieve the singletonService through the provider, which should invoke the factory
            const singletonService = getProvider(servicesContext).singletonService();

            // Check if the factory was called with the correct argument (ServicesContext)
            expect(factorySpy.calledOnce).to.be.true; // Ensure the factory was called exactly once
            expect(factorySpy.firstCall.args[0]).to.equal(servicesContext); // Check that the first argument is the
                                                                            // ServicesContext
            expect(singletonService).to.be.an('object');
            expect(singletonService.name).to.equal('singletonService');
        });
    });

    test.describe('Error Handling for Provider and Binder', function () {
        test('should throw an error if the provider is asked for an undefined service', function () {
            expect(() => getProvider(servicesContext).undefinedService())
                .to.throw(Error, 'Provide a factory or a class for "undefinedService"');
        });

        test('should throw an error if scope is not defined for a service', function () {
            servicesContext = createAppServicesInstance({
                factories: {
                    customService: {
                        factory: () => new SingletonClass(),
                        scope: 'undefinedScope'
                    }
                }
            });

            expect(() => getProvider(servicesContext).customService()).to.throw(Error, /Define scope "undefinedScope"/);
        });
    });

    test("should create services without options", () => {
        const services = createAppServicesInstance();
        expect(isServiceAware(services)).to.be.true;
    })

    test('should get instance from a factory that is only a class', async () => {
        let instance = getProvider(servicesContext).factoryFromClass('a', 'b');
        expect(instance).to.be.an.instanceOf(ClassWithCtorArgs);
        expect(instance.initialized).to.be.true;
        expect(instance.arg1).to.equal('a');
        expect(instance.arg2).to.equal('b');
    })


    test('cloneWithScope should clone servicesContext with a new scope', function () {
        let cloneServicesContext = cloneWithScope(servicesContext, SCOPE_REQUEST);
        expect(cloneServicesContext).to.not.equal(servicesContext);
        expect(isServiceAware(cloneServicesContext)).to.be.true;
    });

    test('cloneWithScope clone should share parent scopes', function () {
        let cloneServicesContext = cloneWithScope(servicesContext, SCOPE_REQUEST);

        expect(getProvider(cloneServicesContext).singletonService()).to
            .equal(getProvider(servicesContext).singletonService());
    });

    test('cloneWithScope clone not should share new scope', function () {
        let cloneServicesContext = cloneWithScope(servicesContext, SCOPE_REQUEST);

        expect(getProvider(cloneServicesContext).requestService()).to.not
            .equal(getProvider(servicesContext).requestService());
    });

    test('getInstanceBinder should provide instances directly from an object', function () {
        let holder = {};
        let obj1 = {};
        let obj2 = {};

        getInstanceBinder(holder)
            .setInstance(obj1, 'custom1')
            .setInstance(obj2, 'custom2');

        expect(getProvider(holder).custom1()).to.equal(obj1);
        expect(getProvider(holder).custom2()).to.equal(obj2);
    });

    test('provider should return service holder before service aware', function () {
        let holder = {};

        let obj1 = {};

        getServiceBinder(servicesContext).makeServiceAware(holder);

        getInstanceBinder(holder)
            .setInstance(obj1, 'singletonService');

        expect(getProvider(holder).singletonService()).to.equal(obj1);
        expect(getProvider(servicesContext).singletonService()).to.not.eq(obj1);
    });
});
