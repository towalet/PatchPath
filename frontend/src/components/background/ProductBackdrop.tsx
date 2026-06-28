import FaultyTerminal from "./FaultyTerminal";

/** Shared authenticated-app backdrop. Kept calm so route changes stay clean. */
export function ProductBackdrop() {
  return (
    <div className="product-bg" aria-hidden="true">
      <div className="product-bg__terminal">
        <FaultyTerminal
          brightness={0.18}
          scale={1.45}
          digitSize={1.45}
          gridMul={[2.7, 1.45]}
          timeScale={0.18}
          scanlineIntensity={0.38}
          flickerAmount={0}
          mouseReact={false}
          pageLoadAnimation={false}
          maxDpr={1}
        />
      </div>
      <div className="product-bg__gradient" />
      <div className="product-bg__grid" />
      <div className="product-bg__scanlines" />
    </div>
  );
}
