import { useEffect, useRef } from "react";

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const mintRgb = style.getPropertyValue("--mint-rgb").trim() || "54, 224, 161";
  const strongRgb = style.getPropertyValue("--mint-strong-rgb").trim() || "17, 185, 129";
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const [mr, mg, mb] = mintRgb.split(",").map(s => parseInt(s.trim(), 10));
  const [sr, sg, sb] = strongRgb.split(",").map(s => parseInt(s.trim(), 10));
  // head: 30% theme color + 70% white
  const hr = Math.round(mr * 0.3 + 255 * 0.7);
  const hg = Math.round(mg * 0.3 + 255 * 0.7);
  const hb = Math.round(mb * 0.3 + 255 * 0.7);
  return { mr, mg, mb, sr, sg, sb, hr, hg, hb, isLight };
}

export default function MintCascades() {
  const canvasRef = useRef(null);
  const colorsRef = useRef(getThemeColors());

  useEffect(() => {
    const sync = () => { colorsRef.current = getThemeColors(); };
    window.addEventListener("gamedocs:theme", sync);
    return () => window.removeEventListener("gamedocs:theme", sync);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const FALL_SPEED = 1.0;
    const COLUMN_DENSITY = 0.7;
    const FONT_SIZE = 16;
    const WAVE_RESOLUTION = 4;
    const MAX_RIPPLES = 40;

    const mathSymbols = "×÷∆∑∏√∞≈≠≤≥∫∂αβγθφψω";
    const numbers = "0123456789";
    const allChars = numbers + mathSymbols;
    const randomChar = () => allChars[Math.floor(Math.random() * allChars.length)];

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0, height = 0, dpr = 1;
    let columns = [];
    let waterSurface = 0;
    let ripples = [];
    let wavePoints = [];
    let animationFrameId = 0;
    let lastTime = 0;

    function createColumn(index, scatter) {
      const length = 12 + Math.floor(Math.random() * 20);
      const chars = Array.from({ length: length + 5 }, () => ({
        char: randomChar(),
        cycleTimer: Math.random() * 3,
        cycleRate: 0.5 + Math.random() * 2,
      }));

      let y;
      if (scatter) {
        y = Math.random() < COLUMN_DENSITY
          ? Math.random() * (waterSurface + length * FONT_SIZE) - length * FONT_SIZE * 0.3
          : -length * FONT_SIZE - Math.random() * height * 0.5;
      } else {
        y = -length * FONT_SIZE * Math.random() * 0.3;
      }

      return {
        x: index * FONT_SIZE,
        y,
        speed: 1.2 + Math.random() * 2.5,
        length,
        chars,
        active: scatter ? Math.random() < COLUMN_DENSITY + 0.2 : Math.random() < COLUMN_DENSITY,
        restartDelay: 0,
        opacity: 0.6 + Math.random() * 0.4,
        hitWater: false,
      };
    }

    function initSystems() {
      waterSurface = height * 0.78;
      const colCount = Math.floor(width / FONT_SIZE);
      columns = Array.from({ length: colCount }, (_, i) => createColumn(i, true));
      const waveCount = Math.ceil(width / WAVE_RESOLUTION) + 1;
      wavePoints = Array.from({ length: waveCount }, () => ({ y: 0, vy: 0 }));
    }

    function resize() {
      const parent = canvas.parentElement;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent ? parent.clientWidth : window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initSystems();
    }

    function spawnRipple(x, y) {
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({
        x, y,
        radius: 0,
        maxRadius: 30 + Math.random() * 50,
        speed: 20 + Math.random() * 30,
        life: 1.0,
        decay: 0.3 + Math.random() * 0.2,
      });
    }

    function disturbWave(x, force) {
      const idx = Math.floor(x / WAVE_RESOLUTION);
      const spread = 3;
      for (let i = -spread; i <= spread; i++) {
        const wi = idx + i;
        if (wi >= 0 && wi < wavePoints.length) {
          wavePoints[wi].vy += force * (1 - Math.abs(i) / (spread + 1));
        }
      }
    }

    function render(timestamp) {
      const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.05);
      lastTime = timestamp;
      const time = timestamp / 1000;
      const { mr, mg, mb, sr, sg, sb, hr, hg, hb, isLight } = colorsRef.current;

      ctx.clearRect(0, 0, width, height);

      if (!prefersReduced) {
        for (const col of columns) {
          if (!col.active) {
            col.restartDelay -= dt;
            if (col.restartDelay <= 0) {
              if (Math.random() < COLUMN_DENSITY) {
                const newCol = createColumn(Math.floor(col.x / FONT_SIZE), false);
                Object.assign(col, newCol, { active: true });
              } else {
                col.restartDelay = 0.3 + Math.random() * 1.5;
              }
            }
            continue;
          }

          const prevY = col.y;
          col.y += col.speed * FALL_SPEED * dt * 60;

          for (const c of col.chars) {
            c.cycleTimer -= dt;
            if (c.cycleTimer <= 0) {
              c.char = randomChar();
              c.cycleTimer = c.cycleRate;
            }
          }

          if (!col.hitWater && col.y >= waterSurface && prevY < waterSurface) {
            col.hitWater = true;
            spawnRipple(col.x + FONT_SIZE * 0.5, waterSurface);
            disturbWave(col.x + FONT_SIZE * 0.5, -2 - Math.random() * 3);
          }

          if (col.y - col.length * FONT_SIZE > waterSurface + 30) {
            col.active = false;
            col.restartDelay = 0.2 + Math.random() * 2;
          }
        }

        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.radius += r.speed * dt;
          r.life -= r.decay * dt;
          if (r.life <= 0 || r.radius > r.maxRadius) ripples.splice(i, 1);
        }

        for (const p of wavePoints) {
          p.vy += -0.03 * p.y;
          p.vy *= 0.97;
          p.y += p.vy;
        }

        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < wavePoints.length; i++) {
            if (i > 0) wavePoints[i].vy += 0.25 * (wavePoints[i - 1].y - wavePoints[i].y);
            if (i < wavePoints.length - 1) wavePoints[i].vy += 0.25 * (wavePoints[i + 1].y - wavePoints[i].y);
          }
        }
      }

      ctx.font = `${FONT_SIZE}px "IBM Plex Mono", "Fira Code", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (const col of columns) {
        if (!col.active) continue;
        for (let j = 0; j < col.length; j++) {
          const charY = col.y - j * FONT_SIZE;
          if (charY > waterSurface || charY < -FONT_SIZE) continue;

          let brightness;
          if (j === 0) brightness = 1.0;
          else if (j === 1) brightness = 0.9;
          else if (j < 4) brightness = 0.75 - (j - 2) * 0.08;
          else brightness = Math.max(0, 0.6 * (1 - j / col.length));

          const distToWater = waterSurface - charY;
          if (distToWater < FONT_SIZE * 3) {
            brightness *= Math.max(0, distToWater / (FONT_SIZE * 3));
          }
          brightness *= col.opacity;
          if (isLight) brightness *= 0.55;
          if (brightness < 0.02) continue;

          let r, g, b;
          if (isLight) {
            // 라이트 테마: 어두운 색이 배경과 대비됨, 헤드도 진한 색 사용
            if (j === 0) { r = sr; g = sg; b = sb; }
            else if (j < 3) { r = mr; g = mg; b = mb; }
            else { r = mr; g = mg; b = mb; }
          } else {
            if (j === 0) { r = hr; g = hg; b = hb; }
            else if (j < 3) { r = mr; g = mg; b = mb; }
            else { r = sr; g = sg; b = sb; }
          }

          ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
          if (j === 0) {
            ctx.shadowColor = `rgba(${mr},${mg},${mb},${isLight ? 0.35 : 0.7})`;
            ctx.shadowBlur = isLight ? 6 : 10;
          }
          ctx.fillText(col.chars[j % col.chars.length].char, col.x + FONT_SIZE * 0.5, charY);
          if (j === 0) ctx.shadowBlur = 0;
        }
      }

      const waterGrad = ctx.createLinearGradient(0, waterSurface, 0, height);
      if (isLight) {
        waterGrad.addColorStop(0,   "rgba(244,246,245,0.10)");
        waterGrad.addColorStop(0.4, "rgba(244,246,245,0.70)");
        waterGrad.addColorStop(1,   "rgba(244,246,245,0.97)");
      } else {
        waterGrad.addColorStop(0, "rgba(4, 19, 14, 0.65)");
        waterGrad.addColorStop(1, "rgba(7, 9, 10, 0.97)");
      }
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, waterSurface - 2, width, height - waterSurface + 2);

      ctx.beginPath();
      for (let x = 0; x <= width; x += WAVE_RESOLUTION) {
        const idx = Math.floor(x / WAVE_RESOLUTION);
        const waveY = idx < wavePoints.length ? wavePoints[idx].y : 0;
        const ambient = Math.sin(x * 0.01 + time * 0.8) * 1.5 + Math.sin(x * 0.023 + time * 0.5);
        const py = waterSurface + waveY + ambient;
        x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
      }
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${isLight ? 0.18 : 0.22})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (const r of ripples) {
        const alpha = r.life * 0.3;
        for (let ring = 0; ring < 3; ring++) {
          const ringRadius = r.radius - ring * 8;
          if (ringRadius <= 0) continue;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y + ring * 2, ringRadius, ringRadius * 0.3, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${mr},${mg},${mb},${alpha * (1 - ring * 0.3)})`;
          ctx.lineWidth = 1 - ring * 0.2;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    resize();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="gd-cascade-canvas"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
    />
  );
}
