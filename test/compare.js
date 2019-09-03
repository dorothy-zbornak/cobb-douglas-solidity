const CompareCobbDouglas = artifacts.require('CompareCobbDouglas');
const BigNumber = require('bignumber.js');
const Decimal = require('decimal.js');
const crypto = require('crypto');
const _ = require('lodash');

const NUM_TESTS = 128;

contract('CompareCobbDouglas', accounts => {
    let contract;
    before(async () => {
        contract = await CompareCobbDouglas.deployed();
    });

    const oldGasCosts = [];
    const oldErrors = [];
    const newGasCosts = [];
    const newErrors = [];
    for (let i = 0; i < NUM_TESTS; i++) {
        it(`test case ${i+1}/${NUM_TESTS}...`, async () => {
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
        ) / NUM_TESTS;
        const averageErorImprovement = _.reduce(
            _.zip(newErrors, oldErrors),
            (s, [n, o]) => s += Math.abs(o / n),
            0,
        ) / NUM_TESTS;
        console.log(`Average gas savings: ${averageGasSaved}`);
        console.log(`Average error improvement: ${averageErorImprovement}`);
        console.log(`Average new error: ${_.sum(newErrors) / NUM_TESTS}`);
        console.log(`Average new gas: ${_.sum(newGasCosts) / NUM_TESTS}`);
    });
});

function getRandomInteger(min, max) {
    const range = new BigNumber(max).minus(min);
    return getRandomPortion(range).plus(min);
}

function getRandomPortion(total) {
    // Generate a really high precision number between [0, 1]
    const r = new BigNumber(
        crypto.randomBytes(32).toString('hex'),
        16,
    ).dividedBy(new BigNumber(2).pow(256).minus(1));
    return new BigNumber(total).times(r).integerValue();
}

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

function toDecimal(x) {
    if (BigNumber.isBigNumber(x)) {
        return new Decimal(x.toString(10));
    }
    return new Decimal(x);
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
            .times(stakeRatio.pow(new Decimal(1).minus(alpha)))
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

async function callAndGetGas(method, ...params) {
    const BASE_TX_FEE = 21e3;
    const _params = params.map(v => v.toString(10));
    return [
        new BigNumber((await method.call(..._params)).toString()),
        await method.estimateGas(..._params) - BASE_TX_FEE,
    ];
}
