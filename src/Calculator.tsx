import { useState } from "react";
import { Game, CompletionOptions } from "./model";
import { percentage, required, stats, completionRule } from "./lib";
type Scenario = {
  id: string;
  name: string;
  introduced: number;
  earned: number;
};
export default function Calculator({
  games,
  precision,
  options,
  onOptionsChange,
}: {
  games: Game[];
  precision: number;
  options: CompletionOptions;
  onOptionsChange: (options: CompletionOptions) => void;
}) {
  const base = stats(games, options);
  const [items, set] = useState<Scenario[]>([]);
  const [target, setTarget] = useState(90);
  const [selected, select] = useState("");
  const earned = base.earned + items.reduce((s, g) => s + g.earned, 0),
    total = base.total + items.reduce((s, g) => s + g.introduced, 0);
  const current = percentage(base.earned, base.total),
    projected = percentage(earned, total);
  const need = required(earned, total, target);
  const valid =
    items.every(
      (i) =>
        Number.isSafeInteger(i.earned) &&
        Number.isSafeInteger(i.introduced) &&
        i.earned >= 0 &&
        i.introduced >= 0,
    ) && earned <= total;
  return (
    <>
      <section className="panel completion-options">
        <h2>What counts towards completion?</h2>
        <p>
          In-progress and completed games count. Ignored games never count.
          Not-started games only count when planned as Want to play and enabled
          below. Games with unknown counts are excluded.
        </p>
        <div className="checks">
          <label>
            <input
              type="checkbox"
              checked={options.includeWantToPlay}
              onChange={(e) => {
                set([]);
                onOptionsChange({
                  ...options,
                  includeWantToPlay: e.target.checked,
                });
              }}
            />
            Include Want to play
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.excludeUnobtainable}
              onChange={(e) => {
                set([]);
                onOptionsChange({
                  ...options,
                  excludeUnobtainable: e.target.checked,
                });
              }}
            />
            Exclude Unobtainable
          </label>
        </div>
        <small>
          Saved for this profile and applied to all completion totals. Excluding
          a game removes both its earned and total achievements. Changing these
          options clears sandbox scenarios.
        </small>
      </section>
      <div className="metric-grid">
        <div className="metric">
          <span>Current completion</span>
          <strong>{base.total ? current.toFixed(precision) + "%" : "—"}</strong>
          <small>
            {base.earned} / {base.total} known achievements
          </small>
        </div>
        <div className="metric">
          <span>Projected completion</span>
          <strong>
            {total && valid ? projected.toFixed(precision) + "%" : "—"}
          </strong>
          <small>
            {valid
              ? (projected - current >= 0 ? "+" : "") +
                (projected - current).toFixed(precision) +
                " percentage points"
              : "Check your scenario counts"}
          </small>
        </div>
      </div>
      <section className="panel">
        <h2>What does your next completion change?</h2>
        <p className="muted">
          New games add achievements to both sides of the equation. Existing
          counted games add only newly earned achievements. This sandbox never
          changes your collection.
        </p>
        {base.missing > 0 && (
          <p className="notice">
            {base.missing} games have unknown counts and are excluded from these
            totals.
          </p>
        )}
        <div className="inline">
          <select
            aria-label="Choose hypothetical game"
            value={selected}
            onChange={(e) => select(e.target.value)}
          >
            <option value="">Choose a collection game</option>
            {games
              .filter(
                (g) =>
                  !g.ignored &&
                  g.total !== null &&
                  !items.some((i) => i.id === g.id),
              )
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              const g = games.find((g) => g.id === selected);
              if (!g || g.total === null) return;
              const counted = completionRule(g, options).included;
              set([
                ...items,
                {
                  id: g.id,
                  name: g.name,
                  introduced: counted ? 0 : g.total,
                  earned: counted ? g.total - g.earned! : g.total,
                },
              ]);
              select("");
            }}
          >
            Add game
          </button>
          <button
            onClick={() =>
              set([
                ...items,
                {
                  id: crypto.randomUUID(),
                  name: "Hypothetical new game",
                  introduced: 0,
                  earned: 0,
                },
              ])
            }
          >
            + Custom scenario
          </button>
        </div>
        {items.map((item, i) => (
          <div className="scenario" key={item.id}>
            <label>
              Game / scenario
              <input
                value={item.name}
                onChange={(e) =>
                  set(
                    items.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            {(["introduced", "earned"] as const).map((k) => (
              <label key={k}>
                {k === "introduced"
                  ? "New achievements introduced"
                  : "Additional achievements earned"}
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="1"
                  value={item[k]}
                  onChange={(e) =>
                    set(
                      items.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              [k]: Math.min(
                                10000000,
                                Math.max(0, Number(e.target.value)),
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              aria-label={"Remove " + item.name}
              onClick={() => set(items.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="target">
          <h3>Your next milestone</h3>
          <div className="inline">
            {[0.1, 0.5, 1].map((step) => (
              <button
                key={step}
                onClick={() =>
                  setTarget(
                    Math.min(
                      100,
                      Number(
                        (
                          (Math.floor((current + 1e-9) / step) + 1) *
                          step
                        ).toFixed(4),
                      ),
                    ),
                  )
                }
              >
                Next {step}%
              </button>
            ))}
            <label>
              Target percentage
              <input
                type="number"
                min="0"
                max="100"
                step="0.0001"
                value={target}
                onChange={(e) =>
                  setTarget(Math.min(100, Math.max(0, Number(e.target.value))))
                }
              />
            </label>
          </div>
          <p className="result">
            {!valid
              ? "Additional earned achievements exceed the projected total."
              : need === null
                ? "Add achievement data to calculate a target."
                : need === 0
                  ? "You have reached this target in your scenario."
                  : `${need.toLocaleString()} more achievements needed after this scenario.`}
          </p>
          {need !== null && need > total - earned && (
            <p className="notice">
              This target exceeds the remaining achievements in this scenario.
            </p>
          )}
          <small className="muted">
            Calculated using integer counts and ceiling division. Display
            rounding does not determine whether a target is reached.
          </small>
        </div>
      </section>
    </>
  );
}
