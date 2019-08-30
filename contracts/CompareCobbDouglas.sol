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
        // totalRewards * feeRatio ^ alpha * stakeRatio ^ (1-alpha)
        // We instead use:
        // totalRewards * stakeRatio * e^(alpha * (ln(feeRatio) - ln(stakeRatio)))

        // Compute e^(alpha * (ln(feeRatio) - ln(stakeRatio)))
        int256 logFeeRatio = LibFixedMath._ln(feeRatio);
        int256 logStakeRatio = LibFixedMath._ln(stakeRatio);
        int256 n;
        if (logFeeRatio <= logStakeRatio) {
            n = LibFixedMath._exp(
                LibFixedMath._mulDiv(
                    LibFixedMath._sub(logFeeRatio, logStakeRatio),
                    int256(alphaNumerator),
                    int256(alphaDenominator)
                )
            );
        } else {
            n = LibFixedMath._exp(
                LibFixedMath._mulDiv(
                    LibFixedMath._sub(logStakeRatio, logFeeRatio),
                    int256(alphaNumerator),
                    int256(alphaDenominator)
                )
            );
            n = LibFixedMath._invert(n);
        }
        // Multiply the above with totalRewards * stakeRatio
        ownerRewards = LibFixedMath._uintMul(
            LibFixedMath._mul(n, stakeRatio),
            totalRewards
        );
    }
}
