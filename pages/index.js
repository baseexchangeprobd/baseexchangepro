import Head from "next/head";
import { useEffect, useState } from "react";
import ParticleField from "../components/ParticleField";
import Counter from "../components/Counter";
import Bars from "../components/Bars";
import Faq from "../components/Faq";
import Dashboard from "../components/Dashboard";

const Mark = ({ style }) => (
  <span className="mark" style={style}>
    baseexchange<span className="pro">pro</span>
  </span>
);

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);

    // reveal-on-scroll for .rv elements
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    const els = Array.from(document.querySelectorAll(".rv"));
    els.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(el); });

    return () => { window.removeEventListener("scroll", onScroll); io.disconnect(); };
  }, []);

  return (
    <>
      <Head>
        <title>baseexchangepro — Professional Trading. Native Base.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Swap any token on Base. Fast, secure, and professional trading powered by the Base ecosystem." />
        <meta property="og:title" content="baseexchangepro — Professional Trading. Native Base." />
        <meta property="og:description" content="Swap any token on Base. Fast, secure, professional." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="base:app_id" content="6a359369b5c7cf28ed894da8" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <nav className={scrolled ? "scrolled" : ""}>
        <div className="wrap nav-in">
          <a href="#" className="mark" style={{ fontSize: 21 }}>baseexchange<span className="pro">pro</span></a>
          <div className="nav-links" style={{ display: menuOpen ? "flex" : undefined }}>
            <a href="#features">Features</a>
            <a href="#swap">Swap</a>
            <a href="#analytics">Analytics</a>
            <a href="#referrals">Referrals</a>
            <a href="#faq">FAQ</a>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="#swap" className="btn btn-primary">Launch App</a>
            <button className="nav-toggle" onClick={() => setMenuOpen((v) => !v)}>≡</button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="glow a" />
        <ParticleField />
        <div className="wrap">
          <div className="hero-mark mark rv">baseexchange<span className="pro">pro</span></div>
          <div className="eyebrow rv"><span className="dot" /> Native to Base · Live on mainnet</div>
          <h1 className="rv">Swap any token <b>on Base</b></h1>
          <p className="sub rv">Fast, secure, and professional trading powered by the Base ecosystem. Best-price routing, real gas estimates, no noise.</p>
          <div className="cta-row rv">
            <a href="#swap" className="btn btn-primary">Start Trading →</a>
            <a href="#analytics" className="btn">View Analytics</a>
          </div>
        </div>
      </header>

      {/* STATS */}
      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="stats rv">
            <div className="stat"><Counter to={2.4} pre="$" suf="B" /><div className="cap">Total Volume</div></div>
            <div className="stat"><Counter to={1.86} suf="M" /><div className="cap">Total Swaps</div></div>
            <div className="stat"><Counter to={312} suf="K" /><div className="cap">Active Traders</div></div>
            <div className="stat"><Counter to={48.2} pre="$" suf="M" /><div className="cap">Protocol Revenue</div></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="wrap">
          <div className="center" style={{ maxWidth: 560 }}>
            <div className="label rv">Built for traders</div>
            <h2 className="rv">Everything you need to trade <b>on Base</b></h2>
          </div>
          <div className="grid3">
            {[
              ["M13 2L3 14h7l-1 8 10-12h-7z", "Base Native", "Built from the ground up for the Base L2. Lower fees, faster finality, no bridges.", "path"],
              [null, "Smart Wallet Support", "Connect any wallet, including Base Smart Wallet and passkeys. One tap, no seed phrase.", "wallet"],
              ["M3 12h6l2-7 4 14 2-7h4", "Best-Price Routing", "Aggregated liquidity across Base DEXs returns the best executable price on every swap.", "path"],
              ["M12 2v20M5 9l7-7 7 7", "Low Gas Fees", "Optimized routing keeps gas minimal, with a live estimate shown before you confirm.", "path"],
              ["M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z", "Secure Trading", "Non-custodial by design. Funds never leave your wallet until a swap settles on-chain.", "path"],
              [null, "Referral Rewards", "Share your link and earn a cut of protocol fees from everyone you bring on-chain.", "ref"],
            ].map(([d, title, body, kind], i) => (
              <div className="fcard rv" key={i}>
                <div className="ficon">
                  <svg fill="none" strokeWidth="1.8" viewBox="0 0 24 24" stroke="currentColor">
                    {kind === "wallet" && (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>)}
                    {kind === "ref" && (<><circle cx="9" cy="7" r="3" /><path d="M2 21v-1a5 5 0 015-5h4M16 11l2 2 4-4" /></>)}
                    {kind === "path" && <path d={d} />}
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SWAP */}
      <section id="swap">
        <div className="wrap split">
          <div>
            <div className="label rv">The interface</div>
            <h2 className="rv">A swap screen that <b>respects your attention</b></h2>
            <p className="lead rv" style={{ marginBottom: 28 }}>
              Price impact, slippage, route and gas — all visible before you sign. The 2% protocol fee is shown in plain numbers, never buried.
            </p>
            <div className="why rv">
              <div className="item"><div className="k">01</div><div><h4>Transparent routing</h4><p>See exactly which pools your trade passes through.</p></div></div>
              <div className="item"><div className="k">02</div><div><h4>Real gas estimates</h4><p>Live network pricing, not a static guess.</p></div></div>
              <div className="item"><div className="k">03</div><div><h4>Set your slippage</h4><p>Defaults that are sane, controls when you need them.</p></div></div>
            </div>
          </div>
          <div className="rv" style={{ display: "flex", justifyContent: "center" }}>
            <Dashboard />
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics">
        <div className="wrap split">
          <div className="rv">
            <div className="chartcard">
              <div className="top">
                <div><div style={{ color: "var(--sec)", fontSize: 13 }}>30-day volume</div><div className="big">$418.6M</div></div>
                <div className="pill">▲ 12.4%</div>
              </div>
              <Bars />
            </div>
          </div>
          <div>
            <div className="label rv">Analytics</div>
            <h2 className="rv">Numbers you can <b>actually read</b></h2>
            <p className="lead rv">Trading volume, active users, and protocol revenue in one premium dashboard. Powered by on-chain data via The Graph and Dune.</p>
          </div>
        </div>
      </section>

      {/* REFERRALS */}
      <section id="referrals">
        <div className="wrap">
          <div className="band rv">
            <div className="glow" />
            <div className="inner">
              <div className="label center">Referral Program</div>
              <h2 className="center" style={{ maxWidth: 560 }}>Earn while <b>others trade</b></h2>
              <p className="lead center" style={{ marginBottom: 30 }}>
                Generate a referral link, share it, and collect revenue from every swap your network makes — tracked live in your dashboard.
              </p>
              <div className="cta-row"><a href="#" className="btn btn-primary">Get your link</a><a href="#" className="btn">How it works</a></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="wrap">
          <div className="center" style={{ maxWidth: 560 }}><div className="label rv">FAQ</div><h2 className="rv">Questions, <b>answered</b></h2></div>
          <Faq />
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <Mark />
              <p>Professional trading. Native Base.</p>
              <div className="socials">
                <a href="#" aria-label="X">𝕏</a>
                <a href="#" aria-label="Discord">◈</a>
                <a href="#" aria-label="GitHub">⌥</a>
              </div>
            </div>
            <div><h5>Product</h5><a href="#swap">Swap</a><a href="#analytics">Analytics</a><a href="#referrals">Referrals</a><a href="#">Portfolio</a></div>
            <div><h5>Resources</h5><a href="#">Documentation</a><a href="#">API</a><a href="#">Audits</a><a href="#faq">FAQ</a></div>
            <div><h5>Legal</h5><a href="#">Privacy Policy</a><a href="#">Terms</a><a href="#">Disclosures</a></div>
          </div>
          <div className="foot-bot">
            <span>© 2026 baseexchangepro. All rights reserved.</span>
            <span>Built on Base.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
