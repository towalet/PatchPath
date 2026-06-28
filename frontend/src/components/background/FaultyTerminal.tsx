import { useEffect, useRef } from "react";

/**
 * FaultyTerminal — animated monochrome pixel/terminal background.
 *
 * React port of the self-contained web component shipped with the PatchPath
 * Landing Redesign (originally adapted from the React Bits component, ogl).
 * `ogl` is lazy-imported inside the effect so it is code-split out of the main
 * bundle and the page degrades gracefully to solid black if WebGL/ogl is
 * unavailable. Honors `prefers-reduced-motion` by rendering a single static
 * frame.
 */

const vertexShader = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;
uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
float time;
float hash21(vec2 p){ p = fract(p * 234.56); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float noise(vec2 p){ return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; }
mat2 rotate(float angle){ float c = cos(angle); float s = sin(angle); return mat2(c, -s, s, c); }
float fbm(vec2 p){
  p *= 1.1; float f = 0.0; float amp = 0.5 * uNoiseAmp;
  mat2 modify0 = rotate(time * 0.02); f += amp * noise(p); p = modify0 * p * 2.0; amp *= 0.454545;
  mat2 modify1 = rotate(time * 0.02); f += amp * noise(p); p = modify1 * p * 2.0; amp *= 0.454545;
  mat2 modify2 = rotate(time * 0.08); f += amp * noise(p);
  return f;
}
float pattern(vec2 p, out vec2 q, out vec2 r){
  vec2 offset1 = vec2(1.0); vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time); mat2 rot1 = rotate(0.1);
  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}
float digit(vec2 p){
  vec2 grid = uGridMul * 15.0;
  vec2 s = floor(p * grid) / grid;
  p = p * grid;
  vec2 q, r;
  float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
  if(uUseMouse > 0.5){
    vec2 mouseWorld = uMouse * uScale;
    float distToMouse = distance(s, mouseWorld);
    float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
    intensity += mouseInfluence;
    float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
    intensity += ripple;
  }
  if(uUsePageLoadAnimation > 0.5){
    float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
    float cellDelay = cellRandom * 0.8;
    float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
    float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
    intensity *= fadeAlpha;
  }
  p = fract(p);
  p *= uDigitSize;
  float px5 = p.x * 5.0;
  float py5 = (1.0 - p.y) * 5.0;
  float x = fract(px5);
  float y = fract(py5);
  float i = floor(py5) - 2.0;
  float j = floor(px5) - 2.0;
  float n = i * i + j * j;
  float f = n * 0.0625;
  float isOn = step(0.1, intensity - f);
  float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
  return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}
float onOff(float a, float b, float c){ return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount; }
float displace(vec2 look){
  float y = look.y - mod(iTime * 0.25, 1.0);
  float window = 1.0 / (1.0 + 50.0 * y * y);
  return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}
