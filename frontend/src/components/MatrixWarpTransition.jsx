import { useRef, useEffect } from "react";

// 배경 애니메이션 전용 (항상 idle 흐름, 워프 없음)
export default function MatrixWarpTransition({ color = "#36E0A1", idleSpeed = 1.4 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹ메에0123456789Z:.=*+-<>";
    const hex = color.replace("#", "");
    const n = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
    const rgbStr = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;

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
      // 잔상: 앱 배경색 rgba로 덮기
      ctx.fillStyle = "rgba(7,9,10,0.38)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.font = `bold 13px 'IBM Plex Mono', ui-monospace, monospace`;

      for (const s of stars) {
        s.pz = s.z;
        s.z -= idleSpeed;
        if (s.z < 1) { Object.assign(s, spawn(W)); continue; }

        const sx = cx + (s.x / s.z) * W;
        const sy = cy + (s.y / s.z) * H;

        if (sx < 0 || sx > W || sy < 0 || sy > H) { Object.assign(s, spawn(W)); continue; }

        const k = Math.max(0, 1 - s.z / W);
        const fs = 9 + k * 22;
        ctx.font = `${fs}px 'IBM Plex Mono', ui-monospace, monospace`;

        if (k > 0.85) {
          ctx.fillStyle = `rgba(200,255,230,${k})`;
          ctx.shadowColor = `rgba(${rgbStr},0.9)`;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(${rgbStr},${0.25 + k * 0.75})`;
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
  }, [color, idleSpeed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}
