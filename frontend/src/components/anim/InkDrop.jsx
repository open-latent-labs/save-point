import { useRef, useEffect } from "react";

function getColors() {
  const style = getComputedStyle(document.documentElement);
  const mintRgb = style.getPropertyValue("--mint-rgb").trim() || "5,150,105";
  const strongRgb = style.getPropertyValue("--mint-strong-rgb").trim() || "4,120,87";
  return { mintRgb, strongRgb };
}
const CHARS = "0123456789×÷∆∑√∞≈∂αβγθ∫≠≤≥";

export default function InkDrop() {
  const canvasRef = useRef(null);
  const colRef = useRef(getColors());
  useEffect(() => { const s = () => { colRef.current = getColors(); }; window.addEventListener("gamedocs:theme", s); return () => window.removeEventListener("gamedocs:theme", s); }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, drops = [], ripples = [], spawnTimer = 0, rafId, lastTime = 0;
    const rand = (a, b) => a + Math.random() * (b - a);
    const rc = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    function mkDrop() {
      return { x: rand(40, W - 40), y: -20, vy: rand(80, 180), impactY: rand(H * 0.45, H * 0.82), size: rand(13, 22), ch: rc(), alpha: rand(0.35, 0.65), hit: false };
    }

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const p = canvas.parentElement;
      W = p ? p.clientWidth : innerWidth; H = innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = []; ripples = []; spawnTimer = 0;
    }

    function frame(ts) {
      const dt = Math.min((ts - (lastTime || ts)) / 1000, 0.05); lastTime = ts;
      const { mintRgb, strongRgb } = colRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      spawnTimer -= dt;
      if (spawnTimer <= 0) { drops.push(mkDrop()); spawnTimer = rand(0.15, 0.55); }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.vy * dt;
        if (!d.hit && d.y >= d.impactY) {
          d.hit = true;
          const ringCount = Math.floor(rand(2, 6));
          for (let r = 0; r < ringCount; r++) ripples.push({ x: d.x, y: d.impactY, radius: 0, maxR: rand(70, 140) + r * 30, life: 1, speed: rand(60, 110), decay: rand(0.40, 0.65) });
        }
        if (d.y > H + 30) { drops.splice(i, 1); continue; }
        if (d.hit) continue;
        ctx.font = `${d.size}px 'IBM Plex Mono',monospace`;
        ctx.fillStyle = `rgba(${strongRgb},${d.alpha})`;
        ctx.fillText(d.ch, d.x, d.y);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed * dt; r.life -= r.decay * dt;
        if (r.life <= 0) { ripples.splice(i, 1); continue; }
        const a = r.life * 0.35 * Math.max(0, 1 - r.radius / r.maxR);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${mintRgb},${a})`;
        ctx.lineWidth = 1.2; ctx.stroke();
      }

      rafId = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);
    resize(); rafId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }} />;
}
