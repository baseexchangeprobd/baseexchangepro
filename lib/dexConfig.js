import { createWalletClient, createPublicClient, custom, http } from "viem";
import { base } from "viem/chains";

// ─────────────────────────────────────────────────────────────
//  Verified Base mainnet addresses.
//  ⚠ Confirm on BaseScan and test on a fork/small amount before
//  routing real liquidity through them.
// ─────────────────────────────────────────────────────────────
export const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

export const AERODROME_ROUTER_ABI = [
  {
    type: "function", name: "addLiquidity", stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "stable", type: "bool" },
      { name: "amountADesired", type: "uint256" }, { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" }, { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" }, { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }, { name: "liquidity", type: "uint256" }],
  },
  {
    type: "function", name: "removeLiquidity", stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "stable", type: "bool" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" }, { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" }, { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }],
  },
  { type: "function", name: "defaultFactory", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function", name: "poolFor", stateMutability: "view",
    inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "stable", type: "bool" }, { name: "_factory", type: "address" }],
    outputs: [{ name: "pool", type: "address" }],
  },
  {
    type: "function", name: "quoteRemoveLiquidity", stateMutability: "view",
    inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "stable", type: "bool" }, { name: "_factory", type: "address" }, { name: "liquidity", type: "uint256" }],
    outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }],
  },
];

export function getPublicClient() {
  return createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
}

export async function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("No EVM wallet detected.");
  const wallet = createWalletClient({ chain: base, transport: custom(window.ethereum) });
  const [account] = await wallet.requestAddresses();
  // ensure Base
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x2105", chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    } else throw e;
  }
  return { wallet, account };
}