vec3 getColor(vec2 p){
  float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
  bar *= uScanlineIntensity;
  float displacement = displace(p);
  p.x += displacement;
  if (uGlitchAmount != 1.0) { float extra = displacement * (uGlitchAmount - 1.0); p.x += extra; }
  float middle = digit(p);
  const float off = 0.002;
  float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
              digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
              digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
  vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
  return baseColor;
}
vec2 barrel(vec2 uv){ vec2 c = uv * 2.0 - 1.0; float r2 = dot(c, c); c *= 1.0 + uCurvature * r2; return c * 0.5 + 0.5; }
void main() {
  time = iTime * 0.333333;
  vec2 uv = vUv;
  if(uCurvature != 0.0){ uv = barrel(uv); }
  vec2 p = uv * uScale;
  vec3 col = getColor(p);
  if(uChromaticAberration != 0.0){
    vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
    col.r = getColor(p + ca).r;
    col.b = getColor(p - ca).b;
  }
  col *= uTint;
  col *= uBrightness;
  if(uDither > 0.0){ float rnd = hash21(gl_FragCoord.xy); col += (rnd - 0.5) * (uDither * 0.003922); }
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = String(hex || "#ffffff").replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

export interface FaultyTerminalProps {
  tint?: string;
  brightness?: number;
  scale?: number;
  digitSize?: number;
  gridMul?: [number, number];
  timeScale?: number;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  curvature?: number;
  mouseReact?: boolean;
  mouseStrength?: number;
  pageLoadAnimation?: boolean;
  maxDpr?: number;
  className?: string;
}

export default function FaultyTerminal({
  tint = "#ffffff",
  brightness = 0.32,
  scale = 1.25,
  digitSize = 1.6,
  gridMul = [2.4, 1.4],
  timeScale = 0.35,
  scanlineIntensity = 0.5,
  glitchAmount = 1,
  flickerAmount = 0.4,
  noiseAmp = 1,
  curvature = 0.12,
  mouseReact = true,
  mouseStrength = 0.15,
  pageLoadAnimation = true,
  maxDpr = 2,
  className,
}: FaultyTerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onVisibilityChange: (() => void) | null = null;
    let gl: import("ogl").OGLRenderingContext | null = null;
    let canvas: HTMLCanvasElement | null = null;

    (async () => {
      let ogl: typeof import("ogl");
      try {
        ogl = await import("ogl");
      } catch {
        host.style.background = "#000";
        return;
      }
      if (cancelled) return;

      const { Renderer, Program, Mesh, Color, Triangle } = ogl;
      const tintVec = hexToRgb(tint);
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      const renderer = new Renderer({ dpr });
      gl = renderer.gl;
      canvas = gl.canvas;
      gl.clearColor(0, 0, 0, 1);
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Color(1, 1, 1) },
          uScale: { value: scale },
          uGridMul: { value: new Float32Array(gridMul) },
          uDigitSize: { value: digitSize },
          uScanlineIntensity: { value: scanlineIntensity },
          uGlitchAmount: { value: glitchAmount },
          uFlickerAmount: { value: flickerAmount },
          uNoiseAmp: { value: noiseAmp },
          uChromaticAberration: { value: 0 },
          uDither: { value: 0 },
          uCurvature: { value: curvature },
          uTint: { value: new Color(tintVec[0], tintVec[1], tintVec[2]) },
          uMouse: { value: new Float32Array([0.5, 0.5]) },
          uMouseStrength: { value: mouseStrength },
          uUseMouse: { value: mouseReact ? 1 : 0 },
          uPageLoadProgress: { value: pageLoadAnimation ? 0 : 1 },
          uUsePageLoadAnimation: { value: pageLoadAnimation ? 1 : 0 },
          uBrightness: { value: brightness },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });

      const resize = () => {
        const w = host.offsetWidth || 1;
        const h = host.offsetHeight || 1;
        renderer.setSize(w, h);
        program.uniforms.iResolution.value = new Color(
          gl!.canvas.width,
          gl!.canvas.height,
          gl!.canvas.width / gl!.canvas.height,
        );
      };
      ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      const mouse = { x: 0.5, y: 0.5 };
      const smooth = { x: 0.5, y: 0.5 };
      if (mouseReact) {
        onMove = (e: MouseEvent) => {
          const r = host.getBoundingClientRect();
          mouse.x = (e.clientX - r.left) / r.width;
          mouse.y = 1 - (e.clientY - r.top) / r.height;
        };
        host.addEventListener("mousemove", onMove);
      }

      const timeOffset = Math.random() * 100;
      let loadStart = 0;
      const reduce =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scheduleFrame = () => {
        if (raf || document.hidden) return;
        raf = requestAnimationFrame(update);
      };

      const update = (t: number) => {
        raf = 0;
        if (reduce) {
          program.uniforms.iTime.value = 8.0; // static frame
          program.uniforms.uPageLoadProgress.value = 1;
        } else {
          program.uniforms.iTime.value = (t * 0.001 + timeOffset) * timeScale;
          if (pageLoadAnimation) {
            if (loadStart === 0) loadStart = t;
            program.uniforms.uPageLoadProgress.value = Math.min((t - loadStart) / 2000, 1);
          }
        }
        if (mouseReact) {
          smooth.x += (mouse.x - smooth.x) * 0.08;
          smooth.y += (mouse.y - smooth.y) * 0.08;
          program.uniforms.uMouse.value[0] = smooth.x;
          program.uniforms.uMouse.value[1] = smooth.y;
        }
        renderer.render({ scene: mesh });
        if (!reduce) scheduleFrame();
      };
      onVisibilityChange = () => {
        if (document.hidden && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          return;
        }
        scheduleFrame();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      scheduleFrame();
      host.appendChild(canvas);
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (onMove) host.removeEventListener("mousemove", onMove);
      if (onVisibilityChange) document.removeEventListener("visibilitychange", onVisibilityChange);
      if (canvas && canvas.parentNode === host) host.removeChild(canvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" style={{ width: "100%", height: "100%" }} />;
}
