import { Game } from "./model";
import { genreTags, percentage, platformTags, isUnobtainable } from "./lib";
export function PlatformBadges({ game }: { game: Game }) {
  return (
    <div className="platform-badges" aria-label="Platforms">
      {platformTags(game.platform).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
export function TrackingSelect({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
  return (
    <select
      aria-label={"Tracking for " + game.name}
      value={
        game.ignored
          ? "ignored"
          : isUnobtainable(game)
            ? "unobtainable"
            : "normal"
      }
      onChange={(e) =>
        onChange({
          ...game,
          ignored: e.target.value === "ignored",
          unobtainable:
            e.target.value === "unobtainable" ||
            (e.target.value === "ignored" && isUnobtainable(game)),
          status: game.status === "unobtainable" ? "unknown" : game.status,
        })
      }
    >
      <option value="normal">Track normally</option>
      <option value="ignored">Ignored · exclude from stats</option>
      <option value="unobtainable">Unobtainable</option>
    </select>
  );
}
export function GameProgress({ game: g }: { game: Game }) {
  const known = g.earned !== null && g.total !== null && g.total > 0;
  const value = known ? percentage(g.earned!, g.total!) : null;
  return (
    <div className="card-progress">
      <div>
        <span>
          {g.earned ?? "?"} / {g.total ?? "?"} achievements
        </span>
        <strong>{value === null ? "—" : `${Number(value.toFixed(1))}%`}</strong>
      </div>
      {value !== null ? (
        <progress aria-label={`${g.name} completion`} max={100} value={value} />
      ) : (
        <small>
          {g.total === 0 ? "No available achievements" : "Completion unknown"}
        </small>
      )}
    </div>
  );
}
export function GenreBadges({ game }: { game: Game }) {
  return (
    <div className="genre-badges" aria-label="Genres">
      {genreTags(game).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
