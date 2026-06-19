// Server-side helper for the 0x Swap API v2 (Base mainnet, chainId 8453).
// The API key is read from the environment and never reaches the browser.

const ZEROX_BASE = "https://api.0x.org";
const CHAIN_ID = "8453"; // Base mainnet

const FEE_BPS = process.env.PROTOCOL_FEE_BPS || "200";      // 200 bps = 2%
const FEE_RECIPIENT = process.env.PROTOCOL_FEE_RECIPIENT || ""; // address that collects the fee

/**
 * Proxy a request to a 0x Swap API endpoint and write the JSON response to `res`.
 * @param {string} path  e.g. "/swap/allowance-holder/price"
 * @param {object} query e.g. { sellToken, buyToken, sellAmount, taker }
 * @param {import('next').NextApiResponse} res
 */
export async function proxy0x(path, query, res) {
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ZEROX_API_KEY. Set it in your environment." });
    return;
  }

  const params = new URLSearchParams({ chainId: CHAIN_ID, ...query });

  // Attach the protocol fee (charged on the buy token) when a recipient is configured.
  if (FEE_RECIPIENT && query.buyToken) {
    params.set("swapFeeRecipient", FEE_RECIPIENT);
    params.set("swapFeeBps", FEE_BPS);
    params.set("swapFeeToken", query.buyToken);
  }

  try {
    const r = await fetch(`${ZEROX_BASE}${path}?${params.toString()}`, {
      headers: { "0x-api-key": apiKey, "0x-version": "v2" },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream request to 0x failed.", detail: String(err) });
  }
}
