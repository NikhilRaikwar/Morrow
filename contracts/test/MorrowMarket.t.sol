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

    function testCancelledUnfilledAuctionLetsEachLenderRecoverEscrowWhilePaused() public {
        vm.prank(seller);
        uint256 id = market.createReceivable(buyer, keccak256("underfilled"), 10_000e6, 8_000e6, uint64(block.timestamp + 30 days), 1_000);
        vm.prank(buyer); market.acceptReceivable(id);
        vm.prank(seller); market.openAuction(id, uint64(block.timestamp + 1 days));
        vm.prank(lenderA); market.placeBid(id, 4_000e6, 500);

        vm.warp(block.timestamp + 1 days);
        market.cancelUnfilledAuction(id);
        market.setPaused(true);

        vm.prank(lenderA); market.claimBidRefund(id, 0);
        assertEq(usdc.balanceOf(lenderA), 20_000e6);
        vm.prank(lenderA);
        vm.expectRevert(MorrowMarket.NothingToRefund.selector);
        market.claimBidRefund(id, 0);
    }

    function testRejectsBidAboveSellerAprCeilingAndUnauthorizedFinalization() public {
        vm.prank(seller);
        uint256 id = market.createReceivable(buyer, keccak256("rate"), 1_000e6, 800e6, uint64(block.timestamp + 30 days), 500);
        vm.prank(buyer); market.acceptReceivable(id);
        vm.prank(seller); market.openAuction(id, uint64(block.timestamp + 1 days));

        vm.prank(lenderA);
        vm.expectRevert(MorrowMarket.BidRateTooHigh.selector);
        market.placeBid(id, 800e6, 501);

        vm.prank(lenderA); market.placeBid(id, 800e6, 500);
        vm.prank(lenderA);
        vm.expectRevert(MorrowMarket.Unauthorized.selector);
        market.finalizeAuction(id);
    }

    function testFuzz_BidRefundEqualsUnusedEscrow(uint96 firstBidRaw, uint96 secondBidRaw) public {
        uint256 firstBid = bound(uint256(firstBidRaw), 1e6, 20_000e6);
        uint256 secondBid = bound(uint256(secondBidRaw), 1e6, 20_000e6);
        uint256 advance = firstBid < secondBid ? firstBid : secondBid;

        vm.prank(seller);
        uint256 id = market.createReceivable(buyer, keccak256("fuzz"), advance + 1e6, advance, uint64(block.timestamp + 30 days), 1_000);
        vm.prank(buyer); market.acceptReceivable(id);
        vm.prank(seller); market.openAuction(id, uint64(block.timestamp + 1 days));
        vm.prank(lenderA); market.placeBid(id, firstBid, 700);
        vm.prank(lenderB); market.placeBid(id, secondBid, 300);
        vm.prank(seller); market.finalizeAuction(id);

        MorrowMarket.Bid[] memory bids = market.getBids(id, 0, 2);
        uint256 expectedA = bids[0].amount - bids[0].acceptedAmount;
        uint256 expectedB = bids[1].amount - bids[1].acceptedAmount;
        uint256 beforeA = usdc.balanceOf(lenderA);
        uint256 beforeB = usdc.balanceOf(lenderB);
        if (expectedA > 0) { vm.prank(lenderA); market.claimBidRefund(id, 0); }
        if (expectedB > 0) { vm.prank(lenderB); market.claimBidRefund(id, 1); }
        assertEq(usdc.balanceOf(lenderA) - beforeA, expectedA);
        assertEq(usdc.balanceOf(lenderB) - beforeB, expectedB);
    }
}
