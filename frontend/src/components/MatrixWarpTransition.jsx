import { useRef, useEffect } from "react";

function getColors() {
  const style = getComputedStyle(document.documentElement);
  const mintRgb = style.getPropertyValue("--mint-rgb").trim() || "54, 224, 161";
  const strongRgb = style.getPropertyValue("--mint-strong-rgb").trim() || "17, 185, 129";
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return { mintRgb, strongRgb, isLight };
}

export default function MatrixWarpTransition({ idleSpeed = 1.4 }) {
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

    const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹ메에0123456789Z:.=*+-<>";

    let W = 0, H = 0, cx = 0, cy = 0;
    let stars = [];
    let rafId = null;

    const spawn = (z) => ({
      x: (Math.random() * 2 - 1) * W,
      y: (Math.random() * 2 - 1) * H,
      z: z ?? W,
      pz: null,
      ch: chars[Math.floor(Math.random() * chars.length)],
    });

    const init = () => {
      stars = Array.from({ length: 280 }, () => spawn(Math.random() * W));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      W = parent ? parent.clientWidth : window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      init();
    };

    const frame = () => {
      const { mintRgb, strongRgb, isLight } = colorsRef.current;

      // 잔상: 테마 배경색으로 덮기
      ctx.fillStyle = isLight ? "rgba(244,246,245,0.38)" : "rgba(7,9,10,0.38)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";

      for (const s of stars) {
        s.pz = s.z;
        s.z -= idleSpeed;
        if (s.z < 1) { Object.assign(s, spawn(W)); continue; }

        const sx = cx + (s.x / s.z) * W;
        const sy = cy + (s.y / s.z) * H;
        if (sx < 0 || sx > W || sy < 0 || sy > H) { Object.assign(s, spawn(W)); continue; }

        const k = Math.max(0, 1 - s.z / W);
        ctx.font = `${9 + k * 22}px 'IBM Plex Mono', ui-monospace, monospace`;

        if (k > 0.85) {
          // 가장 가까운 별: 다크=밝은 민트, 라이트=진한 강조색
          ctx.fillStyle = isLight
            ? `rgba(${strongRgb},${k})`
            : `rgba(200,255,230,${k})`;
          ctx.shadowColor = `rgba(${mintRgb},${isLight ? 0.45 : 0.9})`;
          ctx.shadowBlur = isLight ? 5 : 8;
        } else {
          ctx.fillStyle = `rgba(${mintRgb},${isLight ? 0.12 + k * 0.45 : 0.25 + k * 0.75})`;
          ctx.shadowBlur = 0;
        }

        ctx.fillText(s.ch, sx, sy);
        ctx.shadowBlur = 0;

        if (Math.random() > 0.97)
          s.ch = chars[Math.floor(Math.random() * chars.length)];
      }

      rafId = requestAnimationFrame(frame);
    };

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
  }, [idleSpeed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}
