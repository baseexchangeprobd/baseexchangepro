import { useState } from "react";
import SwapWidget from "./SwapWidget";
import LimitTab from "./LimitTab";
import PoolTab from "./PoolTab";
import TradeTab from "./TradeTab";

const TABS = [
  { id: "swap", label: "Swap" },
  { id: "limit", label: "Limit" },
  { id: "pool", label: "Pool" },
  { id: "trade", label: "Trade" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("swap");
  return (
    <div className="suite">
      <div className="tabnav" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "swap" && <SwapWidget />}
      {tab === "limit" && <LimitTab />}
      {tab === "pool" && <PoolTab />}
      {tab === "trade" && <TradeTab />}
    </div>
  );
}
