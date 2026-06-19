import { useCallback, useEffect, useState } from "react";
import { TOKENS } from "../lib/tokens";
import { buildOrder, signOrder, serializeOrder } from "../lib/limitOrder";

const SYMS = Object.keys(TOKENS).filter((s) => s !== "ETH"); // limit orders use ERC-20s (incl. WETH)
function toUnits(amount, decimals) {
  if (!amount) return 0n;
  const [w = "0", f = ""] = String(amount).split(".");
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export default function LimitTab() {
  const [account, setAccount] = useState("");
  const [side, setSide] = useState("buy");
  const [baseSym, setBaseSym] = useState("WETH");
  const [quoteSym, setQuoteSym] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [expiry, setExpiry] = useState("86400"); // 1 day
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  const baseTok = TOKENS[baseSym], quoteTok = TOKENS[quoteSym];

  const loadOrders = useCallback(async (acct = account) => {
    if (!acct) return;
    try {
      const r = await fetch(`/api/orders?maker=${acct}`);
      const d = await r.json();
      setOrders(d.orders || []);
    } catch { /* ignore */ }
  }, [account]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  async function connect() {
    setError("");
    const eth = window.ethereum;
    if (!eth) { setError("No EVM wallet detected."); return; }
    try {
      const [a] = await eth.request({ method: "eth_requestAccounts" });
      setAccount(a); loadOrders(a);
    } catch (e) { setError(e.message); }
  }

  async function place() {
    setError(""); setMsg("");
    if (!account) return connect();
    if (baseSym === quoteSym) { setError("Base and quote must differ."); return; }
    const amt = Number(amount), p = Number(price);
    if (!(amt > 0) || !(p > 0)) { setError("Enter a valid amount and price."); return; }

    setBusy(true);
    try {
      // price = quote per 1 base
      const baseUnits = toUnits(amount, baseTok.decimals);
      const quoteUnits = toUnits((amt * p).toString(), quoteTok.decimals);

      const fields = side === "sell"
        ? { sellToken: baseTok.address, buyToken: quoteTok.address, sellAmount: baseUnits, buyAmount: quoteUnits }
        : { sellToken: quoteTok.address, buyToken: baseTok.address, sellAmount: quoteUnits, buyAmount: baseUnits };

      const order = buildOrder({ maker: account, ...fields, expirySeconds: Number(expiry) });
      const signature = await signOrder(order);

      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: serializeOrder(order), signature }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not submit order.");
      setMsg(`Order signed and submitted (#${String(d.id).slice(0, 8)}…).`);
      setAmount(""); setPrice("");
      loadOrders();
    } catch (e) {
      setError(e.shortMessage || e.message || "Order failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="swapbox">
      <div className="swap-head">
        <div className="t">Limit order</div>
        <span className="tag">off-chain · EIP-712</span>
      </div>

      <div className="seg">
        <button className={`buy ${side === "buy" ? "on" : ""}`} onClick={() => setSide("buy")}>Limit Buy</button>
        <button className={`sell ${side === "sell" ? "on" : ""}`} onClick={() => setSide("sell")}>Limit Sell</button>
      </div>

      <div className="field-row">
        <span className="glyphlbl">Pair</span>
        <select value={baseSym} onChange={(e) => setBaseSym(e.target.value)}>
          {SYMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: "var(--sec)" }}>/</span>
        <select value={quoteSym} onChange={(e) => setQuoteSym(e.target.value)}>
          {SYMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="field-row">
        <span className="glyphlbl">Amount ({baseSym})</span>
        <input value={amount} inputMode="decimal" placeholder="0.0"
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>

      <div className="field-row">
        <span className="glyphlbl">Price ({quoteSym})</span>
        <input value={price} inputMode="decimal" placeholder={`${quoteSym} per ${baseSym}`}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>

      <div className="field-row">
        <span className="glyphlbl">Expires</span>
        <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
          <option value="3600">1 hour</option>
          <option value="86400">1 day</option>
          <option value="604800">1 week</option>
          <option value="2592000">30 days</option>
        </select>
      </div>

      {msg && <div className="r" style={{ color: "#22c55e", fontSize: 13, margin: "6px 0" }}>{msg}</div>}
      {error && <div className="r" style={{ color: "#f87171", fontSize: 13, margin: "6px 0" }}>{error}</div>}

      <button className="btn btn-primary swapbtn" onClick={place} disabled={busy}>
        {busy ? "Sign in your wallet…" : account ? `Place ${side === "buy" ? "Buy" : "Sell"} Order` : "Connect Wallet"}
      </button>

      {orders.length > 0 && (
        <div className="orderlist">
          <div className="field-label" style={{ marginBottom: 8, color: "var(--sec)", fontSize: 12 }}>Your open orders</div>
          {orders.map((o) => (
            <div className="o" key={o.id}>
              <div>
                <div>{o.order.sellAmount} → {o.order.buyAmount}</div>
                <div className="muted">expires {new Date(Number(o.order.expiry) * 1000).toLocaleString()}</div>
              </div>
              <span className="tag">open</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
