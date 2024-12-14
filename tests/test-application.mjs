import sinon from "sinon";
import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import {createAppServicesInstance} from "../injection/ServicesContext.mjs";
import {mergeDefaultServicesOptions} from "../application/services/mergeDefaultServicesOptions.mjs";
import {
    getEmitter,
    getEnvNameResolver,
    getEventQueue
} from "../application/services/services.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('application', ()=> {
    it('should create services', async()=> {
        let services = createAppServicesInstance(
            mergeDefaultServicesOptions()
        );

        expect(services).to.not.be.undefined;
    })

    it('should get services', async()=> {
        let services = createAppServicesInstance(
            mergeDefaultServicesOptions()
        );

        expect(getEmitter(services)).to.not.be.undefined;
        expect(getEventQueue(services)).to.not.be.undefined;
        expect(getEnvNameResolver(services)).to.not.be.undefined;
    })
})