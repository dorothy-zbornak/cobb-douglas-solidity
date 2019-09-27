pragma solidity ^0.5;

import "./LibFixedMath.sol";
import "./LibFeeMath.sol";

contract CompareCobbDouglas {
    function callSuperSimplified(
        uint256 totalRewards,
        uint256 ownerFees,
        uint256 totalFees,
        uint256 ownerStake,
        uint256 totalStake
    ) external pure returns (uint256) {
        return LibFeeMath._cobbDouglasSuperSimplified(
            totalRewards,
            ownerFees,
            totalFees,
            ownerStake,
            totalStake
        );
    }

    function callFixedMath(
        uint256 totalRewards,
        uint256 ownerFees,
        uint256 totalFees,
        uint256 ownerStake,
        uint256 totalStake
    ) external pure returns (uint256) {
        return _cobbDouglas(
            totalRewards,
            ownerFees,
            totalFees,
            ownerStake,
            totalStake,
            1,
            6
        );
    }

    function _cobbDouglas(
        uint256 totalRewards,
        uint256 ownerFees,
        uint256 totalFees,
        uint256 ownerStake,
        uint256 totalStake,
        uint256 alphaNumerator,
        uint256 alphaDenominator
    )
        internal
        pure
        returns (uint256 ownerRewards)
    {
        assert(alphaNumerator <= alphaDenominator);
        int256 feeRatio = LibFixedMath._toFixed(ownerFees, totalFees);
        int256 stakeRatio = LibFixedMath._toFixed(ownerStake, totalStake);
        if (feeRatio == 0 || stakeRatio == 0) {
            return ownerRewards = 0;
        }

        // The cobb-doublas function has the form:
        // `totalRewards * feeRatio ^ alpha * stakeRatio ^ (1-alpha)`
        // This is equivalent to:
        // `totalRewards * stakeRatio * e^(alpha * (ln(feeRatio / stakeRatio)))`
        // However, because `ln(x)` has the domain of `0 < x < 1`
        // and `exp(x)` has the domain of `x < 0`,
        // and fixed-point math easily overflows with multiplication,
        // we will choose the following if `stakeRatio > feeRatio`:
        // `totalRewards * stakeRatio / e^(alpha * (ln(stakeRatio / feeRatio)))`

        // Compute
        // `e^(alpha * (ln(feeRatio/stakeRatio)))` if feeRatio <= stakeRatio
        // or
        // `e^(ln(stakeRatio/feeRatio))` if feeRatio > stakeRatio
        int256 n = feeRatio <= stakeRatio ?
            LibFixedMath._div(feeRatio, stakeRatio) :
            LibFixedMath._div(stakeRatio, feeRatio);
        n = LibFixedMath._exp(
            LibFixedMath._mulDiv(
                LibFixedMath._ln(n),
                int256(alphaNumerator),
                int256(alphaDenominator)
            )
        );
        // Compute
        // `totalRewards * n` if feeRatio <= stakeRatio
        // or
        // `totalRewards / n` if stakeRatio > feeRatio
        n = feeRatio <= stakeRatio ?
            LibFixedMath._mul(stakeRatio, n) :
            LibFixedMath._div(stakeRatio, n);
        // Multiply the above with totalRewards.
        ownerRewards = LibFixedMath._uintMul(n, totalRewards);
    }
}
