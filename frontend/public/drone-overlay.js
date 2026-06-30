/**
 * save-point — Living AI Drone Overlay (Enhanced V3)
 * FSM + 감정 시스템 기반 자율 행동 드론
 * * 통합된 핵심 기능:
 * - 마우스 포획 & 관성 던지기 물리 시스템
 * - 웹 스크롤 풍압 및 타이핑 인지 인터랙션
 * - 고속 이동 시 부스터 글로우 파티클 트레일 잔상
 * - UI 요소 상단 안착 및 휴식(Resting) 상태 머신
 */

(function () {
  "use strict";
  if (window.__droneOverlayLoaded) return;
  window.__droneOverlayLoaded = true;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const chance = (p) => Math.random() < p;

  function waitForThree(cb) {
    if (window.THREE && window.THREE.GLTFLoader) {
      cb();
      return;
    }
    setTimeout(() => waitForThree(cb), 100);
  }
  waitForThree(init);

  function init() {
    const THREE = window.THREE;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998;";
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      innerWidth / innerHeight,
      0.1,
      500,
    );
    camera.position.set(0, 0, 28);

    function worldBounds() {
      const dist = camera.position.z - 2;
      const vH = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * dist;
      const vW = vH * camera.aspect;
      return { halfW: vW / 2, halfH: vH / 2 };
    }
    let bounds = worldBounds();

    function screenToWorld(sx, sy) {
      const nx = (sx / innerWidth) * 2 - 1;
      const ny = -((sy / innerHeight) * 2 - 1);
      return { x: nx * bounds.halfW, y: ny * bounds.halfH };
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirL = new THREE.DirectionalLight(0xffffff, 0.8);
    dirL.position.set(5, 10, 7);
    scene.add(dirL);
    const tealL = new THREE.PointLight(0x00ffcc, 3.5, 60);
    tealL.position.set(0, 2, 2);
    scene.add(tealL);
    const underGlow = new THREE.PointLight(0x00ffcc, 1.3, 30);

    const dg = new THREE.Group();
    scene.add(dg);
    dg.add(underGlow);
    underGlow.position.set(0, -0.5, 0);
    const spin = new THREE.Group();
    dg.add(spin);

    // ─── 제트 부스터 파티클 풀 ─────────────────────────
    // 부드러운 발광 원형 텍스처 (additive blending용)
    function makeBoosterTex() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0.0, "rgba(255,255,255,1)");
      grd.addColorStop(0.4, "rgba(180,255,240,0.85)");
      grd.addColorStop(1.0, "rgba(0,255,200,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    const boosterTex = makeBoosterTex();
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);
    const trailCount = 32; // 연속 꼬리용으로 증량
    const trailParticles = [];
    for (let i = 0; i < trailCount; i++) {
      const pMat = new THREE.SpriteMaterial({
        map: boosterTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(pMat);
      sp.scale.set(0, 0, 1);
      trailGroup.add(sp);
      trailParticles.push({ mesh: sp, age: 0, maxAge: 0, born: 0, spread: 0 });
    }
    let trailIdx = 0;
    let lastTrailPos = null; // 연속 보간용 직전 분사 위치
    // 부스터 색 (분사구 흰빛 → 청록으로 식음)
    const colHot = new THREE.Color(0xffffff);
    const colMid = new THREE.Color(0x9bffe8);
    const colCool = new THREE.Color(0x00ffcc);
    const _tmpCol = new THREE.Color();

    const bubble = document.createElement("div");
    bubble.style.cssText =
      "position:fixed;background:rgba(0,20,15,0.92);border:1px solid #00ffcc;" +
      "border-radius:12px 12px 12px 2px;padding:8px 14px;font-size:14px;color:#00ffcc;" +
      "pointer-events:none;z-index:10000;opacity:0;transition:opacity 0.3s,transform 0.3s;" +
      "box-shadow:0 0 16px rgba(0,255,200,0.25);white-space:nowrap;";
    document.body.appendChild(bubble);
    const BUBBLES = [
      "안녕하세요! 👋",
      "뭐 찾으세요?",
      "이거 흥미롭네요 👀",
      "삐릭—",
      "음...🤔",
      "반가워요!",
      "탐색 중...",
    ];
    function say(txt, dur = 2200) {
      bubble.textContent = txt || BUBBLES[(Math.random() * BUBBLES.length) | 0];
      bubble._until = performance.now() + dur;
    }

    let model = null,
      isReady = false;

    function makeFallbackDrone() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.6, 1.4),
        new THREE.MeshStandardMaterial({
          color: 0x0d2030,
          emissive: 0x00ffcc,
          emissiveIntensity: 0.4,
          metalness: 0.6,
          roughness: 0.3,
        }),
      );
      g.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x00ffcc,
          emissive: 0x00ffcc,
          emissiveIntensity: 1.5,
        }),
      );
      eye.position.set(0, 0.1, 0.75);
      g.add(eye);
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
          new THREE.MeshStandardMaterial({
            color: 0x1a3a4a,
            emissive: 0x004433,
          }),
        );
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        arm.position.set(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9);
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = a;
        g.add(arm);
        const prop = new THREE.Mesh(
          new THREE.TorusGeometry(0.35, 0.04, 8, 24),
          new THREE.MeshStandardMaterial({
            color: 0x00ffcc,
            emissive: 0x00ffcc,
            emissiveIntensity: 0.6,
          }),
        );
        prop.position.set(Math.cos(a) * 1.3, 0.2, Math.sin(a) * 1.3);
        prop.rotation.x = Math.PI / 2;
        g.add(prop);
      }
      return g;
    }

    new THREE.GLTFLoader().load(
      "/drone.glb",
      (gltf) => {
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        model.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z));
        const box2 = new THREE.Box3().setFromObject(model);
        const c = new THREE.Vector3();
        box2.getCenter(c);
        model.position.sub(c);
        model.traverse((ch) => {
          if (ch.isMesh)
            [].concat(ch.material).forEach((m) => {
              if (m.map) m.map.encoding = THREE.sRGBEncoding;
              if (m.emissiveMap) m.emissiveMap.encoding = THREE.sRGBEncoding;
              m.needsUpdate = true;
            });
        });
        spin.add(model);
        isReady = true;
      },
      undefined,
      (e) => {
        console.warn("[Drone] GLB 로드 실패 → fallback 박스 드론 사용", e);
        model = makeFallbackDrone();
        spin.add(model);
        isReady = true;
      },
    );

    // 감정
    const emo = {
      energy: 0.95,
      curiosity: 0.85,
      mood: 0.8,
      sleepiness: 0.05,
      trust: 0.4,
    };

    // 물리
    const drone = {
      x: 0,
      y: 0,
      z: 2,
      vx: 0,
      vy: 0,
      vz: 0,
      tx: 0,
      ty: 0,
      tz: 2,
      pitch: 0,
      roll: 0,
      yaw: 0,
      trickPitch: 0,
      trickRoll: 0,
      trickYaw: 0,
      bob: 0,
      sx: 0,
      sy: 0, // 2D 렌더링 스크롤 추적용 스크린 좌표 추가
    };
    const ph = {
      bx: rand(0, 99),
      by: rand(0, 99),
      bz: rand(0, 99),
      tilt: rand(0, 99),
      yaw: rand(0, 99),
    };

    let mouseX = innerWidth / 2,
      mouseY = innerHeight / 2;
    let lastActivity = performance.now();
    let mouseWorld = { x: 0, y: 0 };
    let mouseVelWorld = { x: 0, y: 0 }; // 던지기 물리용 마우스 월드 속도
    let isCaptured = false;

    // 대화형 이벤트 감지 레이어
    let lastMouseTime = performance.now();
    addEventListener("mousemove", (e) => {
      const now = performance.now();
      const mdt = Math.max((now - lastMouseTime) / 1000, 0.001);
      lastMouseTime = now;
      const nextMouseWorld = screenToWorld(e.clientX, e.clientY);

      // 속도 스무딩 (튀는 값 방지)
      const nvx = (nextMouseWorld.x - mouseWorld.x) / mdt;
      const nvy = (nextMouseWorld.y - mouseWorld.y) / mdt;
      mouseVelWorld.x = lerp(mouseVelWorld.x, clamp(nvx, -40, 40), 0.5);
      mouseVelWorld.y = lerp(mouseVelWorld.y, clamp(nvy, -40, 40), 0.5);

      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseWorld = nextMouseWorld;
      lastActivity = now;
    });

    addEventListener("mousedown", (e) => {
      if (!isReady || bt.state === "trick") return;
      // 드론과의 2D 스크린 마우스 거리 판정 (포획 반경 40px)
      const dist = Math.hypot(e.clientX - drone.sx, e.clientY - drone.sy);
      if (dist < 40) {
        isCaptured = true;
        bt.enter("captured");
      }
    });

    addEventListener("mouseup", () => {
      if (isCaptured) {
        isCaptured = false;
        if (bt.state === "captured") {
          // 던진 속도(마우스 물리 관성) 그대로 오버레이 좌표계에 주입
          drone.vx = clamp(mouseVelWorld.x * 0.35, -18, 18);
          drone.vy = clamp(mouseVelWorld.y * 0.35, -18, 18);
          say("우와아아앙~ 🚀", 1600);
          bt.enter("idle");
        }
      }
    });

    let lastScrollY = window.scrollY;
    addEventListener("scroll", () => {
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      // 스크롤 풍압 효과 구현: 드론 수직 가속도 왜곡 발생
      if (!isCaptured) {
        drone.vy += dy * 0.025;
        if (chance(0.15) && bt.state !== "trick") {
          say(
            ["휘이이잉~! 🌀", "앗, 기류가 어지러워요!", "영차차 💨"][
              (Math.random() * 3) | 0
            ],
            1200,
          );
        }
      }
      lastActivity = performance.now();
    });

    addEventListener("input", () => {
      lastActivity = performance.now();
      if (bt.state !== "trick" && !isCaptured && chance(0.25)) {
        say(
          [
            "오, 타이핑 중이시네요! ⌨️",
            "기록하는 중... ✍️",
            "열심히 글 쓰신다 👀",
          ][(Math.random() * 3) | 0],
          1600,
        );
      }
    });

    addEventListener("keydown", () => {
      lastActivity = performance.now();
    });
    addEventListener("click", () => {
      lastActivity = performance.now();
    });
    addEventListener("dblclick", () => {
      lastActivity = performance.now();
    });
    addEventListener("resize", () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      bounds = worldBounds();
    });

    function describeEl(el) {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (
        tag === "input" &&
        (type === "search" || type === "text" || type === "")
      )
        return "search";
      if (tag === "textarea") return "search";
      if (
        tag === "button" ||
        el.getAttribute("role") === "button" ||
        tag === "a"
      )
        return "button";
      if (tag === "img" || tag === "svg") return "image";
      if (el.classList.contains("card")) return "card";
      if (tag === "h1" || tag === "h2") return "heading";
      return "ui";
    }
    function pickInterestTarget() {
      const sel =
        'input, textarea, button, a, [role="button"], img, .card, h1, h2, svg';
      const els = [...document.querySelectorAll(sel)].filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 24 &&
          r.height > 16 &&
          r.top > -20 &&
          r.bottom < innerHeight + 20 &&
          r.left > -20 &&
          r.right < innerWidth + 20
        );
      });
      if (!els.length) return null;
      const inputs = els.filter((e) => {
        const t = e.tagName.toLowerCase();
        return t === "input" || t === "textarea";
      });
      let el;
      if (inputs.length && chance(0.6))
        el = inputs[(Math.random() * inputs.length) | 0];
      else el = els[(Math.random() * els.length) | 0];
      const r = el.getBoundingClientRect();
      const p = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
      p.kind = describeEl(el);
      return p;
    }
    function randomScreenPoint(margin = 0.85) {
      return {
        x: rand(-bounds.halfW * margin, bounds.halfW * margin),
        y: rand(-bounds.halfH * margin, bounds.halfH * margin),
      };
    }
    function edgePatrolPoint() {
      const m = 0.92,
        side = (Math.random() * 4) | 0;
      if (side === 0)
        return {
          x: rand(-bounds.halfW * m, bounds.halfW * m),
          y: bounds.halfH * m,
        };
      if (side === 1)
        return {
          x: rand(-bounds.halfW * m, bounds.halfW * m),
          y: -bounds.halfH * m,
        };
      if (side === 2)
        return {
          x: -bounds.halfW * m,
          y: rand(-bounds.halfH * m, bounds.halfH * m),
        };
      return {
        x: bounds.halfW * m,
        y: rand(-bounds.halfH * m, bounds.halfH * m),
      };
    }

    // FSM
    const bt = {
      state: "idle",
      stateName: "BOOT",
      t: 0,
      hold: 0,
      data: {},
      history: [],
      cooldowns: {},
      now() {
        return performance.now() / 1000;
      },
      onCooldown(n) {
        return (this.cooldowns[n] || 0) > this.now();
      },
      setCooldown(n, s) {
        this.cooldowns[n] = this.now() + s;
      },

      interrupt(name) {
        if (name === "startle") {
          const dx = drone.x - mouseWorld.x,
            dy = drone.y - mouseWorld.y;
          const d = Math.hypot(dx, dy) || 1;
          drone.vx += (dx / d) * 7;
          drone.vy += (dy / d) * 7 + 2;
          say("앗! 깜짝이야", 1400);
          this.enter("idle");
        } else if (name === "spin360") {
          this.enter("trick", { kind: "flip" });
          say("우와앗~ 🌀", 1500);
        }
      },

      enter(state, data = {}) {
        this.state = state;
        this.t = 0;
        this.data = data;
        this.history.push(state);
        if (this.history.length > 8) this.history.shift();
        switch (state) {
          case "idle":
            this.stateName = "IDLE HOVER";
            this.hold = rand(1.2, 3) * (1 + emo.sleepiness * 0.5);
            drone.tx = drone.x + rand(-1.5, 1.5);
            drone.ty = drone.y + rand(-1, 1);
            break;
          case "explore": {
            this.stateName = "EXPLORING";
            const p = randomScreenPoint();
            drone.tx = p.x;
            drone.ty = p.y;
            this.hold = rand(0.8, 1.8);
            break;
          }
          case "inspect": {
            this.stateName = "INSPECTING UI";
            const p =
              this.data.target || pickInterestTarget() || randomScreenPoint();
            drone.tx = p.x;
            drone.ty = p.y - 0.8;
            this.hold = rand(2, 4);
            const LINES = {
              search: [
                "뭐 찾으세요? 🔍",
                "검색 도와드릴까요?",
                "여기에 입력하시면 돼요!",
              ],
              button: [
                "이거 눌러보실래요?",
                "오, 버튼이네요 👀",
                "클릭하면 뭐가 나올까?",
              ],
              image: ["예쁜 이미지네요 ✨", "이게 뭐지…👀"],
              card: ["이 카드 흥미롭네요!", "여기 문서가 있어요 📄"],
              heading: ["중요한 내용인가 봐요!", "오 제목이다"],
              ui: ["이게 뭘까…🤔", "탐색 중..."],
            };
            const lines = LINES[p.kind] || LINES.ui;
            if (chance(0.7))
              say(lines[(Math.random() * lines.length) | 0], 2400);
            break;
          }
          case "watchUser":
            this.stateName = "WATCHING YOU";
            this.hold = rand(1.5, 3);
            drone.tx = lerp(drone.x, mouseWorld.x, 0.35);
            drone.ty = lerp(drone.y, mouseWorld.y, 0.35);
            break;
          case "followUser":
            this.stateName = "FOLLOWING";
            this.hold = rand(2, 4);
            break;
          case "circleUser":
            this.stateName = "PLAYING";
            this.hold = rand(2.5, 4);
            this.data.angle = Math.atan2(
              drone.y - mouseWorld.y,
              drone.x - mouseWorld.x,
            );
            this.data.radius = rand(2.5, 4);
            say("히힛 🌀", 1600);
            break;
          case "patrol": {
            this.stateName = "PATROLLING";
            const p = edgePatrolPoint();
            drone.tx = p.x;
            drone.ty = p.y;
            this.hold = rand(1, 2);
            break;
          }
          case "dash": {
            this.stateName = "DASH!";
            const p = randomScreenPoint(0.9);
            drone.tx = p.x;
            drone.ty = p.y;
            this.hold = 1.2;
            break;
          }
          case "spike":
            this.stateName = "WHEE↑";
            drone.ty = drone.y + rand(3, 5);
            this.hold = rand(0.8, 1.4);
            break;
          case "trick":
            this.stateName = "TRICK!";
            this.data.kind =
              this.data.kind ||
              ["barrel", "flip", "loop", "spiral"][(Math.random() * 4) | 0];
            this.data.dur = rand(0.9, 1.4);
            this.hold = this.data.dur;
            this.setCooldown("trick", rand(5, 10));
            break;
          case "charge": {
            this.stateName = "CHARGING…";
            const cx = chance(0.5) ? -1 : 1,
              cy = chance(0.5) ? -1 : 1;
            drone.tx = bounds.halfW * 0.8 * cx;
            drone.ty = bounds.halfH * 0.8 * cy;
            this.hold = rand(3, 5);
            say("충전 중… 🔋", 2500);
            break;
          }
          case "daydream":
            this.stateName = "DAYDREAMING…";
            this.hold = rand(3, 6);
            if (chance(0.4)) say("음…🤔", 2000);
            break;
          case "comeToUser":
            this.stateName = "WAITING FOR YOU";
            this.hold = rand(4, 8);
            drone.tx = lerp(mouseWorld.x, 0, 0.2);
            drone.ty = mouseWorld.y - 1.5;
            if (chance(0.5)) say("어디 계세요…?", 2500);
            break;
          case "hesitate":
            this.stateName = "thinking…";
            this.hold = rand(0.3, 1.2);
            break;

          // 포획(Captured) 모드 상태 정의
          case "captured":
            this.stateName = "CAPTURED";
            this.hold = 99999;
            say(
              ["앗! 잡혔다 😲", "나 놓아줘요~! 놔줘!", "간지러워요! 엉엉 XD"][
                (Math.random() * 3) | 0
              ],
              2000,
            );
            break;

          // UI 위 앉아 쉬기(Resting) 상태 정의
          case "rest": {
            this.stateName = "RESTING";
            const p = pickInterestTarget() || randomScreenPoint();
            // UI 컴포넌트의 상단 모서리에 사뿐히 앉도록 정렬
            drone.tx = p.x;
            drone.ty = p.y + 0.4;
            this.hold = rand(4, 8);
            say(
              [
                "여기에 앉아서 잠시 쉴게요... 💤",
                "휴우, 좀 졸리네요 😴",
                "잠시 대기 중...",
              ][(Math.random() * 3) | 0],
              3000,
            );
            break;
          }
        }
      },

      decide() {
        if (isCaptured) return;
        const idle = performance.now() - lastActivity;
        if (idle > 90000) {
          this.enter("explore");
          return;
        }
        if (idle > 60000 && !this.onCooldown("come")) {
          this.setCooldown("come", 20);
          this.enter("comeToUser");
          return;
        }
        if (emo.energy < 0.18 && !this.onCooldown("charge")) {
          this.setCooldown("charge", 25);
          this.enter("charge");
          return;
        }

        const w = {
          idle: 15,
          explore: 28 * (0.5 + emo.curiosity),
          watchUser: 9 * (0.5 + emo.trust),
          inspect: 14 * (0.5 + emo.curiosity),
          patrol: 12,
          spin: 9 * (0.5 + emo.mood),
          trick: 7 * emo.mood * (this.onCooldown("trick") ? 0 : 1),
          dash: 9 * emo.energy,
          charge: emo.energy < 0.25 ? 8 : 0.5,
          daydream: 1.5 * (0.5 + emo.sleepiness),
          circleUser: 8 * emo.mood * (0.3 + emo.trust),
          spike: 7 * emo.energy,
          followUser: 6 * emo.trust,
          // 피로도나 피곤함이 높을수록 앉아서 쉴 확률 배가
          rest: 15 * (0.2 + emo.sleepiness) * (1.3 - emo.energy),
        };
        const last = this.history[this.history.length - 1];
        if (w[last]) w[last] *= 0.25;
        const total = Object.values(w).reduce((a, b) => a + b, 0);
        let r = Math.random() * total,
          picked = "idle";
        for (const k in w) {
          r -= w[k];
          if (r <= 0) {
            picked = k;
            break;
          }
        }
        if (chance(0.22) && picked !== "idle" && picked !== "rest") {
          this.enter("hesitate");
          this.data.next = picked;
          return;
        }
        if (picked === "spin") {
          this.enter("trick", { kind: "spin" });
          return;
        }
        this.enter(picked);
      },

      update(dt) {
        this.t += dt;
        switch (this.state) {
          case "circleUser":
            this.data.angle += dt * 3.0 * (0.6 + emo.mood);
            drone.tx =
              mouseWorld.x + Math.cos(this.data.angle) * this.data.radius;
            drone.ty =
              mouseWorld.y + Math.sin(this.data.angle) * this.data.radius;
            break;
          case "followUser": {
            const dx = mouseWorld.x - drone.x,
              dy = mouseWorld.y - drone.y;
            const d = Math.hypot(dx, dy) || 1,
              keep = 3.5;
            drone.tx = mouseWorld.x - (dx / d) * keep;
            drone.ty = mouseWorld.y - (dy / d) * keep;
            break;
          }
          case "trick": {
            const p = clamp(this.t / this.data.dur, 0, 1),
              e = ease(p);
            switch (this.data.kind) {
              case "barrel":
                drone.trickRoll = e * Math.PI * 2;
                break;
              case "flip":
                drone.trickPitch = e * Math.PI * 2;
                break;
              case "spin":
                drone.trickYaw = e * Math.PI * 2;
                break;
              case "loop":
                drone.trickPitch = e * Math.PI * 2;
                break;
              case "spiral":
                drone.trickYaw = e * Math.PI * 4;
                drone.trickRoll = e * Math.PI * 2;
                break;
            }
            break;
          }
          case "captured":
            // 마우스 드래그 중인 상태 동기화 유지
            drone.tx = mouseWorld.x;
            drone.ty = mouseWorld.y;
            if (chance(0.04)) {
              say(
                [
                  "이거 놔아~ 😣",
                  "어디로 데려가는 거에요?",
                  "간지럼 태우지 마요!",
                ][(Math.random() * 3) | 0],
                1200,
              );
            }
            break;
        }
        if (this.t >= this.hold && !isCaptured) {
          drone.trickPitch = drone.trickRoll = drone.trickYaw = 0;
          if (this.state === "hesitate" && this.data.next) {
            const nx = this.data.next;
            this.data.next = null;
            this.enter(nx);
          } else this.decide();
        }
      },
    };

    bt.enter("idle");
    setTimeout(() => bt.decide(), 600);

    let last = performance.now();
    function loop(now) {
      requestAnimationFrame(loop);
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);
      if (!isReady) {
        renderer.render(scene, camera);
        return;
      }

      emo.energy = clamp(
        emo.energy - dt * 0.003 + (bt.state === "charge" ? dt * 0.15 : 0),
        0,
        1,
      );
      emo.sleepiness = clamp(
        emo.sleepiness + dt * (emo.energy < 0.3 ? 0.01 : -0.004),
        0,
        1,
      );
      emo.curiosity = clamp(emo.curiosity + dt * 0.003, 0, 1);
      emo.mood = clamp(emo.mood + (chance(dt) ? rand(-0.05, 0.05) : 0), 0.1, 1);
      const distToUser = Math.hypot(
        drone.x - mouseWorld.x,
        drone.y - mouseWorld.y,
      );
      emo.trust = clamp(
        emo.trust + (distToUser < 5 ? dt * 0.01 : -dt * 0.004),
        0,
        1,
      );

      bt.update(dt);

      const speedScale = (0.4 + emo.energy * 0.8) * (1 - emo.sleepiness * 0.5);
      let accelK = 3.0 * speedScale,
        damp = 3.2;
      if (bt.state === "dash") {
        accelK = 4 * speedScale;
        damp = 4.0;
      }
      if (bt.state === "spike") {
        accelK = 4 * speedScale;
        damp = 3.5;
      }
      if (bt.state === "charge") {
        accelK = 4 * speedScale;
        damp = 4.0;
      }
      if (bt.state === "circleUser" || bt.state === "followUser") {
        accelK = 5 * speedScale;
        damp = 4.5;
      }
      if (bt.state === "rest") {
        accelK = 3.5;
        damp = 5.5;
      } // 안착 시 흔들림 방지 제동 향상

      ph.bx += dt;
      ph.by += dt;
      ph.bz += dt;
      const hoverX =
        Math.sin(ph.bx * 0.9) * 0.35 + Math.sin(ph.bx * 2.3) * 0.15;
      const hoverY = Math.sin(ph.by * 1.1) * 0.4 + Math.sin(ph.by * 2.7) * 0.18;
      const microCircle = bt.state === "idle" || bt.state === "daydream";
      const mcX = microCircle ? Math.cos(ph.bx * 0.6) * 0.4 : 0;
      const mcY = microCircle ? Math.sin(ph.bx * 0.6) * 0.4 : 0;

      const gx = drone.tx + hoverX + mcX;
      const gy = drone.ty + hoverY + mcY;

      if (bt.state === "captured") {
        // 드래그 중: 위치는 마우스에 부드럽게 추종 (순간이동 대신 lerp)
        drone.x = lerp(drone.x, mouseWorld.x, 0.5);
        drone.y = lerp(drone.y, mouseWorld.y, 0.5);
        drone.vx = 0;
        drone.vy = 0;
      } else {
        drone.vx += (accelK * (gx - drone.x) - damp * drone.vx) * dt;
        drone.vy += (accelK * (gy - drone.y) - damp * drone.vy) * dt;
        drone.x += drone.vx * dt;
        drone.y += drone.vy * dt;
      }

      drone.vz += (4 * (2 - drone.z) - 3.5 * drone.vz) * dt;
      drone.z += drone.vz * dt;

      // 휴식 상태인 경우 지면 안착 묘사를 위해 bob 공중 부유 차단
      if (bt.state === "rest") {
        drone.bob = Math.sin(ph.bz * 0.4) * 0.015;
      } else {
        drone.bob = Math.sin(ph.bz * 1.3) * (0.12 + emo.energy * 0.05);
      }

      const mW = bounds.halfW * 0.97,
        mH = bounds.halfH * 0.97;
      if (drone.x > mW) drone.vx -= (drone.x - mW) * 8 * dt;
      if (drone.x < -mW) drone.vx -= (drone.x + mW) * 8 * dt;
      if (drone.y > mH) drone.vy -= (drone.y - mH) * 8 * dt;
      if (drone.y < -mH) drone.vy -= (drone.y + mH) * 8 * dt;

      dg.position.set(drone.x, drone.y + drone.bob, drone.z);

      // ════ 제트 부스터 분사 ════
      const currentSpeed = Math.hypot(drone.vx, drone.vy);
      // 분사 강도: 속도 4 이상부터 서서히, 빠를수록 강하게 (0~1)
      const boost = clamp((currentSpeed - 5) / 8, 0, 1);
      const boosting = isReady && boost > 0.02 && bt.state !== "captured";

      if (boosting && currentSpeed > 0.001) {
        // 분사구 = 드론 뒤쪽(진행 역방향)
        const nx = -drone.vx / currentSpeed,
          ny = -drone.vy / currentSpeed;
        const nozzle = 0.5; // 분사구 거리
        const ex = drone.x + nx * nozzle;
        const ey = drone.y + drone.bob + ny * nozzle;

        // 직전 분사 위치와 보간해서 '연속' 꼬리 (빠를수록 촘촘히 채움)
        if (!lastTrailPos) lastTrailPos = { x: ex, y: ey };
        const segDX = ex - lastTrailPos.x,
          segDY = ey - lastTrailPos.y;
        const segLen = Math.hypot(segDX, segDY);
        // 입자 간격(작을수록 촘촘) — 분사 강할수록 더 촘촘
        const step = lerp(0.32, 0.12, boost);
        const nEmit = Math.min(3, Math.max(1, Math.floor(segLen / step)));

        for (let k = 0; k < nEmit; k++) {
          const f = (k + 1) / nEmit;
          const pt = trailParticles[trailIdx];
          // 보간 위치 + 분사구 옆으로 살짝 퍼짐
          const perpX = -ny,
            perpY = nx; // 진행방향 수직
          const spread = (Math.random() - 0.5) * lerp(0.02, 0.08, boost);
          pt.mesh.position.set(
            lerp(lastTrailPos.x, ex, f) + perpX * spread + nx * rand(0, 0.15),
            lerp(lastTrailPos.y, ey, f) + perpY * spread + ny * rand(0, 0.15),
            drone.z - 0.1,
          );
          pt.born = 0;
          pt.age = 0;
          pt.maxAge = rand(0.15, 0.3) * (0.7 + boost * 0.3); // 빠를수록 꼬리 길게
          pt.spread = 0.25 + boost * 0.3 + Math.random() * 0.12; // 분사구 입자 크기
          pt.mesh.material.opacity = (0.25 + boost * 0.25) * rand(0.7, 1.0);
          pt.mesh.scale.setScalar(pt.spread);
          trailIdx = (trailIdx + 1) % trailCount;
        }
        lastTrailPos.x = ex;
        lastTrailPos.y = ey;
      } else {
        lastTrailPos = null; // 분사 중단 시 보간 리셋
      }

      // 입자 생명주기: 식어가며(흰→청록) 작아지고 사라짐
      for (let i = 0; i < trailCount; i++) {
        const pt = trailParticles[i];
        if (pt.mesh.material.opacity > 0) {
          pt.age += dt;
          const pct = pt.age / pt.maxAge;
          if (pct >= 1) {
            pt.mesh.material.opacity = 0;
            pt.mesh.scale.set(0, 0, 1);
          } else {
            // 색: 분사 직후 흰빛 → 중간 민트 → 청록
            if (pct < 0.4) _tmpCol.copy(colHot).lerp(colMid, pct / 0.4);
            else _tmpCol.copy(colMid).lerp(colCool, (pct - 0.4) / 0.6);
            pt.mesh.material.color.copy(_tmpCol);
            // 투명도: 분사구에서 진하고 꼬리로 흐려짐
            pt.mesh.material.opacity = (1 - pct) * (0.25 + boost * 0.2);
            // 크기: 꼬리로 갈수록 작아지는 테이퍼
            const sc = pt.spread * (1 - pct * 0.7);
            pt.mesh.scale.set(sc, sc, 1);
          }
        }
      }

      const targetRoll = clamp(-drone.vx * 0.12, -0.5, 0.5);
      drone.roll = lerp(drone.roll, targetRoll, 1 - Math.pow(0.001, dt));
      const targetPitch = clamp(drone.vy * 0.1, -0.4, 0.4);
      drone.pitch = lerp(drone.pitch, targetPitch, 1 - Math.pow(0.001, dt));

      let targetYaw;
      const lookAtUser =
        bt.state === "watchUser" ||
        bt.state === "followUser" ||
        bt.state === "comeToUser" ||
        bt.state === "captured";
      if (lookAtUser) targetYaw = Math.atan2(mouseWorld.x - drone.x, 6);
      else if (currentSpeed > 0.4)
        targetYaw = clamp(drone.vx * 0.15, -0.6, 0.6);
      else {
        ph.yaw += dt * 0.3;
        targetYaw = Math.sin(ph.yaw * 0.5) * 0.4;
      }
      drone.yaw = lerp(drone.yaw, targetYaw, 1 - Math.pow(0.01, dt));

      ph.tilt += dt * (8 + emo.energy * 10);
      // 포획 혹은 휴식 상태에서는 불필요한 기체 바이브레이션(jitter) 안정화 조절
      const jitterAmt =
        bt.state === "rest" || bt.state === "captured" ? 0.003 : 0.012;
      const jitter = Math.sin(ph.tilt) * jitterAmt * (0.5 + emo.energy);

      if (model) {
        spin.rotation.set(
          drone.pitch + drone.trickPitch + jitter,
          drone.yaw + drone.trickYaw,
          drone.roll + drone.trickRoll + jitter,
        );
      }

      const pulse = 1 + 0.25 * Math.sin(ph.bz * 3);
      underGlow.intensity = (1.0 + emo.energy * 1.2) * pulse;
      tealL.intensity = 3.0 + emo.mood * 1.5 + 0.6 * Math.sin(ph.bz * 2.5);

      renderer.render(scene, camera);

      const v3 = new THREE.Vector3(
        drone.x,
        drone.y + drone.bob,
        drone.z,
      ).project(camera);
      // 내부 판정을 위해 스크린 좌표 갱신 바인딩
      drone.sx = (v3.x * 0.5 + 0.5) * innerWidth;
      drone.sy = (-v3.y * 0.5 + 0.5) * innerHeight;

      if (bubble._until && performance.now() < bubble._until) {
        bubble.style.left = drone.sx + 24 + "px";
        bubble.style.top = drone.sy - 54 + "px";
        bubble.style.opacity = "1";
        bubble.style.transform = "translateY(0)";
      } else {
        bubble.style.opacity = "0";
        bubble.style.transform = "translateY(4px)";
      }

    }

    requestAnimationFrame(loop);

    const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];
    function isAuthPage() {
      return AUTH_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
    }
    function setDroneVisible(v) {
      canvas.style.display = v ? "" : "none";
      bubble.style.display = v ? "" : "none";
    }
    setDroneVisible(!isAuthPage());
    const origPush = history.pushState.bind(history);
    history.pushState = function (...args) {
      origPush(...args);
      setDroneVisible(!isAuthPage());
    };
    const origReplace = history.replaceState.bind(history);
    history.replaceState = function (...args) {
      origReplace(...args);
      setDroneVisible(!isAuthPage());
    };
    addEventListener("popstate", () => setDroneVisible(!isAuthPage()));
  }
})();
