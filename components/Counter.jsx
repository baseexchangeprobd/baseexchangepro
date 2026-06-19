import { useEffect, useRef, useState } from "react";

// Counts up to `to` when scrolled into view. e.g. <Counter to={2.4} pre="$" suf="B" />
export default function Counter({ to, pre = "", suf = "" }) {
  const ref = useRef(null);
  const [text, setText] = useState(`${pre}0${suf}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dec = to % 1 !== 0 ? (to < 10 ? 2 : 1) : 0;

    const run = () => {
      let s = null;
      const step = (t) => {
        if (!s) s = t;
        const p = Math.min((t - s) / 1500, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setText(pre + (to * e).toFixed(dec) + suf);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (es) => es.forEach((entry) => {
        if (entry.isIntersecting) { run(); io.unobserve(el); }
      }),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, pre, suf]);

  return <div className="num" ref={ref}>{text}</div>;
}
