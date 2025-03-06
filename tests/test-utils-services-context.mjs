import {
    areSame,
    createAppServicesInstance,
    getGlobalServices,
    getInstanceBinder,
    getServiceBinder,
    getServiceBuilder,
    getServices,
    getUuid,
    isInstanceOf,
    isServiceAware,
    SCOPE_PROTOTYPE,
    SCOPE_REQUEST,
    SCOPE_SINGLETON,
} from "../injection/ServicesContext.mjs";
import sinon from "sinon";
import {getProvider} from "../application/services/baseServices.mjs";

import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import {s_logger} from "../application/services/serviceKeys.mjs";
import {getLogger} from "../application/services/services.mjs";
import {AsyncLocalStorage} from 'node:async_hooks';
import {timeoutAsync} from "velor-utils/utils/sync.mjs";

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

    const symKey = Symbol();
    const symInst = {};

    test.beforeEach(function () {
        anInstance = {}
        // Initialize a new ServicesContext with factories and scopes
        servicesContext = createAppServicesInstance({
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
                factoryFromClass: ClassWithCtorArgs,
                [symKey]: () => {
                    return symInst;
                }
            }
        });
    });


    // test.skip('cloneWithScope should clone servicesContext with a new scope', function () {
    //     let cloneServicesContext = getServiceBuilder(servicesContext)
    //         .extend().addScope(SCOPE_REQUEST).done();
    //     expect(cloneServicesContext).to.not.equal(servicesContext);
    //     expect(isServiceAware(cloneServicesContext)).to.be.true;
    // });
    //
    // test.skip('cloneWithScope clone should share parent scopes', function () {
    //     let cloneServicesContext = getServiceBuilder(servicesContext)
    //         .extend().addScope(SCOPE_REQUEST).done();
    //
    //     let obj1 = getProvider(cloneServicesContext).singletonService();
    //     let obj2 = getProvider(cloneServicesContext).singletonService();
    //
    //     expect(getUuid(obj1)).to.not.be.undefined;
    //     expect(getUuid(obj2)).to.not.be.undefined;
    //
    //     expect(getUuid(obj1)).to.equal(getUuid(obj2));
    // });
    //
    // test.skip('cloneWithScope clone not should share new scope', function () {
    //     let cloneServicesContext = getServiceBuilder(servicesContext)
    //         .extend()
    //         .addScope(SCOPE_REQUEST)
    //         .done();
    //
    //     expect(getProvider(cloneServicesContext).requestService()).to.not
    //         .equal(getProvider(servicesContext).requestService());
    // });
    //
    // test.skip('services clone must convey all installed instances', async () => {
    //     let obj1 = {
    //         name: 'foobar'
    //     };
    //     let holder = {};
    //
    //     let symbol = Symbol('test');
    //
    //     getInstanceBinder(servicesContext).setInstance(symbol, obj1);
    //
    //     let clone = getServiceBuilder(servicesContext)
    //         .extend()
    //         .done();
    //
    //     expect(areSame(getProvider(clone)[symbol](), obj1)).to.be.true;
    //
    //     getServiceBinder(clone).makeServiceAware(holder);
    //
    //     let obj2 = getProvider(holder)[symbol]();
    //     expect(areSame(obj2, obj1)).to.be.true;
    //
    // });
    //
    // test.skip('should chain service inheritance', async () => {
    //
    //     getServiceBuilder(servicesContext)
    //         .addEnv("env1", 10)
    //         .addEnv("env2", 20)
    //         .done();
    //
    //     expect(getEnvValue(servicesContext, "env1")).to.equal(10);
    //     expect(getEnvValue(servicesContext, "env2")).to.equal(20);
    //
    //     let clone = getServiceBuilder(servicesContext)
    //         .extend()
    //         .addEnv("env2", 30)
    //         .addEnv("env3", 40)
    //         .done();
    //
    //     expect(getEnvValue(clone, "env1")).to.equal(10);
    //     expect(getEnvValue(clone, "env2")).to.equal(30);
    //     expect(getEnvValue(clone, "env3")).to.equal(40);
    // })
    //
    // test.skip('should only create scope in clone', () => {
    //     let services = createAppServicesInstance();
    //
    //     let clone = getServiceBuilder(services).extend()
    //         .addScope(SCOPE_REQUEST).done();
    //
    //     expect(getScopeNames(services)).to.deep.eq([SCOPE_SINGLETON]);
    //     expect(getScopeNames(clone)).to.deep.eq([SCOPE_SINGLETON, SCOPE_REQUEST]);
    // })
    //
    // test.skip('should create scopes for provided factories', () => {
    //     let services = createAppServicesInstance({
    //         factories: {
    //             dummy: {
    //                 scope: SCOPE_REQUEST,
    //                 factory: () => null
    //             }
    //         }
    //     });
    //
    //     let clone = getServiceBuilder(services).extend()
    //         .addScope("dummy").done();
    //
    //     expect(getScopeNames(services)).to.deep.eq([SCOPE_SINGLETON, SCOPE_REQUEST]);
    //     expect(getScopeNames(clone)).to.deep.eq([SCOPE_SINGLETON, SCOPE_REQUEST, "dummy"]);
    // })
    //
    // test.skip('should create instance and put in parent services scopes', () => {
    //     let a = {};
    //
    //     let aFactory = sinon.stub().returns(a);
    //
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //         }
    //     });
    //
    //     let clone = getServiceBuilder(services)
    //         .extend().done();
    //
    //     // Clone of services is created.
    //     // "a" instance is not created initially.
    //     // "a" should have been placed into original services singleton scope even if created
    //     // when calling provider on clone services, because clone has no scopes declared.
    //     expect(getUuid(getProvider(clone).a())).to.eq(getUuid(a));
    //     expect(getUuid(getProvider(services).a())).to.eq(getUuid(a));
    //     expect(getServices(a)).to.eq(services);
    //
    //     expect(getUuid(getProvider(clone).a())).to.not.be.undefined;
    //
    //     expect(aFactory).calledOnce;
    // })
    //
    // test.skip('should create instance and put in grand-parent services scopes', () => {
    //     let a = {};
    //
    //     let aFactory = sinon.stub().returns(a);
    //
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //         }
    //     });
    //
    //     let subclone = getServiceBuilder(services)
    //         .extend().extend().done();
    //
    //     expect(getUuid(getProvider(subclone).a())).to.eq(getUuid(a));
    //     expect(getUuid(getProvider(services).a())).to.eq(getUuid(a));
    //
    //     expect(getServices(a)).to.eq(services);
    //
    //     expect(aFactory).calledOnce;
    // })
    //
    // test.skip('should handle scope redeclaration correctly', async () => {
    //     class MyClass extends ServiceAware {
    //         getB() {
    //             return getProvider(this).b();
    //         }
    //     }
    //
    //     let a = new MyClass();
    //
    //     let aFactory = sinon.stub().returns(a);
    //     let bFactory = sinon.stub().callsFake(() => {
    //         return {};
    //     });
    //
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //             b: {
    //                 scope: SCOPE_REQUEST,
    //                 factory: bFactory
    //             },
    //         }
    //     });
    //
    //     let clone = getServiceBuilder(services).extend()
    //         .addScope(SCOPE_REQUEST).done();
    //
    //     // "b1" is in clone
    //     let b1 = getProvider(clone).b();
    //     expect(getServices(b1)).to.eq(clone);
    //
    //     // "b2" is also in clone
    //     let b2 = getProvider(clone).a().getB();
    //     expect(getServices(b2)).to.eq(clone);
    //
    //     expect(getUuid(b2)).to.eq(getUuid(b1));
    //
    //
    // })
    //
    // test.skip('should get another instance from service aware instance', async () => {
    //     class MyClass {
    //         prop = 'value';
    //
    //         getB() {
    //             return getProvider(this).b();
    //         }
    //     }
    //
    //     let a = new MyClass();
    //
    //     let aFactory = sinon.stub().returns(a);
    //     let bFactory = sinon.stub().callsFake(() => {
    //         return {};
    //     });
    //
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //             b: {
    //                 scope: SCOPE_REQUEST,
    //                 factory: bFactory
    //             },
    //         }
    //     });
    //
    //
    //     let clone = getServiceBuilder(services).extend()
    //         .addScope(SCOPE_REQUEST).done();
    //
    //     let bInstance1 = getProvider(clone).a().getB();
    //     let bInstance2 = getProvider(clone).a().getB();
    //     let bInstance3 = getProvider(services).a().getB();
    //
    //     expect(getServices(bInstance1)).to.eq(clone);
    //     expect(getServices(bInstance2)).to.eq(clone);
    //     expect(getServices(bInstance3)).to.eq(services);
    //
    //     expect(getUuid(bInstance1)).to.eq(getUuid(bInstance2));
    //     expect(getUuid(bInstance2)).to.not.eq(getUuid(bInstance3));
    //
    //     expect(getUuid(bInstance2)).to.not.be.undefined;
    //     expect(getUuid(bInstance3)).to.not.be.undefined;
    //
    // })
    //
    // test.skip('should not get object as proxy if not service aware', () => {
    //
    //     class MyClass {
    //     }
    //
    //     let a = new MyClass();
    //
    //     let aFactory = sinon.stub().returns(a);
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //         }
    //     });
    //
    //     expect(isProxy(getProvider(services).a())).to.be.false;
    // })
    //
    // test.skip('should get object as proxy if service aware', () => {
    //
    //     class MyClass extends ServiceAware {
    //     }
    //
    //     let a = new MyClass();
    //
    //     let aFactory = sinon.stub().returns(a);
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //         }
    //     });
    //
    //     expect(isProxy(getProvider(services).a())).to.be.true;
    // })
    //
    // test.skip('should bind to functions', () => {
    //
    //     class MyClass extends ServiceAware {
    //         freeFct = () => {
    //             if (!this || isProxy(this)) {
    //                 throw new Error();
    //             }
    //         }
    //
    //         notSoFree = function () {
    //             if (!this || !isProxy(this)) {
    //                 throw new Error();
    //             }
    //         }
    //
    //         method() {
    //             if (!this || !isProxy(this)) {
    //                 throw new Error();
    //             }
    //         }
    //     }
    //
    //     let a = new MyClass();
    //
    //     function freeMeToo() {
    //         if (!this || !isProxy(this)) {
    //             throw new Error();
    //         }
    //     }
    //
    //     a.freeMeToo = freeMeToo;
    //
    //     let aFactory = sinon.stub().returns(a);
    //     let services = createAppServicesInstance({
    //         factories: {
    //             a: aFactory,
    //         }
    //     });
    //
    //     getProvider(services).a().freeFct();
    //     getProvider(services).a().freeMeToo();
    //     getProvider(services).a().method();
    //     getProvider(services).a().notSoFree();
    // })

    test('should get uuid of services', () => {
        let uuid = getUuid(servicesContext);
        expect(uuid).to.not.be.undefined;
        expect(uuid).to.be.greaterThan(0);
    })

    test('should get uuid of provided instance', () => {
        let instance = getProvider(servicesContext).singletonService();
        let uuid = getUuid(instance);
        expect(uuid).to.not.be.undefined;
        expect(uuid).to.be.greaterThan(0);
    })

    test('should return the same instance for a singleton-scoped service from provider', function () {
        const singletonService1 = getProvider(servicesContext).singletonService();
        const singletonService2 = getProvider(servicesContext).singletonService();

        // Should return the same instance
        expect(getUuid(singletonService1)).to.not.be.undefined;
        expect(getUuid(singletonService1)).to.equal(getUuid(singletonService2));
        expect(singletonService1.name).to.equal('singletonClass');
    });

    test('should return a new instance for a prototype-scoped service from provider', function () {
        const prototypeService1 = getProvider(servicesContext).prototypeService();
        const prototypeService2 = getProvider(servicesContext).prototypeService();

        // Should return different instances
        expect(getUuid(prototypeService1)).to.not.be.undefined;
        expect(getUuid(prototypeService2)).to.not.be.undefined;
        expect(getUuid(prototypeService1)).to.not.equal(getUuid(prototypeService2));
        expect(prototypeService1.name).to.equal('prototypeClass');
    });

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
        expect(() => binder.createInstance('undefinedService'))
            .to.throw(Error, /Provide a factory or a class for "undefinedService"/);
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
        expect(factorySpy).calledOnce; // Ensure the factory was called exactly once
        expect(factorySpy.firstCall.args[0]).to.equal(servicesContext); // Check that the first argument is the
                                                                        // ServicesContext
        expect(singletonService).to.be.an('object');
        expect(singletonService.name).to.equal('singletonService');
    });

    test('should throw an error if the provider is asked for an undefined service', function () {
        expect(() => getProvider(servicesContext).undefinedService())
            .to.throw(Error, 'Provide a factory or a class for "undefinedService"');
    });

    test('should not throw an error and auto create scopes for factories', function () {
        servicesContext = createAppServicesInstance({
            factories: {
                customService: {
                    factory: () => new SingletonClass(),
                    scope: 'undefinedScope'
                }
            }
        });

        expect(() => getProvider(servicesContext).customService()).to.not.throw(Error, /Define scope "undefinedScope"/);
    });

    test("should create services without options", () => {
        const services = createAppServicesInstance();
        expect(isServiceAware(services)).to.be.true;
    })

    test('should get instance from a factory that is only a class', async () => {
        let instance = getProvider(servicesContext).factoryFromClass('a', 'b');
        expect(isInstanceOf(instance, ClassWithCtorArgs)).to.be.true;
        expect(instance.initialized).to.be.true;
        expect(instance.arg1).to.equal('a');
        expect(instance.arg2).to.equal('b');
    })

    test('getInstanceBinder should provide instances directly from an object', function () {
        let holder = {};
        let obj1 = {};
        let obj2 = {};

        getInstanceBinder(holder)
            .setInstance('custom1', obj1)
            .setInstance('custom2', obj2);

        expect(areSame(getProvider(holder).custom1(), obj1)).to.be.true;
        expect(areSame(getProvider(holder).custom2(), obj2)).to.be.true;
    });

    test('provider should return service holder before service aware', function () {
        let holder = {};
        let obj1 = {
            name: 'foobar'
        };

        getServiceBinder(servicesContext).makeServiceAware(holder);
        getInstanceBinder(holder).setInstance('singletonService', obj1);

        let obj2 = getProvider(holder).singletonService();
        expect(areSame(obj2, obj1)).to.be.true;
        expect(areSame(getProvider(servicesContext).singletonService(), obj1)).to.be.false;
    });

    test('instance binder may shadow values directly on services', async () => {
        let obj1 = {
            name: 'foobar'
        };
        let holder = {};
        getServiceBinder(servicesContext).makeServiceAware(holder);
        getInstanceBinder(servicesContext).setInstance('singletonService', obj1);
        let obj2 = getProvider(holder).singletonService();
        expect(areSame(obj2, obj1)).to.be.true;
        expect(areSame(getProvider(servicesContext).singletonService(), obj1)).to.be.true;
    });

    test('instance binder should allow symbols', async () => {
        let obj1 = {
            name: 'foobar'
        };
        let symbol = Symbol('test');
        let holder = {};
        getServiceBinder(servicesContext).makeServiceAware(holder);
        getInstanceBinder(servicesContext).setInstance(symbol, obj1);
        let obj2 = getProvider(holder)[symbol]();
        expect(areSame(obj2, obj1)).to.be.true;
        expect(areSame(getProvider(servicesContext)[symbol](), obj1)).to.be.true;
    });

    test('provider should get scopes from instance then services', async () => {
        let holder = {};
        let obj1 = {};

        expect(isServiceAware(holder)).to.be.false;
        getServiceBinder(servicesContext).addScope(holder, "customScope");
        expect(isServiceAware(holder)).to.be.true;

        getServiceBuilder(servicesContext).addFactory('obj', {
            factory: () => obj1,
            scope: 'customScope'
        });

        let instance1 = getProvider(holder).obj();
        expect(getUuid(instance1)).to.eq(getUuid(obj1));

        let instance2 = getProvider(holder).obj();
        expect(getUuid(instance1)).to.eq(getUuid(instance2));

        expect(() => getProvider(servicesContext).obj()).to.throw(Error, /Define scope "customScope" in ServicesContext/);
    });

    test('provider should not fail for no scope in holder', async () => {
        let holder = {};
        let obj1 = {};

        // we omit to add a scope to holder
        // expect(isServiceAware(holder)).to.be.false;
        // getServiceBinder(servicesContext).addScope(holder, "customScope");
        // expect(isServiceAware(holder)).to.be.true;

        getServiceBinder(servicesContext).makeServiceAware(holder);

        getServiceBuilder(servicesContext)
            .addFactory('obj', {
                factory: () => obj1,
                scope: 'customScope'
            });

        expect(() => getProvider(holder).obj()).to.throw(Error, /Define scope "customScope" in ServicesContext/);
    });

    test('service builder should permit to provide instances in instance scope', async () => {
        let holder = {};
        let obj1 = {};
        let obj2 = {};

        let instances = {
            obj: obj1
        };
        getServiceBuilder(servicesContext).addScope("customScope", {instances});
        let instance1 = getProvider(servicesContext).obj();
        expect(getUuid(instance1)).to.eq(getUuid(obj1));
    });

    test('should get logger from bound instance', async () => {
        let holder = {};
        let logger = {
            debug: sinon.stub()
        };
        getInstanceBinder(holder).setInstance(s_logger, logger);

        expect(getLogger(holder)).to.eq(logger);
    })

    test('getGlobalContextshould be a singleton', async () => {
        expect(getGlobalServices()).to.eq(getGlobalServices());
    })

    test('should get global services with binder', async () => {
        class Mock {
        }

        let instance = getServiceBinder().createInstance(Mock);
        expect(getServices(instance)).to.eq(getGlobalServices());
    })

    test('should allow symbol as service key', async () => {
        let instance = getProvider(servicesContext)[symKey]();
        expect(areSame(instance, symInst)).to.be.true;
    })

    test('should throw error if no factory', () => {
        expect(getProvider(servicesContext)[Symbol("fetch")]).to
            .throw(Error, 'Provide a factory or a class for "Symbol(fetch)"');
    })

    test('should get properties of provided instance', () => {
        let a = {
            prop1: 'value1',
            prop2: 'value2',
        };

        let aFactory = sinon.stub().returns(a);

        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
            }
        });

        let instance = getProvider(services).a();

        expect(instance.prop1).to.equal('value1');
        expect(instance.prop2).to.equal('value2');
    })

    test('should set properties of provided instance', () => {
        let a = {
            prop1: 'value1',
            prop2: 'value2',
        };

        let aFactory = sinon.stub().returns(a);

        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
            }
        });

        let instance = getProvider(services).a();

        instance.prop1 = 'newValue1';
        instance.prop2 = 'newValue2';

        expect(instance.prop1).to.equal('newValue1');
        expect(instance.prop2).to.equal('newValue2');

        instance = getProvider(services).a();

        expect(instance.prop1).to.equal('newValue1');
        expect(instance.prop2).to.equal('newValue2');

        expect(a.prop1).to.equal('newValue1');
        expect(a.prop2).to.equal('newValue2');
    })

    test('should bind methods to proxy', () => {
        let a = {
            prop1: 'value1',
            prop2: 'value2',

            getProp1() {
                return this.prop1 + '_in_getter';
            }
        };

        let aFactory = sinon.stub().returns(a);

        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
            }
        });

        let instance = getProvider(services).a();

        expect(instance.getProp1()).to.eq('value1_in_getter');

        a.prop1 = 'another_value';
        expect(instance.getProp1()).to.eq('another_value_in_getter');

    })

    test('should internally get private properties of instance', () => {
        class MyClass {
            #prop1 = 'value1';

            getProp1(val) {
                return this.#prop1 + '_in_getter' + val;
            }
        }

        let aFactory = sinon.stub().callsFake(() => new MyClass());

        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
            }
        });

        let instance = getProvider(services).a();
        expect(instance.getProp1("_toto")).to.eq('value1_in_getter_toto');
    })

    test('should enumerate own keys', () => {
        const sym = Symbol();
        let a = {
            prop: 'value',
            [sym]: 'toto',
            getB() {
                return getProvider(this).b();
            }
        };

        let aFactory = sinon.stub().returns(a);
        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
            }
        });

        let keys = Object.keys(getProvider(services).a());
        expect(keys).to.deep.eq(['prop', 'getB']);

    })

    test('should redefine scope storage provider', () => {
        let services = createAppServicesInstance({
            factories: {
                b: {
                    scope: SCOPE_REQUEST,
                    factory: () => {
                        return {}
                    }
                },
            }
        });

        let store = {};
        getServiceBuilder(services).addScope(SCOPE_REQUEST, {
            storeProvider: () => store
        }).done();

        let b = getProvider(services).b();
        expect(getUuid(b)).to.eq(getUuid(store['b']));
    })

    test('should have AsyncLocalStorage request scope', async () => {
        class MyClass {
            getB() {
                return getProvider(this).b();
            }
        }

        let aFactory = sinon.stub().callsFake(() => {
            return new MyClass();
        });
        let bFactory = sinon.stub().callsFake(() => {
            return {};
        });

        let requestStorage = new AsyncLocalStorage();
        let services = createAppServicesInstance({
            factories: {
                a: aFactory,
                b: {
                    scope: SCOPE_REQUEST,
                    factory: bFactory
                },
            },
            scopes: {
                [SCOPE_REQUEST]: () => {
                    return requestStorage.getStore();
                }
            }
        });

        let a1, a2, b1, b2, a3, b3, b4;

        requestStorage.run({}, () => {
            a1 = getProvider(services).a();
            a2 = getProvider(services).a();
            b1 = getProvider(services).a().getB();
            b2 = getProvider(services).a().getB();
            b3 = getProvider(services).b();
        });

        expect(getUuid(a1)).to.eq(getUuid(a2));
        expect(getUuid(b1)).to.eq(getUuid(b2));
        expect(getUuid(b1)).to.eq(getUuid(b3));

        expect(getUuid(b1)).to.be.greaterThan(0);
        expect(getUuid(a1)).to.be.greaterThan(0);

        requestStorage.run({}, () => {
            a3 = getProvider(services).a();
            b4 = getProvider(services).a().getB();
        });

        expect(getUuid(a3)).to.eq(getUuid(a1));
        expect(getUuid(b4)).to.not.eq(getUuid(b1));
    })

    test('should provide async', async () => {

        let instance = {
            async initialize() {
                await timeoutAsync(100);
                this.isInitialized = true;
            }
        };
        let services = createAppServicesInstance({
            factories: {
                a: async () => {
                    await timeoutAsync(100);
                    return instance;
                }
            }
        });

        let ia = await getProvider(services).a();
        expect(ia).to.eq(instance);

        expect(isServiceAware(ia)).to.be.true;

        let ib = getProvider(services).a();
        expect(ib).to.eq(instance);

        let ic = await getProvider(services).a();
        expect(ic).to.eq(instance);

        expect(instance).to.have.property('isInitialized', true);
    })

    test('should define local services for service aware', async () => {
        let a = {};

        let b1 = {};
        let b2 = {};

        let options = {
            factories: {
                b: () => b2,
                a: {
                    scope: SCOPE_SINGLETON,
                    factory: () => a,
                    services: {
                        factories: {
                            b: () => b1
                        }
                    }
                },
            }
        };

        let services = createAppServicesInstance(options);

        let aa = getProvider(services).a();
        expect(aa).to.eq(a);

        expect(getProvider(aa).b()).to.eq(b1);
        expect(getProvider(services).b()).to.eq(b2);

    })

    test('should access instance of parent services', async () => {
        let a = {};
        let c = {};
        let b1 = {
            getC() {
                return getProvider(this).c();
            }
        };

        let options = {
            factories: {
                c: () => c,
                a: {
                    scope: SCOPE_SINGLETON,
                    factory: () => a,
                    services: {
                        factories: {
                            b: () => b1
                        }
                    }
                },
            }
        };

        let services = createAppServicesInstance(options);
        let aa = getProvider(services).a();
        expect(getProvider(aa).b().getC()).to.eq(c);

    })

    test('should throw error directly if not ServiceError', async () => {

    })
});
