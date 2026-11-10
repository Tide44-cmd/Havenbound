// A pipe is part of Xbox Series X|S, never a platform delimiter.
export function platformTags(value: string): string[] {
  const canonical: Record<string, string> = {
    windows: "Windows",
    "windows 10": "Windows 10",
    "windows 11": "Windows 11",
    pc: "PC",
    "xbox one": "Xbox One",
    "xbox 360": "Xbox 360",
    "xbox series x|s": "Xbox Series X|S",
    "xbox series x/s": "Xbox Series X|S",
    "xbox cloud gaming": "Xbox Cloud Gaming",
    xcloud: "Xbox Cloud Gaming",
    "xbox play anywhere": "Xbox Play Anywhere",
  };
  const tags = value
    .split(/[,;\r\n]+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  return [
    ...new Map(
      tags.map((s) => {
        const label = canonical[s.toLowerCase()] || s;
        return [label.toLowerCase(), label];
      }),
    ).values(),
  ];
}
