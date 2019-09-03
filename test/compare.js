const CompareCobbDouglas = artifacts.require('CompareCobbDouglas');
const BigNumber = require('bignumber.js');
const _ = require('lodash');
const { env } = require('process');
const { callAndGetGas, getRandomInteger, getRandomPortion, toDecimal } = require('./utils/util');

const NUM_SAMPLES = parseInt(env.SAMPLES || 128);

contract('CompareCobbDouglas', accounts => {
    let contract;
    before(async () => {
        contract = await CompareCobbDouglas.deployed();
    });

    const oldGasCosts = [];
    const oldErrors = [];
    const newGasCosts = [];
    const newErrors = [];
    for (let i = 0; i < NUM_SAMPLES; i++) {
        it(`test case ${i+1}/${NUM_SAMPLES}...`, async () => {
            const params = getRandomParams();
            const [ [error1, gas1], [error2, gas2] ] = await Promise.all([
                testImplementation(contract.callSuperSimplified, params),
                testImplementation(contract.callFixedMath, params),
            ]);
            oldErrors.push(error1);
            newErrors.push(error2);
            oldGasCosts.push(gas1);
            newGasCosts.push(gas2);
        });
    }

    after(() => {
        const averageGasSaved = _.reduce(
            _.zip(newGasCosts, oldGasCosts),
            (s, [n, o]) => s += o - n,
            0,
        ) / NUM_SAMPLES;
        const averageErorImprovement = _.reduce(
            _.zip(newErrors, oldErrors),
            (s, [n, o]) => s += Math.abs(o / n),
            0,
        ) / NUM_SAMPLES;
        console.log(`Average gas savings: ${averageGasSaved}`);
        console.log(`Average error improvement: ${averageErorImprovement}`);
        console.log(`Average new error: ${_.sum(newErrors) / NUM_SAMPLES}`);
        console.log(`Average new gas: ${_.sum(newGasCosts) / NUM_SAMPLES}`);
    });
});

function getRandomParams(overrides) {
    const totalRewards = _.get(overrides, 'totalRewards', getRandomInteger(0, 1e27));
    const totalFees = _.get(overrides, 'totalFees', getRandomInteger(1, 1e27));
    const ownerFees = _.get(overrides, 'ownerFees', getRandomPortion(totalFees));
    const totalStake = _.get(overrides, 'totalStake', getRandomInteger(1, 1e27));
    const ownerStake = _.get(overrides, 'ownerStake', getRandomPortion(totalStake));
    return {
        totalRewards,
        ownerFees,
        totalFees,
        ownerStake,
        totalStake,
    };
}

function cobbDouglas(params) {
    const { totalRewards, ownerFees, totalFees, ownerStake, totalStake } = params;
    const feeRatio = toDecimal(ownerFees).dividedBy(toDecimal(totalFees));
    const stakeRatio = toDecimal(ownerStake).dividedBy(toDecimal(totalStake));
    const alpha = toDecimal(1 / 6);
    // totalRewards * feeRatio ^ alpha * stakeRatio ^ (1-alpha)
    return new BigNumber(
        feeRatio
            .pow(alpha)
            .times(stakeRatio.pow(toDecimal(1).minus(alpha)))
            .times(toDecimal(totalRewards))
            .toFixed(0),
    );
}

async function testImplementation(method, params) {
    const expectedResult = cobbDouglas(params);
    const [result, gas] = await callAndGetGas(
        method,
        params.totalRewards,
        params.ownerFees,
        params.totalFees,
        params.ownerStake,
        params.totalStake,
    );
    const error = result.minus(expectedResult).dividedBy(expectedResult).abs().toNumber();
    return [ error, gas ];
}
