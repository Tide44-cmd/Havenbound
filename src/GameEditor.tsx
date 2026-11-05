import { useEffect, useRef, useState } from "react";
import { Game, gameSchema, statuses, lanes, dayKey } from "./model";
export default function GameEditor({
  game,
  onSave,
  onClose,
}: {
  game: Game;
  onSave: (g: Game) => void;
  onClose: () => void;
}) {
  const [g, set] = useState(game);
  const [error, setError] = useState("");
  const modal = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = modal.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),input,select,textarea",
      );
      if (!elements?.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [onClose]);
  const update = (key: keyof Game, value: unknown) =>
    set({
      ...g,
      [key]: value,
      ...(key === "lane" && value === "Completed"
        ? { status: "completed" as const }
        : key === "lane" && value === "Currently Playing"
          ? { status: "started" as const }
          : {}),
    });
  return (
    <div className="overlay">
      <section
        ref={modal}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Game details"
      >
        <div className="section-head">
          <h2>{game.name ? "Game details" : "Add to your collection"}</h2>
          <button onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const result = gameSchema.safeParse(g);
            if (!result.success) {
              setError(result.error.issues[0].message);
              return;
            }
            onSave({
              ...result.data,
              completedAt:
                g.status === "completed" ? g.completedAt || dayKey() : "",
            });
          }}
        >
          <div className="form-grid">
            {(
              ["name", "productId", "platform", "edition", "cover"] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    name: "Game title",
                    productId: "Xbox Product ID",
                    platform: "Platform / stack",
                    edition: "Edition",
                    cover: "Cover image URL (optional)",
                  }[k]
                }
                <input
                  autoFocus={k === "name"}
                  required={k === "name"}
                  value={g[k]}
                  onChange={(e) => update(k, e.target.value)}
                />
              </label>
            ))}
            <label>
              Status
              <select
                value={g.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Backlog list
              <select
                value={g.lane || ""}
                onChange={(e) => update("lane", e.target.value || null)}
              >
                <option value="">Not planned</option>
                {lanes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={g.priority}
                onChange={(e) => update("priority", e.target.value)}
              >
                {["Low", "Normal", "High"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {(
              ["earned", "total", "remaining", "played", "estimated"] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    earned: "Achievements earned (unknown if blank)",
                    total: "Achievements available (unknown if blank)",
                    remaining: "Remaining hours · manual estimate",
                    played: "Hours already played",
                    estimated: "Total completion hours · estimate",
                  }[k]
                }
                <input
                  type="number"
                  min="0"
                  max={["earned", "total"].includes(k) ? 10000000 : 100000}
                  step={["earned", "total"].includes(k) ? 1 : 0.25}
                  value={g[k] ?? ""}
                  onChange={(e) =>
                    update(
                      k,
                      e.target.value === "" && ["earned", "total"].includes(k)
                        ? null
                        : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
            <label>
              Tags · comma separated
              <input
                value={g.tags.join(",")}
                onChange={(e) => update("tags", e.target.value.split(","))}
              />
            </label>
            <label>
              Completion date
              <input
                type="date"
                value={g.completedAt}
                onChange={(e) => update("completedAt", e.target.value)}
              />
            </label>
          </div>
          <label>
            Personal notes
            <textarea
              value={g.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
            />
          </label>
          <div className="checks">
            {(["owned", "included", "favorite", "coop"] as const).map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={g[k]}
                  onChange={(e) => update(k, e.target.checked)}
                />
                {
                  {
                    owned: "Owned",
                    included: "Include in achievement statistics",
                    favorite: "Favourite",
                    coop: "Co-op supported (manually verified)",
                  }[k]
                }
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary">Save game</button>
          </div>
        </form>
      </section>
    </div>
  );
}
