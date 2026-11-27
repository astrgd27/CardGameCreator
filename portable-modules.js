// Portable generalized modules. ZIP dependency injected for browser and Node tests.
import {assertModuleV2} from "./kernel/module-v2.js";
import {createMatch} from "./kernel/runtime.js";
import {compileWorkshopRules} from "./rule-composer.js";
const MAX_ZIP=32*1024*1024,MAX_EXPANDED=40*1024*1024,MAX_ART=400000;
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const artPattern=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const safeId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x)&&!Object.hasOwn(Object.prototype,x);
export function migrateModule(input){
 check(input&&typeof input==="object"&&!Array.isArray(input),"Expected module object");
 const m=structuredClone(input);
 // Only an explicitly recognized early generalized shape is migrated.
 // Legacy workshop v1 has a different rules model and is not silently converted.
 if(m.schemaVersion===1&&Array.isArray(m.definitions)&&Array.isArray(m.players)&&Array.isArray(m.zones)&&m.effects){m.schemaVersion=2}
 check(m.schemaVersion===2,"Unsupported schema; legacy workshop modules use the original workshop");
 return m;
}
export function validatePortable(input){
 const m=compileWorkshopRules(migrateModule(input));assertModuleV2(m);createMatch(m);
 for(const [id,p] of Object.entries(m.cardPresentation??{})){
  check(safeId(id)&&m.definitions.includes(id),"Invalid artwork definition");
  if(p.art){const match=artPattern.exec(p.art);check(match&&match[2].length<=MAX_ART*4/3+4,"Invalid or oversized artwork")}
 }
 return m;
}
export async function packPortable(input,Zip=globalThis.JSZip,{type="uint8array"}={}){
 check(Zip,"ZIP library unavailable");const m=validatePortable(input),zip=new Zip(),assets=[];
 for(const [id,p] of Object.entries(m.cardPresentation??{}))if(p.art){
  const [,ext,data]=artPattern.exec(p.art),path="assets/cards/"+id+"."+ext;
  zip.file(path,data,{base64:true});p.art=path;assets.push(path);
 }
 zip.file("manifest.json",JSON.stringify({format:"card-game-creator",version:2,module:"module.json",assets},null,2));
 zip.file("module.json",JSON.stringify(m,null,2));
 const result=await zip.generateAsync({type,compression:"DEFLATE"});
 check((result.byteLength??result.size)<=MAX_ZIP,"Module ZIP exceeds 32 MB");return result;
}
export async function unpackPortable(input,Zip=globalThis.JSZip){
 check(Zip,"ZIP library unavailable");check((input.byteLength??input.size)<=MAX_ZIP,"Module ZIP exceeds 32 MB");
 const zip=await Zip.loadAsync(input),entries=Object.values(zip.files),files=entries.filter(f=>!f.dir);
 check(entries.length<=2005,"Too many archive entries");for(const f of entries)check(!f.unsafeOriginalName||f.unsafeOriginalName===f.name,"Unsafe archive path");
 check(files.length<=1002,"Too many archive files");
 let expanded=0;for(const f of files){check(!f.unsafeOriginalName||f.unsafeOriginalName===f.name,"Unsafe archive path");check(Number.isSafeInteger(f._data?.uncompressedSize)&&f._data.uncompressedSize>=0,"Unknown archive size");expanded+=f._data.uncompressedSize;check(expanded<=MAX_EXPANDED,"Expanded ZIP exceeds 40 MB")}
 const read=async(path,format)=>{const f=zip.file(path);check(f,"Missing archive file: "+path);const bytes=await f.async("uint8array");check(bytes.length===f._data.uncompressedSize,"Archive size mismatch");if(format==="string")return new TextDecoder("utf-8",{fatal:true}).decode(bytes);return f.async(format)};
 const manifest=JSON.parse(await read("manifest.json","string"));
 check(manifest&&typeof manifest==="object"&&!Array.isArray(manifest)&&manifest.format==="card-game-creator"&&manifest.version===2&&manifest.module==="module.json"&&Array.isArray(manifest.assets),"Unsupported ZIP format; open legacy v1 in original workshop");
 const declared=new Set(manifest.assets);check(declared.size===manifest.assets.length&&manifest.assets.every(x=>typeof x==="string"&&/^assets\/cards\/[A-Za-z0-9_-]{1,80}\.(png|jpeg|webp)$/.test(x)),"Invalid asset manifest");
 check(files.every(f=>["manifest.json","module.json"].includes(f.name)||declared.has(f.name)),"Undeclared archive file");
 const m=migrateModule(JSON.parse(await read("module.json","string"))),used=new Set();
 for(const [id,p] of Object.entries(m.cardPresentation??{}))if(p.art){
  check(safeId(id)&&declared.has(p.art)&&p.art.startsWith("assets/cards/"+id+".")&&!used.has(p.art),"Invalid artwork reference");
  const path=p.art;used.add(path);check(zip.file(path)?._data?.uncompressedSize<=MAX_ART,"Artwork exceeds size limit");
  p.art="data:image/"+path.split(".").at(-1)+";base64,"+await read(path,"base64");
 }
 check(used.size===declared.size,"Unused archive assets");return validatePortable(m);
}
