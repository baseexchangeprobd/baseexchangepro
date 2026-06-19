// GET /api/quote?sellToken=&buyToken=&sellAmount=&taker=
// Firm quote — returns an executable `transaction` payload plus any allowance `issues`.
// Call only when the user is ready to swap and a wallet is connected.
import { proxy0x } from "../../lib/zerox";

export default async function handler(req, res) {
  const { sellToken, buyToken, sellAmount, taker } = req.query;
  if (!sellToken || !buyToken || !sellAmount || !taker) {
    return res.status(400).json({ error: "sellToken, buyToken, sellAmount and taker are required." });
  }
  await proxy0x("/swap/allowance-holder/quote", { sellToken, buyToken, sellAmount, taker }, res);
}
