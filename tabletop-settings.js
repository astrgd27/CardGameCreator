const KEY="tcg-tabletop-settings-v1";
export function normalizeSettings(v={}){return {speed:["off","fast","normal","slow"].includes(v.speed)?v.speed:"normal",scale:["compact","normal","large"].includes(v.scale)?v.scale:"normal",opponentPreview:v.opponentPreview!==false}}
export function readSettings(storage=localStorage){try{return normalizeSettings(JSON.parse(storage.getItem(KEY)??"{}")??{})}catch{return normalizeSettings()}}
export function saveSettings(v,storage=localStorage){const s=normalizeSettings(v);storage.setItem(KEY,JSON.stringify(s));return s}
export function animationDuration(settings){return {off:0,fast:180,normal:400,slow:800}[normalizeSettings(settings).speed]}
