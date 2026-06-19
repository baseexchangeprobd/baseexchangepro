import { useEffect, useRef, useState } from "react";
import { TOKENS } from "../lib/tokens";

const PAIRS = [
  { base: "ETH", quote: "USDC" },
  { base: "WETH", quote: "USDC" },
  { base: "cbETH", quote: "USDC" },
  { base: "DAI", quote: "USDC" },
];

export default function TradeTab() {
  const elRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const dataRef = useRef([]);
  const [pairIdx, setPairIdx] = useState(0);
  const [last, setLast] = useState(null);
  const [err, setErr] = useState("");

  const pair = PAIRS[pairIdx];
  const baseTok = TOKENS[pair.base], quoteTok = TOKENS[pair.quote];

  // build/destroy chart
  useEffect(() => {
    let disposed = false;
    let ro;
    (async () => {
      const { createChart } = await import("lightweight-charts");
      if (disposed || !elRef.current) return;
      const chart = createChart(elRef.current, {
        layout: { background: { color: "transparent" }, textColor: "#A1A1AA", fontFamily: "Inter, sans-serif" },
        grid: { vertLines: { color: "#171717" }, horzLines: { color: "#171717" } },
        rightPriceScale: { borderColor: "#171717" },
        timeScale: { borderColor: "#171717", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 0 },
        width: elRef.current.clientWidth,
        height: 300,
      });
      const series = chart.addLineSeries({ color: "#0052FF", lineWidth: 2 });
      chartRef.current = chart;
      seriesRef.current = series;
      if (dataRef.current.length) series.setData(dataRef.current);

      ro = new ResizeObserver(() => chart.applyOptions({ width: elRef.current.clientWidth }));
      ro.observe(elRef.current);
    })();
    return () => { disposed = true; ro?.disconnect(); chartRef.current?.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []);

  // reset series when the pair changes
  useEffect(() => { dataRef.current = []; seriesRef.current?.setData([]); setLast(null); }, [pairIdx]);

  // poll live price
  useEffect(() => {
    let alive = true;
    const sellAmount = (10n ** BigInt(baseTok.decimals)).toString(); // 1 base unit
    async function tick() {
      try {
        const params = new URLSearchParams({ sellToken: baseTok.address, buyToken: quoteTok.address, sellAmount });
        const r = await fetch(`/api/price?${params.toString()}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "price error");
        const price = Number(d.buyAmount) / 10 ** quoteTok.decimals;
        if (!alive || !Number.isFinite(price)) return;
        setErr(""); setLast(price);
        const time = Math.floor(Date.now() / 1000);
        const arr = dataRef.current;
        if (!arr.length || arr[arr.length - 1].time < time) {
          arr.push({ time, value: price });
          seriesRef.current?.update({ time, value: price });
        }
      } catch (e) {
        if (alive) setErr(e.message);
      }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [pairIdx, baseTok, quoteTok]);

  return (
    <div className="suite">
      <div className="swap-head" style={{ marginBottom: 12 }}>
        <div className="t" style={{ fontFamily: "'Jost',sans-serif" }}>
          {pair.base}/{pair.quote} {last != null && <span style={{ color: "#fff", marginLeft: 8 }}>{last.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>}
        </div>
        <select className="tag" value={pairIdx} onChange={(e) => setPairIdx(Number(e.target.value))}
          style={{ background: "#050505", color: "var(--text)", borderRadius: 8, padding: "4px 8px", border: "1px solid var(--border)" }}>
          {PAIRS.map((p, i) => <option key={i} value={i}>{p.base}/{p.quote}</option>)}
        </select>
      </div>

      <div className="chartwrap">
        <div className="chart-el" ref={elRef} />
        {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{err}</div>}
        <div style={{ color: "var(--sec)", fontSize: 11, marginTop: 8 }}>
          Live mid-price sampled every 5s from the 0x aggregator. History builds while this tab is open.
        </div>
      </div>
    </div>
  );
}
