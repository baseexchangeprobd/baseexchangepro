import { createWalletClient, custom } from "viem";
import { base } from "viem/chains";

// Off-chain EIP-712 limit order for the baseexchangepro order book.
// This is a self-hosted order model (0x retired its public order book/relayer),
// so a signed order must be stored by your backend and executed by a keeper/filler
// you operate. The signature here is real and verifiable on-chain by a settlement
// contract you control.

export const ORDER_DOMAIN = {
  name: "baseexchangepro",
  version: "1",
  chainId: base.id, // 8453
};

export const ORDER_TYPES = {
  Order: [
    { name: "maker", type: "address" },
    { name: "sellToken", type: "address" },
    { name: "buyToken", type: "address" },
    { name: "sellAmount", type: "uint256" },
    { name: "buyAmount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "salt", type: "uint256" },
  ],
};

export function buildOrder({ maker, sellToken, buyToken, sellAmount, buyAmount, expirySeconds }) {
  const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds);
  const salt = BigInt("0x" + crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), ""));
  return {
    maker,
    sellToken,
    buyToken,
    sellAmount: BigInt(sellAmount),
    buyAmount: BigInt(buyAmount),
    expiry,
    salt,
  };
}

export async function signOrder(order) {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("No EVM wallet detected.");
  const wallet = createWalletClient({ chain: base, transport: custom(window.ethereum) });
  const signature = await wallet.signTypedData({
    account: order.maker,
    domain: ORDER_DOMAIN,
    types: ORDER_TYPES,
    primaryType: "Order",
    message: order,
  });
  return signature;
}

// JSON-safe (BigInt -> string) for transport to the order-book API.
export function serializeOrder(order) {
  return Object.fromEntries(
    Object.entries(order).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])
  );
}
