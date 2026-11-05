import { openDB } from "idb";
import { AppData, backupSchema, initialData } from "./model";
const db = openDB("havenbound", 1, {
  upgrade(db) {
    db.createObjectStore("app");
  },
});
export async function load() {
  const raw = await (await db).get("app", "data");
  return raw ? backupSchema.parse(raw) : initialData();
}
let writes = Promise.resolve();
export function save(data: AppData) {
  writes = writes
    .catch(() => {})
    .then(async () => {
      await (await db).put("app", data, "data");
    });
  return writes;
}
export function download(data: AppData) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "havenbound-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
