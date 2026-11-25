export function summarize(catalog,version,evidence) {
  if(evidence.catalogVersion!==version) throw Error('Catalog version mismatch');
  const ids=new Set(), groups=new Map();
  for(const c of catalog){
    if(ids.has(c.id)) throw Error('Duplicate catalog ID: '+c.id);
    ids.add(c.id);
  }
  for(const id of Object.keys(evidence.cases)){
    if(!ids.has(id)) throw Error('Unknown evidence ID: '+id);
  }
  for(const c of catalog){
    const e=evidence.cases[c.id]??{status:'pending'};
    if(!['pending','partial','fail','pass','na'].includes(e.status)) throw Error('Invalid status: '+c.id);
    if(e.status==='pass'){
      if(!['basic','advanced','script'].includes(e.layer)) throw Error('Missing layer: '+c.id);
      for(const key of ['fixture','steps','expected','actual','commit','date','evidence']){
        if(typeof e[key]!=='string'||!e[key].trim()) throw Error('Missing '+key+': '+c.id);
      }
      if(e.roundTrip!==true||e.verified!==true) throw Error('Missing verification: '+c.id);
    }
    if(e.status==='na'&&(!e.rationale||!e.review)) throw Error('Unreviewed exclusion: '+c.id);
    const key=JSON.stringify([c.game,c.category]);
    const g=groups.get(key)??{game:c.game,category:c.category,total:0,pending:0,partial:0,fail:0,na:0,visual:0,all:0};
    if(e.status==='na') g.na++;
    else{
      g.total++;
      if(e.status==='pass'){g.all++;if(e.layer!=='script')g.visual++;}
      else g[e.status]++;
    }
    groups.set(key,g);
  }
  return {catalogVersion:version,caseCount:catalog.length,groups:[...groups.values()].map(g=>({...g,visualPercent:g.total?100*g.visual/g.total:null,allPercent:g.total?100*g.all/g.total:null,visualTargetMet:g.total?g.visual/g.total>=0.8:null,allTargetMet:g.total?g.all/g.total>=0.95:null})),cases:catalog.map(c=>({id:c.id,game:c.game,category:c.category,title:c.title,...(evidence.cases[c.id]??{status:'pending'})}))};
}
