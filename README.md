# baseexchangepro

Professional token swaps on **Base**, with a premium minimal UI and live pricing from the **0x Swap API v2**. Built with **Next.js (Pages Router)**.

> Design note: the landing page is a faithful React port of the original `baseexchangepro` design — same colors, typography (Jost + Inter), and layout. Only the swap panel and animations were made interactive.

---

## Stack

- **Next.js 15** + **React 18** (Pages Router)
- Plain CSS design system in `styles/globals.css` (no Tailwind — kept identical to the original)
- **0x Swap API v2** for quotes and executable swaps on Base (chainId 8453)
- Wallet via the browser's injected EIP-1193 provider (MetaMask / Coinbase Wallet)

## Project structure

```
baseexchangepro/
├── pages/
│   ├── _app.js            # global CSS
│   ├── _document.js       # <html lang>, font preconnect/links
│   ├── index.js           # the landing page (Head incl. base:app_id)
│   └── api/
│       ├── price.js       # GET /api/price  → indicative quote (server-side key)
│       └── quote.js       # GET /api/quote  → executable transaction payload
├── components/
│   ├── SwapWidget.jsx     # live ETH→USDC swap, wallet connect, fee display
│   ├── ParticleField.jsx  # hero canvas animation
│   ├── Counter.jsx        # animated stat counters
│   ├── Bars.jsx           # analytics bars
│   └── Faq.jsx            # accordion
├── lib/
│   ├── tokens.js          # Base token registry + chain params
│   └── zerox.js           # server helper that calls 0x (injects the 2% fee)
├── styles/globals.css     # the original design, verbatim
├── public/                # favicon, robots.txt, sitemap.xml
└── .env.example           # required environment variables
```

## Getting started

```bash
npm install
cp .env.example .env.local      # then fill in your 0x API key
npm run dev                     # http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `ZEROX_API_KEY` | **Yes** | Get one free at https://dashboard.0x.org. Stays server-side. |
| `PROTOCOL_FEE_RECIPIENT` | No | Address that collects your 2% fee. Leave blank to disable. |
| `PROTOCOL_FEE_BPS` | No | Fee size in basis points. `200` = 2% (default). |

The API key is only read inside `pages/api/*` and `lib/zerox.js`, so it is **never shipped to the browser**.

## How the swap works

1. As the user types an amount, the widget calls `/api/price`, which proxies the 0x **price** endpoint and returns an indicative quote (rate, price impact, gas, fee).
2. On **Swap**, it calls `/api/quote` for a firm quote that includes a ready-to-send `transaction` payload, then submits it with `eth_sendTransaction`.
3. The 2% fee is attached server-side via 0x's `swapFeeRecipient` / `swapFeeBps` parameters, so the returned `buyAmount` is already net of fee. The panel shows the fee explicitly.

The default pair is **ETH → USDC**. Adding a full token selector is a small extension — the token list already lives in `lib/tokens.js`.

## Deploy to Vercel

1. Push this folder to a new GitHub repository.
2. Import the repo at https://vercel.com/new (Next.js is auto-detected).
3. Add the environment variables from the table above in **Project → Settings → Environment Variables**.
4. Deploy. The `/api` routes run as serverless functions automatically.

## Honest caveats

- **Selling ERC-20 tokens** (instead of native ETH) needs an allowance/approval step before the swap. The code path is noted in `SwapWidget.jsx` (`q.issues.allowance`) but not yet implemented, since the default pair sells native ETH, which needs no approval.
- **Not audited.** The "Audits" link in the footer is a placeholder. Don't present the product as audited until a real audit exists.
- **Stats and the analytics chart are illustrative** placeholders, not live on-chain data. Wire them to The Graph / Dune when ready.
- Test with **small amounts on Base** first, and confirm the 0x response field names against the current API reference (response shapes can change between API versions).

## License

MIT

---

## DeFi suite (v1.1)

The swap section now hosts a 4-tab dashboard (`components/Dashboard.jsx`):

| Tab | File | Status |
| --- | --- | --- |
| **Swap** | `SwapWidget.jsx` | Working — 0x v2, approvals, token selector, 2% fee. |
| **Limit** | `LimitTab.jsx` | Real EIP-712 order signing → `pages/api/orders.js`. Needs a real DB + a keeper/filler to execute. |
| **Pool** | `PoolTab.jsx` | Aerodrome add/remove via viem. ERC-20/ERC-20 pairs only. Verify addresses + test before mainnet. |
| **Trade** | `TradeTab.jsx` | Live `lightweight-charts` fed by `/api/price`, sampled every 5s. |

New deps: `viem`, `lightweight-charts` (run `npm install` again).

### ⚠ Read before going live
- **Limit orders** are signed off-chain with a self-hosted EIP-712 model — 0x retired its public order book. `pages/api/orders.js` stores orders **in memory** (resets on cold start). Swap it for a database, and build a keeper that watches prices and settles matched orders against a settlement contract you deploy. Until then, orders are signed and stored but **not executed**.
- **Liquidity** transactions move real funds with hand-built calldata. The Aerodrome router address is verified, but **test on a fork or with tiny amounts first**. Native-ETH pools (`addLiquidityETH`) are intentionally not included to avoid untested value-bearing calldata — use WETH pairs.
- Token addresses in `lib/tokens.js` and the router in `lib/dexConfig.js` should be re-confirmed on BaseScan before launch.
