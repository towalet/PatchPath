import { Link } from "react-router-dom";

/**
 * Public landing page — product narrative + demo-ready flow (see AGENT_PLAN §14).
 * Sections planned: hero, three-step workflow, supported platforms, example
 * diagnosis card, AI safety/trust, CTA. Scaffold stub.
 */
export default function LandingPage() {
  return (
    <main data-route="landing">
      <h1>PatchPath</h1>
      <p>Find the root cause. Follow the fix. Ship with confidence.</p>
      <Link to="/register">Get started</Link>
    </main>
  );
}
