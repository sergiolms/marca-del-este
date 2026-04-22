import type { TimelineEntry } from "../../rules/types";

interface Props { entries: TimelineEntry[]; }

export function Timeline({ entries }: Props) {
  if (!entries.length) {
    return (
      <div class="card" style="padding:16px;color:var(--ink-muted);font-size:13px;text-align:center">
        La crónica está en silencio… tira tu primer d20.
      </div>
    );
  }
  return (
    <div class="timeline">
      {entries.slice(0, 12).map(e => (
        <div key={e.id} class={`tl ${e.kind === "crit" ? "tl--crit" : e.kind === "fumble" ? "tl--fumble" : e.kind === "heal" ? "tl--heal" : ""}`}>
          <div class="tl__time">{formatTime(e.time)}</div>
          <span dangerouslySetInnerHTML={{ __html: e.text }} />
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
