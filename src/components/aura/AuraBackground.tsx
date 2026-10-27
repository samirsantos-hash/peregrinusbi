import { useEffect, useRef } from "react";

/**
 * Fundo do Aura Cloud (design system aplicado ao Peregrinus).
 *
 * Mesmo shader WebGL do original (campo de luz fluida) e os mesmos vínculos:
 * - u_intro 0 → 1 em 3,5s (power2.inOut);
 * - u_scroll acompanha a rolagem da página;
 * - a luz segue o cursor aproximando 0,04 por quadro;
 * - o canvas desce 35% e cresce de 1,1 para 1,22 ao longo da página;
 * - três blobs desfocados derivam com a rolagem.
 * Adaptações para o app: o shader roda em meia resolução (o efeito é difuso e o
 * painel tem muitos gráficos) e, com "reduzir movimento", desenha um quadro fixo.
 */
const VS = `
  attribute vec2 position;
  void main() {
      gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const FS = `
  precision highp float;
  // linhas suaves
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_intro;
  uniform float u_burst;
  uniform float u_scroll;
  uniform float u_light;

  float random(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv;
      vec2 center = vec2(0.55, 0.48);

      vec2 mouse = u_mouse / u_resolution.xy;
      mouse.y = 1.0 - mouse.y;

      // Mesmo fundo do painel escuro (#0B0F17).
      vec3 color = vec3(0.043, 0.059, 0.090);

      float bgGlow = max(0.0, 1.0 - distance(p, vec2(-0.1, 0.5)));
      color += vec3(0.02, 0.10, 0.06) * pow(bgGlow, 2.0) * 0.5 * u_intro;

      float rightGlow = max(0.0, 1.0 - distance(p, vec2(1.08, 0.35)));
      color += vec3(0.02, 0.08, 0.05) * pow(rightGlow, 2.0) * 0.35;

      float particleNoise = fract(sin(dot(p + u_time * 0.015, vec2(12.9898, 78.233))) * 43758.5453);

      float radial = distance(p, center);
      float radialBurst = smoothstep(0.55, 0.0, radial);
      color += vec3(0.04, 0.16, 0.10) * radialBurst * 0.4 * u_burst;

      float ring1 = abs(radial - (0.08 + u_burst * 0.26));
      float ring2 = abs(radial - (0.18 + u_burst * 0.32));
      float burstRing = smoothstep(0.035, 0.0, ring1) + smoothstep(0.05, 0.0, ring2);
      color += vec3(0.23, 0.83, 0.58) * burstRing * 0.22 * u_burst;

      float globalDriftY = sin(p.x * 2.0 - u_time * 0.4) * 0.15;
      float globalDriftX = cos(p.y * 1.5 + u_time * 0.3) * 0.05;

      p.y += globalDriftY * p.x;
      p.x += globalDriftX;
      p.y += sin((p.x + u_scroll * 0.65) * 8.0) * 0.015 * u_burst;

      float lineCount = 45.0;
      
      for(float i = 0.0; i < 45.0; i++) {
          float seed = i / lineCount;
          float speed = 0.05 + random(seed) * 0.1;
          float phase = seed * 6.2831;
          float startY = 0.5;

          float strandDelay = random(seed + 5.0) * 0.4; 
          float localIntro = clamp((u_intro - strandDelay) * 1.6, 0.0, 1.0);
          localIntro = localIntro * localIntro * (3.0 - 2.0 * localIntro);
          
          float spread = pow(p.x, 1.2) * 0.7 * localIntro; 
          
          float wave1 = sin(p.x * (1.8 + random(seed)*1.2) - u_time * speed + phase);
          float wave2 = cos(p.x * 2.5 + u_time * speed * 0.7 - phase * 1.1);
          float explosionWave = sin((p.x * 10.0) - u_time * 2.0 + seed * 14.0) * 0.08 * u_burst * pow(p.x, 1.4);
          
          float yPos = startY + (wave1 * 0.5 + wave2 * 0.3) * spread + explosionWave;

          vec2 linePoint = vec2(p.x, yPos);
          float distToMouse = distance(linePoint, mouse);
          float hoverInfluence = smoothstep(0.4, 0.0, distToMouse);
          
          float dy = mouse.y - yPos;
          float ripple = sin(distToMouse * 12.0 - u_time * 3.0) * 0.03 * hoverInfluence;
          yPos += dy * hoverInfluence * 0.4 * localIntro + ripple;

          float centerPush = smoothstep(0.38, 0.0, distance(vec2(p.x, yPos), center));
          yPos += (yPos - center.y) * centerPush * 0.45 * u_burst;

          float distToLine = abs(p.y - yPos);
          float thickness = 0.001 + p.x * 0.005 + u_burst * 0.002; 
          float intensity = 0.0007 / (distToLine + thickness);
          
          float edgeFade = smoothstep(1.0, 0.1, p.x);
          float lengthFade = smoothstep(u_intro * 1.5, (u_intro * 1.5) - 0.35, p.x);
          
          vec3 colDeepAqua = vec3(0.05, 0.50, 0.32);
          vec3 colTeal = vec3(0.08, 0.66, 0.42);
          vec3 colBrightCyan = vec3(0.23, 0.83, 0.58);
          
          vec3 lineColor = mix(colDeepAqua, colTeal, random(seed + 1.0));
          lineColor = mix(lineColor, colBrightCyan, random(seed + 2.0) * 0.4);
          lineColor += vec3(0.23, 0.83, 0.58) * centerPush * u_burst * 0.7;
          
          float coreGlow = smoothstep(0.015, 0.0, distToLine);
          lineColor += vec3(0.85, 1.0, 0.92) * coreGlow * 0.5 * (1.0 - u_light);
          // Modo claro: fios verdes da marca com parte em amarelo.
          vec3 claro = mix(vec3(0.05, 0.50, 0.32), vec3(0.08, 0.66, 0.42), random(seed + 1.0));
          claro = mix(claro, vec3(1.0, 0.85, 0.0), step(0.72, random(seed + 3.0)));
          lineColor = mix(lineColor, claro, u_light);
          
          color += lineColor * intensity * edgeFade * lengthFade * localIntro;
      }

      if (u_light > 0.5) {
          vec3 linhas = max(color - vec3(0.043, 0.059, 0.090), vec3(0.0));
          float a = clamp(max(linhas.r, max(linhas.g, linhas.b)), 0.0, 1.0);
          vec3 bruto = linhas / max(a, 0.001);
          // Só verde da marca ou amarelo, sem misturar em verde-limão.
          vec3 tom = mix(vec3(0.055, 0.50, 0.32), vec3(0.92, 0.76, 0.0), smoothstep(0.45, 0.85, bruto.r / max(bruto.g, 0.001)));
          // Fundo branco no modo claro.
          color = mix(vec3(1.0), tom, smoothstep(0.0, 0.8, a) * 0.85);
      }
      // Dither leve para evitar faixas no degradê escuro.
      color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      gl_FragColor = vec4(color, 1.0);
  }
