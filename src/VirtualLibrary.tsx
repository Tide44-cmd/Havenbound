import { useMemo, useState } from "react";
import { Trees, Shuffle, Compass } from "lucide-react";
import { Game } from "./model";
import {
  alphabet,
  huntCandidates,
  randomGames,
  unfinished,
  genreTags,
} from "./lib";
import { GameProgress, GenreBadges } from "./GameProgress";
const modes = [
  "Shelves",
  "A–Z challenge",
  "My next 10",
  "Give me a hunt",
] as const;
export default function VirtualLibrary({
  games,
  onEdit,
  onPlan,
}: {
  games: Game[];
  onEdit: (g: Game) => void;
  onPlan: (id: string) => void;
}) {
  const [mode, setMode] = useState<(typeof modes)[number]>("Shelves");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [progress, setProgress] = useState("all");
  const [letter, setLetter] = useState("A");
  const [picks, setPicks] = useState<string[]>([]);
  const [rolled, setRolled] = useState(false);
  const [limit, setLimit] = useState(48);
  const owned = useMemo(() => games.filter((g) => g.owned), [games]);
  const genres = useMemo(
    () => [...new Set(owned.flatMap(genreTags))].sort(),
    [owned],
  );
  const filtered = owned.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) &&
      (!genre || genreTags(g).includes(genre)) &&
      (progress === "all" ||
        (progress === "next"
          ? g.lane === "Want to Play" && g.status === "unstarted"
          : g.status === progress)),
  );
  const candidates =
    mode === "Give me a hunt"
      ? huntCandidates(filtered)
      : filtered.filter(unfinished);
  const display = (
    mode === "Shelves"
      ? filtered
      : mode === "A–Z challenge"
        ? filtered.filter((g) => unfinished(g) && alphabet(g) === letter)
        : picks
            .map((id) => candidates.find((g) => g.id === id))
            .filter((g): g is Game => !!g)
  ).sort((a, b) =>
    mode === "Shelves"
      ? a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name)
      : mode === "A–Z challenge"
        ? a.name.localeCompare(b.name)
        : 0,
  );
  const groups = new Map<string, Game[]>();
  display.slice(0, limit).forEach((g) => {
    const key =
      mode === "Shelves"
        ? genre || genreTags(g)[0] || "Uncategorised"
        : mode === "A–Z challenge"
          ? `${letter} · unfinished adventures`
          : "Your next adventures";
    groups.set(key, [...(groups.get(key) || []), g]);
  });
  return (
    <>
      <section className="panel library-controls">
        <div className="inline">
          {modes.map((m) => (
            <button
              aria-pressed={mode === m}
              className={mode === m ? "primary" : ""}
              key={m}
              onClick={() => {
                setMode(m);
                setPicks([]);
                setRolled(false);
                setLimit(48);
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="muted">
          Your virtual library: browse by genre, open a game to edit it, or put
          it on your Want to Play list. Cover artwork appears when you provide
          an image URL.
        </p>
        <div className="toolbar">
          <input
            aria-label="Search virtual library"
            placeholder="Search your shelves…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(48);
            }}
          />
          <select
            aria-label="Library genre"
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setLimit(48);
            }}
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            aria-label="Library progress"
            value={progress}
            onChange={(e) => {
              setProgress(e.target.value);
              setLimit(48);
            }}
          >
            <option value="all">All progress</option>
            <option value="unstarted">Not started</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="unknown">Unknown</option>
            <option value="next">Want to Play · not started</option>
          </select>
          <span className="muted">
            {display.length.toLocaleString()} games shown by these filters
          </span>
        </div>
      </section>
      {mode === "A–Z challenge" && (
        <section className="panel">
          <h2>An adventure for every letter</h2>
          <p className="muted">
            Owned, started and not-started games. Titles use their first letter,
            including “The”; numbers and symbols appear under #. Unknown
            progress is excluded.
          </p>
          <div className="alphabet">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map((l) => {
              const count = filtered.filter(
                (g) => unfinished(g) && alphabet(g) === l,
              ).length;
              return (
                <button
                  key={l}
                  aria-label={`Letter ${l}: ${count} games`}
                  aria-pressed={letter === l}
                  className={letter === l ? "primary" : ""}
                  onClick={() => {
                    setLetter(l);
                    setLimit(48);
                  }}
                >
                  {l}
                  <small>{count}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {(mode === "My next 10" || mode === "Give me a hunt") && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>
                {mode === "My next 10"
                  ? "Ten possibilities. One next adventure."
                  : "A new hunt awaits."}
              </h2>
              <p className="muted">
                {mode === "My next 10"
                  ? "Pick up to ten unique, random unfinished games."
                  : "Pick one not-started or Want to Play game. Completed, abandoned and unobtainable games are excluded."}{" "}
                Your search and genre filters apply. {candidates.length}{" "}
                eligible games.
              </p>
            </div>
            <button
              className="primary"
              disabled={!candidates.length}
              onClick={() => {
                setPicks(
                  randomGames(candidates, mode === "My next 10" ? 10 : 1).map(
                    (g) => g.id,
                  ),
                );
                setRolled(true);
              }}
            >
              <Shuffle size={16} />
              {rolled
                ? "Pick again"
                : mode === "My next 10"
                  ? "Pick my next 10"
                  : "Give me a hunt"}
            </button>
          </div>
        </section>
      )}
      {[...groups].map(([name, list]) => (
        <section className="library-shelf" key={name}>
          <h2>{name}</h2>
          <div className="library-books">
            {list.map((g) => (
              <article className="library-book" key={g.id}>
                <button
                  className="cover-button"
                  aria-label={`Open ${g.name}`}
                  onClick={() => onEdit(g)}
                >
                  <LibraryCover game={g} />
                </button>
                <div className="game-info">
                  <button className="game-title" onClick={() => onEdit(g)}>
                    {g.name}
                  </button>
                  <small>{g.platform}</small>
                  <p className="library-progress">
                    <span>
                      {g.status === "unstarted" ? "Not started" : g.status}
                    </span>
                  </p>
                  <GameProgress game={g} />
                  <GenreBadges game={g} />
                  <button
                    disabled={
                      g.lane === "Want to Play" || g.status === "completed"
                    }
                    onClick={() => onPlan(g.id)}
                  >
                    {g.status === "completed"
                      ? "Completed"
                      : g.lane === "Want to Play"
                        ? "On your Want to Play list"
                        : "Want to Play next"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {!display.length && (
        <section className="panel empty">
          <Compass size={36} />
          <h2>
            {mode === "Shelves"
              ? "Your shelves are waiting"
              : mode === "A–Z challenge"
                ? "No matching games for this letter"
                : rolled
                  ? "No eligible picks remain"
                  : "Ready when you are"}
          </h2>
          <p>
            {mode === "Shelves"
              ? "Import a collection to fill your library."
              : mode === "A–Z challenge"
                ? "Choose another letter or broaden your filters."
                : "Use the picker above. Picks stay temporary until you add them to Want to Play."}
          </p>
        </section>
      )}
      {display.length > limit && (
        <button className="load-more" onClick={() => setLimit(limit + 48)}>
          Show more ({display.length - limit} remaining)
        </button>
      )}
    </>
  );
}
function LibraryCover({ game: g }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`cover tone-${g.name.length % 5}`}>
      {g.cover && /^https?:\/\//.test(g.cover) && !failed ? (
        <img
          src={g.cover}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Trees size={36} />
          <span>{g.name}</span>
        </>
      )}
    </div>
  );
}
