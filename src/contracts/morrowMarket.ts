import { erc20Abi } from "viem";

/** ABI used for live Arc reads/writes; regenerate from Foundry before deployment. */
export const morrowMarketAbi = [
  {
    type: "function",
    name: "createReceivable",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "documentDigest", type: "bytes32" },
      { name: "faceValue", type: "uint256" },
      { name: "advanceRequested", type: "uint256" },
      { name: "dueDate", type: "uint64" },
      { name: "maxAprBps", type: "uint16" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "acceptReceivable",
    stateMutability: "nonpayable",
    inputs: [{ name: "receivableId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "openAuction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "receivableId", type: "uint256" },
      { name: "auctionDeadline", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "placeBid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "receivableId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "aprBps", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeAuction",
    stateMutability: "nonpayable",
    inputs: [{ name: "receivableId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "receivableId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export { erc20Abi };
