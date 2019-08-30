const CompareCobbDouglas = artifacts.require('CompareCobbDouglas');
const BigNumber = require('bignumber.js');
const Decimal = require('decimal.js');
const crypto = require('crypto');
const _ = require('lodash');

const NUM_TESTS = 256;

contract('CompareCobbDouglas', accounts => {
    let contract;
    before(async () => {
        contract = await CompareCobbDouglas.deployed();
    });

    let sumGasSavings = 0;
    let sumErrorImprovement = 0;
    for (let i = 0; i < NUM_TESTS; i++) {
        it(`test case ${i+1}/${NUM_TESTS}...`, async () => {
            const [ gas, error ] =
                await compareImplementations(contract, getRandomParams());
            sumGasSavings += gas;
            sumErrorImprovement += error;
        });
    }

    after(() => {
        console.log(`Average gas savings: ${sumGasSavings / NUM_TESTS}`);
        console.log(`Average error improvement: ${Math.abs(sumErrorImprovement) / NUM_TESTS}`);
    });
});

function getRandomInteger(min, max) {
    const range = new BigNumber(max).minus(min);
    const random = new BigNumber(crypto.randomBytes(32).toString('hex'), 16);
    return random.mod(range).plus(min).integerValue();
}

function getRandomPortion(total) {
    return new BigNumber(total).times(Math.random()).integerValue();
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

async function compareImplementations(contract, params) {

    const [result1, gas1] = await callAndGetGas(
        contract.callSuperSimplified,
        params.totalRewards,
        params.ownerFees,
        params.totalFees,
        params.ownerStake,
        params.totalStake,
    );
    const [result2, gas2] = await callAndGetGas(
        contract.callFixedMath,
        params.totalRewards,
        params.ownerFees,
        params.totalFees,
        params.ownerStake,
        params.totalStake,
    );
    const expectedResult = cobbDouglas(params);
    const error1 = result1.minus(expectedResult).dividedBy(expectedResult).abs().toNumber();
    const error2 = result2.minus(expectedResult).dividedBy(expectedResult).abs().toNumber();
    const gasChange = gas2 - gas1;
    const errorChange = error2 - error1;
    console.log(`gasChange: ${gasChange}, errorChange: ${errorChange}`)
    return [ gasChange, errorChange ];
}

async function callAndGetGas(method, ...params) {
    const BASE_TX_FEE = 21e3;
    const _params = params.map(v => v.toString(10));
    return [
        new BigNumber((await method.call(..._params)).toString()),
        await method.estimateGas(..._params) - BASE_TX_FEE,
    ];
}
