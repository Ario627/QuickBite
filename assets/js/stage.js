(function (SC) {
  "use strict";

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
  const MODULES = 4;
  const PITCH = 1.06;
  const FLAP_W = 0.86;
  const FLAP_H = 1.24;
  const HALF = FLAP_H / 2;
  const FLIP = 0.2;
  const SETTLE = 0.16;
  const STAGGER = 0.07;

  function webgl() {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  function easeIn(t) {
    return t * t;
  }

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function randChar(exclude) {
    let char = CHARS[Math.floor(Math.random() * CHARS.length)];
    if (char === exclude) char = CHARS[(CHARS.indexOf(char) + 7) % CHARS.length];
    return char;
  }

  SC.stage = {
    mount(host) {
      if (!host || !webgl()) {
        if (host) host.dataset.stage = "off";
        return null;
      }

      SC.stage.debug = { frames: 0, error: null };

      let disposed = false;
      let controller = null;
      let pending = "A---";

      const api = {
        set(value) {
          pending = String(value || "A---").slice(0, MODULES).padEnd(MODULES, "-");
          if (controller) controller.set(pending);
        },
        destroy() {
          disposed = true;
          if (controller) controller.destroy();
          controller = null;
        },
      };

      import("three")
        .then((THREE) => {
          if (disposed) return;
          controller = build(THREE, host);
          host.dataset.stage = controller ? "on" : "off";
          if (controller) controller.set(pending);
        })
        .catch(() => {
          host.dataset.stage = "off";
        });

      return api;

      function build(THREE, target) {
        const reduced = SC.motion.reduced;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
          return null;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.04;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.classList.add("stage__canvas");
        target.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a0b0d, 7.5, 15);

        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
        const restZ = 5.7;
        camera.position.set(0, 0.35, reduced ? restZ : restZ + 2.4);
        camera.lookAt(0, 0, 0);

        const trash = [];
        const track = (item) => {
          trash.push(item);
          return item;
        };

        const envCanvas = document.createElement("canvas");
        envCanvas.width = 256;
        envCanvas.height = 128;
        const envCtx = envCanvas.getContext("2d");
        const grad = envCtx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "#1b2026");
        grad.addColorStop(0.42, "#3a424b");
        grad.addColorStop(0.5, "#8c97a3");
        grad.addColorStop(0.58, "#2a3037");
        grad.addColorStop(1, "#08090b");
        envCtx.fillStyle = grad;
        envCtx.fillRect(0, 0, 256, 128);
        envCtx.fillStyle = "rgba(255, 226, 176, 0.9)";
        envCtx.beginPath();
        envCtx.ellipse(64, 30, 46, 16, 0, 0, Math.PI * 2);
        envCtx.fill();
        envCtx.fillStyle = "rgba(190, 215, 235, 0.55)";
        envCtx.beginPath();
        envCtx.ellipse(198, 52, 40, 12, 0, 0, Math.PI * 2);
        envCtx.fill();
        const envTexture = track(new THREE.CanvasTexture(envCanvas));
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        envTexture.colorSpace = THREE.SRGBColorSpace;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envMap = pmrem.fromEquirectangular(envTexture).texture;
        pmrem.dispose();
        scene.environment = envMap;
        trash.push(envMap);

        function halfTexture(char, half) {
          const canvas = document.createElement("canvas");
          canvas.width = 192;
          canvas.height = 128;
          const ctx = canvas.getContext("2d");
          const shade = ctx.createLinearGradient(0, 0, 0, 128);
          shade.addColorStop(0, "#f4f5ee");
          shade.addColorStop(0.55, "#e6e8df");
          shade.addColorStop(1, "#d5d8cd");
          ctx.fillStyle = shade;
          ctx.fillRect(0, 0, 192, 128);
          ctx.fillStyle = "rgba(10,11,13,0.16)";
          if (half === "top") ctx.fillRect(0, 124, 192, 4);
          else ctx.fillRect(0, 0, 192, 4);
          ctx.fillStyle = "rgba(10,11,13,0.07)";
          ctx.fillRect(0, half === "top" ? 0 : 120, 192, 8);
          ctx.fillStyle = "#14171c";
          ctx.font = "700 168px 'Martian Mono', ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(char, 96, half === "top" ? 134 : -6);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          return track(texture);
        }

        function faceMaterial(char, half, tone) {
          return track(
            new THREE.MeshStandardMaterial({
              map: halfTexture(char, half),
              roughness: 0.55,
              metalness: 0.02,
              envMapIntensity: 0.5,
              color: tone === "dim" ? 0xa8ada6 : 0xffffff,
            })
          );
        }

        function plateTexture() {
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 72;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#191d21";
          ctx.fillRect(0, 0, 512, 72);
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          ctx.fillRect(0, 0, 512, 2);
          ctx.fillStyle = "#d3d8d3";
          ctx.font = "700 24px 'Martian Mono', ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("QUICKBITE", 22, 32);
          ctx.fillStyle = "#7d858d";
          ctx.font = "400 15px 'Martian Mono', ui-monospace, monospace";
          ctx.fillText("QB-01 KANTIN", 22, 55);
          ctx.fillStyle = "#ffb01f";
          ctx.fillRect(432, 22, 60, 3);
          ctx.fillRect(432, 32, 38, 3);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          return track(texture);
        }

        function ledTexture() {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 16;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#0b0d0f";
          ctx.fillRect(0, 0, 256, 16);
          ctx.fillStyle = "#ffb01f";
          for (let x = 4; x < 252; x += 16) ctx.fillRect(x, 6, 9, 4);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          return track(texture);
        }

        function gridTexture() {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#0a0b0d";
          ctx.fillRect(0, 0, 256, 256);
          ctx.strokeStyle = "rgba(255,255,255,0.05)";
          ctx.lineWidth = 1;
          for (let i = 0; i <= 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 256);
            ctx.moveTo(0, i);
            ctx.lineTo(256, i);
            ctx.stroke();
          }
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(6, 4);
          return track(texture);
        }

        function floorTexture() {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          const radial = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
          radial.addColorStop(0, "rgba(255,255,255,0.18)");
          radial.addColorStop(0.4, "rgba(255,255,255,0.05)");
          radial.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, 256, 256);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          return track(texture);
        }

        function metal(color, rough, env) {
          return track(
            new THREE.MeshStandardMaterial({
              color,
              roughness: rough,
              metalness: 0.95,
              envMapIntensity: env == null ? 1 : env,
            })
          );
        }

        function matte(color, rough) {
          return track(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.1, envMapIntensity: 0.35 }));
        }

        const shell = new THREE.Group();
        shell.rotation.x = -0.04;
        scene.add(shell);

        const boardW = MODULES * PITCH + 0.36;
        const boardH = FLAP_H + 0.7;

        const backplate = new THREE.Mesh(
          track(new THREE.BoxGeometry(boardW, boardH, 0.34)),
          track(
            new THREE.MeshStandardMaterial({
              color: 0x15181c,
              roughness: 0.72,
              metalness: 0.5,
              envMapIntensity: 0.7,
            })
          )
        );
        backplate.position.z = -0.06;
        shell.add(backplate);

        const cavity = new THREE.Mesh(
          track(new THREE.BoxGeometry(boardW - 0.44, FLAP_H + 0.28, 0.02)),
          matte(0x080a0b, 0.95)
        );
        cavity.position.z = 0.13;
        shell.add(cavity);

        const railMat = metal(0x2b3036, 0.34, 1.15);
        const railGeo = track(new THREE.BoxGeometry(boardW + 0.22, 0.16, 0.5));
        const sideGeo = track(new THREE.BoxGeometry(0.16, boardH + 0.22, 0.5));
        [
          { geo: railGeo, x: 0, y: boardH / 2 + 0.03, z: 0.04 },
          { geo: railGeo, x: 0, y: -boardH / 2 - 0.03, z: 0.04 },
          { geo: sideGeo, x: -boardW / 2 - 0.03, y: 0, z: 0.04 },
          { geo: sideGeo, x: boardW / 2 + 0.03, y: 0, z: 0.04 },
        ].forEach((spec) => {
          const bar = new THREE.Mesh(spec.geo, railMat);
          bar.position.set(spec.x, spec.y, spec.z);
          shell.add(bar);
        });

        const ventGeo = track(new THREE.BoxGeometry(0.5, 0.03, 0.06));
        for (let index = 0; index < 5; index += 1) {
          const vent = new THREE.Mesh(ventGeo, matte(0x0a0c0e, 0.9));
          vent.position.set(-0.66 + index * 0.33, boardH / 2 + 0.1, 0.28);
          shell.add(vent);
        }

        const screwGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 18));
        const screwMat = metal(0x6f757c, 0.28, 1.3);
        [
          [-boardW / 2 - 0.03, boardH / 2 + 0.03],
          [boardW / 2 + 0.03, boardH / 2 + 0.03],
          [-boardW / 2 - 0.03, -boardH / 2 - 0.03],
          [boardW / 2 + 0.03, -boardH / 2 - 0.03],
          [-boardW / 2 + 0.34, 0],
          [boardW / 2 - 0.34, 0],
        ].forEach((spec) => {
          const screw = new THREE.Mesh(screwGeo, screwMat);
          screw.rotation.x = Math.PI / 2;
          screw.position.set(spec[0], spec[1], 0.29);
          shell.add(screw);
        });

        const bezelGeo = track(new THREE.BoxGeometry(FLAP_W + 0.12, FLAP_H + 0.12, 0.15));
        const bezelMat = metal(0x23272c, 0.38, 1.05);
        const slotGeo = track(new THREE.BoxGeometry(FLAP_W + 0.02, FLAP_H + 0.02, 0.04));
        const slotMat = track(new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 1, metalness: 0 }));
        const hingeGeo = track(new THREE.CylinderGeometry(0.018, 0.018, FLAP_W * 0.92, 12));
        const hingeMat = metal(0x4a5057, 0.4, 1.1);
        const planeGeo = track(new THREE.PlaneGeometry(FLAP_W, HALF));

        const cells = [];

        for (let index = 0; index < MODULES; index += 1) {
          const x = (index - (MODULES - 1) / 2) * PITCH;

          const bezel = new THREE.Mesh(bezelGeo, bezelMat);
          bezel.position.set(x, 0, 0.05);
          shell.add(bezel);

          const slot = new THREE.Mesh(slotGeo, slotMat);
          slot.position.set(x, 0, 0.14);
          shell.add(slot);

          const hinge = new THREE.Mesh(hingeGeo, hingeMat);
          hinge.rotation.z = Math.PI / 2;
          hinge.position.set(x, 0, 0.235);
          shell.add(hinge);

          const topFace = new THREE.Mesh(planeGeo, faceMaterial("-", "top"));
          topFace.position.set(x, HALF / 2, 0.22);
          shell.add(topFace);

          const bottomFace = new THREE.Mesh(planeGeo, faceMaterial("-", "bottom"));
          bottomFace.position.set(x, -HALF / 2, 0.22);
          shell.add(bottomFace);

          const fallGroup = new THREE.Group();
          fallGroup.position.set(x, 0, 0.225);
          const fallLeaf = new THREE.Mesh(planeGeo, faceMaterial("-", "top"));
          fallLeaf.position.y = HALF / 2;
          fallGroup.add(fallLeaf);
          const fallBack = new THREE.Mesh(planeGeo, faceMaterial("-", "bottom", "dim"));
          fallBack.position.set(0, HALF / 2, -0.004);
          fallBack.rotation.y = Math.PI;
          fallGroup.add(fallBack);
          shell.add(fallGroup);

          const riseGroup = new THREE.Group();
          riseGroup.position.set(x, 0, 0.225);
          const riseLeaf = new THREE.Mesh(planeGeo, faceMaterial("-", "bottom"));
          riseLeaf.position.y = -HALF / 2;
          riseGroup.add(riseLeaf);
          const riseBack = new THREE.Mesh(planeGeo, faceMaterial("-", "top", "dim"));
          riseBack.position.set(0, -HALF / 2, -0.004);
          riseBack.rotation.y = Math.PI;
          riseGroup.add(riseBack);
          shell.add(riseGroup);

          cells.push({
            current: "-",
            target: null,
            queue: [],
            phase: "idle",
            t: 0,
            delay: 0,
            topFace,
            bottomFace,
            fallGroup,
            fallLeaf,
            fallBack,
            riseGroup,
            riseLeaf,
            riseBack,
          });
        }

        const plate = new THREE.Mesh(
          track(new THREE.BoxGeometry(1.72, 0.24, 0.03)),
          track(
            new THREE.MeshStandardMaterial({
              map: plateTexture(),
              roughness: 0.42,
              metalness: 0.8,
              envMapIntensity: 0.9,
            })
          )
        );
        plate.position.set(-boardW / 2 + 0.95, -boardH / 2 - 0.36, 0.24);
        shell.add(plate);

        const ledMap = ledTexture();
        const led = new THREE.Mesh(
          track(new THREE.BoxGeometry(1.6, 0.1, 0.03)),
          track(
            new THREE.MeshStandardMaterial({
              map: ledMap,
              emissiveMap: ledMap,
              emissive: 0xffb01f,
              emissiveIntensity: 1.4,
              roughness: 0.5,
              metalness: 0.2,
            })
          )
        );
        led.position.set(boardW / 2 - 0.92, -boardH / 2 - 0.36, 0.24);
        shell.add(led);

        const lampGeo = track(new THREE.CylinderGeometry(0.058, 0.058, 0.05, 20));
        const lampMats = [
          track(
            new THREE.MeshStandardMaterial({
              color: 0x3a2c0a,
              emissive: 0xffb01f,
              emissiveIntensity: 1.6,
              roughness: 0.3,
            })
          ),
          track(
            new THREE.MeshStandardMaterial({
              color: 0x0f2a20,
              emissive: 0x46d69b,
              emissiveIntensity: 0.9,
              roughness: 0.3,
            })
          ),
        ];
        lampMats.forEach((material, index) => {
          const lamp = new THREE.Mesh(lampGeo, material);
          lamp.rotation.x = Math.PI / 2;
          lamp.position.set(-boardW / 2 + 0.32 + index * 0.24, boardH / 2 - 0.01, 0.3);
          shell.add(lamp);
        });

        const armGeo = track(new THREE.BoxGeometry(0.12, 0.86, 0.12));
        const armMat = metal(0x24282d, 0.45, 0.9);
        [-1, 1].forEach((side) => {
          const arm = new THREE.Mesh(armGeo, armMat);
          arm.position.set(side * (boardW / 2 - 0.5), -boardH / 2 - 0.42, -0.16);
          arm.rotation.x = -0.36;
          shell.add(arm);
          const clamp = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, 0.1, 0.26)), armMat);
          clamp.position.set(side * (boardW / 2 - 0.5), -boardH / 2 - 0.84, -0.34);
          shell.add(clamp);
        });

        const cableCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-boardW / 2 + 0.62, -boardH / 2 - 0.5, -0.2),
          new THREE.Vector3(-boardW / 2 + 0.12, -boardH / 2 - 1.05, -0.45),
          new THREE.Vector3(-boardW / 2 - 0.5, -boardH / 2 - 1.62, -0.7),
        ]);
        shell.add(
          new THREE.Mesh(track(new THREE.TubeGeometry(cableCurve, 24, 0.032, 8, false)), matte(0x14171a, 0.95))
        );

        const wall = new THREE.Mesh(
          track(new THREE.PlaneGeometry(22, 12)),
          track(new THREE.MeshBasicMaterial({ map: gridTexture(), transparent: true, opacity: 0.5 }))
        );
        wall.position.set(0, 0, -3.4);
        scene.add(wall);

        const floor = new THREE.Mesh(
          track(new THREE.PlaneGeometry(16, 8)),
          track(new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, opacity: 0.55, depthWrite: false }))
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -boardH / 2 - 1.85, 0.6);
        scene.add(floor);

        scene.add(new THREE.HemisphereLight(0x93a4b5, 0x07080a, 0.55));

        const key = new THREE.DirectionalLight(0xfff3e0, 1.9);
        key.position.set(2.6, 3.1, 3.4);
        scene.add(key);

        const rim = new THREE.DirectionalLight(0x8fb6d6, 0.85);
        rim.position.set(-3.2, 1.5, -2.4);
        scene.add(rim);

        const underGlow = new THREE.PointLight(0xffb01f, 3.4, 5.2, 2);
        underGlow.position.set(0, -1.5, 1.4);
        scene.add(underGlow);

        let flash = 0;
        let jolt = 0;
        let clock = 0;
        let ratchetIn = 4 + Math.random() * 4;
        let frameCount = 0;
        let failed = false;

        window.SC.stage.debug = { frames: 0, error: null };

        function swap(mesh, char, half, tone) {
          const previous = mesh.material;
          mesh.material = faceMaterial(char, half, tone);
          if (previous) previous.dispose();
        }

        function begin(cell, char) {
          swap(cell.fallLeaf, cell.current, "top");
          swap(cell.fallBack, randChar(cell.current), "bottom", "dim");
          swap(cell.topFace, char, "top");
          swap(cell.riseLeaf, char, "bottom");
          swap(cell.riseBack, cell.current, "top", "dim");
          cell.phase = "fall";
          cell.t = 0;
          jolt = Math.min(1, jolt + 0.2);
          flash = Math.min(1, flash + 0.42);
        }

        function settle(cell) {
          cell.current = cell.target;
          cell.phase = "idle";
          cell.t = 0;
          swap(cell.bottomFace, cell.current, "bottom");
          swap(cell.fallLeaf, cell.current, "top");
          cell.fallGroup.rotation.x = 0;
          cell.riseGroup.rotation.x = 0;
          if (cell.queue.length) {
            cell.target = cell.queue.shift();
            cell.delay = STAGGER;
          }
        }

        function set(value) {
          const text = String(value).padEnd(MODULES, "-").slice(0, MODULES);
          cells.forEach((cell, index) => {
            const char = CHARS.includes(text[index]) ? text[index] : "-";
            cell.queue = [];
            cell.target = null;
            if (char === cell.current && cell.phase === "idle") return;
            if (reduced) {
              cell.current = char;
              cell.phase = "idle";
              swap(cell.topFace, char, "top");
              swap(cell.bottomFace, char, "bottom");
              swap(cell.fallLeaf, char, "top");
              swap(cell.riseLeaf, char, "bottom");
              return;
            }
            const steps = [];
            const hops = 1 + Math.floor(Math.random() * 2);
            for (let hop = 0; hop < hops; hop += 1) steps.push(randChar(char));
            steps.push(char);
            cell.target = steps[0];
            cell.queue = steps.slice(1);
            cell.delay = index * STAGGER;
          });
          if (reduced) renderer.render(scene, camera);
        }

        function ratchet() {
          const cell = cells[Math.floor(Math.random() * cells.length)];
          if (!cell || cell.phase !== "idle" || cell.target) return;
          cell.target = randChar(cell.current);
          cell.queue = [cell.current];
          cell.delay = 0;
        }

        const pointer = { x: 0, y: 0, has: false };
        const sway = { x: 0, y: 0, vx: 0, vy: 0 };
        let last = performance.now();
        let raf = 0;
        let visible = true;
        let live = true;
        let intro = reduced ? 1 : 0;

        function resize() {
          const width = target.clientWidth;
          const height = target.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(target);
        resize();

        const visibility = new IntersectionObserver(
          (entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            last = performance.now();
          },
          { threshold: 0.02 }
        );
        visibility.observe(target);

        function onHidden() {
          live = !document.hidden;
          last = performance.now();
        }
        document.addEventListener("visibilitychange", onHidden);

        function onPointer(event) {
          const rect = target.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          pointer.has = true;
        }
        target.addEventListener("pointermove", onPointer);
        target.addEventListener("pointerleave", () => {
          pointer.has = false;
        });

        function update(dt) {
          clock += dt;
          intro = Math.min(1, intro + dt / 1.1);
          const introEase = 1 - Math.pow(1 - intro, 3);

          jolt *= Math.pow(0.006, dt);
          flash *= Math.pow(0.02, dt);

          ratchetIn -= dt;
          if (ratchetIn <= 0 && !reduced) {
            ratchet();
            ratchetIn = 6 + Math.random() * 6;
          }

          const targetX = pointer.has ? pointer.x * 0.36 : Math.sin(clock * 0.21) * 0.13;
          const targetY = pointer.has ? pointer.y * 0.2 : Math.sin(clock * 0.16) * 0.04;
          sway.vx += (targetX - sway.x) * 26 * dt;
          sway.vy += (targetY - sway.y) * 26 * dt;
          sway.vx *= Math.pow(0.02, dt);
          sway.vy *= Math.pow(0.02, dt);
          sway.x += sway.vx * dt;
          sway.y += sway.vy * dt;

          cells.forEach((cell) => {
            if (cell.phase === "idle") {
              if (cell.target) {
                if (cell.delay > 0) cell.delay -= dt;
                else begin(cell, cell.target);
              }
              return;
            }
            cell.t += dt;
            if (cell.phase === "fall") {
              const progress = Math.min(1, cell.t / FLIP);
              cell.fallGroup.rotation.x = easeIn(progress) * (Math.PI / 2);
              if (progress >= 1) {
                cell.phase = "rise";
                cell.t = 0;
                cell.riseGroup.rotation.x = -Math.PI / 2;
              }
              return;
            }
            if (cell.phase === "rise") {
              const progress = Math.min(1, cell.t / FLIP);
              cell.riseGroup.rotation.x = (-Math.PI / 2) * (1 - easeOut(progress));
              if (progress >= 1) {
                cell.phase = "settle";
                cell.t = 0;
              }
              return;
            }
            const progress = Math.min(1, cell.t / SETTLE);
            const bounce = Math.sin(progress * Math.PI) * 0.075;
            cell.riseGroup.rotation.x = bounce;
            cell.fallGroup.rotation.x = -bounce * 0.6;
            if (progress >= 1) settle(cell);
          });

          shell.position.x = sway.x;
          shell.position.y = sway.y + (1 - introEase) * -0.5;
          shell.rotation.y = -sway.x * 0.24 + Math.sin(clock * 21) * jolt * 0.006;
          shell.rotation.x = -0.04 - sway.y * 0.14 + Math.cos(clock * 26) * jolt * 0.004;
          shell.rotation.z = Math.sin(clock * 34) * jolt * 0.005;

          wall.position.x = sway.x * 0.4;
          wall.position.y = sway.y * 0.4;

          key.position.x = 2.6 + sway.x * 1.2;
          key.position.y = 3.1 - sway.y * 1.2;
          underGlow.intensity = 2.6 + flash * 3.4 + Math.sin(clock * 1.6) * 0.24;

          ledMap.offset.x -= dt * 0.24;
          lampMats[0].emissiveIntensity = 1.2 + flash * 2.2 + Math.sin(clock * 2.4) * 0.22;
          lampMats[1].emissiveIntensity = 0.85 + Math.sin(clock * 1.1 + 1) * 0.18;

          camera.position.x = sway.x * 0.5;
          camera.position.y = 0.35 - sway.y * 0.35 + Math.sin(clock * 0.4) * 0.018;
          camera.position.z = restZ + 2.4 * (1 - introEase);
          camera.lookAt(0, sway.y * 0.2, 0);
        }

        function loop(now) {
          raf = window.requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!live || !visible) return;
          try {
            update(dt);
            renderer.render(scene, camera);
            frameCount += 1;
            window.SC.stage.debug.frames = frameCount;
          } catch (error) {
            if (!failed) {
              failed = true;
              window.SC.stage.debug.error = error;
              window.console.warn("scene berhenti", error);
              target.dataset.stage = "off";
            }
          }
        }

        if (reduced) {
          update(0);
          renderer.render(scene, camera);
        } else {
          raf = window.requestAnimationFrame(loop);
        }

        function destroy() {
          window.cancelAnimationFrame(raf);
          resizeObserver.disconnect();
          visibility.disconnect();
          document.removeEventListener("visibilitychange", onHidden);
          target.removeEventListener("pointermove", onPointer);
          trash.forEach((item) => {
            if (item && typeof item.dispose === "function") item.dispose();
          });
          renderer.dispose();
          if (renderer.domElement.parentNode === target) target.removeChild(renderer.domElement);
        }

        return { set, destroy };
      }
    },
  };
})(window.SC || (window.SC = {}));
