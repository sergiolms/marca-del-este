import { activeCharacter, updateActive, exportActiveJson, importCharacterJson } from "../state/store";
import { uid } from "../state/character";
import { Icon } from "../components/ui/Icon";

export function JournalScreen() {
  const c = activeCharacter.value;
  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;

  const addSession = () => updateActive(cc => ({
    ...cc,
    journal: {
      ...cc.journal,
      sessions: [
        { id: uid(), title: `Sesión ${cc.journal.sessions.length + 1}`, date: new Date().toISOString().slice(0, 10), xp: 0, text: "" },
        ...cc.journal.sessions,
      ],
    },
  }));

  const doExport = () => {
    const json = exportActiveJson();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(c.character.name || "personaje").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      importCharacterJson(raw);
    } catch {
      alert("No se pudo importar el JSON de personaje.");
    }
  };

  return (
    <div class="scroll">
      <section class="section">
        <h2 class="section__title">Objetivos</h2>
        <textarea
          class="card"
          style="padding:12px;min-height:100px;width:100%;font-family:var(--font-display);font-size:15px;line-height:1.45;border:1.5px solid var(--aged-line);background:var(--card-bg);color:var(--ink);resize:vertical"
          value={c.journal.goals}
          placeholder="Escribe los objetivos de tu personaje o del grupo…"
          onInput={e => updateActive(cc => ({ ...cc, journal: { ...cc.journal, goals: (e.currentTarget as HTMLTextAreaElement).value } }))}
        />
      </section>

      <section class="section">
        <h2 class="section__title">Notas</h2>
        <textarea
          class="card"
          style="padding:12px;min-height:100px;width:100%;font-size:13px;line-height:1.5;border:1.5px solid var(--aged-line);background:var(--card-bg);color:var(--ink);resize:vertical"
          value={c.journal.notes}
          placeholder="Notas rápidas durante la sesión…"
          onInput={e => updateActive(cc => ({ ...cc, journal: { ...cc.journal, notes: (e.currentTarget as HTMLTextAreaElement).value } }))}
        />
      </section>

      <section class="section">
        <h2 class="section__title">Sesiones</h2>
        {c.journal.sessions.length === 0 && (
          <div class="card" style="padding:16px;text-align:center;color:var(--ink-muted);font-size:13px">
            Sin sesiones registradas.
          </div>
        )}
        {c.journal.sessions.map(s => (
          <div class="card" style="margin-bottom:8px" key={s.id}>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:baseline">
              <input
                value={s.title}
                onInput={e => updateActive(cc => ({ ...cc, journal: { ...cc.journal, sessions: cc.journal.sessions.map(x => x.id === s.id ? { ...x, title: (e.currentTarget as HTMLInputElement).value } : x) } }))}
                style="font-family:var(--font-display);font-weight:700;font-size:15px;border:none;background:transparent;color:var(--ink);padding:0"
              />
              <span style="color:var(--ink-muted);font-size:12px">{s.date} · +{s.xp} PX</span>
            </div>
            <textarea
              value={s.text}
              onInput={e => updateActive(cc => ({ ...cc, journal: { ...cc.journal, sessions: cc.journal.sessions.map(x => x.id === s.id ? { ...x, text: (e.currentTarget as HTMLTextAreaElement).value } : x) } }))}
              style="margin-top:4px;width:100%;min-height:60px;border:none;background:transparent;color:var(--ink);font-size:13px;resize:vertical"
            />
          </div>
        ))}
        <button class="dash-btn btn-with-icon" onClick={addSession}><Icon name="add" />Nueva sesión</button>
      </section>

      <section class="section">
        <h2 class="section__title">Datos</h2>
        <div class="card" style="padding:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="buy-btn btn-with-icon" onClick={doExport}><Icon name="export" />Exportar JSON</button>
          <label class="buy-btn btn-with-icon" style="background:var(--class-mago);box-shadow:0 2px 0 #143861;cursor:pointer">
            <Icon name="import" />Importar JSON
            <input type="file" accept=".json,application/json" style="display:none" onChange={doImport} />
          </label>
        </div>
      </section>

      <div style="height:80px"></div>
    </div>
  );
}
