import { Game } from "./model";
import { genreTags, percentage } from "./lib";
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
