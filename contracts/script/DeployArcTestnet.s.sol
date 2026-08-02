// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../src/MorrowMarket.sol";

contract DeployArcTestnet is Script {
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    function run() external returns (MorrowMarket market) {
        address feeRecipient = vm.envAddress("PROTOCOL_FEE_RECIPIENT");
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(key);
        market = new MorrowMarket(ARC_USDC, feeRecipient, 100);
        vm.stopBroadcast();
    }
}
