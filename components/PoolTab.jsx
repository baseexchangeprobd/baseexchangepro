import { useState } from "react";
import { TOKENS } from "../lib/tokens";
import {
  AERODROME_ROUTER, AERODROME_ROUTER_ABI, ERC20_ABI,
  getPublicClient, getWalletClient,
} from "../lib/dexConfig";

const SYMS = Object.keys(TOKENS).filter((s) => s !== "ETH"); // ERC-20 / ERC-20 only
const SLIPPAGE_BPS = 50n; // 0.5%
function toUnits(amount, decimals) {
  if (!amount) return 0n;
  const [w = "0", f = ""] = String(amount).split(".");
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}
const minOut = (x) => (x * (10000n - SLIPPAGE_BPS)) / 10000n;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 1200); // +20 min

export default function PoolTab() {
  const [mode, setMode] = useState("add");
  const [aSym, setASym] = useState("WETH");
  const [bSym, setBSym] = useState("USDC");
  const [stable, setStable] = useState(false);
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");
  const [lpAmt, setLpAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");

  const tokA = TOKENS[aSym], tokB = TOKENS[bSym];

  async function ensureAllowance(pub, wallet, account, token, owner, spender, needed) {
    const current = await pub.readContract({ address: token.address, abi: ERC20_ABI, functionName: "allowance", args: [owner, spender] });
    if (current >= needed) return;
    setStatus(`Approving ${token.symbol}…`);
    const h = await wallet.writeContract({
      account, address: token.address, abi: ERC20_ABI, functionName: "approve", args: [spender, needed],
    });
    await pub.waitForTransactionReceipt({ hash: h });
  }

  async function addLiquidity() {
    setError(""); setStatus(""); setHash("");
    if (aSym === bSym) { setError("Choose two different tokens."); return; }
    if (!(Number(amtA) > 0) || !(Number(amtB) > 0)) { setError("Enter both amounts."); return; }
    setBusy(true);
    try {
      const pub = getPublicClient();
      const { wallet, account } = await getWalletClient();
      const desiredA = toUnits(amtA, tokA.decimals);
      const desiredB = toUnits(amtB, tokB.decimals);

      await ensureAllowance(pub, wallet, account, tokA, account, AERODROME_ROUTER, desiredA);
      await ensureAllowance(pub, wallet, account, tokB, account, AERODROME_ROUTER, desiredB);

      setStatus("Adding liquidity…");
      const h = await wallet.writeContract({
        account,
        address: AERODROME_ROUTER,
        abi: AERODROME_ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          tokA.address, tokB.address, stable,
          desiredA, desiredB, minOut(desiredA), minOut(desiredB),
          account, deadline(),
        ],
      });
      setHash(h);
      await pub.waitForTransactionReceipt({ hash: h });
      setStatus("Liquidity added.");
      setAmtA(""); setAmtB("");
    } catch (e) {
      setError(e.shortMessage || e.message || "Add liquidity failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLiquidity() {
    setError(""); setStatus(""); setHash("");
    if (aSym === bSym) { setError("Choose two different tokens."); return; }
    if (!(Number(lpAmt) > 0)) { setError("Enter an LP amount to remove."); return; }
    setBusy(true);
    try {
      const pub = getPublicClient();
      const { wallet, account } = await getWalletClient();

      const factory = await pub.readContract({ address: AERODROME_ROUTER, abi: AERODROME_ROUTER_ABI, functionName: "defaultFactory" });
      const pool = await pub.readContract({
        address: AERODROME_ROUTER, abi: AERODROME_ROUTER_ABI, functionName: "poolFor",
        args: [tokA.address, tokB.address, stable, factory],
      });
      // Aerodrome pools (LP tokens) are 18-decimal ERC-20s.
      const liquidity = toUnits(lpAmt, 18);

      const [qa, qb] = await pub.readContract({
        address: AERODROME_ROUTER, abi: AERODROME_ROUTER_ABI, functionName: "quoteRemoveLiquidity",
        args: [tokA.address, tokB.address, stable, factory, liquidity],
      });

      await ensureAllowance(pub, wallet, account, { address: pool, symbol: "LP" }, account, AERODROME_ROUTER, liquidity);

      setStatus("Removing liquidity…");
      const h = await wallet.writeContract({
        account,
        address: AERODROME_ROUTER,
        abi: AERODROME_ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [
          tokA.address, tokB.address, stable,
          liquidity, minOut(qa), minOut(qb),
          account, deadline(),
        ],
      });
      setHash(h);
      await pub.waitForTransactionReceipt({ hash: h });
      setStatus("Liquidity removed.");
      setLpAmt("");
    } catch (e) {
      setError(e.shortMessage || e.message || "Remove liquidity failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="swapbox">
      <div className="swap-head">
        <div className="t">Liquidity</div>
        <span className="tag">Aerodrome</span>
      </div>

      <div className="seg">
        <button className={`buy ${mode === "add" ? "on" : ""}`} onClick={() => setMode("add")}>Add</button>
        <button className={`sell ${mode === "remove" ? "on" : ""}`} onClick={() => setMode("remove")}>Remove</button>
      </div>

      <div className="field-row">
        <span className="glyphlbl">Pair</span>
        <select value={aSym} onChange={(e) => setASym(e.target.value)}>
          {SYMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: "var(--sec)" }}>+</span>
        <select value={bSym} onChange={(e) => setBSym(e.target.value)}>
          {SYMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stable ? "s" : "v"} onChange={(e) => setStable(e.target.value === "s")}>
          <option value="v">Volatile</option>
          <option value="s">Stable</option>
        </select>
      </div>

      {mode === "add" ? (
        <>
          <div className="field-row">
            <span className="glyphlbl">{aSym}</span>
            <input value={amtA} inputMode="decimal" placeholder="0.0"
              onChange={(e) => setAmtA(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div className="field-row">
            <span className="glyphlbl">{bSym}</span>
            <input value={amtB} inputMode="decimal" placeholder="0.0"
              onChange={(e) => setAmtB(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
        </>
      ) : (
        <div className="field-row">
          <span className="glyphlbl">LP amount</span>
          <input value={lpAmt} inputMode="decimal" placeholder="0.0"
            onChange={(e) => setLpAmt(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
      )}

      {status && <div className="r" style={{ color: "#22c55e", fontSize: 13, margin: "6px 0" }}>{status}</div>}
      {error && <div className="r" style={{ color: "#f87171", fontSize: 13, margin: "6px 0" }}>{error}</div>}
      {hash && (
        <div className="r" style={{ fontSize: 13, margin: "6px 0" }}>
          <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer"
             style={{ color: "#22c55e", textDecoration: "underline" }}>view tx on BaseScan</a>
        </div>
      )}

      <button className="btn btn-primary swapbtn" onClick={mode === "add" ? addLiquidity : removeLiquidity} disabled={busy}>
        {busy ? (status || "Working…") : mode === "add" ? "Add Liquidity" : "Remove Liquidity"}
      </button>
    </div>
  );
}
