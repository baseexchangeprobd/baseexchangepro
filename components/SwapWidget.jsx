import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOKENS, NATIVE_ETH, BASE_CHAIN } from "../lib/tokens";

/* ───────────────────────── unit + abi helpers (no external deps) ───────────────────────── */
function toBaseUnits(amount, decimals) {
  if (!amount) return 0n;
  const [whole = "0", frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}
function fromBaseUnits(value, decimals, maxFrac = 6) {
  const v = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}
const toHex = (dec) => "0x" + BigInt(dec).toString(16);
const padAddr = (a) => a.toLowerCase().replace("0x", "").padStart(64, "0");
const padUint = (bi) => BigInt(bi).toString(16).padStart(64, "0");
const fmt = (n, d = 2) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const isNative = (addr) => addr.toLowerCase() === NATIVE_ETH.toLowerCase();
const SEL_BALANCEOF = "0x70a08231";
const SEL_APPROVE = "0x095ea7b3";
const FEE_BPS = 200; // 2% — keep in sync with PROTOCOL_FEE_BPS on the server
const SLIPPAGE = "0.5%";

/* ───────────────────────── component ───────────────────────── */
export default function SwapWidget() {
  const [account, setAccount] = useState("");
  const [sellSym, setSellSym] = useState("ETH");
  const [buySym, setBuySym] = useState("USDC");
  const [amount, setAmount] = useState("1.0");
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(""); // transient status line
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [bal, setBal] = useState({ sell: null, buy: null });
  const [modal, setModal] = useState(null); // 'sell' | 'buy' | null
  const debounce = useRef(null);

  const sellToken = TOKENS[sellSym];
  const buyToken = TOKENS[buySym];
  const sellBaseUnits = useMemo(() => toBaseUnits(amount, sellToken.decimals), [amount, sellToken]);

  /* ── balances ── */
  const readBalance = useCallback(async (eth, token, owner) => {
    if (isNative(token.address)) {
      const wei = await eth.request({ method: "eth_getBalance", params: [owner, "latest"] });
      return fromBaseUnits(BigInt(wei).toString(), token.decimals, 4);
    }
    const data = SEL_BALANCEOF + padAddr(owner);
    const out = await eth.request({ method: "eth_call", params: [{ to: token.address, data }, "latest"] });
    return fromBaseUnits(BigInt(out || "0x0").toString(), token.decimals, 4);
  }, []);

  const refreshBalances = useCallback(async (acct = account) => {
    const eth = window.ethereum;
    if (!eth || !acct) return;
    try {
      const [s, b] = await Promise.all([
        readBalance(eth, sellToken, acct),
        readBalance(eth, buyToken, acct),
      ]);
      setBal({ sell: s, buy: b });
    } catch { /* non-fatal */ }
  }, [account, sellToken, buyToken, readBalance]);

  /* ── live indicative price ── */
  const fetchPrice = useCallback(async () => {
    setError(""); setTxHash(""); setStatus("");
    if (sellSym === buySym) { setQuote(null); setError("Choose two different tokens."); return; }
    if (!amount || Number(amount) <= 0) { setQuote(null); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: sellBaseUnits.toString(),
      });
      if (account) params.set("taker", account);
      const r = await fetch(`/api/price?${params.toString()}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.reason || "Could not fetch a price.");
      setQuote(data);
    } catch (e) {
      setError(e.message); setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [account, amount, sellSym, buySym, sellToken, buyToken, sellBaseUnits]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(fetchPrice, 450);
    return () => clearTimeout(debounce.current);
  }, [fetchPrice]);

  useEffect(() => { refreshBalances(); }, [refreshBalances]);

  /* ── wallet ── */
  async function ensureBase(eth) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN.idHex }] });
    } catch (e) {
      if (e.code === 4902) {
        await eth.request({ method: "wallet_addEthereumChain", params: [BASE_CHAIN.params] });
      } else throw e;
    }
  }
  async function connect() {
    setError("");
    const eth = typeof window !== "undefined" ? window.ethereum : null;
    if (!eth) { setError("No EVM wallet detected. Install MetaMask or Coinbase Wallet."); return; }
    try {
      const accts = await eth.request({ method: "eth_requestAccounts" });
      await ensureBase(eth);
      setAccount(accts[0]);
      refreshBalances(accts[0]);
    } catch (e) {
      setError(e.message || "Wallet connection was rejected.");
    }
  }

  // react to account / chain changes
  useEffect(() => {
    const eth = typeof window !== "undefined" ? window.ethereum : null;
    if (!eth?.on) return;
    const onAccts = (a) => { setAccount(a?.[0] || ""); if (a?.[0]) refreshBalances(a[0]); };
    const onChain = () => fetchPrice();
    eth.on("accountsChanged", onAccts);
    eth.on("chainChanged", onChain);
    return () => { eth.removeListener?.("accountsChanged", onAccts); eth.removeListener?.("chainChanged", onChain); };
  }, [refreshBalances, fetchPrice]);

  /* ── receipt polling ── */
  async function waitForReceipt(eth, hash, label) {
    setStatus(`${label} — waiting for confirmation…`);
    for (let i = 0; i < 60; i++) {
      const rc = await eth.request({ method: "eth_getTransactionReceipt", params: [hash] });
      if (rc) {
        if (rc.status && BigInt(rc.status) === 0n) throw new Error(`${label} reverted on-chain.`);
        return rc;
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
    throw new Error(`${label} timed out waiting for confirmation.`);
  }

  /* ── approval (ERC-20 sells) ── */
  const allowanceIssue = quote?.issues?.allowance || null; // { actual, spender } when insufficient
  const needsApproval = !isNative(sellToken.address) && !!allowanceIssue;

  async function approve() {
    const eth = window.ethereum;
    if (!eth || !account) return connect();
    const spender = allowanceIssue?.spender;
    if (!spender) { setError("No spender returned for approval."); return; }
    setBusy(true); setError("");
    try {
      const data = SEL_APPROVE + padAddr(spender) + padUint(sellBaseUnits);
      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: sellToken.address, data }],
      });
      await waitForReceipt(eth, hash, `Approve ${sellToken.symbol}`);
      setStatus(`${sellToken.symbol} approved.`);
      await fetchPrice(); // re-evaluate; allowance issue should clear
    } catch (e) {
      setError(e.shortMessage || e.message || "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  /* ── execute swap ── */
  async function swap() {
    const eth = window.ethereum;
    if (!eth || !account) return connect();
    setBusy(true); setError(""); setTxHash("");
    try {
      const params = new URLSearchParams({
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: sellBaseUnits.toString(),
        taker: account,
      });
      const r = await fetch(`/api/quote?${params.toString()}`);
      const q = await r.json();
      if (!r.ok) throw new Error(q.error || q.reason || "Could not build the swap transaction.");

      // Safety: if the firm quote still reports an allowance issue, route to approve.
      if (!isNative(sellToken.address) && q.issues?.allowance) {
        setQuote(q); setBusy(false);
        setError("Token approval required before swapping.");
        return;
      }
      const tx = q.transaction;
      if (!tx?.to) throw new Error("Quote did not include a transaction payload.");

      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [{
          from: account,
          to: tx.to,
          data: tx.data,
          value: tx.value ? toHex(tx.value) : "0x0",
          ...(tx.gas ? { gas: toHex(tx.gas) } : {}),
        }],
      });
      setTxHash(hash);
      await waitForReceipt(eth, hash, "Swap");
      setStatus("Swap confirmed.");
      refreshBalances();
    } catch (e) {
      setError(e.shortMessage || e.message || "Swap failed.");
    } finally {
      setBusy(false);
    }
  }

  /* ── token selection ── */
  function pick(side, sym) {
    if (side === "sell") {
      if (sym === buySym) setBuySym(sellSym); // swap sides if collision
      setSellSym(sym);
    } else {
      if (sym === sellSym) setSellSym(buySym);
      setBuySym(sym);
    }
    setModal(null);
  }
  function flip() {
    setSellSym(buySym); setBuySym(sellSym); setAmount("");
  }

  /* ── derived display ── */
  const buyHuman = quote?.buyAmount ? fromBaseUnits(quote.buyAmount, buyToken.decimals, 4) : "0.0000";
  const sellNum = Number(amount) || 0, buyNum = Number(buyHuman) || 0;
  const rate = sellNum > 0 && buyNum > 0 ? fmt(buyNum / sellNum) : "—";
  const impact = quote?.estimatedPriceImpact != null ? `${fmt(quote.estimatedPriceImpact)}%` : "—";
  const gas = quote?.gas ? `${Number(quote.gas).toLocaleString()} units` : "—";
  const feeBuy = buyNum > 0 ? fmt((buyNum * FEE_BPS) / (10000 - FEE_BPS), 4) : "0.0000";

  /* ── primary button ── */
  let label = "Connect Wallet", onClick = connect, disabled = false, danger = false;
  if (account) {
    if (sellSym === buySym) { label = "Select different tokens"; disabled = true; onClick = () => {}; }
    else if (!amount || Number(amount) <= 0) { label = "Enter an amount"; disabled = true; onClick = () => {}; }
    else if (loading) { label = "Fetching quote…"; disabled = true; onClick = () => {}; }
    else if (busy) { label = status || "Confirm in your wallet…"; disabled = true; onClick = () => {}; }
    else if (needsApproval) { label = `Approve ${sellToken.symbol}`; onClick = approve; danger = false; }
    else { label = `Swap ${sellToken.symbol} for ${buyToken.symbol}`; onClick = swap; disabled = !quote; }
  }

  return (
    <div className="swapbox" style={{ position: "relative" }}>
      <div className="swap-head">
        <div className="t">Swap</div>
        <div className="gear" title={`Slippage ${SLIPPAGE}`}>⚙</div>
      </div>

      {/* sell leg */}
      <div className="leg">
        <div className="row">
          <input
            className="amt"
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.0"
          />
          <button className="token" onClick={() => setModal("sell")} style={tokenBtn}>
            <div className={`tk ${sellToken.badgeClass}`}>{sellToken.glyph}</div>{sellToken.symbol} ▾
          </button>
        </div>
        <div className="bal">Balance {bal.sell ?? "—"} {sellToken.symbol}</div>
      </div>

      <div className="arrowmid"><div onClick={flip} style={{ cursor: "pointer" }} title="Flip">↓</div></div>

      {/* buy leg */}
      <div className="leg">
        <div className="row">
          <input className="amt" value={loading ? "…" : buyHuman} readOnly />
          <button className="token" onClick={() => setModal("buy")} style={tokenBtn}>
            <div className={`tk ${buyToken.badgeClass}`}>{buyToken.glyph}</div>{buyToken.symbol} ▾
          </button>
        </div>
        <div className="bal">Balance {bal.buy ?? "—"} {buyToken.symbol} · after 2% fee</div>
      </div>

      <div className="swap-meta">
        <div className="r"><span>Rate</span><b>1 {sellToken.symbol} = {rate} {buyToken.symbol}</b></div>
        <div className="r"><span>Price impact</span><b className="good">{impact}</b></div>
        <div className="r"><span>Slippage</span><b>{SLIPPAGE}</b></div>
        <div className="r"><span>Est. gas</span><b>{gas}</b></div>
        <div className="r fee-row"><span>Protocol fee (2%)</span><b>{feeBuy} {buyToken.symbol}</b></div>
      </div>

      {status && !busy && (
        <div className="r" style={{ color: "#22c55e", fontSize: 13, marginBottom: 10 }}>{status}</div>
      )}
      {error && (
        <div className="r" style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>{error}</div>
      )}
      {txHash && (
        <div className="r" style={{ color: "#22c55e", fontSize: 13, marginBottom: 10 }}>
          Tx submitted —{" "}
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer"
             style={{ color: "#22c55e", textDecoration: "underline" }}>view on BaseScan</a>
        </div>
      )}

      <button className="btn btn-primary swapbtn" onClick={onClick} disabled={disabled}>{label}</button>

      {/* token selector modal */}
      {modal && (
        <div style={overlay} onClick={() => setModal(null)}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontFamily: "'Jost',sans-serif", fontWeight: 400, fontSize: 16 }}>
                Select a token
              </span>
              <button onClick={() => setModal(null)} style={closeBtn}>✕</button>
            </div>
            {Object.values(TOKENS).map((t) => {
              const active = (modal === "sell" ? sellSym : buySym) === t.symbol;
              return (
                <button key={t.symbol} onClick={() => pick(modal, t.symbol)} style={tokenRow(active)}>
                  <div className={`tk ${t.badgeClass}`} style={{ width: 30, height: 30 }}>{t.glyph}</div>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.symbol}</div>
                    <div style={{ fontSize: 12, color: "var(--sec)" }}>{t.name}</div>
                  </div>
                  {active && <span style={{ color: "var(--primary)", fontSize: 13 }}>selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── inline styles for the modal (keeps the dark premium look) ───────────────────────── */
const tokenBtn = { font: "inherit", color: "inherit" };
const overlay = {
  position: "absolute", inset: 0, background: "rgba(0,0,0,.66)", backdropFilter: "blur(4px)",
  borderRadius: 22, display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: 14, zIndex: 20,
};
const sheet = {
  width: "100%", maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 18, padding: 14, boxShadow: "0 30px 80px -30px rgba(0,0,0,.8)",
};
const sheetHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 };
const closeBtn = { background: "none", border: "none", color: "var(--sec)", fontSize: 15, cursor: "pointer" };
const tokenRow = (active) => ({
  width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
  marginBottom: 4, borderRadius: 12, cursor: "pointer", color: "var(--text)",
  background: active ? "rgba(0,82,255,.10)" : "transparent",
  border: `1px solid ${active ? "rgba(0,82,255,.35)" : "transparent"}`,
});
