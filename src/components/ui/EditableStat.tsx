// Tap-to-edit stat card. Displays value until tapped; shows input to edit.
import { useState } from "preact/hooks";

interface Props {
  label: string;
  value: string | number;
  display?: string;
  onCommit: (next: string) => void;
  inputMode?: "numeric" | "text";
  small?: boolean;
}

export function EditableStat({ label, value, display, onCommit, inputMode = "text", small }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    if (draft !== String(value)) onCommit(draft);
  };

  return (
    <div class="card stat editable-stat" style={small ? "min-height:60px;padding:6px 8px" : "min-height:70px"}>
      <span class="stat__label">{label}</span>
      {editing ? (
        <input
          class="stat__value stat__value-input"
          autofocus
          inputMode={inputMode}
          value={draft}
          onInput={e => setDraft((e.currentTarget as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={e => { if ((e as KeyboardEvent).key === "Enter") commit(); if ((e as KeyboardEvent).key === "Escape") { setDraft(String(value)); setEditing(false); } }}
        />
      ) : (
        <button
          class="stat__value editable-stat__display"
          style={small ? "font-size:20px" : "font-size:22px"}
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          aria-label={`Editar ${label}`}
        >
          {display ?? value}
        </button>
      )}
    </div>
  );
}
