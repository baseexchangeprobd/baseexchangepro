import { useEffect, useRef } from "react";

// Ambient blue particle field for the hero. Mirrors the original canvas animation.
export default function ParticleField() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = cv.getContext("2d");
    let ps = [], W, H, raf;

    const size = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
    const init = () => {
      size();
      const n = Math.min(46, Math.floor(W / 26));
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.5 + 0.15,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(0,82,255,${p.o})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    init(); draw();
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init); };
  }, []);

  return <canvas id="particles" ref={ref} />;
}
