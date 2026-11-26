// Browser-local generalized module library. No silent overwrite.
const KEY="tcg-v2-library";
export function readLibrary(storage=localStorage){
 const raw=storage.getItem(KEY);if(!raw)return [];
 const value=JSON.parse(raw);if(!Array.isArray(value))throw Error("Invalid library data");
 return value;
}
export function saveLibraryModule(module,id=null,storage=localStorage){
 const items=readLibrary(storage);
 if(id!==null&&!items.some(x=>x.id===id))throw Error("Saved module not found");
 const entry={id:id??crypto.randomUUID(),module:structuredClone(module)};
 const next=id===null?[...items,entry]:items.map(x=>x.id===id?entry:x);
 storage.setItem(KEY,JSON.stringify(next));return entry.id;
}
export function deleteLibraryModule(id,storage=localStorage){
 const items=readLibrary(storage);if(!items.some(x=>x.id===id))throw Error("Saved module not found");
 storage.setItem(KEY,JSON.stringify(items.filter(x=>x.id!==id)));
}
export function stagePlaytest(module,storage=sessionStorage){storage.setItem("tcg-v2-playtest",JSON.stringify(module))}
export function readPlaytest(storage=sessionStorage){const raw=storage.getItem("tcg-v2-playtest");return raw?JSON.parse(raw):null}
