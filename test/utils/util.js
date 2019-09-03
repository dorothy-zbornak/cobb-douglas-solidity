const BigNumber = require('bignumber.js');
const crypto = require('crypto');
const Decimal = require('decimal.js');

Decimal.precision = 128;

function getRandomInteger(min, max) {
    const range = new BigNumber(max).minus(min);
    return getRandomPortion(range).plus(min);
}

function getRandomFloat(min, max) {
    // Generate a really high precision number between [0, 1]
    const r = new BigNumber(
        crypto.randomBytes(32).toString('hex'),
        16,
    ).dividedBy(new BigNumber(2).pow(256).minus(1));
    return new BigNumber(max).minus(min).times(r).plus(min);
}

function getRandomPortion(total) {
    return new BigNumber(total).times(getRandomFloat(0, 1)).integerValue();
}

function toFixed(n) {
    return new BigNumber(n).times(2 ** 127).integerValue();
}

function fromFixed(n) {
    return new BigNumber(n).dividedBy(2 ** 127);
}

function toDecimal(x) {
    if (BigNumber.isBigNumber(x)) {
        return new Decimal(x.toString(10));
    }
    return new Decimal(x);
}

async function callAndGetGas(method, ...params) {
    const BASE_TX_FEE = 21e3;
    const _params = params.map(v => v.toString(10));
    return [
        new BigNumber((await method.call(..._params)).toString()),
        await method.estimateGas(..._params) - BASE_TX_FEE,
    ];
}

module.exports = {
    getRandomInteger,
    getRandomPortion,
    getRandomFloat,
    toFixed,
    fromFixed,
    toDecimal,
    callAndGetGas,
};
