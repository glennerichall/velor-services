import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import {createAppServicesInstance, ENV_NAME_PREFIX} from "../injection/ServicesContext.mjs";
import {
    getEnvironment,
    getEnvValue,
    getEnvValueArray,
    getEnvValueIndirect,
    getEnvValues,
    getNodeEnv,
    isProduction
} from "../application/services/baseServices.mjs";
import {ENV_TEST} from "velor-utils/env.mjs";

const {
    expect,
    test
} = setupTestContext();

test.describe('environment', () => {

    test.describe('no prefix', () => {
        let services, env;

        test.beforeEach(() => {
            env = {
                VAR_A: 'valueA',
                VAR_B: 'valueB',
                VAR_B_VAR: 'VAR_B',
                VAR_ARR: 'A;B;C;D;',
                NODE_ENV: ENV_TEST
            };
            services = createAppServicesInstance({
                env
            });
        })

        test('should check if test env', ()=> {
            expect(isProduction(services)).to.be.false;
        })

        test('should get NODE_ENV', () => {
            expect(getNodeEnv(services)).to.eq(ENV_TEST);
        })

        test('should get environment', () => {
            expect(getEnvironment(services)).to.deep.eq(env);
        })

        test('should get variable value', () => {
            expect(getEnvValue(services, 'VAR_A')).to.eq('valueA');
        })

        test('should get variables values', () => {
            expect(getEnvValues(services, 'VAR_A', 'VAR_B')).to.deep.eq(['valueA', 'valueB']);
        })

        test('should get variable indirect', () => {
            expect(getEnvValueIndirect(services, 'VAR_B_VAR')).to.eq('valueB');
        })

        test('should get variable array', () => {
            expect(getEnvValueArray(services, 'VAR_ARR')).to.deep.eq(['A','B','C','D', '']);
        })
    })

    test.describe('with prefix', () => {
        let services, env;

        test.beforeEach(() => {
            env = {
                toto_VAR_A: 'valueA',
                toto_VAR_B: 'valueB',
                toto_VAR_B_VAR: 'VAR_B',
                NODE_ENV: ENV_TEST
            };
            services = createAppServicesInstance({
                env,
                constants: {
                    [ENV_NAME_PREFIX]: 'toto'
                }
            });
        })

        test('should get NODE_ENV', () => {
            expect(getNodeEnv(services)).to.eq(ENV_TEST);
        })

        test('should get environment', () => {
            expect(getEnvironment(services)).to.deep.eq(env);
        })

        test('should get variable value', () => {
            expect(getEnvValue(services, 'VAR_A')).to.eq('valueA');
        })

        test('should get variables values', () => {
            expect(getEnvValues(services, 'VAR_A', 'VAR_B')).to.deep.eq(['valueA', 'valueB']);
        })

        test('should get variable indirect', () => {
            expect(getEnvValueIndirect(services, 'VAR_B_VAR')).to.eq('valueB');
        })
    })
})