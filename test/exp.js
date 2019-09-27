const TestFixedMath = artifacts.require('TestFixedMath');
const BigNumber = require('bignumber.js');
const _ = require('lodash');
const path = require('path');
const fs = require('mz/fs');
const { env } = require('process');
const { callAndGetGas, fromFixed, getRandomFloat, toFixed, toDecimal } = require('./utils/util');

const NUM_SAMPLES = parseInt(env.SAMPLES || 1024);

contract('Sampling exp()', accounts => {
    let contract;
    before(async () => {
        contract = await TestFixedMath.deployed();
    });

    const samples = [];
    for (let i = 0; i < NUM_SAMPLES; i++) {
        it(`sample case ${i+1}/${NUM_SAMPLES}...`, async () => {
            const input = getRandomFloat(-65, 0);
            const [ fixedResult ] = await callAndGetGas(
                contract.exp,
                toFixed(input),
            );
            const result = fromFixed(fixedResult);
            const expectedResult = exp(input);
            const error = expectedResult.minus(result).abs().toNumber();
            samples.push({
                input: input.toString(10),
                output: result.toString(10),
                error: error,
            });
        });
    }

    after(async () => {
        const OUTPUT_FILE = path.resolve(__dirname, '../data/exp.json');
        await fs.writeFile(
            OUTPUT_FILE,
            JSON.stringify(samples, null, '  '),
            'utf-8',
        );
    });
});

function exp(x) {
    return new BigNumber(toDecimal(x).exp().toFixed(100));
}
