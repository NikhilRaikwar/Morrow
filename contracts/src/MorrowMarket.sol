// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Minimal ERC-20 surface used by Arc's canonical USDC ERC-20 interface.
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title MorrowMarket
/// @notice Bounded, escrowed invoice-financing auctions settled exclusively in ERC-20 USDC on Arc.
/// @dev This contract deliberately never accepts native USDC/value. On Arc, native USDC and its ERC-20
///      interface share a balance but use different decimal representations; all market amounts are USDC-6.
contract MorrowMarket {
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant YEAR = 365 days;
    uint8 public constant MAX_BIDS_PER_RECEIVABLE = 32;

    enum Status {
        None,
        AwaitingBuyer,
        BuyerAccepted,
        BuyerRejected,
        AuctionLive,
        Funded,
        Settled,
        Cancelled
    }

    struct Receivable {
        address seller;
        address buyer;
        bytes32 documentDigest;
        uint64 dueDate;
        uint64 auctionDeadline;
        uint16 maxAprBps;
        Status status;
        uint256 faceValue;
        uint256 advanceRequested;
        uint256 totalEscrowed;
        uint256 fundedPrincipal;
        uint256 totalLenderDue;
        uint256 totalLenderPaid;
        uint256 totalRepaid;
    }

    struct Bid {
        address lender;
        uint64 placedAt;
        uint16 aprBps;
        uint256 amount;
        uint256 acceptedAmount;
        uint256 refundedAmount;
    }

    struct Claim {
        uint256 principal;
        uint256 yield;
        uint256 paid;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidStatus(Status expected, Status actual);
    error InvalidDate();
    error AuctionNotFilled();
    error AuctionExpired();
    error AuctionFull();
    error BidRateTooHigh();
    error NothingToRefund();
    error NoCode();
    error Paused();
    error ReentrantCall();
    error TransferFailed();
    error NativeValueNotAccepted();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PauseChanged(bool paused);
    event FeeRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event ReceivableCreated(
        uint256 indexed receivableId,
        address indexed seller,
        address indexed buyer,
        bytes32 documentDigest,
        uint256 faceValue,
        uint256 advanceRequested,
        uint64 dueDate,
        uint16 maxAprBps
    );
    event ReceivableAccepted(uint256 indexed receivableId, address indexed buyer);
    event ReceivableRejected(uint256 indexed receivableId, address indexed buyer);
    event ReceivableCancelled(uint256 indexed receivableId, address indexed seller);
    event AuctionOpened(uint256 indexed receivableId, uint64 auctionDeadline);
    event BidPlaced(uint256 indexed receivableId, uint256 indexed bidIndex, address indexed lender, uint256 amount, uint16 aprBps);
    event BidAllocated(uint256 indexed receivableId, uint256 indexed bidIndex, address indexed lender, uint256 principal, uint256 yield);
    event BidRefunded(uint256 indexed receivableId, uint256 indexed bidIndex, address indexed lender, uint256 amount);
    event AuctionFinalized(uint256 indexed receivableId, uint256 advancePaid, uint256 totalLenderDue);
    event RepaymentReceived(uint256 indexed receivableId, address indexed buyer, uint256 amount, uint256 feePaid);
    event ClaimPaid(uint256 indexed receivableId, address indexed lender, uint256 amount);
    event SellerRemainderPaid(uint256 indexed receivableId, address indexed seller, uint256 amount);
    event ReceivableSettled(uint256 indexed receivableId);

    IERC20 public immutable usdc;
    address public owner;
    address public pendingOwner;
    address public feeRecipient;
    uint16 public immutable servicingFeeBps;
    bool public paused;

    uint256 public nextReceivableId = 1;
    mapping(uint256 receivableId => Receivable) private receivables;
    mapping(uint256 receivableId => Bid[]) private bids;
    mapping(uint256 receivableId => mapping(address lender => Claim)) private claims;
    mapping(uint256 receivableId => address[]) private claimants;
    mapping(uint256 receivableId => mapping(address lender => bool)) private hasClaim;

    uint256 private entered;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        if (entered == 1) revert ReentrantCall();
        entered = 1;
        _;
        entered = 0;
    }

    constructor(address usdc_, address feeRecipient_, uint16 servicingFeeBps_) {
        if (usdc_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (usdc_.code.length == 0) revert NoCode();
        if (servicingFeeBps_ > BPS_DENOMINATOR) revert InvalidAmount();

        usdc = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        servicingFeeBps = servicingFeeBps_;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    receive() external payable {
        revert NativeValueNotAccepted();
    }

    fallback() external payable {
        revert NativeValueNotAccepted();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PauseChanged(paused_);
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        if (newFeeRecipient == address(0)) revert InvalidAddress();
        address previousRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(previousRecipient, newFeeRecipient);
    }

    function createReceivable(
        address buyer,
        bytes32 documentDigest,
        uint256 faceValue,
        uint256 advanceRequested,
        uint64 dueDate,
        uint16 maxAprBps
    ) external whenNotPaused returns (uint256 receivableId) {
        if (buyer == address(0)) revert InvalidAddress();
        if (faceValue == 0 || advanceRequested == 0 || advanceRequested > faceValue) revert InvalidAmount();
        if (dueDate <= block.timestamp || maxAprBps > BPS_DENOMINATOR) revert InvalidDate();

        receivableId = nextReceivableId++;
        receivables[receivableId] = Receivable({
            seller: msg.sender,
            buyer: buyer,
            documentDigest: documentDigest,
            dueDate: dueDate,
            auctionDeadline: 0,
            maxAprBps: maxAprBps,
            status: Status.AwaitingBuyer,
            faceValue: faceValue,
            advanceRequested: advanceRequested,
            totalEscrowed: 0,
            fundedPrincipal: 0,
            totalLenderDue: 0,
            totalLenderPaid: 0,
            totalRepaid: 0
        });

        emit ReceivableCreated(receivableId, msg.sender, buyer, documentDigest, faceValue, advanceRequested, dueDate, maxAprBps);
    }

    function cancelReceivable(uint256 receivableId) external whenNotPaused {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.seller) revert Unauthorized();
        if (receivable.status != Status.AwaitingBuyer) revert InvalidStatus(Status.AwaitingBuyer, receivable.status);
        receivable.status = Status.Cancelled;
        emit ReceivableCancelled(receivableId, msg.sender);
    }

    function acceptReceivable(uint256 receivableId) external whenNotPaused {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.buyer) revert Unauthorized();
        if (receivable.status != Status.AwaitingBuyer) revert InvalidStatus(Status.AwaitingBuyer, receivable.status);
        receivable.status = Status.BuyerAccepted;
        emit ReceivableAccepted(receivableId, msg.sender);
    }

    function rejectReceivable(uint256 receivableId) external whenNotPaused {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.buyer) revert Unauthorized();
        if (receivable.status != Status.AwaitingBuyer) revert InvalidStatus(Status.AwaitingBuyer, receivable.status);
        receivable.status = Status.BuyerRejected;
        emit ReceivableRejected(receivableId, msg.sender);
    }

    function openAuction(uint256 receivableId, uint64 auctionDeadline) external whenNotPaused {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.seller) revert Unauthorized();
        if (receivable.status != Status.BuyerAccepted) revert InvalidStatus(Status.BuyerAccepted, receivable.status);
        if (auctionDeadline <= block.timestamp || auctionDeadline >= receivable.dueDate) revert InvalidDate();
        receivable.auctionDeadline = auctionDeadline;
        receivable.status = Status.AuctionLive;
        emit AuctionOpened(receivableId, auctionDeadline);
    }

    function placeBid(uint256 receivableId, uint256 amount, uint16 aprBps) external whenNotPaused nonReentrant {
        Receivable storage receivable = _receivable(receivableId);
        if (receivable.status != Status.AuctionLive) revert InvalidStatus(Status.AuctionLive, receivable.status);
        if (block.timestamp >= receivable.auctionDeadline) revert AuctionExpired();
        if (amount == 0) revert InvalidAmount();
        if (aprBps > receivable.maxAprBps) revert BidRateTooHigh();
        if (bids[receivableId].length >= MAX_BIDS_PER_RECEIVABLE) revert AuctionFull();

        _safeTransferFrom(msg.sender, address(this), amount);
        bids[receivableId].push(Bid({
            lender: msg.sender,
            placedAt: uint64(block.timestamp),
            aprBps: aprBps,
            amount: amount,
            acceptedAmount: 0,
            refundedAmount: 0
        }));
        receivable.totalEscrowed += amount;
        emit BidPlaced(receivableId, bids[receivableId].length - 1, msg.sender, amount, aprBps);
    }

    /// @notice Selects lowest-APR escrowed bids until the seller's exact advance is filled.
    function finalizeAuction(uint256 receivableId) external whenNotPaused nonReentrant {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.seller) revert Unauthorized();
        if (receivable.status != Status.AuctionLive) revert InvalidStatus(Status.AuctionLive, receivable.status);
        if (receivable.totalEscrowed < receivable.advanceRequested) revert AuctionNotFilled();

        uint256 remaining = receivable.advanceRequested;
        uint256[] memory sortedBidIndexes = _sortedBidIndexes(receivableId);
        for (uint256 position; position < sortedBidIndexes.length && remaining > 0; ++position) {
            uint256 bidIndex = sortedBidIndexes[position];
            Bid storage bid = bids[receivableId][bidIndex];
            uint256 allocated = bid.amount < remaining ? bid.amount : remaining;
            uint256 yield = _calculateYield(allocated, bid.aprBps, receivable.dueDate - uint64(block.timestamp));

            bid.acceptedAmount = allocated;
            remaining -= allocated;
            _addClaim(receivableId, bid.lender, allocated, yield);
            receivable.fundedPrincipal += allocated;
            receivable.totalLenderDue += allocated + yield;
            emit BidAllocated(receivableId, bidIndex, bid.lender, allocated, yield);
        }

        // The requested advance leaves the escrow only after all lender claims exist in state.
        receivable.status = Status.Funded;
        _safeTransfer(receivable.seller, receivable.advanceRequested);
        emit AuctionFinalized(receivableId, receivable.advanceRequested, receivable.totalLenderDue);
    }

    /// @notice Cancels an under-filled auction after expiry. Each lender later pulls their own escrow refund.
    function cancelUnfilledAuction(uint256 receivableId) external whenNotPaused {
        Receivable storage receivable = _receivable(receivableId);
        if (receivable.status != Status.AuctionLive) revert InvalidStatus(Status.AuctionLive, receivable.status);
        if (block.timestamp < receivable.auctionDeadline) revert AuctionExpired();
        if (receivable.totalEscrowed >= receivable.advanceRequested) revert AuctionNotFilled();
        receivable.status = Status.Cancelled;
        emit ReceivableCancelled(receivableId, receivable.seller);
    }

    /// @notice Returns any unaccepted escrow after finalization or all escrow from a cancelled auction.
    function claimBidRefund(uint256 receivableId, uint256 bidIndex) external nonReentrant {
        Receivable storage receivable = _receivable(receivableId);
        if (receivable.status != Status.Funded && receivable.status != Status.Settled && receivable.status != Status.Cancelled) {
            revert InvalidStatus(Status.Funded, receivable.status);
        }
        Bid storage bid = _bid(receivableId, bidIndex);
        if (msg.sender != bid.lender) revert Unauthorized();

        uint256 refundable = receivable.status == Status.Cancelled ? bid.amount : bid.amount - bid.acceptedAmount;
        uint256 amount = refundable - bid.refundedAmount;
        if (amount == 0) revert NothingToRefund();
        bid.refundedAmount += amount;
        _safeTransfer(bid.lender, amount);
        emit BidRefunded(receivableId, bidIndex, bid.lender, amount);
    }

    /// @notice Buyer repays in USDC. Fees come first; lender claims then receive pro-rata payments; any surplus reaches seller.
    function repay(uint256 receivableId, uint256 amount) external whenNotPaused nonReentrant {
        Receivable storage receivable = _receivable(receivableId);
        if (msg.sender != receivable.buyer) revert Unauthorized();
        if (receivable.status != Status.Funded) revert InvalidStatus(Status.Funded, receivable.status);
        if (amount == 0) revert InvalidAmount();

        _safeTransferFrom(msg.sender, address(this), amount);
        receivable.totalRepaid += amount;

        uint256 fee = (amount * servicingFeeBps) / BPS_DENOMINATOR;
        if (fee > 0) _safeTransfer(feeRecipient, fee);
        uint256 remaining = amount - fee;
        uint256 outstanding = receivable.totalLenderDue - receivable.totalLenderPaid;

        uint256 lenderPayment = remaining < outstanding ? remaining : outstanding;
        if (lenderPayment > 0) _payClaims(receivableId, lenderPayment, outstanding);

        uint256 sellerRemainder = remaining - lenderPayment;
        if (sellerRemainder > 0) {
            _safeTransfer(receivable.seller, sellerRemainder);
            emit SellerRemainderPaid(receivableId, receivable.seller, sellerRemainder);
        }

        emit RepaymentReceived(receivableId, msg.sender, amount, fee);
        if (receivable.totalLenderPaid == receivable.totalLenderDue) {
            receivable.status = Status.Settled;
            emit ReceivableSettled(receivableId);
        }
    }

    function getReceivable(uint256 receivableId) external view returns (Receivable memory) {
        return _receivable(receivableId);
    }

    function getBidCount(uint256 receivableId) external view returns (uint256) {
        _receivable(receivableId);
        return bids[receivableId].length;
    }

    function getBids(uint256 receivableId, uint256 offset, uint256 limit) external view returns (Bid[] memory page) {
        _receivable(receivableId);
        uint256 length = bids[receivableId].length;
        if (offset >= length || limit == 0) return new Bid[](0);
        uint256 end = offset + limit;
        if (end > length) end = length;
        page = new Bid[](end - offset);
        for (uint256 index; index < page.length; ++index) page[index] = bids[receivableId][offset + index];
    }

    function getClaim(uint256 receivableId, address lender) external view returns (Claim memory) {
        _receivable(receivableId);
        return claims[receivableId][lender];
    }

    function previewSettlement(uint256 receivableId, uint256 amount)
        external
        view
        returns (uint256 fee, uint256 lenderPayment, uint256 sellerRemainder)
    {
        Receivable storage receivable = _receivable(receivableId);
        fee = (amount * servicingFeeBps) / BPS_DENOMINATOR;
        uint256 afterFee = amount - fee;
        uint256 outstanding = receivable.totalLenderDue - receivable.totalLenderPaid;
        lenderPayment = afterFee < outstanding ? afterFee : outstanding;
        sellerRemainder = afterFee - lenderPayment;
    }

    function _payClaims(uint256 receivableId, uint256 amount, uint256 totalOutstanding) private {
        Receivable storage receivable = receivables[receivableId];
        address[] storage lenders = claimants[receivableId];
        uint256 remaining = amount;
        uint256 remainingOutstanding = totalOutstanding;

        for (uint256 index; index < lenders.length && remaining > 0; ++index) {
            Claim storage claim = claims[receivableId][lenders[index]];
            uint256 claimOutstanding = claim.principal + claim.yield - claim.paid;
            if (claimOutstanding == 0) continue;

            uint256 payout = index + 1 == lenders.length
                ? remaining
                : (amount * claimOutstanding) / totalOutstanding;
            if (payout > claimOutstanding) payout = claimOutstanding;
            if (payout > remaining) payout = remaining;

            claim.paid += payout;
            receivable.totalLenderPaid += payout;
            remaining -= payout;
            remainingOutstanding -= claimOutstanding;
            _safeTransfer(lenders[index], payout);
            emit ClaimPaid(receivableId, lenders[index], payout);
        }

        // A bounded final pass assigns any integer dust without exceeding an unpaid claim.
        for (uint256 index; remaining > 0 && index < lenders.length; ++index) {
            Claim storage claim = claims[receivableId][lenders[index]];
            uint256 claimOutstanding = claim.principal + claim.yield - claim.paid;
            if (claimOutstanding == 0) continue;
            uint256 payout = claimOutstanding < remaining ? claimOutstanding : remaining;
            claim.paid += payout;
            receivable.totalLenderPaid += payout;
            remaining -= payout;
            _safeTransfer(lenders[index], payout);
            emit ClaimPaid(receivableId, lenders[index], payout);
        }
    }

    function _addClaim(uint256 receivableId, address lender, uint256 principal, uint256 yield) private {
        Claim storage claim = claims[receivableId][lender];
        if (!hasClaim[receivableId][lender]) {
            hasClaim[receivableId][lender] = true;
            claimants[receivableId].push(lender);
        }
        claim.principal += principal;
        claim.yield += yield;
    }

    function _sortedBidIndexes(uint256 receivableId) private view returns (uint256[] memory indexes) {
        uint256 length = bids[receivableId].length;
        indexes = new uint256[](length);
        for (uint256 index; index < length; ++index) indexes[index] = index;

        // Selection sort is intentional: 32 bids max, deterministic tie-breaking by earlier bid index.
        for (uint256 left; left < length; ++left) {
            uint256 best = left;
            for (uint256 right = left + 1; right < length; ++right) {
                Bid storage candidate = bids[receivableId][indexes[right]];
                Bid storage current = bids[receivableId][indexes[best]];
                if (candidate.aprBps < current.aprBps || (candidate.aprBps == current.aprBps && indexes[right] < indexes[best])) {
                    best = right;
                }
            }
            if (best != left) (indexes[left], indexes[best]) = (indexes[best], indexes[left]);
        }
    }

    function _calculateYield(uint256 principal, uint16 aprBps, uint256 termSeconds) private pure returns (uint256) {
        return (principal * aprBps * termSeconds) / (BPS_DENOMINATOR * YEAR);
    }

    function _receivable(uint256 receivableId) private view returns (Receivable storage receivable) {
        receivable = receivables[receivableId];
        if (receivable.status == Status.None) revert InvalidStatus(Status.None, Status.None);
    }

    function _bid(uint256 receivableId, uint256 bidIndex) private view returns (Bid storage bid) {
        if (bidIndex >= bids[receivableId].length) revert InvalidAmount();
        bid = bids[receivableId][bidIndex];
    }

    function _safeTransfer(address recipient, uint256 amount) private {
        (bool success, bytes memory data) = address(usdc).call(abi.encodeCall(IERC20.transfer, (recipient, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransferFrom(address sender, address recipient, uint256 amount) private {
        (bool success, bytes memory data) = address(usdc).call(abi.encodeCall(IERC20.transferFrom, (sender, recipient, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
