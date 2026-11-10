import { useEffect, useMemo, useState } from "react";
import {
  Trees,
  LayoutDashboard,
  Library,
  Layers,
  CalendarDays,
  Calculator as CalcIcon,
  Users,
  Settings,
  ArrowUpRight,
  Plus,
  Upload,
  Search,
  Star,
  Menu,
  ChevronRight,
  Target,
  Trophy,
  Compass,
  Download,
  ShieldCheck,
  Pause,
  Play,
} from "lucide-react";
import {
  AppData,
  Game,
  Profile,
  backupSchema,
  newGame,
  newProfile,
  statusLabels,
  lanes,
  snapshot,
  dayKey,
} from "./model";
import { load, save, download } from "./storage";
import {
  allocate,
  identity,
  percentage,
  stats,
  achievementStatus,
  remapPlans,
  matchesStatuses,
} from "./lib";
import { GameProgress, GenreBadges } from "./GameProgress";
import VirtualLibrary from "./VirtualLibrary";
import GameEditor from "./GameEditor";
import Importer from "./Importer";
import Calculator from "./Calculator";
import Calendar from "./Calendar";
import AmbientBackground from "./AmbientBackground";
import StatusFilter from "./StatusFilter";
const navigation = [
  ["Overview", LayoutDashboard],
  ["Collection", Library],
  ["Virtual library", Trees],
  ["My backlog", Layers],
  ["Calendar", CalendarDays],
  ["Completion lab", CalcIcon],
  ["Friends", Users],
  ["Import & settings", Settings],
] as const;
function Cover({ game: g }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={"cover tone-" + (g.name.length % 5)}>
      {g.cover && /^https?:\/\//.test(g.cover) && !failed ? (
        <img
          loading="lazy"
          referrerPolicy="no-referrer"
          src={g.cover}
          onError={() => setFailed(true)}
          alt=""
        />
      ) : (
        <>
          <Trees size={42} strokeWidth={1} />
          <span>{g.name}</span>
        </>
      )}
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [page, setPage] = useState(
    () => decodeURIComponent(location.hash.slice(1)) || "Overview",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [edit, setEdit] = useState<Game | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [platform, setPlatform] = useState("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("name");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [owned, setOwned] = useState(true);
  const [limit, setLimit] = useState(48);
  const [friend, setFriend] = useState("");
  const [compare, setCompare] = useState("shared");
  const [profileName, setProfileName] = useState("");
  useEffect(() => {
    load()
      .then(setData)
      .catch((e) => setError("Could not open local storage: " + String(e)));
    const onHash = () =>
      setPage(decodeURIComponent(location.hash.slice(1)) || "Overview");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const p = data?.profiles.find((p) => p.id === data.active);
  const s = useMemo(() => stats(p?.games || []), [p]);
  const plans = useMemo(
    () => (p ? allocate(p) : { days: [], unscheduled: [] }),
    [p],
  );
  function persist(next: AppData) {
    setData(next);
    setSaved("Saving…");
    save(next)
      .then(() => setSaved("Saved on this device"))
      .catch((e) => {
        setSaved("Save failed");
        setError(
          "Local save failed. Export a backup now to protect your changes. " +
            String(e),
        );
      });
  }
  function update(next: Profile) {
    if (data)
      persist({
        ...data,
        profiles: data.profiles.map((x) =>
          x.id === next.id ? snapshot(next) : x,
        ),
      });
  }
  function navigate(next: string) {
    location.hash = encodeURIComponent(next);
    setPage(next);
  }
  function changeGame(g: Game) {
    if (!p) return;
    g = { ...g, status: achievementStatus(g) };
    update({
      ...p,
      games: p.games.some((x) => x.id === g.id)
        ? p.games.map((x) => (x.id === g.id ? g : x))
        : [...p.games, g],
    });
  }
  function moveGame(id: string, lane: Game["lane"], before?: string) {
    if (!p) return;
    const game = p.games.find((g) => g.id === id);
    if (
      lane === "Completed" &&
      game &&
      game.earned !== null &&
      achievementStatus(game) !== "completed"
    ) {
      setError(
        "This game has unfinished achievement progress. Update its counts before marking it completed.",
      );
      return;
    }
    const order = [
      ...p.order,
      ...p.games.map((g) => g.id).filter((id) => !p.order.includes(id)),
    ].filter((x) => x !== id);
    const at = before ? order.indexOf(before) : -1;
    if (at >= 0) order.splice(at, 0, id);
    else order.push(id);
    update({
      ...p,
      order,
      games: p.games.map((g) =>
        g.id === id
          ? {
              ...g,
              lane,
              status: achievementStatus({
                ...g,
                status:
                  lane === "Completed"
                    ? "completed"
                    : lane === "Currently Playing"
                      ? "started"
                      : g.status,
              }),
              completedAt:
                lane === "Completed" &&
                achievementStatus({ ...g, status: "completed" }) === "completed"
                  ? g.completedAt || dayKey()
                  : g.status === "completed"
                    ? g.completedAt
                    : "",
            }
          : g,
      ),
    });
  }
  if (!data || !p)
    return (
      <main className="loading">
        <Trees size={50} />
        <h1>Havenbound</h1>
        <p>{error || "Opening your haven…"}</p>
      </main>
    );
  const completed = p.games.filter((g) => g.status === "completed"),
    backlog = p.games.filter((g) => g.owned && g.status !== "completed");
  const month = dayKey().slice(0, 7),
    year = dayKey().slice(0, 4);
  const yearDone = completed.filter((g) =>
      g.completedAt.startsWith(year),
    ).length,
    monthDone = completed.filter((g) => g.completedAt.startsWith(month)).length;
  const sorted = p.games
    .filter(
      (g) =>
        (!owned || g.owned) &&
        g.name.toLowerCase().includes(query.toLowerCase()) &&
        matchesStatuses(g, filters) &&
        (platform === "all" || g.platform === platform) &&
        (!tag ||
          g.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))) &&
        (!onlyFavorites || g.favorite),
    )
    .sort((a, b) =>
      sort === "completion"
        ? percentage(b.earned || 0, b.total || 0) -
          percentage(a.earned || 0, a.total || 0)
        : sort === "priority"
          ? ["High", "Normal", "Low"].indexOf(a.priority) -
            ["High", "Normal", "Low"].indexOf(b.priority)
          : a.name.localeCompare(b.name),
    );
  const active = p.games.filter((g) => g.lane === "Currently Playing");
  const next = p.games
    .filter((g) => g.lane && g.status !== "completed")
    .sort((a, b) => p.order.indexOf(a.id) - p.order.indexOf(b.id));
  const friendProfile = data.profiles.find(
    (x) => x.id === friend && x.id !== p.id,
  );
  const matches = friendProfile
    ? p.games.filter((g) => {
        const other = friendProfile.games.find(
          (o) => identity(o) === identity(g),
        );
        if (!other || !g.owned || !other.owned) return false;
        return compare === "unfinished"
          ? g.status !== "completed" && other.status !== "completed"
          : compare === "coop"
            ? g.coop && other.coop
            : compare === "different"
              ? (g.status === "completed") !== (other.status === "completed")
              : compare === "goals"
                ? !!g.lane && !!other.lane
                : true;
      })
    : [];
  return (
    <div
      className={"app " + (collapsed ? "collapsed" : "")}
      data-motion={data.ambientMotion ? "on" : "off"}
    >
      <AmbientBackground motion={data.ambientMotion} />
      <aside className="sidebar">
        <a href="#Overview" className="brand">
          <span className="brand-icon">
            <Trees size={29} />
          </span>
          <span>
            HAVENBOUND<small>THE HUNTER’S COMPANION</small>
          </span>
        </a>
        <div className="profile-picker">
          <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
          <label>
            <small>YOUR HAVEN</small>
            <select
              aria-label="Active profile"
              value={p.id}
              onChange={(e) => {
                persist({ ...data, active: e.target.value });
                setEdit(null);
              }}
            >
              {data.profiles.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="nav-label">YOUR JOURNEY</p>
        <nav>
          {navigation.map(([name, Icon]) => (
            <button
              title={name}
              className={page === name ? "active" : ""}
              key={name}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "My backlog" && <small>{next.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="haven-note">
            <Trees />
            <p>
              A little less backlog.
              <br />A little more adventure.
            </p>
          </div>
          <span>
            <ShieldCheck size={14} /> Local & private
          </span>
          <small>{saved || "Your collection stays with you"}</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="inline">
            <button
              className="icon-button"
              aria-label="Toggle navigation"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Your haven <ChevronRight size={14} /> {page}
            </span>
          </div>
          <div className="inline">
            <span className="date-label">
              {new Date().toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <button onClick={() => navigate("Import & settings")}>
              <Upload size={15} /> Import collection
            </button>
            <button
              className="icon-button ambient-toggle"
              aria-label={
                data.ambientMotion
                  ? "Pause background animation"
                  : "Resume background animation"
              }
              title={
                data.ambientMotion
                  ? "Pause background animation"
                  : "Resume background animation"
              }
              onClick={() =>
                persist({ ...data, ambientMotion: !data.ambientMotion })
              }
            >
              {data.ambientMotion ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="avatar small">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "Overview"
                  ? "EVERY COMPLETION IS A NEW CHAPTER"
                  : "YOUR COLLECTION. YOUR JOURNEY."}
              </p>
              <h1>{page === "Overview" ? "Welcome to your haven." : page}</h1>
              <p className="muted">
                {page === "Overview"
                  ? "Your collection. Your journey. Your next completion."
                  : (
                      {
                        "Virtual library":
                          "Your collection on the shelves. Your next hunt within reach.",
                        Collection:
                          "Every game has a place. Find your next adventure.",
                        "My backlog":
                          "Turn the games you mean to play into a journey you love.",
                        Calendar:
                          "A little planning. More time for the games that matter.",
                        "Completion lab":
                          "Explore the impact of your next achievement.",
                        Friends:
                          "Find your common ground and plan a shared adventure.",
                        "Import & settings":
                          "A home for your data, entirely on your device.",
                      } as Record<string, string>
                    )[page]}
              </p>
            </div>
            {["Collection", "My backlog"].includes(page) && (
              <button className="primary" onClick={() => setEdit(newGame())}>
                <Plus size={17} /> Add game
              </button>
            )}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => download(data)}>
                Export current data
              </button>
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-art" aria-hidden="true">
                  <div className="moon" />
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      className="pine"
                      key={i}
                      style={{
                        left: `${i * 9 - 4}%`,
                        height: `${100 + (i % 4) * 35}px`,
                        opacity: 0.3 + (i % 3) * 0.2,
                      }}
                    />
                  ))}
                </div>
                <div className="hero-content">
                  <span className="badge">
                    <Compass size={13} /> THE PATH IS YOURS
                  </span>
                  <h2>
                    Your next great adventure
                    <br />
                    is already in your collection.
                  </h2>
                  <p>Make space for the stories you haven’t finished.</p>
                  <button
                    className="primary"
                    onClick={() =>
                      navigate(
                        p.games.length ? "My backlog" : "Import & settings",
                      )
                    }
                  >
                    {p.games.length
                      ? "Explore my backlog"
                      : "Import your first collection"}
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <span className="hero-caption">
                  LESS SCROLLING. MORE EXPLORING.
                </span>
              </section>
              <div className="metric-grid four">
                {[
                  [
                    "Games owned",
                    p.games.filter((g) => g.owned).length,
                    `${p.games.filter((g) => g.owned && g.status === "unstarted").length} not started`,
                    Library,
                  ],
                  [
                    "To be completed",
                    backlog.length,
                    "Owned, not marked completed",
                    Layers,
                  ],
                  [
                    "Completed",
                    completed.length,
                    `${monthDone} dated this month`,
                    Trophy,
                  ],
                  [
                    "Achievement completion",
                    s.total
                      ? percentage(s.earned, s.total).toFixed(data.precision) +
                        "%"
                      : "—",
                    `${s.known} games with known, included counts`,
                    Target,
                  ],
                ].map(([label, value, sub, Icon]) => {
                  const I = Icon as typeof Library;
                  return (
                    <div className="metric" key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <I size={18} />
                      </div>
                      <strong>{String(value)}</strong>
                      <small>{String(sub)}</small>
                    </div>
                  );
                })}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="section-head">
                    <h2>
                      On your path{" "}
                      <span className="count">{active.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("My backlog")}
                    >
                      View backlog <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {active.length ? (
                    <div className="featured-games">
                      {active.slice(0, 3).map((g) => (
                        <button
                          className="featured"
                          key={g.id}
                          onClick={() => setEdit(g)}
                        >
                          <Cover game={g} />
                          <h3>{g.name}</h3>
                          <p>
                            {g.platform} · {g.remaining}h estimated left
                          </p>
                          <progress
                            max="100"
                            value={percentage(g.earned || 0, g.total || 0)}
                          />
                          <small>
                            {g.total !== null && g.earned !== null
                              ? `${g.earned} / ${g.total} achievements`
                              : "Achievement progress unknown"}
                          </small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <Compass size={36} />
                      <h3>Your journey starts here</h3>
                      <p>
                        Add games to Currently Playing to keep your next
                        completion in sight.
                      </p>
                      <button onClick={() => navigate("Collection")}>
                        Browse collection →
                      </button>
                    </div>
                  )}
                </section>
                <section className="panel goal-panel">
                  <span className="eyebrow">ONE GAME AT A TIME</span>
                  <h2>Your {year} goal</h2>
                  <div
                    className="goal-ring"
                    style={{
                      background: `conic-gradient(#c7ae72 ${Math.min(100, (yearDone / Math.max(1, p.annual)) * 100)}%,#28372d 0)`,
                    }}
                  >
                    <div>
                      <strong>
                        {yearDone}
                        <span> / {p.annual}</span>
                      </strong>
                      <small>games completed</small>
                    </div>
                  </div>
                  <p>
                    {Math.max(0, p.annual - yearDone)} more stories to finish
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("My backlog")}
                  >
                    Set your own pace <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="section-head">
                    <h2>Backlog over time</h2>
                    <span className="muted">Daily local snapshots</span>
                  </div>
                  {p.history.length > 1 ? (
                    <>
                      <div className="history-chart">
                        {p.history.slice(-30).map((h) => (
                          <div
                            key={h.date}
                            title={`${h.date}: ${h.backlog} unfinished`}
                          >
                            <span
                              style={{
                                height: `${Math.max(2, (h.backlog / Math.max(1, ...p.history.map((x) => x.backlog))) * 110)}px`,
                              }}
                            />
                            <small>{h.date.slice(5)}</small>
                          </div>
                        ))}
                      </div>
                      <p className="muted">
                        {p.history[0].backlog - backlog.length} fewer unfinished
                        owned games since {p.history[0].date}. Imports and
                        ownership changes also affect this measure.
                      </p>
                    </>
                  ) : (
                    <div className="empty compact">
                      <p>
                        Your history will grow as you use Havenbound.
                        <br />A chart appears after two days of collection
                        changes.
                      </p>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <h2>Coming over the horizon</h2>
                  {p.schedule.length ? (
                    p.schedule.slice(0, 5).map((plan) => {
                      const g = p.games.find((g) => g.id === plan.gameId);
                      if (!g) return null;
                      return (
                        <div className="list-row" key={g.id}>
                          <span>
                            {g.name}
                            <small>Estimated completion</small>
                          </span>
                          <span className="gold">
                            {plans.days.filter((d) => d.gameId === g.id).at(-1)
                              ?.date || "Not allocated"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty compact">
                      <CalendarDays />
                      <p>
                        A date on the calendar.
                        <br />
                        An adventure to look forward to.
                      </p>
                      <button onClick={() => navigate("Calendar")}>
                        Plan a game →
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {page === "Virtual library" && (
            <VirtualLibrary
              key={p.id}
              games={p.games}
              onEdit={setEdit}
              onPlan={(id) => moveGame(id, "Want to Play")}
            />
          )}
          {page === "Collection" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Search collection"
                    placeholder="Find a game in your collection…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(48);
                    }}
                  />
                </label>
                <StatusFilter
                  selected={filters}
                  onChange={(value) => {
                    setFilters(value);
                    setLimit(48);
                  }}
                />
                <select
                  aria-label="Filter platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="all">All platforms</option>
                  {[...new Set(p.games.map((g) => g.platform))]
                    .sort()
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
                <select
                  aria-label="Sort games"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="name">Title A–Z</option>
                  <option value="completion">Achievement completion</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
              <div className="filters">
                <label>
                  <input
                    type="checkbox"
                    checked={owned}
                    onChange={(e) => setOwned(e.target.checked)}
                  />{" "}
                  Owned only
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={onlyFavorites}
                    onChange={(e) => setOnlyFavorites(e.target.checked)}
                  />{" "}
                  Favourites
                </label>
                <input
                  aria-label="Filter tags"
                  placeholder="Filter by tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
                <small>{sorted.length.toLocaleString()} games</small>
              </div>
              {!sorted.length ? (
                <section className="panel empty">
                  <Library size={40} />
                  <h2>
                    {p.games.length
                      ? "No games match these filters"
                      : "Your collection belongs here"}
                  </h2>
                  <p>Import an XCT export or add a game to begin.</p>
                  <button
                    className="primary"
                    onClick={() => navigate("Import & settings")}
                  >
                    Import collection
                  </button>
                </section>
              ) : (
                <div className="game-grid">
                  {sorted.slice(0, limit).map((g) => (
                    <article className="game-card" key={g.id}>
                      <button
                        className="cover-button"
                        aria-label={"Open details for " + g.name}
                        onClick={() => setEdit(g)}
                      >
                        <Cover game={g} />
                      </button>
                      <div className="game-info">
                        <div className="section-head">
                          <span className="status">
                            {statusLabels[g.status]}
                          </span>
                          <button
                            className={"star " + (g.favorite ? "selected" : "")}
                            aria-label={
                              (g.favorite ? "Unfavourite " : "Favourite ") +
                              g.name
                            }
                            onClick={() =>
                              changeGame({ ...g, favorite: !g.favorite })
                            }
                          >
                            <Star size={16} />
                          </button>
                        </div>
                        <button
                          className="game-title"
                          onClick={() => setEdit(g)}
                        >
                          {g.name}
                        </button>
                        <small>
                          {g.platform} · {g.edition}
                        </small>
                        <div className="game-meta">
                          <span>{g.priority}</span>
                        </div>
                        <GameProgress game={g} />
                        <GenreBadges game={g} />
                        <div className="card-actions">
                          <select
                            aria-label={"Backlog list for " + g.name}
                            value={g.lane || ""}
                            onChange={(e) =>
                              moveGame(
                                g.id,
                                (e.target.value || null) as Game["lane"],
                              )
                            }
                          >
                            <option value="">Add to a plan…</option>
                            {lanes.map((l) => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                          <small className="source">
                            {g.source === "csv"
                              ? "Imported collection data"
                              : "Manually entered"}
                            {g.included ? " · Included in stats" : ""}
                          </small>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {sorted.length > limit && (
                <button
                  className="load-more"
                  onClick={() => setLimit(limit + 48)}
                >
                  Show more games ({sorted.length - limit} remaining)
                </button>
              )}
            </>
          )}
          {page === "My backlog" && (
            <>
              <section className="panel goals">
                <div>
                  <h2>A goal worth coming back to</h2>
                  <p className="muted">
                    Count completions by recorded completion date.
                  </p>
                </div>
                {(["annual", "monthly", "reduction"] as const).map((k) => (
                  <label key={k}>
                    {
                      {
                        annual: "Annual completions",
                        monthly: "Monthly completions",
                        reduction: "Backlog reduction target",
                      }[k]
                    }
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      value={p[k]}
                      onChange={(e) =>
                        update({
                          ...p,
                          [k]: Math.floor(
                            Math.max(
                              0,
                              Math.min(10000000, Number(e.target.value)),
                            ),
                          ),
                        })
                      }
                    />
                    <small>
                      {k === "annual"
                        ? yearDone
                        : k === "monthly"
                          ? monthDone
                          : Math.max(
                              0,
                              (p.history[0]?.backlog || backlog.length) -
                                backlog.length,
                            )}{" "}
                      / {p[k]}
                    </small>
                  </label>
                ))}
              </section>
              <p className="muted">
                Drag cards between lists or onto another card to reorder. Use
                the list selector and arrows for keyboard or touch controls.
              </p>
              <div className="board">
                {lanes.map((lane) => (
                  <section
                    className="lane"
                    key={lane}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveGame(e.dataTransfer.getData("text/plain"), lane);
                    }}
                  >
                    <h2>
                      <span className="lane-dot" />
                      {lane}
                      <small>
                        {p.games.filter((g) => g.lane === lane).length}
                      </small>
                    </h2>
                    {p.games
                      .filter((g) => g.lane === lane)
                      .sort(
                        (a, b) => p.order.indexOf(a.id) - p.order.indexOf(b.id),
                      )
                      .map((g, i, arr) => (
                        <article
                          className="backlog-card"
                          key={g.id}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("text/plain", g.id)
                          }
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveGame(
                              e.dataTransfer.getData("text/plain"),
                              lane,
                              g.id,
                            );
                          }}
                        >
                          <span
                            className={"priority " + g.priority.toLowerCase()}
                          >
                            {g.priority} priority
                          </span>
                          <button
                            className="game-title"
                            onClick={() => setEdit(g)}
                          >
                            {g.name}
                          </button>
                          <small>{g.remaining}h estimated remaining</small>
                          {g.notes && <p>{g.notes}</p>}
                          <select
                            aria-label={"Move " + g.name}
                            value={lane}
                            onChange={(e) =>
                              moveGame(g.id, e.target.value as Game["lane"])
                            }
                          >
                            {lanes.map((l) => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                          <div className="inline">
                            <button
                              disabled={i === 0}
                              aria-label={"Move " + g.name + " up"}
                              onClick={() =>
                                moveGame(g.id, lane, arr[i - 1].id)
                              }
                            >
                              ↑
                            </button>
                            <button
                              disabled={i === arr.length - 1}
                              aria-label={"Move " + g.name + " down"}
                              onClick={() =>
                                moveGame(arr[i + 1].id, lane, g.id)
                              }
                            >
                              ↓
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setEdit(g)}
                            >
                              Edit notes
                            </button>
                            <button
                              aria-label={"Remove " + g.name + " from backlog"}
                              onClick={() => moveGame(g.id, null)}
                            >
                              ×
                            </button>
                          </div>
                        </article>
                      ))}
                    {!p.games.some((g) => g.lane === lane) && (
                      <div className="lane-empty">
                        Room for your next adventure
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "Calendar" && <Calendar profile={p} update={update} />}
          {page === "Completion lab" && (
            <Calculator games={p.games} precision={data.precision} />
          )}
          {page === "Friends" && (
            <section className="panel">
              <h2>Better adventures, together</h2>
              <p className="muted">
                Create a separate profile and import a friend’s export to
                compare locally. Co-op suggestions require the co-op flag to be
                verified manually in both profiles.
              </p>
              <div className="inline">
                <select
                  aria-label="Friend profile"
                  value={friend}
                  onChange={(e) => setFriend(e.target.value)}
                >
                  <option value="">Choose another profile</option>
                  {data.profiles
                    .filter((x) => x.id !== p.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Comparison type"
                  value={compare}
                  onChange={(e) => setCompare(e.target.value)}
                >
                  <option value="shared">Both own</option>
                  <option value="unfinished">Both unfinished</option>
                  <option value="coop">Verified potential co-op</option>
                  <option value="different">Only one completed</option>
                  <option value="goals">Both have planned</option>
                </select>
              </div>
              {friendProfile ? (
                <>
                  <p className="gold">{matches.length} matching games</p>
                  {matches.slice(0, 200).map((g) => (
                    <div className="list-row" key={g.id}>
                      <span>
                        {g.name}
                        <small>
                          {g.platform} · {g.edition}
                        </small>
                      </span>
                      <span>
                        {statusLabels[g.status]} /{" "}
                        {
                          statusLabels[
                            friendProfile.games.find(
                              (o) => identity(o) === identity(g),
                            )?.status || "unknown"
                          ]
                        }
                      </span>
                    </div>
                  ))}
                  {matches.length > 200 && (
                    <p>Showing the first 200 matches.</p>
                  )}
                </>
              ) : (
                <div className="empty">
                  <Users size={36} />
                  <h3>Find your common ground</h3>
                  <p>
                    Each profile keeps its own collection, goals and schedule.
                  </p>
                  <button onClick={() => navigate("Import & settings")}>
                    Manage profiles
                  </button>
                </div>
              )}
            </section>
          )}
          {page === "Import & settings" && (
            <>
              <Importer
                games={p.games}
                onImport={(games, aliases) =>
                  update(remapPlans(p, games, aliases))
                }
              />
              <section className="panel">
                <h2>Your havens</h2>
                <p className="muted">
                  Each profile is separate. Import a friend’s collection into a
                  new profile.
                </p>
                <form
                  className="inline"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!profileName.trim()) return;
                    const profile = newProfile(profileName.trim());
                    persist({
                      ...data,
                      active: profile.id,
                      profiles: [...data.profiles, profile],
                    });
                    setProfileName("");
                  }}
                >
                  <input
                    aria-label="New profile name"
                    placeholder="Profile or gamertag"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                  <button className="primary">
                    <Plus size={16} /> Create profile
                  </button>
                </form>
                <label>
                  Current profile name
                  <input
                    value={p.name}
                    onChange={(e) => {
                      if (e.target.value.trim())
                        update({ ...p, name: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Percentage decimal places
                  <select
                    value={data.precision}
                    onChange={(e) =>
                      persist({ ...data, precision: Number(e.target.value) })
                    }
                  >
                    {[1, 2, 3, 4].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </section>
              <section className="panel">
                <h2>Keep your journey safe</h2>
                <p className="muted">
                  Data lives in this browser’s IndexedDB, not your GitHub
                  repository. Clearing browser data removes it. Back up
                  regularly; backups include all profiles.
                </p>
                <div className="inline">
                  <button onClick={() => download(data)}>
                    <Download size={16} /> Export JSON backup
                  </button>
                  <label className="file-button">
                    Restore JSON backup
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={async (e) => {
                        try {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 50 * 1024 * 1024)
                            throw Error("Backup exceeds 50 MB.");
                          const restored = backupSchema.parse(
                            JSON.parse(await file.text()),
                          );
                          if (
                            confirm(
                              "Replace all local profiles with this backup? Export your current data first if needed.",
                            )
                          )
                            persist(restored);
                        } catch (err) {
                          setError("Backup was not restored: " + String(err));
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="muted">
                  External cover URLs are optional and fetched directly by your
                  browser; collection files are never uploaded.
                </p>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Mark every game in this profile as unowned? Notes, achievements, backlog lists and calendar plans will be retained.",
                      )
                    )
                      update({
                        ...p,
                        games: p.games.map((g) => ({ ...g, owned: false })),
                      });
                  }}
                >
                  Clear owned collection
                </button>
              </section>
              <section className="panel">
                <h2>Built for the journey ahead</h2>
                <p className="muted">
                  XCT, Microsoft sign-in and Hunter’s Ledger / Discord adapters
                  have extension interfaces. These integrations are not
                  connected in this local release. Havenbound complements XCT
                  and TrueAchievements.
                </p>
              </section>
            </>
          )}
          {!navigation.some(([name]) => name === page) && (
            <section className="panel">
              <h2>That path is not here</h2>
              <button onClick={() => navigate("Overview")}>
                Return to overview
              </button>
            </section>
          )}
          <footer>
            <Trees size={16} /> HAVENBOUND{" "}
            <span>A quieter way to conquer your backlog.</span>
          </footer>
        </main>
      </div>
      {edit && (
        <GameEditor
          key={edit.id}
          game={edit}
          onClose={() => setEdit(null)}
          onSave={(g) => {
            const collision = p.games.find(
              (x) => x.id !== g.id && identity(x) === identity(g),
            );
            if (collision) {
              setError(
                "That game and platform edition already exists. Edit the existing game instead.",
              );
              return;
            }
            changeGame(g);
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
