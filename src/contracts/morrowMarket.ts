import { erc20Abi, parseAbi } from "viem";

/**
 * Canonical MorrowMarket ABI shared by Arc reads, decoded events, and the
 * server-side Circle contract-call allowlist. Keep in sync with Foundry before
 * changing VITE_MORROW_MARKET_ADDRESS.
 */
export const morrowMarketAbi = parseAbi([
  "function BPS_DENOMINATOR() view returns (uint16)",
  "function MAX_BIDS_PER_RECEIVABLE() view returns (uint8)",
  "function YEAR() view returns (uint256)",
  "function usdc() view returns (address)",
  "function owner() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function feeRecipient() view returns (address)",
  "function servicingFeeBps() view returns (uint16)",
  "function paused() view returns (bool)",
  "function nextReceivableId() view returns (uint256)",
  "function createReceivable(address buyer, bytes32 documentDigest, uint256 faceValue, uint256 advanceRequested, uint64 dueDate, uint16 maxAprBps) returns (uint256 receivableId)",
  "function cancelReceivable(uint256 receivableId)",
  "function acceptReceivable(uint256 receivableId)",
  "function rejectReceivable(uint256 receivableId)",
  "function openAuction(uint256 receivableId, uint64 auctionDeadline)",
  "function placeBid(uint256 receivableId, uint256 amount, uint16 aprBps)",
  "function cancelUnfilledAuction(uint256 receivableId)",
  "function claimBidRefund(uint256 receivableId, uint256 bidIndex)",
  "function finalizeAuction(uint256 receivableId)",
  "function repay(uint256 receivableId, uint256 amount)",
  "function transferOwnership(address newOwner)",
  "function acceptOwnership()",
  "function setPaused(bool paused)",
  "function setFeeRecipient(address newFeeRecipient)",
  "function getReceivable(uint256 receivableId) view returns ((address seller,address buyer,bytes32 documentDigest,uint64 dueDate,uint64 auctionDeadline,uint16 maxAprBps,uint8 status,uint256 faceValue,uint256 advanceRequested,uint256 totalEscrowed,uint256 fundedPrincipal,uint256 totalLenderDue,uint256 totalLenderPaid,uint256 totalRepaid))",
  "function getBidCount(uint256 receivableId) view returns (uint256)",
  "function getBids(uint256 receivableId, uint256 offset, uint256 limit) view returns ((address lender,uint64 placedAt,uint16 aprBps,uint256 amount,uint256 acceptedAmount,uint256 refundedAmount)[])",
  "function getClaim(uint256 receivableId, address lender) view returns ((uint256 principal,uint256 yield,uint256 paid))",
  "function previewSettlement(uint256 receivableId, uint256 amount) view returns (uint256 fee,uint256 lenderPayment,uint256 sellerRemainder)",
  "event ReceivableCreated(uint256 indexed receivableId,address indexed seller,address indexed buyer,bytes32 documentDigest,uint256 faceValue,uint256 advanceRequested,uint64 dueDate,uint16 maxAprBps)",
  "event ReceivableAccepted(uint256 indexed receivableId,address indexed buyer)",
  "event ReceivableRejected(uint256 indexed receivableId,address indexed buyer)",
  "event ReceivableCancelled(uint256 indexed receivableId,address indexed seller)",
  "event AuctionOpened(uint256 indexed receivableId,uint64 auctionDeadline)",
  "event BidPlaced(uint256 indexed receivableId,uint256 indexed bidIndex,address indexed lender,uint256 amount,uint16 aprBps)",
  "event BidAllocated(uint256 indexed receivableId,uint256 indexed bidIndex,address indexed lender,uint256 principal,uint256 yield)",
  "event BidRefunded(uint256 indexed receivableId,uint256 indexed bidIndex,address indexed lender,uint256 amount)",
  "event AuctionFinalized(uint256 indexed receivableId,uint256 advancePaid,uint256 totalLenderDue)",
  "event RepaymentReceived(uint256 indexed receivableId,address indexed buyer,uint256 amount,uint256 feePaid)",
  "event ClaimPaid(uint256 indexed receivableId,address indexed lender,uint256 amount)",
  "event SellerRemainderPaid(uint256 indexed receivableId,address indexed seller,uint256 amount)",
  "event ReceivableSettled(uint256 indexed receivableId)",
]);

export { erc20Abi };