`;

// Resolução nativa (até 2x) para linhas contínuas, sem pixel.
const RENDER_SCALE = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
const INTRO_MS = 3500;
const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // GSAP power2.inOut

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type) as WebGLShader;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export function AuraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let scroll = 0;

    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      scroll = Math.min(1, Math.max(0, window.scrollY / max));
      const canvasProgress = Math.min(
        1,
        window.scrollY / Math.max(1, doc.scrollHeight),
      );
      canvas.style.transform = `translateY(${35 * canvasProgress}%) scale(${1.1 + 0.12 * canvasProgress})`;
      const blobs = blobsRef.current?.children;
      if (blobs && blobs.length === 3) {
        (blobs[0] as HTMLElement).style.transform =
          `translate(${60 * scroll}px, ${-180 * scroll}px)`;
        (blobs[1] as HTMLElement).style.transform =
          `translate(${-70 * scroll}px, ${-100 * scroll}px)`;
        (blobs[2] as HTMLElement).style.transform =
          `translate(${40 * scroll}px, ${-140 * scroll}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return () => window.removeEventListener("scroll", onScroll);

    const program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    gl.useProgram(program);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posAttr = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uIntro = gl.getUniformLocation(program, "u_intro");
    const uBurst = gl.getUniformLocation(program, "u_burst");
    const uScroll = gl.getUniformLocation(program, "u_scroll");
    const uLight = gl.getUniformLocation(program, "u_light");
    const ehClaro = () => document.documentElement.classList.contains("light") ? 1 : 0;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * RENDER_SCALE);
      canvas.height = Math.round(window.innerHeight * RENDER_SCALE);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    const startTime = performance.now();
    let frame = 0;
    const draw = (time: number) => {
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;
      const intro = reduce
        ? 1
        : easeInOutQuad(Math.min(1, (time - startTime) / INTRO_MS));
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (time - startTime) * 1e-3);
      gl.uniform2f(uMouse, mouseX * RENDER_SCALE, mouseY * RENDER_SCALE);
      gl.uniform1f(uIntro, intro);
      gl.uniform1f(uBurst, 0);
      gl.uniform1f(uScroll, scroll);
      gl.uniform1f(uLight, ehClaro());
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    if (reduce) {
      draw(startTime + INTRO_MS);
    } else {
      window.addEventListener("mousemove", onMouseMove);
      const loop = (time: number) => {
        draw(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="bg-canvas"
        aria-hidden
        className="aura-canvas fixed inset-0 w-full h-full scale-110 pointer-events-none z-0"
      />
      <div
        ref={blobsRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      >
        <div className="blob blob-1 absolute top-[8%] left-[-10rem] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[140px]" />
        <div className="blob blob-2 absolute top-[30%] right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-[140px]" />
        <div className="blob blob-3 absolute bottom-[-8rem] left-[20%] w-[26rem] h-[26rem] rounded-full bg-primary/5 blur-[140px]" />
      </div>
    </>
  );
}

/**
 * Entrada dos cartões como os stat-cards do Aura: y 24px, escala 0,96 → 1,
 * 0,8s power2.out, 80ms entre os que aparecem juntos. Os cartões ficam pausados
 * até entrarem na tela; o atributo data-revealed sobrevive às re-renderizações do React.
 */
export function AuraReveal() {
  useEffect(() => {
    const SELECTOR = ".glass-card, .aura-reveal";
    if (typeof IntersectionObserver === "undefined") {
      document
        .querySelectorAll<HTMLElement>(SELECTOR)
        .forEach((el) => (el.dataset.revealed = "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.setProperty(
            "--aura-delay",
            `${Math.min(order * 80, 480)}ms`,
          );
          el.dataset.revealed = "true";
          io.unobserve(el);
          order++;
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    // Rede de segurança: o que já está na tela e por algum recorte não disparou o observer entra mesmo assim
    let fallback = 0;
    const revealVisible = () => {
      document
        .querySelectorAll<HTMLElement>(`:is(${SELECTOR}):not([data-revealed])`)
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.top < window.innerHeight && r.bottom > 0) {
            el.dataset.revealed = "true";
            io.unobserve(el);
          }
        });
    };
    const scan = () => {
      document
        .querySelectorAll<HTMLElement>(`:is(${SELECTOR}):not([data-revealed])`)
        .forEach((el) => io.observe(el));
      window.clearTimeout(fallback);
      fallback = window.setTimeout(revealVisible, 1200);
    };
    scan();
    // Também ao rolar, para blocos que um recorte de rolagem esconde do observer
    let ticking = false;
    const onScrollReveal = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        revealVisible();
      });
    };
    window.addEventListener("scroll", onScrollReveal, { passive: true });
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("scroll", onScrollReveal);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
