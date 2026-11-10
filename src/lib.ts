import Papa from "papaparse";
import {
  Game,
  Profile,
  newGame,
  dayKey,
  statuses,
  CompletionOptions,
  defaultCompletionOptions,
  statusLabels,
} from "./model";
import { platformTags } from "./platforms";
export { platformTags } from "./platforms";
export const isUnobtainable = (g: Game) =>
  g.unobtainable || g.status === "unobtainable";
export const isWantToPlay = (g: Game) =>
  g.lane === "Want to Play" &&
  (g.earned === 0 ||
    (g.earned === null && ["unstarted", "unknown"].includes(g.status)));
export function collectionStatus(g: Game) {
  if (g.ignored) return "Ignored";
  if (isWantToPlay(g)) return "Want to play";
  const state = achievementStatus(g);
  return state === "incomplete" ? "In progress" : statusLabels[state];
}
export function completionRule(
  g: Game,
  options: CompletionOptions = defaultCompletionOptions,
): { included: boolean; reason: string; missing?: boolean } {
  if (g.ignored) return { included: false, reason: "Excluded · ignored" };
  if (isUnobtainable(g) && options.excludeUnobtainable)
    return { included: false, reason: "Excluded · unobtainable" };
  if (isWantToPlay(g) && !options.includeWantToPlay)
    return { included: false, reason: "Excluded · Want to play toggle is off" };
  if (!isWantToPlay(g) && achievementStatus(g) === "unstarted")
    return { included: false, reason: "Excluded · not started" };
  if (g.earned === null || g.total === null)
    return {
      included: false,
      reason: "Excluded · achievement counts unknown",
      missing: true,
    };
  if (g.total === 0)
    return { included: false, reason: "Excluded · no available achievements" };
  return {
    included: true,
    reason: isWantToPlay(g)
      ? "Included · Want to play toggle is on"
      : "Included in completion stats",
  };
}
export function percentage(earned: number, total: number) {
  return total === 0 ? 0 : (earned / total) * 100;
}
export function matchesStatuses(game: Game, selected: string[]) {
  if (!selected.length) return true;
  const progress = achievementStatus(game);
  return selected.some((status) => {
    if (status === "ignored") return game.ignored;
    if (game.ignored) return false;
    if (status === "unobtainable") return isUnobtainable(game);
    if (status === "next") return isWantToPlay(game);
    if (status === "unstarted")
      return progress === "unstarted" && !isWantToPlay(game);
    if (status === "started" || status === "incomplete")
      return ["started", "incomplete"].includes(progress);
    return progress === status;
  });
}
export function required(earned: number, total: number, target: number) {
  if (!total) return null;
  const scale = 1000000n;
  const t = BigInt(Math.round(target * Number(scale)));
  const denominator = 100n * scale;
  const needed =
    (BigInt(total) * t + denominator - 1n) / denominator - BigInt(earned);
  return Math.max(0, Number(needed));
}
export function stats(
  games: Game[],
  options: CompletionOptions = defaultCompletionOptions,
) {
  const counted = games.filter((g) => completionRule(g, options).included);
  return {
    earned: counted.reduce((s, g) => s + g.earned!, 0),
    total: counted.reduce((s, g) => s + g.total!, 0),
    known: counted.length,
    missing: games.filter((g) => completionRule(g, options).missing).length,
  };
}
export type Allocation = { date: string; gameId: string; hours: number };
export function allocate(p: Profile): {
  days: Allocation[];
  unscheduled: string[];
} {
  const days: Allocation[] = [];
  const unscheduled: string[] = [];
  const used = new Map<string, number>();
  for (const item of p.schedule) {
    const game = p.games.find((g) => g.id === item.gameId);
    if (!game || game.status === "completed") continue;
    let left = Math.round(game.remaining * 100);
    const date = new Date(item.start + "T12:00:00");
    for (let i = 0; left > 0 && i < 3660; i++) {
      const key = dayKey(date);
      const cap = Math.round(
        ([0, 6].includes(date.getDay()) ? p.weekend : p.weekday) * 100,
      );
      const available = Math.max(0, cap - (used.get(key) || 0));
      const h = Math.min(left, available);
      if (h) {
        days.push({ date: key, gameId: game.id, hours: h / 100 });
        used.set(key, (used.get(key) || 0) + h);
        left -= h;
      }
      date.setDate(date.getDate() + 1);
    }
    if (left > 0) unscheduled.push(game.id);
  }
  return { days, unscheduled };
}
export function parseCsv(text: string) {
  const result = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    },
  );
  return {
    headers: result.meta.fields || [],
    rows: result.data,
    errors: result.errors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`),
  };
}
export const fields = [
  "name",
  "productId",
  "platform",
  "edition",
  "genre",
  "xctGenre",
  "status",
  "earned",
  "total",
  "totalFallback",
  "owned",
  "included",
  "coop",
  "cover",
] as const;
export type Mapping = Partial<Record<(typeof fields)[number], string>>;
const aliases: Record<string, string[]> = {
  name: ["name", "title", "gamename", "gametitle", "producttitle"],
  productId: ["productid", "xboxproductid", "id"],
  platform: ["platform", "platforms"],
  edition: ["edition", "stack"],
  genre: ["genre"],
  xctGenre: ["xctgenre"],
  totalFallback: ["achv"],
  status: ["status", "completionstatus"],
  earned: ["earned", "achievementsearned", "unlockedachievements"],
  total: [
    "total",
    "totalachievements",
    "achievementstotal",
    "achievementsavailable",
  ],
  owned: ["owned"],
  included: ["included", "includeinstats"],
  coop: ["coop", "cooperative"],
  cover: ["cover", "coverurl", "imageurl"],
};
export function guessMapping(headers: string[]): Mapping {
  const normalized = headers.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const xct = normalized.includes("gamertag") && normalized.includes("source");
  const hasAchievementData = normalized.some(
    (h) => aliases.earned.includes(h) || aliases.totalFallback.includes(h),
  );
  return Object.fromEntries(
    fields.map((f) => [
      f,
      (xct || hasAchievementData) && f === "status"
        ? ""
        : headers.find((h) =>
            aliases[f].includes(h.toLowerCase().replace(/[^a-z0-9]/g, "")),
          ) || "",
    ]),
  );
}
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const cleanTitle = (title: string) =>
  title.replace(/\s*Gifted\s*$/i, "").trim();
export function genreTags(g: Pick<Game, "genre" | "xctGenre">) {
  const tags = [g.genre, g.xctGenre]
    .flatMap((s) => (s || "").split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Map(tags.map((t) => [t.toLowerCase(), t])).values()];
}
const platformKey = (platform: string) =>
  [
    ...new Set(
      platformTags(platform)
        .map(normalize)
        .filter(
          (p) => !["xbox cloud gaming", "xbox play anywhere"].includes(p),
        ),
    ),
  ]
    .sort()
    .join(",");
export function identity(g: Game) {
  return `${normalize(g.productId) || normalize(cleanTitle(g.name))}|${platformKey(g.platform)}|${normalize(g.edition)}`;
}
export function importRows(rows: Record<string, string>[], map: Mapping) {
  const games: Game[] = [];
  const errors: string[] = [];
  for (const [i, row] of rows.entries()) {
    const val = (key: (typeof fields)[number]) =>
      (row[map[key] || ""] || "").trim();
    if (!cleanTitle(val("name"))) {
      errors.push(`Row ${i + 2}: game name is required`);
      continue;
    }
    const g = newGame(cleanTitle(val("name")));
    g.source = "csv";
    g.status = "unknown";
    for (const key of [
      "productId",
      "platform",
      "edition",
      "cover",
      "genre",
      "xctGenre",
    ] as const)
      if (val(key)) g[key] = val(key);
    g.platform = platformTags(g.platform).join(", ");
    const state = val("status").toLowerCase();
    let bad = false;
    for (const key of ["earned", "total"] as const) {
      const raw = val(key) || (key === "total" ? val("totalFallback") : "");
      if (raw) {
        const n = Number(raw);
        if (!Number.isSafeInteger(n) || n < 0 || n > 10000000) {
          errors.push(`Row ${i + 2}: ${key} must be a non-negative integer`);
          bad = true;
        } else g[key] = n;
      }
    }
    const inferredZero =
      !!map.totalFallback && !val("earned") && g.total !== null;
    if (inferredZero) g.earned = 0;
    // Counts are authoritative; purchase-status text must never override them.
    if (g.earned === null && state) {
      if (!statuses.includes(state as Game["status"])) {
        errors.push(`Row ${i + 2}: unknown status "${state}"`);
        bad = true;
      } else g.status = state as Game["status"];
    }
    for (const key of ["owned", "included", "coop"] as const) {
      if (val(key)) {
        if (!/^(true|false|yes|no|1|0)$/i.test(val(key))) {
          errors.push(`Row ${i + 2}: ${key} must be true/false`);
          bad = true;
        } else g[key] = /^(true|yes|1)$/i.test(val(key));
      }
    }
    if (g.earned !== null && g.total !== null && g.earned > g.total) {
      errors.push(`Row ${i + 2}: earned exceeds total`);
      bad = true;
    }
    if (!map.included && g.total !== null && g.earned !== null && !inferredZero)
      g.included = true;
    g.status = achievementStatus(g);
    if (!bad) games.push(g);
  }
  return { games, errors };
}
export function mergeGames(
  existing: Game[],
  incoming: Game[],
  map: Mapping,
  achievementsOnly = false,
  matchUniqueTitles = false,
  resolutions: Record<string, string> = {},
) {
  const old = deduplicate(existing, resolutions, "existing:"),
    fresh = deduplicate(incoming, resolutions, "incoming:");
  const result = old.games;
  incoming = fresh.games;
  const byIdentity = new Map(result.map((g, i) => [identity(g), i]));
  const titleKey = (g: Game) => identity({ ...g, productId: "" });
  const byTitle = new Map<string, number[]>();
  const looseKey = (g: Game) =>
    `${normalize(cleanTitle(g.name))}|${normalize(g.edition)}`;
  const loose = new Map<string, number[]>();
  result.forEach((g, i) =>
    loose.set(looseKey(g), [...(loose.get(looseKey(g)) || []), i]),
  );
  const incomingNames = new Map<string, number>();
  incoming.forEach((g) =>
    incomingNames.set(looseKey(g), (incomingNames.get(looseKey(g)) || 0) + 1),
  );
  const conflicts: string[] = [...old.conflicts, ...fresh.conflicts];
  result.forEach((g, i) =>
    byTitle.set(titleKey(g), [...(byTitle.get(titleKey(g)) || []), i]),
  );
  let added = 0,
    updated = 0;
  for (const game of incoming) {
    let index = byIdentity.get(identity(game)) ?? -1;
    if (index < 0)
      index =
        (byTitle.get(titleKey(game)) || []).find(
          (i) => !result[i].productId || !game.productId,
        ) ?? -1;
    if (index < 0 && matchUniqueTitles) {
      const candidates = loose.get(looseKey(game)) || [];
      if (candidates.length) {
        if (
          candidates.length === 1 &&
          incomingNames.get(looseKey(game)) === 1 &&
          (!game.productId || !result[candidates[0]].productId)
        )
          index = candidates[0];
        else {
          conflicts.push(
            `Ambiguous title: ${game.name}. Map platform/edition explicitly.`,
          );
          continue;
        }
      }
    }
    if (index >= 0) {
      const prev = result[index];
      const next = { ...prev };
      next.unobtainable = isUnobtainable(prev);
      // A collection row establishes ownership even when the export has no
      // Owned column. Achievement-only updates must not change ownership.
      if (!achievementsOnly) next.owned = game.owned;
      for (const key of fields) {
        if (
          key === "name" ||
          key === "totalFallback" ||
          (achievementsOnly && !["earned", "total", "included"].includes(key))
        )
          continue;
        if (
          (map[key] ||
            (key === "total" && map.totalFallback) ||
            (key === "earned" && map.totalFallback)) &&
          (key !== "productId" || !!game.productId) &&
          (!(key === "earned" || key === "total") || game[key] !== null)
        )
          Object.assign(next, { [key]: game[key] });
      }
      if (
        !map.included &&
        (game.included || !map.totalFallback || !!game.earned) &&
        game.total !== null &&
        game.earned !== null
      )
        next.included = true;
      next.status = achievementStatus(next);
      if (next.status !== "completed") next.completedAt = "";
      result[index] = next;
      byIdentity.delete(identity(prev));
      byIdentity.set(identity(next), index);
      updated++;
    } else if (!achievementsOnly) {
      byIdentity.set(identity(game), result.length);
      byTitle.set(titleKey(game), [
        ...(byTitle.get(titleKey(game)) || []),
        result.length,
      ]);
      result.push(game);
      added++;
    }
  }
  return {
    games: result,
    added,
    updated,
    conflicts,
    conflictGroups: [...old.conflictGroups, ...fresh.conflictGroups],
    aliases: old.aliases,
    duplicates: old.removed + fresh.removed,
  };
}

export function deduplicate(
  games: Game[],
  resolutions: Record<string, string> = {},
  prefix = "",
) {
  const result: Game[] = [];
  const groups = new Map<string, Game[]>();
  const aliases: Record<string, string> = {};
  const conflicts: string[] = [];
  const conflictGroups: { key: string; name: string; choices: string[] }[] = [];
  let removed = 0;
  for (const original of games) {
    const game = { ...original, name: cleanTitle(original.name) };
    const key = identity(game);
    groups.set(key, [...(groups.get(key) || []), game]);
  }
  const pair = (g: Game) => `${g.earned ?? "?"} / ${g.total ?? "?"}`;
  for (const [identityKey, group] of groups) {
    const key = prefix + identityKey;
    const conflicting = ["earned", "total"].some(
      (field) =>
        new Set(
          group
            .map((g) => g[field as "earned" | "total"])
            .filter((v) => v !== null),
        ).size > 1,
    );
    let selected: Game | undefined;
    if (conflicting) {
      const choices = [...new Set(group.map(pair))];
      conflictGroups.push({ key, name: group[0].name, choices });
      selected = group.find((g) => pair(g) === resolutions[key]);
      if (!selected) {
        conflicts.push(
          `Conflicting duplicate achievement counts for ${group[0].name}. Choose counts below or correct platform/edition mappings if these are distinct stacks.`,
        );
        result.push(group[0]);
        continue;
      }
    }
    let previous = group[0];
    for (const game of group.slice(1)) {
      removed++;
      aliases[game.id] = previous.id;
      const unique = (a: string, b: string) =>
        [...new Set([a, b].filter(Boolean))].join("\n\n");
      previous = {
        ...previous,
        earned: previous.earned ?? game.earned,
        total: previous.total ?? game.total,
        owned: previous.owned || game.owned,
        included: previous.included || game.included,
        ignored: previous.ignored || game.ignored,
        unobtainable: isUnobtainable(previous) || isUnobtainable(game),
        favorite: previous.favorite || game.favorite,
        tags: [...new Set([...previous.tags, ...game.tags])],
        notes: unique(previous.notes, game.notes),
        genre: genreTags({ genre: previous.genre, xctGenre: game.genre }).join(
          ", ",
        ),
        xctGenre: genreTags({
          genre: previous.xctGenre,
          xctGenre: game.xctGenre,
        }).join(", "),
        lane: previous.lane || game.lane,
        completedAt: previous.completedAt || game.completedAt,
        cover: previous.cover || game.cover,
        priority: [previous.priority, game.priority].includes("High")
          ? "High"
          : previous.priority,
        ...(!previous.lane && game.lane
          ? {
              remaining: game.remaining,
              played: game.played,
              estimated: game.estimated,
            }
          : {}),
      };
    }
    if (selected)
      previous = {
        ...previous,
        earned: selected.earned,
        total: selected.total,
      };
    previous.status = achievementStatus(previous);
    result.push(previous);
  }
  return { games: result, aliases, conflicts, conflictGroups, removed };
}
export function remapPlans(
  p: Profile,
  games: Game[],
  aliases: Record<string, string>,
): Profile {
  const id = (value: string) => aliases[value] || value;
  const plans = new Map<string, string>();
  p.schedule.forEach((s) => {
    const key = id(s.gameId);
    plans.set(
      key,
      plans.has(key) ? [plans.get(key)!, s.start].sort()[0] : s.start,
    );
  });
  return {
    ...p,
    games,
    order: [...new Set(p.order.map(id))],
    schedule: [...plans].map(([gameId, start]) => ({ gameId, start })),
  };
}

// Planning intent never overrides known achievement progress. 0/0 is not a completion.
export function achievementStatus(
  g: Pick<Game, "earned" | "total" | "status">,
): Game["status"] {
  if (g.earned === null) return g.status;
  if (g.earned === 0) return "unstarted";
  if (g.total !== null && g.total > 0 && g.earned === g.total)
    return "completed";
  return "started";
}
export function alphabet(g: Game) {
  const letter = g.name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .charAt(0)
    .toUpperCase();
  return /^[A-Z]$/.test(letter) ? letter : "#";
}
export function unfinished(g: Game) {
  return (
    g.owned &&
    !g.ignored &&
    !isUnobtainable(g) &&
    ["started", "incomplete", "unstarted"].includes(g.status)
  );
}
export function huntCandidates(games: Game[]) {
  return games.filter(
    (g) =>
      g.owned &&
      !g.ignored &&
      !isUnobtainable(g) &&
      !["completed", "abandoned", "unobtainable"].includes(g.status) &&
      (g.status === "unstarted" || g.lane === "Want to Play"),
  );
}
export function randomGames(games: Game[], count: number, rng = Math.random) {
  const pool = [...games];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}
