import Papa from "papaparse";
import { Game, Profile, newGame, dayKey, statuses } from "./model";
export function percentage(earned: number, total: number) {
  return total === 0 ? 0 : (earned / total) * 100;
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
export function stats(games: Game[]) {
  const counted = games.filter(
    (g) => g.included && g.earned !== null && g.total !== null,
  );
  return {
    earned: counted.reduce((s, g) => s + g.earned!, 0),
    total: counted.reduce((s, g) => s + g.total!, 0),
    known: counted.length,
    missing: games.filter(
      (g) => g.included && (g.earned === null || g.total === null),
    ).length,
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
  "status",
  "earned",
  "total",
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
  status: ["status", "completionstatus"],
  earned: ["earned", "achievementsearned", "unlockedachievements"],
  total: ["total", "totalachievements", "achievementsavailable"],
  owned: ["owned"],
  included: ["included", "includeinstats"],
  coop: ["coop", "cooperative"],
  cover: ["cover", "coverurl", "imageurl"],
};
export function guessMapping(headers: string[]): Mapping {
  const xct = headers.includes("Gamertag") && headers.includes("Product ID");
  return Object.fromEntries(
    fields.map((f) => [
      f,
      xct && f === "status"
        ? ""
        : headers.find((h) =>
            aliases[f].includes(h.toLowerCase().replace(/[^a-z0-9]/g, "")),
          ) || "",
    ]),
  );
}
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export function identity(g: Game) {
  return `${normalize(g.productId) || normalize(g.name)}|${normalize(g.platform)}|${normalize(g.edition)}`;
}
export function importRows(rows: Record<string, string>[], map: Mapping) {
  const games: Game[] = [];
  const errors: string[] = [];
  for (const [i, row] of rows.entries()) {
    const val = (key: (typeof fields)[number]) =>
      (row[map[key] || ""] || "").trim();
    if (!val("name")) {
      errors.push(`Row ${i + 2}: game name is required`);
      continue;
    }
    const g = newGame(val("name"));
    g.source = "csv";
    for (const key of ["productId", "platform", "edition", "cover"] as const)
      if (val(key)) g[key] = val(key);
    const state = val("status").toLowerCase();
    if (state && !statuses.includes(state as Game["status"])) {
      errors.push(`Row ${i + 2}: unknown status "${state}"`);
      continue;
    }
    if (state) g.status = state as Game["status"];
    let bad = false;
    for (const key of ["earned", "total"] as const) {
      if (val(key)) {
        const n = Number(val(key));
        if (!Number.isSafeInteger(n) || n < 0 || n > 10000000) {
          errors.push(`Row ${i + 2}: ${key} must be a non-negative integer`);
          bad = true;
        } else g[key] = n;
      }
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
    if (!map.included && g.total !== null && g.earned !== null)
      g.included = true;
    if (!bad) games.push(g);
  }
  return { games, errors };
}
export function mergeGames(
  existing: Game[],
  incoming: Game[],
  map: Mapping,
  achievementsOnly = false,
) {
  const result = [...existing];
  const byIdentity = new Map(result.map((g, i) => [identity(g), i]));
  const titleKey = (g: Game) => identity({ ...g, productId: "" });
  const byTitle = new Map<string, number[]>();
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
    if (index >= 0) {
      const prev = result[index];
      const next = { ...prev };
      for (const key of fields) {
        if (
          key === "name" ||
          (achievementsOnly && !["earned", "total", "included"].includes(key))
        )
          continue;
        if (
          map[key] &&
          (!(key === "earned" || key === "total") || game[key] !== null)
        )
          Object.assign(next, { [key]: game[key] });
      }
      if (!map.included && game.total !== null && game.earned !== null)
        next.included = true;
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
  return { games: result, added, updated };
}
