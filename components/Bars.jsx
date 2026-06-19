import { useEffect, useRef, useState } from "react";

const HEIGHTS = [42, 55, 38, 68, 60, 82, 74, 90, 70, 96, 85, 100];

// Bars grow to their target height once scrolled into view.
export default function Bars() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((entry) => {
        if (entry.isIntersecting) { setShown(true); io.unobserve(el); }
      }),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="bars" ref={ref}>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          style={{ height: shown ? `${h}%` : "0%", transitionDelay: `${i * 55}ms` }}
        />
      ))}
    </div>
  );
}
