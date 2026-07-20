import { FileSearch } from "lucide-react";

export function EmptyState() {
  return (
    <main className="rr-app rr-empty">
      <div className="rr-empty-card" role="status">
        <FileSearch size={28} />
        <h1>No verified registration artifact loaded.</h1>
        <p>
          The private rig lab renders only host-verified registration
          artifacts. Nothing was supplied, so there is nothing to review —
          candidate evidence only · no runtime node · no motion channel · no
          production binding.
        </p>
      </div>
    </main>
  );
}
