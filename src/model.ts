import { z } from "zod";
const hours = z.number().finite().min(0).max(100000);
const count = z.number().int().min(0).max(10000000);
export const statuses = [
  "unstarted",
  "started",
  "incomplete",
  "completed",
  "abandoned",
  "unobtainable",
] as const;
export const lanes = [
  "Want to Play",
  "Currently Playing",
  "Want to Complete",
  "Completed",
] as const;
export const gameSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    name: z.string().min(1),
    platform: z.string(),
    edition: z.string(),
    status: z.enum(statuses),
    owned: z.boolean(),
    included: z.boolean(),
    earned: count.nullable(),
    total: count.nullable(),
    tags: z.array(z.string()),
    favorite: z.boolean(),
    priority: z.enum(["Low", "Normal", "High"]),
    notes: z.string(),
    remaining: hours,
    played: hours,
    estimated: hours,
    coop: z.boolean(),
    cover: z.string(),
    source: z.enum(["manual", "csv"]),
    completedAt: z.string(),
    lane: z.enum(lanes).nullable(),
  })
  .refine(
    (g) => g.earned === null || g.total === null || g.earned <= g.total,
    "Earned cannot exceed total",
  );
export type Game = z.infer<typeof gameSchema>;
export const profileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  games: z.array(gameSchema),
  order: z.array(z.string()),
  schedule: z.array(
    z.object({
      gameId: z.string(),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ),
  weekday: hours.max(24),
  weekend: hours.max(24),
  annual: count,
  monthly: count,
  reduction: count,
  history: z.array(
    z.object({ date: z.string(), backlog: count, completed: count }),
  ),
});
export type Profile = z.infer<typeof profileSchema>;
export const backupSchema = z
  .object({
    version: z.literal(1),
    active: z.string(),
    precision: z.number().int().min(1).max(4),
    profiles: z.array(profileSchema).min(1),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.profiles.map((p) => p.id)).size !== s.profiles.length ||
      !s.profiles.some((p) => p.id === s.active)
    )
      ctx.addIssue({ code: "custom", message: "Invalid profile identifiers" });
    for (const p of s.profiles)
      if (new Set(p.games.map((g) => g.id)).size !== p.games.length)
        ctx.addIssue({ code: "custom", message: "Duplicate game IDs" });
  });
export type AppData = z.infer<typeof backupSchema>;
export function newGame(name = ""): Game {
  return {
    id: crypto.randomUUID(),
    productId: "",
    name,
    platform: "Xbox Series X|S",
    edition: "Standard",
    status: "unstarted",
    owned: true,
    included: false,
    earned: null,
    total: null,
    tags: [],
    favorite: false,
    priority: "Normal",
    notes: "",
    remaining: 10,
    played: 0,
    estimated: 10,
    coop: false,
    cover: "",
    source: "manual",
    completedAt: "",
    lane: null,
  };
}
export function newProfile(name: string): Profile {
  return {
    id: crypto.randomUUID(),
    name,
    games: [],
    order: [],
    schedule: [],
    weekday: 2,
    weekend: 4,
    annual: 12,
    monthly: 1,
    reduction: 10,
    history: [],
  };
}
export function initialData(): AppData {
  const p = newProfile("My haven");
  return { version: 1, active: p.id, precision: 2, profiles: [p] };
}
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function snapshot(p: Profile): Profile {
  const entry = {
    date: dayKey(),
    backlog: p.games.filter((g) => g.owned && g.status !== "completed").length,
    completed: p.games.filter((g) => g.status === "completed").length,
  };
  return {
    ...p,
    history: [...p.history.filter((h) => h.date !== entry.date), entry].sort(
      (a, b) => a.date.localeCompare(b.date),
    ),
  };
}
