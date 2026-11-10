import { useState } from "react";
import { Game, gameSchema } from "./model";
import {
  fields,
  guessMapping,
  importRows,
  Mapping,
  mergeGames,
  parseCsv,
} from "./lib";
export default function Importer({
  games,
  onImport,
}: {
  games: Game[];
  onImport: (g: Game[]) => void;
}) {
  const [csv, setCsv] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [mode, setMode] = useState("merge");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [matchTitles, setMatchTitles] = useState(false);
  const parsed = csv ? importRows(csv.rows, map) : null;
  const preview = parsed
    ? mergeGames(
        mode === "replace" ? games.map((g) => ({ ...g, owned: false })) : games,
        parsed.games,
        mode === "replace" ? { ...map, owned: map.owned || "__owned" } : map,
        mode === "achievements",
        matchTitles,
      )
    : null;
  return (
    <section className="panel">
      <h2>Bring your collection home</h2>
      <p className="muted">
        Import an XCT export or an achievement CSV. Files are processed on this
        device.
      </p>
      <label className="dropzone">
        Choose a CSV export
        <input
          aria-label="CSV export"
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            try {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 20 * 1024 * 1024)
                throw Error("Please choose a CSV under 20 MB.");
              const result = parseCsv(await file.text());
              setCsv(result);
              setMap(guessMapping(result.headers));
              setMessage("");
              setError("");
            } catch (err) {
              setError(String(err));
            }
          }}
        />
      </label>
      {csv && (
        <>
          <p className="notice">
            {csv.rows.length.toLocaleString()} rows found. XCT purchase status
            is deliberately unmapped. Platform and edition default to Xbox
            Series X|S / Standard when absent; change them for known stacks.
            Ownership does not establish achievement progress. Known counts
            determine progress: 0 = not started, some = started, all =
            completed. Blank counts stay unknown. Genre is imported separately.
          </p>
          <label className="checks">
            <input
              type="checkbox"
              checked={matchTitles}
              onChange={(e) => setMatchTitles(e.target.checked)}
            />
            Match unique titles across changed platform labels (for upgrading
            older exports without matching Product IDs). Preserves IDs and
            plans; ambiguous titles are blocked.
          </label>
          <label>
            Import mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="merge">
                Merge collection · preserve existing plans
              </option>
              <option value="achievements">
                Update achievement data · matching games only
              </option>
              <option value="replace">
                Replace owned collection · retain existing games and plans as
                unowned
              </option>
            </select>
          </label>
          <div className="form-grid mapping">
            {fields.map((f) => (
              <label key={f}>
                {f}
                <select
                  value={map[f] || ""}
                  onChange={(e) => setMap({ ...map, [f]: e.target.value })}
                >
                  <option value="">Not provided</option>
                  {csv.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {parsed && preview && (
            <>
              <p>
                {preview.added} new · {preview.updated} matched ·{" "}
                {parsed.errors.length +
                  csv.errors.length +
                  preview.conflicts.length}{" "}
                errors
              </p>
              {mode === "achievements" && (
                <p className="muted">
                  Unmatched rows are skipped. Match Product ID, platform and
                  edition, or title when an ID is missing.
                </p>
              )}
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Platform</th>
                      <th>Earned / total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.games.slice(0, 6).map((g, i) => (
                      <tr key={i}>
                        <td>{g.name}</td>
                        <td>{g.platform}</td>
                        <td>
                          {g.earned ?? "?"} / {g.total ?? "?"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {[...csv.errors, ...parsed.errors, ...preview.conflicts]
                .slice(0, 10)
                .map((err, i) => (
                  <p className="error" key={i}>
                    {err}
                  </p>
                ))}
              <button
                className="primary"
                disabled={
                  !map.name ||
                  !parsed.games.length ||
                  !!parsed.errors.length ||
                  !!csv.errors.length ||
                  !!preview.conflicts.length ||
                  (mode === "achievements" && (!map.earned || !map.total))
                }
                onClick={() => {
                  const next = preview.games;
                  const valid = gameSchema.array().safeParse(next);
                  if (!valid.success) {
                    setError(
                      "Import conflicts with existing achievement counts. Map both earned and total, then review: " +
                        valid.error.issues[0].message,
                    );
                    return;
                  }
                  onImport(valid.data);
                  setMessage(
                    "Import saved. Your notes, backlog lists and calendar plans have been preserved.",
                  );
                  setCsv(null);
                }}
              >
                Confirm import
              </button>
            </>
          )}
        </>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
