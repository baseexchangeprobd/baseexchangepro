// GET /api/price?sellToken=&buyToken=&sellAmount=&taker=
// Indicative quote used to update the UI as the user types. No transaction is built.
import { proxy0x } from "../../lib/zerox";

export default async function handler(req, res) {
  const { sellToken, buyToken, sellAmount, taker } = req.query;
  if (!sellToken || !buyToken || !sellAmount) {
    return res.status(400).json({ error: "sellToken, buyToken and sellAmount are required." });
  }
  const query = { sellToken, buyToken, sellAmount };
  if (taker) query.taker = taker;
  await proxy0x("/swap/allowance-holder/price", query, res);
}
