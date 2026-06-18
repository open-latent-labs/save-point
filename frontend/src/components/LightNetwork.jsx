import { useRef, useEffect } from "react";

function getColors() {
  const style = getComputedStyle(document.documentElement);
  const mintRgb = style.getPropertyValue("--mint-rgb").trim() || "5, 150, 105";
  const strongRgb = style.getPropertyValue("--mint-strong-rgb").trim() || "4, 120, 87";
  return { mintRgb, strongRgb };
}

const LINK_DIST = 150;
const CHARS = "0123456789×÷∆∑√∞≈∂αβγθφψω∫≠≤≥Z:.=*+-<>";

export default function LightNetwork() {
  const canvasRef = useRef(null);
  const colorsRef = useRef(getColors());

  useEffect(() => {
    const sync = () => { colorsRef.current = getColors(); };
    window.addEventListener("gamedocs:theme", sync);
    return () => window.removeEventListener("gamedocs:theme", sync);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let W = 0, H = 0;
    let nodes = [];
    let rafId = null;
    let lastTime = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    const randChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    function mkNode() {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(0.20, 0.60);
      const size = rand(11, 20);
      return {
        x: rand(0, W),
        y: rand(0, H),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        alpha: rand(0.32, 0.62),
        ch: randChar(),
        timer: rand(1.0, 3.5),
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      W = parent ? parent.clientWidth : window.innerWidth;
      H = window.innerHeight;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.floor((W * H) / 11000));
      nodes = Array.from({ length: count }, mkNode);
    }

    function frame(ts) {
      const dt = Math.min((ts - (lastTime || ts)) / 1000, 0.05);
      lastTime = ts;
      const { mintRgb, strongRgb } = colorsRef.current;

      ctx.clearRect(0, 0, W, H);

      // 노드 이동 + 벽 반사
      for (const n of nodes) {
        n.x += n.vx * dt * 60;
        n.y += n.vy * dt * 60;
        if (n.x < 0)  { n.x = 0;  n.vx *= -1; }
        else if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0)  { n.y = 0;  n.vy *= -1; }
        else if (n.y > H) { n.y = H; n.vy *= -1; }
      }

      // 노드 타이머 업데이트
      for (const n of nodes) {
        n.timer -= dt;
        if (n.timer <= 0) { n.ch = randChar(); n.timer = rand(1.0, 3.5); }
      }

      // 연결선 — 거리에 따라 투명도 조절
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > LINK_DIST) continue;

          const t = 1 - dist / LINK_DIST;
          const lineAlpha = t * t * 0.30;

          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `rgba(${mintRgb},${lineAlpha})`);
          grad.addColorStop(1, `rgba(${mintRgb},${lineAlpha})`);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.8 + t * 0.7;
          ctx.stroke();
        }
      }

      // 노드 글자
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const n of nodes) {
        ctx.font = `${n.size}px 'IBM Plex Mono', monospace`;
        ctx.fillStyle = `rgba(${strongRgb},${n.alpha})`;
        ctx.fillText(n.ch, n.x, n.y);
      }

      rafId = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);
    resize();
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}
