// Base mainnet (chainId 8453) token registry.
// Native ETH uses the 0x sentinel address; no approval is needed when selling ETH.
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const TOKENS = {
  ETH: {
    symbol: "ETH",
    name: "Ether",
    address: NATIVE_ETH,
    decimals: 18,
    badgeClass: "eth",
    glyph: "Ξ",
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    badgeClass: "eth",
    glyph: "Ξ",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    badgeClass: "usdc",
    glyph: "$",
  },
  DAI: {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
    badgeClass: "usdc",
    glyph: "◈",
  },
  cbETH: {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    decimals: 18,
    badgeClass: "eth",
    glyph: "Ξ",
  },
};

export const BASE_CHAIN = {
  idHex: "0x2105", // 8453
  idDec: 8453,
  params: {
    chainId: "0x2105",
    chainName: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
};
