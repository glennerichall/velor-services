import {isClass} from "../injection/isClass.mjs";
import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import {createInstance} from "../application/factories/createInstance.mjs";

const {
    expect,
    test
} = setupTestContext();

test.describe('injection', () => {
    test('should determine if obj is a class', () => {

        class A {
        }

        expect(isClass(class {
        })).to.be.true;

        expect(isClass(A)).to.be.true;

        expect(isClass(class extends A {
        })).to.be.true;

        expect(isClass(new A())).to.be.false;

        expect(isClass(function () {
        })).to.be.false;

        expect(isClass(() => {
        })).to.be.false;

        expect(isClass('')).to.be.false;
    })

    test('createInstance returns a function that instantiates the provided class', async () => {
        class TestClass {
            constructor(arg1, arg2) {
                this.arg1 = arg1;
                this.arg2 = arg2;
            }
        }

        const instanceFunc = createInstance(TestClass, 'testArg1', 'testArg2');
        expect(instanceFunc).to.be.a('function');

        const instance = instanceFunc();
        expect(instance).to.be.instanceof(TestClass);
        expect(instance.arg1).to.equal('testArg1');
        expect(instance.arg2).to.equal('testArg2');
    });


})