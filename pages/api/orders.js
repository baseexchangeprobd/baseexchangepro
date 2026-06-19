// Minimal order-book endpoint for signed limit orders.
//
// ⚠ STORAGE IS IN-MEMORY: this map resets whenever the serverless function
// cold-starts, so it is suitable for local testing only. For production,
// replace `BOOK` with a real database (Supabase, Postgres, Redis, etc.) and
// add a keeper/filler service that watches prices and settles matched orders.

const BOOK = globalThis.__BX_ORDER_BOOK__ || (globalThis.__BX_ORDER_BOOK__ = []);

function isExpired(o) {
  return Number(o.order.expiry) * 1000 < Date.now();
}

export default function handler(req, res) {
  if (req.method === "POST") {
    const { order, signature } = req.body || {};
    if (!order || !signature) {
      return res.status(400).json({ error: "order and signature are required." });
    }
    const required = ["maker", "sellToken", "buyToken", "sellAmount", "buyAmount", "expiry", "salt"];
    for (const k of required) {
      if (order[k] == null) return res.status(400).json({ error: `order.${k} is required.` });
    }
    const record = { id: order.salt, order, signature, createdAt: Date.now(), status: "open" };
    BOOK.push(record);
    return res.status(201).json({ ok: true, id: record.id });
  }

  if (req.method === "GET") {
    const { maker } = req.query;
    const open = BOOK.filter((r) => r.status === "open" && !isExpired(r));
    const list = maker
      ? open.filter((r) => r.order.maker.toLowerCase() === String(maker).toLowerCase())
      : open;
    return res.status(200).json({ orders: list });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
