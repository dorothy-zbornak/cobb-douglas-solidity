pragma solidity ^0.5;

import "./LibFixedMath.sol";

contract TestFixedMath {
    function ln(int256 x) external pure returns (int256) {
        return LibFixedMath._ln(x);
    }
}
