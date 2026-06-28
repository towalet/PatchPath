import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

import patchPathLogo from "../assets/patchpath-logo.png";
import FaultyTerminal from "../components/background/FaultyTerminal";
import { useReveal } from "../hooks/useReveal";

/** A scroll-reveal container: its `.reveal-item` descendants settle in when it
 * enters the viewport. */
function RevealGroup({ className = "", children }: { className?: string; children: ReactNode }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal-group ${className} ${visible ? "is-visible" : ""}`.trim()}>
      {children}
    </div>
  );
}

/** Per-item reveal cadence (staggered transition-delay). */
const rd = (ms: number): CSSProperties => ({ transitionDelay: `${ms}ms` });

/**
 * Public landing page — ported from the "PatchPath Landing Redesign" design.
 * Monochrome pixel-diagnostic system with the animated FaultyTerminal hero
 * background. Copy is adapted to PatchPath's deployment-diagnostics product.
 */

const FAULTS = [
  {
    code: "ERR_01",
    glyph: <span className="glyph glyph--on glyph--lg" />,
    title: "Missing env vars",
    desc: "Config that exists locally but never reached production — DATABASE_URL, secrets, API keys.",
  },
  {
    code: "ERR_02",
    glyph: <span className="glyph glyph--outline-bright glyph--lg" />,
    title: "Wrong start command",
    desc: "A start command that launches on your machine but the platform can't run.",
  },
  {
    code: "ERR_03",
    glyph: (
      <span style={{ display: "inline-flex", gap: 2 }}>
        <span className="glyph glyph--muted glyph--lg" />
        <span className="glyph glyph--dim glyph--lg" />
      </span>
    ),
    title: "Port binding",
    desc: "The server ignores $PORT, so the platform never routes traffic and marks it dead.",
  },
  {
    code: "ERR_04",
    glyph: <span className="glyph glyph--outline glyph--lg" />,
    title: "Build & dependency breaks",
    desc: "A missing module or failed build step that only surfaces in the deploy log.",
  },
];

const STEPS = [
  {
    num: "01",
    solid: false,
    glyph: <span className="glyph glyph--on" />,
    title: "Upload the evidence",
    desc: "Drop in deploy logs, Dockerfiles, configs, or paste the exact error you're seeing.",
  },
  {
    num: "02",
    solid: false,
    glyph: <span className="glyph glyph--outline-bright" />,
    title: "Detect before AI",
    desc: "Deterministic rules extract evidence first — the AI diagnoses only from what's proven.",
  },
  {
    num: "03",
    solid: true,
    glyph: <span className="glyph glyph--on" />,
    title: "Follow the fix",
    desc: "A ranked root cause with commands, a verification checklist, and what's still uncertain.",
  },
];

// Zig-zag node anchors in the SVG's user-coordinate space (viewBox 560×640):
// 01 upper-left, 02 middle-right, 03 lower-left. The squiggle threads through
// them; the DOM step cards are positioned at the same coordinates (as %).
const SEQ_VB = { w: 560, h: 640 };
const SEQ_NODES = [
  { x: 123, y: 80 }, // 01
  { x: 432, y: 312 }, // 02
  { x: 138, y: 556 }, // 03
];
// First curve (node 1 → node 2), measured to know when the dot reaches node 2.
const SEQ_SEG1 = "M 123 80 C 150 250, 500 150, 432 312";
// Full squiggle: node 1 → node 2 → node 3.
const SEQ_PATH = "M 123 80 C 150 250, 500 150, 432 312 C 372 452, 50 430, 138 556";
// The dot finishes the path at this scroll fraction, then dwells on node 3.
const SEQ_FINISH = 0.85;

/**
 * "Repair sequence" — a pinned scroll sequence. On wide screens (motion
 * allowed) the section sticks while a tall spacer scrolls past; progress drives
 * a circle along a squiggly SVG path that threads the three zig-zagged steps
 * (left → right → lower-left), lighting each as it arrives, then the pin
 * releases. Narrow screens / reduced motion get a plain stacked fallback.
 */
function RepairSequence() {
  const outerRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const seg1Ref = useRef<SVGPathElement>(null);
  const lensRef = useRef<{ L: number; seg1: number } | null>(null);

  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(0);
  const [dot, setDot] = useState<{ x: number; y: number; len: number } | null>(null);

  useEffect(() => {
    const canPin =
      window.matchMedia("(min-width: 861px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPinned(canPin);
    if (!canPin) return;

    let ticking = false;
    const measure = () => {
      ticking = false;
      const el = outerRef.current;
      const path = pathRef.current;
      const seg = seg1Ref.current;
      if (!el || !path || !seg) return;

      if (!lensRef.current) {
        lensRef.current = { L: path.getTotalLength(), seg1: seg.getTotalLength() };
      }
      const { L, seg1 } = lensRef.current;

      const range = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), Math.max(range, 1));
      const p = range > 0 ? scrolled / range : 0;

      const t = Math.min(p / SEQ_FINISH, 1); // dot finishes early, then dwells
      const len = t * L;
      const pt = path.getPointAtLength(len);
      setDot({ x: pt.x, y: pt.y, len });

      let act = 0;
      if (len >= seg1 - 6) act = 1;
      if (t >= 0.997) act = 2;
      setActive(act);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const stepState = (i: number) => (i < active ? "done" : i === active ? "active" : "upcoming");

  const header = (
    <>
      <div className="eyebrow">
        <span className="glyph glyph--on glyph--sm" />// REPAIR_SEQUENCE
      </div>
      <h2 className="section-title">Three steps from failure to fix.</h2>
    </>
  );

  // Fallback: plain stacked steps (mobile / reduced motion).
  if (!pinned) {
    return (
      <section id="how" className="lp-section">
        <div className="lp-section__inner">
          {header}
          <div className="lp-steps">
            <div className="lp-steps__rail" aria-hidden="true" />
            {STEPS.map((s) => (
              <div className="lp-step" key={s.num}>
                <div className="lp-step__head">
                  <span className={`lp-step__num${s.solid ? " lp-step__num--solid" : ""}`}>
                    {s.num}
                  </span>
                  {s.glyph}
                </div>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const L = lensRef.current?.L;
  const dash =
    L && dot
      ? { strokeDasharray: L, strokeDashoffset: Math.max(L - dot.len, 0) }
      : { strokeDasharray: 9999, strokeDashoffset: 9999 };

  return (
    <section
      id="how"
      ref={outerRef}
      className="lp-section lp-how is-pinned"
      style={{ height: `calc(100vh + ${STEPS.length * 72}vh)` }}
    >
      <div className="lp-how__pin">
        <div className="lp-section__inner">
          {header}

          <div className="seq-stage">
            <svg
              className="seq-svg"
              viewBox={`0 0 ${SEQ_VB.w} ${SEQ_VB.h}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <path className="seq-track" d={SEQ_PATH} />
              <path ref={pathRef} className="seq-progress" d={SEQ_PATH} style={dash} />
              {/* measured only — never painted */}
              <path ref={seg1Ref} d={SEQ_SEG1} fill="none" stroke="none" />
              {dot ? (
                <>
                  <circle className="seq-dot__ring" cx={dot.x} cy={dot.y} r="14" />
                  <circle className="seq-dot" cx={dot.x} cy={dot.y} r="6.5" />
                </>
              ) : null}
            </svg>

            {STEPS.map((s, i) => {
              const node = SEQ_NODES[i];
              const side = i === 1 ? "right" : "left";
              return (
                <div
                  key={s.num}
                  className={`seq-step seq-step--${side}`}
                  data-state={stepState(i)}
                  style={{ left: `${(node.x / SEQ_VB.w) * 100}%`, top: `${(node.y / SEQ_VB.h) * 100}%` }}
                >
                  <span className="seq-step__node">{s.num}</span>
                  <div className="seq-step__body">
                    <h3 className="seq-step__title">{s.title}</h3>
                    <p className="seq-step__desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="lp" id="top">
      {/* ===== NAVBAR ===== */}
      <nav className="lp-nav">
        <Link
          to="/"
          className="brand"
          aria-label="PatchPath home"
          onClick={(e) => {
            // Already on the landing route, so just smooth-scroll to the top.
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img className="brand__logo" src={patchPathLogo} alt="" />
        </Link>
        <div className="lp-nav__links">
          <a href="#blockers" className="lp-nav__link">
            Failures
          </a>
          <a href="#how" className="lp-nav__link">
            How it works
          </a>
          <Link to="/login" className="lp-nav__link">
            Sign in
          </Link>
          <Link to="/register" data-variant="primary" data-size="sm">
            Run a diagnosis
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="lp-hero">
        <div className="lp-bg">
          <FaultyTerminal />
        </div>
        <div className="lp-bg__gradient" />
        <div className="lp-bg__dim" />
        <div className="lp-bg__pixelgrid" />
        <div className="lp-bg__scanlines" />

        {/* corner brand nodes */}
        <span className="lp-node glyph--sm" style={{ left: 34, top: 120, width: 7, height: 7, background: "#6b6b6b" }} />
        <span className="lp-node" style={{ left: 44, top: 123, width: 46, height: 1, background: "#1a1a1a" }} />
        <span className="lp-node" style={{ right: 34, bottom: 60, width: 7, height: 7, border: "1px solid #6b6b6b" }} />
        <span className="lp-node" style={{ right: 44, bottom: 63, width: 46, height: 1, background: "#1a1a1a" }} />

        <div className="lp-hero__inner">
          <div className="lp-eyebrow reveal" style={{ animationDelay: "0.1s" }}>
            <span className="node-pulse" aria-hidden="true" />
            SYSTEM DIAGNOSTIC // ONLINE
          </div>

          <h1 className="lp-headline">
            <span>
              <span className="pixel-word" style={{ animationDelay: "0s" }}>
                Find
              </span>
              <span className="pixel-word" style={{ animationDelay: "0.12s" }}>
                the
              </span>
              <span className="pixel-word" style={{ animationDelay: "0.24s" }}>
                fault.
              </span>
            </span>
            <span className="dim">
              <span className="pixel-word" style={{ animationDelay: "0.42s" }}>
                Patch
              </span>
              <span className="pixel-word" style={{ animationDelay: "0.54s" }}>
                the
              </span>
              <span className="pixel-word" style={{ color: "#fff", animationDelay: "0.66s" }}>
                path.
              </span>
            </span>
            <span className="scanline" aria-hidden="true" />
          </h1>

          <p className="lp-sub reveal" style={{ animationDelay: "1s" }}>
            PatchPath turns noisy deployment failures into a clear, evidence-backed repair plan you
            can actually follow.
          </p>

          <div className="lp-cta-row reveal" style={{ animationDelay: "1.15s" }}>
            <Link to="/register" data-variant="primary" data-size="lg">
              <span className="btn__dot" aria-hidden="true" />
              Run a diagnosis
            </Link>
            <a href="#how" data-variant="secondary" data-size="lg">
              See how it works
            </a>
          </div>

          {/* diagnostic card */}
          <div className="lp-card reveal" style={{ animationDelay: "1.3s" }}>
            <div className="lp-card__head">
              <span className="lp-card__title">
                <span className="dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                PATH_SCAN.LOG
              </span>
              <span className="lp-card__status">RUNNING</span>
            </div>
            <div className="lp-card__body">
              <div className="lp-card__row">
                <span className="lp-card__label">
                  <span className="glyph glyph--on" aria-hidden="true" />
                  Log scan
                </span>
                <span className="lp-card__val">
                  <span className="lp-bar" aria-hidden="true">
                    <i style={{ width: "72%" }} />
                  </span>
                  72%
                </span>
              </div>
              <div className="lp-card__row">
                <span className="lp-card__label">
                  <span className="glyph glyph--outline" aria-hidden="true" />
                  Env config
                </span>
                <span className="lp-card__val lp-card__val--muted">Missing</span>
              </div>
              <div className="lp-card__row">
                <span className="lp-card__label">
                  <span style={{ display: "inline-flex", gap: 2 }} aria-hidden="true">
                    <span className="glyph glyph--muted" />
                    <span className="glyph glyph--muted" />
                    <span className="glyph glyph--dim" />
                  </span>
                  Detected faults
                </span>
                <span className="lp-card__val">3 items</span>
              </div>
              <div className="lp-card__row">
                <span className="lp-card__label">
                  <span className="glyph glyph--on" aria-hidden="true" />
                  Root cause
                </span>
                <span className="lp-card__val">missing_database_url</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== FAILURES ===== */}
      <section id="blockers" className="lp-section lp-section--alt">
        <RevealGroup className="lp-section__inner">
          <div className="eyebrow reveal-item" style={rd(0)}>
            <span className="glyph glyph--muted glyph--sm" />// DETECTED_FAULTS
          </div>
          <h2 className="section-title reveal-item" style={rd(80)}>
            Where deployments quietly break.
          </h2>
          <p className="lede reveal-item" style={rd(150)}>
            Four faults stall most deploys. PatchPath finds which one is yours.
          </p>

          <div className="lp-faults reveal-item" style={rd(220)}>
            {FAULTS.map((f) => (
              <div className="lp-fault" key={f.code}>
                <div className="lp-fault__head">
                  {f.glyph}
                  <span className="lp-fault__code">{f.code}</span>
                </div>
                <h3 className="lp-fault__title">{f.title}</h3>
                <p className="lp-fault__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </RevealGroup>
      </section>

      {/* ===== HOW IT WORKS (pinned scroll sequence) ===== */}
      <RepairSequence />

      {/* ===== FINAL CTA ===== */}
      <section id="cta" className="lp-cta">
        <div className="lp-cta__grid" aria-hidden="true" />
        <span style={{ position: "absolute", left: "8%", top: "30%", width: 8, height: 8, background: "#6b6b6b" }} />
        <span style={{ position: "absolute", right: "10%", top: "40%", width: 8, height: 8, border: "1px solid #6b6b6b" }} />
        <span style={{ position: "absolute", right: "18%", bottom: "24%", width: 8, height: 8, background: "#1a1a1a", border: "1px solid #2a2a2a" }} />

        <RevealGroup className="lp-cta__inner">
          <div className="eyebrow reveal-item" style={rd(0)}>
            <span className="glyph glyph--on glyph--sm" />READY_TO_PATCH
          </div>
          <h2 className="lp-cta__title reveal-item" style={rd(80)}>
            Stop guessing what broke the deploy.
            <span className="scanline" aria-hidden="true" />
          </h2>
          <p className="lede reveal-item" style={{ textAlign: "center", marginInline: "auto", ...rd(150) }}>
            Upload the evidence, read the diagnosis, ship the fix. One clear path forward.
          </p>
          <Link
            to="/register"
            data-variant="primary"
            data-size="lg"
            className="reveal-item"
            style={{ marginTop: 36, ...rd(230) }}
          >
            <span className="btn__dot" aria-hidden="true" />
            Run a diagnosis
          </Link>
        </RevealGroup>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <Link to="/" className="brand" aria-label="PatchPath home">
            <span className="brand__mark" aria-hidden="true" style={{ width: 18, height: 18 }}>
              <i />
              <i />
              <i />
            </span>
            <span className="brand__word" style={{ fontSize: 14 }}>
              Patch<span>Path</span>
            </span>
          </Link>
          <span className="lp-footer__note">© 2026 PATCHPATH // ALL SYSTEMS MONOCHROME</span>
        </div>
      </footer>
    </div>
  );
}
