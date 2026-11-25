import { validate } from "./engine.js";
const db = new Promise((ok, no) => {
  const req = indexedDB.open("card-game-creator", 1);
  req.onupgradeneeded = () =>
    req.result.createObjectStore("modules", { keyPath: "id" });
  req.onsuccess = () => ok(req.result);
  req.onerror = () => no(req.error);
});
export async function saveModule(m) {
  const t = (await db).transaction("modules", "readwrite");
  t.objectStore("modules").put(m);
  await new Promise((ok, no) => {
    t.oncomplete = ok;
    t.onabort = t.onerror = () => no(t.error);
  });
}
export async function collection() {
  const req = (await db).transaction("modules").objectStore("modules").getAll();
  return new Promise((ok, no) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => no(req.error);
  });
}
export async function pack(m) {
  validate(m);
  const copy = structuredClone(m),
    zip = new JSZip();
  function extract(obj, key, path) {
    if (!obj[key]) return;
    const [header, data] = obj[key].split(",");
    const ext = header.split("/")[1].split(";")[0];
    obj[key] = path + "." + ext;
    zip.file(obj[key], data, { base64: true });
  }
  extract(copy, "fieldArt", "assets/field");
  copy.cards.forEach((c) => extract(c, "art", "assets/cards/" + c.id));
  zip.file(
    "manifest.json",
    JSON.stringify(
      { format: "card-game-creator", version: 1, module: "module.json" },
      null,
      2,
    ),
  );
  zip.file("module.json", JSON.stringify(copy, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
export async function unpack(file) {
  if (file.size > 32 * 1024 * 1024) throw Error("Module ZIP exceeds 32 MB.");
  const z = await JSZip.loadAsync(file);
  let total = 0;
  async function read(path, format) {
    const f = z.file(path);
    if (!f || !f._data) throw Error("Missing archive file: " + path);
    total += f._data.uncompressedSize;
    if (total > 40 * 1024 * 1024) throw Error("Expanded module exceeds 40 MB.");
    return f.async(format);
  }
  const manifest = JSON.parse(await read("manifest.json", "string"));
  if (
    manifest.format !== "card-game-creator" ||
    manifest.version !== 1 ||
    manifest.module !== "module.json"
  )
    throw Error("Unsupported module format.");
  const m = JSON.parse(await read("module.json", "string"));
  if (!Array.isArray(m.cards) || m.cards.length > 500)
    throw Error("Invalid card catalog.");
  async function restore(obj, key) {
    const path = obj[key];
    if (path === "") return;
    if (
      typeof path !== "string" ||
      !/^assets\/(?:cards\/)?[-\w]+\.(png|jpeg|webp)$/.test(path)
    )
      throw Error("Invalid image path.");
    obj[key] =
      "data:image/" +
      path.split(".").at(-1) +
      ";base64," +
      (await read(path, "base64"));
  }
  await restore(m, "fieldArt");
  for (const c of m.cards) await restore(c, "art");
  return validate(m);
}
