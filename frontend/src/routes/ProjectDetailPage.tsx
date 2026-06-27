import { useParams } from "react-router-dom";

/** Project detail: metadata, recent sessions, "new analysis" CTA. Scaffold stub. */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  return (
    <main data-route="project-detail">
      <h1>Project</h1>
      <p>ID: {projectId}</p>
      {/* TODO: metadata + recent sessions + CTA */}
    </main>
  );
}
