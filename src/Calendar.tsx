import { useMemo, useState } from "react";
import { Profile, dayKey } from "./model";
import { allocate } from "./lib";
export default function Calendar({
  profile: p,
  update,
}: {
  profile: Profile;
  update: (p: Profile) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [game, setGame] = useState("");
  const [date, setDate] = useState(dayKey());
  const result = useMemo(() => allocate(p), [p]);
  function schedule(id: string, start: string) {
    if (!p.games.some((g) => g.id === id) || !start) return;
    update({
      ...p,
      schedule: [
        ...p.schedule.filter((s) => s.gameId !== id),
        { gameId: id, start },
      ],
    });
  }
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  return (
    <>
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Make room for your next adventure</h2>
            <p className="muted">
              Drag a planned game onto a date, or use the accessible controls
              below.
            </p>
          </div>
          <div className="inline">
            {(["weekday", "weekend"] as const).map((k) => (
              <label key={k}>
                {k} hours / day
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  value={p[k]}
                  onChange={(e) =>
                    update({
                      ...p,
                      [k]: Math.min(24, Math.max(0, Number(e.target.value))),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <div className="inline">
          <select
            aria-label="Game to schedule"
            value={game}
            onChange={(e) => setGame(e.target.value)}
          >
            <option value="">Select game</option>
            {p.games
              .filter((g) => g.status !== "completed")
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.remaining}h remaining
                </option>
              ))}
          </select>
          <input
            aria-label="Planned start date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="primary"
            disabled={!game || !date}
            onClick={() => schedule(game, date)}
          >
            Schedule game
          </button>
        </div>
        <div className="chips">
          {p.games
            .filter((g) => g.lane && g.status !== "completed")
            .map((g) => (
              <span
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", g.id)}
                className="chip"
                key={g.id}
              >
                {g.name} · {g.remaining}h
              </span>
            ))}
        </div>
      </section>
      <section className="panel calendar-panel">
        <div className="section-head">
          <h2>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="inline">
            <button
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              ←
            </button>
            <button
              onClick={() =>
                setMonth(
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                )
              }
            >
              Today
            </button>
            <button
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              →
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="day empty-day" key={"empty" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const key = dayKey(
              new Date(month.getFullYear(), month.getMonth(), i + 1),
            );
            return (
              <div
                className={"day " + (key === dayKey() ? "today" : "")}
                key={key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  schedule(e.dataTransfer.getData("text/plain"), key);
                }}
              >
                <span>{i + 1}</span>
                {result.days
                  .filter((d) => d.date === key)
                  .map((d) => (
                    <div
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", d.gameId)
                      }
                      className="allocation"
                      key={d.gameId}
                    >
                      {p.games.find((g) => g.id === d.gameId)?.name}
                      <b>{d.hours}h</b>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h2>Planned journeys</h2>
        <p className="muted">
          Games share daily capacity in the order listed. Moving a game puts it
          last in the queue. Edit remaining hours in game details to adjust the
          allocation. Dates are estimates.
        </p>
        {p.schedule.map((s) => {
          const g = p.games.find((g) => g.id === s.gameId);
          if (!g) return null;
          const allocations = result.days.filter((d) => d.gameId === s.gameId);
          return (
            <div className="list-row" key={s.gameId}>
              <span>
                {g.name}
                <small>
                  {" "}
                  {g.remaining}h remaining · {s.start} →{" "}
                  {allocations.at(-1)?.date || "No hours allocated"}
                </small>
              </span>
              <button
                onClick={() =>
                  update({
                    ...p,
                    schedule: p.schedule.filter((x) => x.gameId !== s.gameId),
                  })
                }
              >
                Remove plan
              </button>
            </div>
          );
        })}
        {result.unscheduled.length > 0 && (
          <p role="alert" className="error">
            Some hours could not fit within ten years. Increase availability or
            reduce remaining hours.
          </p>
        )}
      </section>
    </>
  );
}
