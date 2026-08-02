// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../src/MorrowMarket.sol";
import "./MockUSDC.sol";

contract MorrowMarketTest is Test {
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address lenderA = makeAddr("lenderA");
    address lenderB = makeAddr("lenderB");
    address feeRecipient = makeAddr("fees");
    MockUSDC usdc;
    MorrowMarket market;

    function setUp() public {
        usdc = new MockUSDC();
        market = new MorrowMarket(address(usdc), feeRecipient, 100);
        usdc.mint(buyer, 20_000e6);
        usdc.mint(lenderA, 20_000e6);
        usdc.mint(lenderB, 20_000e6);
        vm.prank(lenderA); usdc.approve(address(market), type(uint256).max);
        vm.prank(lenderB); usdc.approve(address(market), type(uint256).max);
        vm.prank(buyer); usdc.approve(address(market), type(uint256).max);
    }

    function testGoldenLifecycleEscrowsClearsRefundsAndSettles() public {
        vm.prank(seller);
        uint256 id = market.createReceivable(buyer, keccak256("invoice"), 10_000e6, 8_000e6, uint64(block.timestamp + 30 days), 1_000);
        vm.prank(buyer); market.acceptReceivable(id);
        vm.prank(seller); market.openAuction(id, uint64(block.timestamp + 1 days));
        vm.prank(lenderA); market.placeBid(id, 5_000e6, 500);
        vm.prank(lenderB); market.placeBid(id, 5_000e6, 300);
        vm.prank(seller); market.finalizeAuction(id);

        MorrowMarket.Claim memory a = market.getClaim(id, lenderA);
        MorrowMarket.Claim memory b = market.getClaim(id, lenderB);
        assertEq(a.principal, 3_000e6);
        assertEq(b.principal, 5_000e6);
        assertEq(usdc.balanceOf(seller), 8_000e6);

        vm.prank(lenderA); market.claimBidRefund(id, 0);
        assertEq(usdc.balanceOf(lenderA), 17_000e6);

        vm.prank(buyer); market.repay(id, 10_000e6);
        MorrowMarket.Receivable memory receivable = market.getReceivable(id);
        assertEq(uint8(receivable.status), uint8(MorrowMarket.Status.Settled));
        assertGt(usdc.balanceOf(feeRecipient), 0);
        assertGt(usdc.balanceOf(lenderA), 17_000e6);
        assertGt(usdc.balanceOf(lenderB), 15_000e6);
    }

    function testOnlyBuyerCanAccept() public {
        vm.prank(seller);
        uint256 id = market.createReceivable(buyer, keccak256("invoice"), 10e6, 8e6, uint64(block.timestamp + 30 days), 1_000);
        vm.prank(lenderA);
        vm.expectRevert(MorrowMarket.Unauthorized.selector);
        market.acceptReceivable(id);
    }
}
