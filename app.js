/* Planning La Bocca : programme principal (sorti de index.html). */
/* =====================================================================
   Planning La Bocca — démo
   ===================================================================== */
const LS_DATA='planning-bocca-local-v1', LS_PREF='planning-bocca-prefs-v1';
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v)}
const fmt=n=>{const r=Math.round(n*10)/10;return String(r).replace('.',',')};
const num=s=>parseFloat(String(s).replace(',','.'));

/* ---------- référentiels ---------- */
const CENTRALE='La Bocca';
const PLAQUES=[{c:'7656',p:''},{c:'V955',p:''},{c:'EF',p:'EF-507-VT'},{c:'EE',p:'EE-443-NL'},{c:'GW',p:'GW-741-DT'},{c:'V874',p:''}];
const plDisp=p=>(p&&p.p&&!/^n°\s*de\s*parc/i.test(p.p))?p.p:(p?p.c:'');
const EXT0=[{c:'FK218',p:'FK-218-QM · SP4 loueur'},{c:'HD470',p:'HD-470-LS · SP4 loueur'}];
const AG0=['Grasse','Nice','Vallauris','Tourrettes'];
const FOURN=['Lafarge','Fica','BST','GCA'];
const TAILLES=['17','20','24','26','28','32','36','42','47','52','BQA'];
const pPre=o=>P_COMMENT.filter(t=>(o&&o.pompe)||!/citybag|b[ée]tobag/i.test(t));
const P_COMMENT=['Prendre 1 journée','Appeler avant départ','Appeler chaque camion','Attendre le client','Bétobag 1er camion','1er camion ferme pour escalier','Formule … en premier','Chef de chantier : ','Retard 1 h','Vidange longue 45 min+','Prévoir 1 h 30 par rotation','Accès difficile'];
const P_ENTRETIEN=['Graissage malaxeur','Graissage ensilage','Graissage tapis peseur','Nettoyage déchargeur','Nettoyage chargeur','Chargeur fosse','Chaussette ciment','Trappe à ciment','Trappe malaxeur','Piquage trappe malaxeur','Piquage pales malaxeur','Kärcher malaxeur','Rangement local stock','État stocks colorants','Enlèvement bennes : 1x Benne','Enlèvement bennes : 2x Bennes'];
const ZONES=['La piste','Le labo','Le stock','Local adjuvants','Zone ensilage intérieur','Organes de pesée'];
const SEMI_MAX=12;  // tours par semi et par jour à La Bocca
const AGG=['6/16','4/10','10/20','0/4L','0/4R','0/2'];
const CARRS=['CALLAS','GOURDON'];
const CIMENTS=['42,5R','52,5N','FILLER','SRPM'];
const ROLES={centraliste:'Centraliste',commercial:'Commercial',labo:'Tech labo'};
const DEM_TYPES={modif:'Modification de commande',formule:'Formule',compo:'Modification de composition',resultats:'Résultats d\'essais',eprouvettes:'Éprouvettes',info:'Info client',chantier:'Création chantier',contrat:'Formule au contrat',visite:'Visite de chantier',autre:'Autre'};
const POUR={centraliste:'Centraliste',commercial:'Commercial',labo:'Labo'};
const role=()=>prefs.user?prefs.user.role:'centraliste';
const peutValider=()=>role()==='centraliste'||role()==='commercial';  // valider, réserver pompes et camions, paiements
const isPhone=()=>typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(max-width:760px)').matches;
const simple=()=>role()!=='centraliste'||isPhone();
const STATUTS={attente:'En attente',encours:'En cours',terminee:'Terminée',annulee:'Annulée'};

/* ---------- dates ---------- */
const MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const MOISL=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const JC=['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
const pad=n=>String(n).padStart(2,'0');
const D=iso=>new Date(iso+'T12:00:00Z');
const toIso=d=>d.toISOString().slice(0,10);
const addDays=(iso,n)=>{const d=D(iso);d.setUTCDate(d.getUTCDate()+n);return toIso(d)};
const dow=iso=>D(iso).getUTCDay();
const isWE=iso=>{const w=dow(iso);return w===0||w===6};
const mondayOf=iso=>addDays(iso,-((dow(iso)+6)%7));
function isoWeek(iso){const d=D(iso);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)+3);const y=d.getUTCFullYear();const f=new Date(Date.UTC(y,0,4,12));return 1+Math.round(((d-f)/864e5-3+((f.getUTCDay()+6)%7))/7)}
const weekKey=iso=>{const d=D(mondayOf(iso));d.setUTCDate(d.getUTCDate()+3);return d.getUTCFullYear()+'-S'+pad(isoWeek(iso))};
const dayLong=iso=>{const d=D(iso);return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`};
const dayShort=iso=>{const d=D(iso);return `${JC[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`};
function realToday(){const n=new Date();return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`}
const hm=h=>h?h.replace(':',' h '):'';
function parseDate(s){
  s=s.trim().toLowerCase();let m=/^(\d{1,2})[\/.\- ](\d{1,2})(?:[\/.\- ](\d{2,4}))?$/.exec(s);let d,mo,y;
  if(m){d=+m[1];mo=+m[2];y=m[3]?+m[3]:null}
  else{m=/^(?:[a-zé]+\.? )?(\d{1,2}) ([a-zéû]+)\.?(?: (\d{4}))?$/.exec(s);if(!m)return null;d=+m[1];const k=MOISL.findIndex(x=>x.startsWith(m[2].slice(0,3)));if(k<0)return null;mo=k+1;y=m[3]?+m[3]:null}
  if(!y)y=+TODAY.slice(0,4);if(y<100)y+=2000;if(mo<1||mo>12||d<1||d>31)return null;
  const iso=`${y}-${pad(mo)}-${pad(d)}`;return toIso(D(iso))===iso?iso:null}
const mins=h=>{const [a,b]=(h||'00:00').split(':').map(Number);return a*60+(b||0)};

/* ---------- jeu de démonstration (fictif) ---------- */
/* ---------- calculs métier ---------- */
const CONFIG0=()=>({agg:AGG.slice(),carr:CARRS.slice(),cim:CIMENTS.slice(),agence:AG0.slice(),camions:[{t:'8x4',cap:7.5},{t:'SP6',cap:6},{t:'SP4',cap:4}],pompes:['17','20','24','26','28','32','36','42','47','52','BQA'],fourn:['Lafarge','Fica','BST','GCA']});
const CFG=()=>(typeof S!=='undefined'&&S&&S.config&&S.config.camions)?S.config:CONFIG0();
const AG=()=>(CFG().agence&&CFG().agence.length)?CFG().agence:AG0;
const AGGL=()=>(CFG().agg&&CFG().agg.length)?CFG().agg:AGG;
const CARRL=()=>(CFG().carr&&CFG().carr.length)?CFG().carr:CARRS;
const CIML=()=>(CFG().cim&&CFG().cim.length)?CFG().cim:CIMENTS;
function learnList(k,v,def){v=String(v||'').trim();if(!v)return;if(!S.config)S.config=CONFIG0();if(!S.config[k])S.config[k]=def.slice();if(!S.config[k].some(x=>x.toLowerCase()===v.toLowerCase()))S.config[k].push(v)}
function camParse(cam){const m=/^\s*(\d*)\s*(.*)$/.exec(cam||'');const rest=(m&&m[2]||'').trim().toLowerCase();const k=CFG().camions.find(c=>c.t.toLowerCase()===rest);return {n:m&&m[1]?+m[1]:'',t:k?k.t:(rest?rest.toUpperCase():CFG().camions[0].t)}}
// chargement réduit : réglé par produit spécial (Administration → Formules : « Chargement plein / réduit ») ; chapes réduites par défaut
let _catK,_catP=null;const catProds=()=>{const c=typeof fxCat==='function'?fxCat():null;if(c!==_catK||!_catP){_catK=c;_catP=(c&&c.prods)||(window.FX?FX.defaults().prods:[])}return _catP};
const chgOf=p=>p.chg||(/chape/i.test(p.g||'')?'fluide':'plein');
function isFluide(f){const s=String(f||'').toLowerCase().trim();if(!s)return false;let P=null;
  for(const p of catProds()){const n=String(p.n||'').toLowerCase().trim();if(n&&(s===n||s.startsWith(n+' '))&&(!P||n.length>P.n.length))P=p}
  return P?chgOf(P)==='fluide':/chape|cemexa/.test(s)}
const FL0={'8x4':7,sp6:5,sp4:3.5};   // m³ maxi d'un produit très fluide (chape…) : 8x4 6 à 7 m³ selon la route, 4x2 19 t 3 à 3,5 m³
const capFl=k=>k.fl>0?k.fl:(FL0[k.t.toLowerCase()]??Math.floor(k.cap*0.9*2)/2);
function capType(cam){if(!cam)return CFG().camions[0];const t=camParse(cam).t.toLowerCase();return CFG().camions.find(c=>c.t.toLowerCase()===t)||{t:t,cap:/sp4/i.test(cam)?4:/sp6/i.test(cam)?6:7.5}}
function capOf(cam,f){const k=capType(cam);return isFluide(f)?Math.min(k.cap,capFl(k)):k.cap}
function flTxt(cam){const k=capType(cam),fl=Math.min(k.cap,capFl(k));const big=/8x4/i.test(k.t);
  return `Chargement réduit (produit fluide) : jamais au maximum. ${big?'8x4 : 6 à 7 m³ selon la route':k.t+(/sp4/i.test(k.t)?' (4x2, 19 t) : 3 à 3,5 m³':'')}, tours prévus à ${fmt(fl)} m³ maximum.`}
// formule changée : si la capacité change (béton ↔ chape), les tours pas encore chargés sont recalculés
function reCap(o,oldF){const a=capOf(o.cam,oldF),b=capOf(o.cam,o.f);if(a===b||!o.tours.length)return;const keep=o.tours.filter(t=>t.s||t.mv);const rest=Math.round((total(o)-keep.filter(t=>!t.mv).reduce((x,t)=>x+num(t.v),0))*10)/10;o.tours=rest>0.05?keep.concat(genTours(rest,b)):keep;}
// clic droit sur le cubage : cubage demandé et complément (+). Les tours déjà chargés ne bougent pas.
function volPop(o,el){if(!o)return;const id=o.id;setEditing(id);const L=livre(o);
  formPop(el,'Cubage demandé',[{k:'m',label:'Cubage demandé (m³)',val:fmt(total(o))},{k:'plus',label:'Et plus : complément à confirmer par le client (+)',type:'check',val:!!o.plus}],v=>{
    const x=byId(id);if(!x)return;const m=Math.round(num(v.m)*10)/10;
    if(!(m>0)){toast('Indiquez un cubage');return 'keep'}
    if(m<L-0.01){toast(`Déjà chargé : ${fmt(L)} m³. Le cubage ne peut pas être plus petit.`);return 'keep'}
    const avant=`${fmt(total(x))}${x.plus?'+':''}`;
    if(Math.abs(m-total(x))>0.01){const keep=x.tours.filter(t=>t.s||t.mv);const rest=Math.round((m-L)*10)/10;x.tours=rest>0.05?keep.concat(genTours(rest,capOf(x.cam,x.f))):keep}
    x.plus=!!v.plus;if(x.plus&&statut(x)==='terminee'&&x.st==='terminee')delete x.st;
    const apres=`${fmt(total(x))}${x.plus?'+':''}`;if(avant!==apres)jlog(x.date,`Cubage ${cl(x.cl).n} : ${avant} → ${apres} m³`);
    commit();render();return 'close'});
  const f=popEl.querySelector('#pf0');if(f){f.setAttribute('inputmode','decimal');setTimeout(()=>{f.focus();f.select()},30)}}
let labVus=new Set();
function labInfoCheck(){if(role()!=='centraliste'||RO()||!S||!S.orders)return;
  for(const o of S.orders){if(o.date!==view.date&&o.date!==TODAY)continue;const L=(o.pills||[]).filter(p=>p.lab&&!p.vu);if(!L.length)continue;
    if(!(o.tours||[]).some(t=>t.s&&!t.mv))continue;const k=o.id+':'+L.map(p=>p.t).join('|');if(labVus.has(k))continue;
    if(popEl&&!popEl.hidden){setTimeout(labInfoCheck,1500);return}
    labVus.add(k);const id=o.id,row=document.getElementById('row-'+id);
    openPop(row||document.body,`<div class="pop-h lab-h">Info du labo · ${esc(cl(o.cl).n)}</div><p class="muted" style="margin:0;font-size:12.5px">${esc(siteName(o))} · premier camion chargé</p>
      <ul class="lab-l">${L.map(p=>`<li><b>${esc(p.t)}</b><small>${esc(p.by||'labo')}</small></li>`).join('')}</ul><button class="btn primary" data-pa="vu">Vu</button>`,
      {vu(){const x=byId(id);if(x)(x.pills||[]).forEach(p=>{if(p.lab)p.vu=1});commit();render();return 'close'}});return}}
function genTours(m3,cap){const n=Math.floor(m3/cap+1e-9);const t=[];for(let i=0;i<n;i++)t.push({v:cap,s:0});const r=Math.round((m3-n*cap)*10)/10;if(r>0.05)t.push({v:r,s:0});return t}
const TR=o=>o.tours.filter(t=>!t.mv);
const total=o=>TR(o).reduce((a,t)=>a+t.v,0);
const livre=o=>TR(o).reduce((a,t)=>a+(t.s?t.v:0),0);
function statut(o){if(o.st)return o.st;const n=TR(o).length,c=TR(o).filter(t=>t.s).length;if(n&&c===n)return o.plus?'encours':'terminee';if(c)return 'encours';return 'attente'}
// Citybag : produit BAG, sacs de 0,5 m³ remplis à la centrale par la toupie
const BAG_M3=0.5;const isBag=o=>/^\s*BAG\b|citybag/i.test((o&&o.f)||'');const nBags=v=>Math.round((+v||0)/BAG_M3);
function family(f){const s=(f||'').toLowerCase();if(/chape|cemexa/.test(s))return 'chape';if(/d[ée]sactiv/.test(s))return 'desac';if(/sable stab/.test(s))return 'sable';return 'beton'}
// formule proposée par le labo sur une commande en attente : une info ; le centraliste ou le commercial l'applique
const fLaboTag=o=>o.fLabo&&o.fLabo.f?`<button class="flabo" data-act="flabo" title="Formule proposée par ${esc(o.fLabo.by||'le labo')}${o.fLabo.at?' le '+esc(o.fLabo.at):''}${role()==='labo'?' · clic : modifier':' · clic : appliquer à la commande'} : ${esc(o.fLabo.f)}"><span>Labo</span></button>`:'';
function attente(f){if(/^ATT\b/.test(f||''))return 'Produit en attente';const m=/attente formule\s*(labo|client|commercial)?/i.exec(f||'');return m?('Attente formule'+(m[1]?' '+m[1].toLowerCase():'')):''}

/* ---------- état ---------- */
let S=null;              // données
let MODE='loading';      // 'shared' | 'local' | 'loading'
const prefs=Object.assign({theme:'light',user:null,gate:'',banner:'',vue:'normal'},lsGet(LS_PREF)||{});
if(prefs.v!==2){prefs.theme='light';prefs.v=2}
let TODAY=realToday();
// la page reste souvent ouverte la nuit : la date du jour se met à jour toute seule
setInterval(()=>{const t=realToday();if(t===TODAY)return;const suivre=view.date===TODAY;TODAY=t;if(suivre)view.date=t;if(S)render(true)},60000);
const view={tab:'planning',mode:'jour',date:pickStart(),dfilter:(prefs.user&&prefs.user.role!=='centraliste')?'moi':'tous',focus:null,hbOpen:[],adjYear:false};
/* le planning s'ouvre toujours sur la date du jour (téléphone comme ordinateur) */
function pickStart(){return TODAY}
const savePrefs=()=>lsSet(LS_PREF,prefs);
const cl=id=>(S.clients.find(c=>c.id===id)||{n:'?',t:'compte'});
const chan=id=>S.chantiers.find(c=>c.id===id)||null;
const byId=id=>S.orders.find(o=>o.id===id);
const DAY0=()=>({presents:[],passation:[],events:[],labo:[],ech:[],semis:[],ciments:[],etat:{k:'ouverte',t:''}});
function day(iso){if(!S.days[iso])S.days[iso]=DAY0();const d=S.days[iso];Object.keys(DAY0()).forEach(k=>{if(d[k]==null)d[k]=DAY0()[k]});return d}
const dayRO=iso=>Object.assign(DAY0(),S.days[iso]||{});
function ordersOn(iso){return S.orders.filter(o=>o.date===iso&&o.kind!=='aplacer').sort((a,b)=>mins(a.h)-mins(b.h)||a.seq-b.seq)}
function pendingOn(iso){return S.orders.filter(o=>o.date===iso&&o.kind==='aplacer').sort((a,b)=>mins(a.h)-mins(b.h)||a.seq-b.seq)}
const hasOrders=iso=>S.orders.some(o=>o.date===iso&&o.kind!=='aplacer');
const weOpen=d=>!!(dayRO(d)||{}).ouvert;
// nuit de la veille encore à afficher (ex. vendredi 22 h → samedi matin, même si le samedi n'est pas ouvert)
const nuitVeille=iso=>ordersOn(addDays(iso,-1)).filter(o=>mins(o.h)>=NUIT&&statut(o)!=='annulee');
function step(iso,dir){let d=iso;for(let i=0;i<10;i++){d=addDays(d,dir);if(!isWE(d)||hasOrders(d)||weOpen(d)||nuitVeille(d).length)return d}return d}
function totals(iso){const os=ordersOn(iso).filter(o=>statut(o)!=='annulee');const pl=new Set();os.forEach(o=>o.tours.forEach(t=>{if(t.p)pl.add(t.p)}));return{k:pl.size,m3:os.reduce((a,o)=>a+total(o),0),liv:os.reduce((a,o)=>a+livre(o),0),n:os.reduce((a,o)=>a+o.tours.length,0),p:os.reduce((a,o)=>a+o.tours.filter(t=>t.s).length,0),c:os.length}}
function siteName(o){const c=chan(o.ch);return c?(c.nom||c.adr):''}
function sapOf(o){if(o.sap)return o.sap;const k=S.formules.find(x=>x.f.toLowerCase()===(o.f||'').trim().toLowerCase());return k?k.sap:''}
const known=f=>S.formules.some(x=>x.f.toLowerCase()===(f||'').trim().toLowerCase());
const FLEET=()=>((S&&S.config&&S.config.flotte&&S.config.flotte.length)?S.config.flotte:PLAQUES.concat((S&&S.plaquesX)||[])).map(x=>/^n°\s*de\s*parc/i.test(x.p||'')?{c:x.c,p:''}:x);
const EXT=()=>(S&&S.config&&S.config.ext&&S.config.ext.length)?S.config.ext:EXT0;
const onSite=o=>[...new Set(o.tours.map(t=>t.p).filter(p=>p&&!FLEET().some(f=>f.c===p)))].map(c=>({c,p:'noté sur ce chantier'}));
const plN=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
/* plaque tapée : retrouve un camion connu, sinon l'apprend dans « Autres camions » */
function plateOf(txt,o){const n=plN(txt);if(!n)return '';const k=FLEET().find(p=>plN(p.c)===n||plN(p.p).startsWith(n)||plN(p.p)===n);if(k)return k.c;
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(n)?n.slice(0,5):n.slice(0,6)}
/* choix rapide de la plaque d'une bulle (i=null : nouvelle bulle) */
/* charger un tour avant le jour du chantier demande une validation */
function early(o,anchor,fn){const x=byId(o.id)||o;if(!(x.date>TODAY))return fn();return confirmPop(anchor,'Charger avant le jour J ?',`Ce chantier est prévu le ${dayShort(x.date).toLowerCase()}, nous sommes le ${dayShort(TODAY).toLowerCase()}.`,'Oui, charger quand même',fn)}
function platePick(o,i,anchor,opt){opt=opt||{};const id=o.id;setEditing(id);const t=i==null?null:o.tours[i];const cap=capOf(o.cam,o.f);
  const btn=p=>{const ab=absentOn(o.date,p.c);return `<button class="pop-c ${t&&t.p===p.c?'on':''} ${ab?'off':''}" data-pa="pk" data-v="${esc(p.c)}" title="${esc(p.p||'')}${ab?' · absent ce jour':''}">${esc(p.c)}</button>`};
  const mine=FLEET(),oth=onSite(o);
  openPop(anchor,`<div class="pop-h">${t?`Tour ${i+1}`:'Nouveau tour'}</div>
    <label class="fl pk-v">Cubage chargé (m³)<input id="pk-v" type="text" value="${fmt(t?t.v:cap)}" inputmode="decimal" autocomplete="off"></label>${isFluide(o.f)?`<div class="hint pk-fl">${esc(flTxt(o.cam))}</div>`:''}
    <div class="pop-l">Mes camions</div><div class="pop-grid">${mine.map(btn).join('')}</div>
    ${oth.length?`<div class="pop-l">Sur ce chantier</div><div class="pop-grid">${oth.map(btn).join('')}</div>`:''}
    <form data-pa="typed" class="pk-f"><input id="pk-t" placeholder="Noter la plaque (ex. EF507VT)" aria-label="Plaque" autocomplete="off"><button class="btn primary" type="submit">OK</button></form>
    ${t?'<button class="pop-b" data-pa="none">Chargé sans plaque</button>':`<button class="pop-b" data-pa="nonec">Chargé sans plaque</button>${opt.cpl&&!o.plus?'<button class="pop-b cpl-prevu" data-pa="prevu">Pas encore chargé : complément prévu (orange)</button>':''}`}`,
  {pk(el){const v=vol();if(!v)return 'keep';const c=el.dataset.v;return early(o,null,()=>put(c,v))},typed(f){const v=vol();if(!v)return 'keep';const t=f.querySelector('#pk-t').value;if(!plN(t))return 'keep';const c=plateOf(t,byId(id));return early(o,null,()=>put(c,v))},none(){const v=vol();if(!v)return 'keep';return early(o,null,()=>put('',v))},nonec(){const v=vol();if(!v)return 'keep';return early(o,null,()=>put('',v,true))},prevu(){const x=byId(id);x.plus=true;jlog(x.date,`Complément prévu : ${siteName(x)}`);toast('Complément prévu ajouté (bulle orange)')}});
  function vol(){const e=popEl.querySelector('#pk-v');const v=e?num(e.value):cap;if(!(v>0)||v>cap+.01){toast(`Cubage entre 0,5 et ${fmt(cap)} m³`);e&&e.focus();return 0}return v}
  // le cubage est lu AVANT une éventuelle confirmation (qui remplace le contenu de la fenêtre)
  function put(c,v,sans){const x=byId(id);v=v||cap;if(i==null){x.tours.push({v,s:1,x:1,p:c||''});if(opt.fromPlus)x.plus=false;toast(c?`Complément ${c} chargé · ${fmt(v)} m³`:`Complément chargé · ${fmt(v)} m³`);
      if(opt.cpl||opt.fromPlus)setTimeout(()=>askMoreCpl(id),60)}else{const u=x.tours[i];u.p=c;u.s=1;u.v=v;toast(c?`Tour ${i+1} chargé · ${c} · ${fmt(v)} m³`:`Tour ${i+1} chargé · ${fmt(v)} m³`)}}
  setTimeout(()=>{const n=popEl.querySelector('#pk-t');if(n&&window.matchMedia('(pointer:fine)').matches)n.focus()},20);
}
// après chaque complément chargé : en attend-on encore un ? (évite de laisser un chantier « terminé » à tort)
function askMoreCpl(id){const x=byId(id);if(!x)return;setEditing(id);
  const a=document.querySelector(`#row-${id} .t-add`)||document.querySelector(`#row-${id}`);if(!a)return;
  openPop(a,`<div class="pop-h">Encore un complément prévu ?</div><p class="muted" style="margin:0;font-size:13px">${esc(cl(x.cl).n)} · ${fmt(livre(x))} m³ chargés</p><button class="pop-b on" data-pa="oui">Oui, le client en reprendra : complément prévu (orange)</button><button class="pop-b" data-pa="non">Non, c'est le dernier</button>`,
    {oui(){const y=byId(id);y.plus=true;jlog(y.date,`Complément prévu : ${siteName(y)}`);toast('Complément prévu : bulle orange')},
     non(){const y=byId(id);y.plus=false;if(statut(y)!=='terminee'&&statut(y)!=='annulee')y.st='terminee';jlog(y.date,`Chantier terminé : ${siteName(y)}`);toast('Chantier terminé')}})}
function author(){const u=prefs.user;if(!u)return 'Anonyme';return u.role==='centraliste'?u.nom:`${u.nom} (${u.role==='labo'?'labo':'commercial'})`}

/* =====================================================================
   Rendu
   ===================================================================== */
function chipX(act,i,label){return `<button class="x" data-act="${act}" data-i="${i}" aria-label="Retirer ${esc(label)}">×</button>`}
function pompeLabel(p){return p.t==='BQA'?`BQA ${p.f}${p.ml?' +'+p.ml+' ML':''}`:`${p.f} ${p.t} m${p.ml?' +'+p.ml+' ML':''}`}
const shortC=c=>String(c||'').toUpperCase();

/* ---------- agrégats : une ligne par semi, une ligne ciments ---------- */
function aggInner(iso){
  const dd=dayRO(iso);
  const semis=(dd.semis||[]).map((s,i)=>{const last=s.tours.reduce((a,t,k)=>t.s?k:a,-1);const nOld=Math.max(0,last);return `<div class="sl"><button class="s-name" data-act="semi-ed" data-i="${i}" title="Renommer (prénom du chauffeur), heure, remarque">${esc(s.nom)}${s.ch?`<small>${esc(s.ch)}</small>`:''}</button><span class="s-h">${esc(hm(s.h))}</span><span class="s-ts">${nOld?`<span class="s-more" title="${nOld} tour${nOld>1?'s':''} reçu${nOld>1?'s':''} avant · survoler pour tout voir">+${nOld}</span>`:''}${s.tours.map((t,k)=>`<button class="s-t ${t.s?'on':''} ${k<last?'old':''}" data-act="semi-t" data-i="${i}" data-k="${k}" data-long="1" title="Tour ${k+1} · ${t.s?'reçu':'attendu'}${t.carr?' · '+esc(t.carr):''} · clic : reçu · clic long : modifier">${esc(t.prod)}${t.carr?`<small>${esc(shortC(t.carr))}</small>`:''}</button>`).join('')}${s.tours.length<SEMI_MAX?`<button class="s-add" data-act="semi-tadd" data-i="${i}" aria-label="Ajouter un tour à ${esc(s.nom)}" title="Tour suivant">+</button>`:''}${s.note?`<span class="s-note">${esc(s.note)}</span>`:''}</span></div>`}).join('');
  const cim=(dd.ciments||[]).map((c,i)=>`<span class="s-cg"><button class="s-cn" data-act="cim-ed" data-i="${i}" title="Modifier ou supprimer ce liant">${esc(c.prod)}</button>${c.rec.map((r,k)=>`<button class="s-t ${r.s?'on':''}" data-act="cim-t" data-i="${i}" data-k="${k}" data-long="1" title="${esc(c.prod)} · ${r.s?'reçu':'attendu'} · clic long : supprimer">${esc(hm(r.h))}</button>`).join('')}<button class="s-add" data-act="cim-tadd" data-i="${i}" aria-label="Ajouter une livraison de ${esc(c.prod)}">+</button></span>`).join('');
  const sm=semis||'<div class="sl"><button class="s-name" data-act="semi-add">Semi 1</button><span class="s-h">—</span><span class="s-ts"><button class="s-add" data-act="semi-add" aria-label="Noter la semi 1">+</button></span></div>';
  return `<div class="sl cim"><span class="s-name">Liants</span><span class="s-ts">${cim||'<span class="muted">—</span>'}</span></div>
  ${sm}`;
}

function convChips(iso,kind){const cv=S.convocs[iso]||{};return Object.keys(cv).map(p=>{const x=cv[p];
    if(kind==='abs'&&x.st==='abs')return `<button class="chip bad" data-act="conv" data-long="1" data-d="${iso}" data-p="${esc(p)}" title="Absent${x.raison?' · '+esc(x.raison):''} · clic : modifier · clic droit : menu"><b>${esc(p)}</b> <small>${esc(x.per||'Journée')}</small>${x.raison?` <small>· ${esc(x.raison)}</small>`:''}<span class="x" data-act="conv-x" data-d="${iso}" data-p="${esc(p)}" role="button" aria-label="Annuler l'absence de ${esc(p)}">×</span></button>`;
    if(kind==='pret'&&x.st==='pret')return `<button class="chip info" data-act="conv" data-d="${iso}" data-p="${esc(p)}" title="Convoqué à ${esc(x.pc)} · clic : modifier"><b>${esc(p)}</b> → ${esc(x.pc)} <small>${x.h?esc(hm(x.h)):esc(x.per||'')}</small></button>`;
    if(kind==='ailleurs'&&x.st!=='abs'&&x.dep&&x.dep!==CENTRALE)return `<button class="chip info" data-act="conv" data-d="${iso}" data-p="${esc(p)}" title="Convoqué à ${esc(x.dep)} à ${esc(hm(x.h))}${x.aff?' · '+esc(x.aff):''} · clic : modifier"><b>${esc(p)}</b> → ${esc(x.dep)} <small>${esc(hm(x.h))}</small></button>`;
    return ''}).join('')}
/* ---- disposition des encadrés : défaut de la centrale (partagé) + choix de chaque centraliste (sur son poste) ---- */
const HEAD_2L=1180;   // en dessous : deux lignes (camions + journal, puis agrégats sur toute la largeur)
const BOXES={ech:1,vie:1,agg:1},BOX_N={ech:'Planning camions',vie:'Journal de bord',agg:'Agrégats · ciments'};
const meKey=()=>((prefs.user||{}).nom||'').trim().toLowerCase();
function normL(L){const o=((L&&L.order)||[]).filter(k=>BOXES[k]);Object.keys(BOXES).forEach(k=>{if(!o.includes(k))o.push(k)});return {order:o,pos:L&&L.pos==='bottom'?'bottom':'top'}}
function layoutGet(){const u=(prefs.layouts||{})[meKey()];const c=S&&S.config&&S.config.layout;return Object.assign(normL(u||c),{src:u?'perso':c?'centrale':'defaut'})}
function applyLayout(L){const hd=document.getElementById('head'),m=document.getElementById('main');if(!hd||!m)return;L=L||layoutGet();
  if(L.pos==='bottom'){if(m.nextElementSibling!==hd)m.after(hd)}else if(hd.nextElementSibling!==m)m.before(hd);
  hd.classList.toggle('at-bottom',L.pos==='bottom');
  const vide=k=>{const w=hd.querySelector(`.hb-w[data-box="${k}"]`);return !!(w&&w.classList.contains('hb-vide'))};const tout=Object.keys(BOXES).every(vide);
  hd.classList.toggle('tout-vide',tout);
  hd.style.gridTemplateColumns=innerWidth>HEAD_2L?L.order.map(()=>'minmax(0,1fr)').join(' '):'';   // trois encadrés de même largeur
  hd.querySelectorAll('.hb-w[data-box]').forEach(w=>{w.style.order=L.order.indexOf(w.dataset.box)})}
function saveMyLayout(L){prefs.layouts=prefs.layouts||{};prefs.layouts[meKey()]={order:L.order.slice(),pos:L.pos};savePrefs()}
let hbDrag=null,hbSwallow=0;
document.addEventListener('pointerdown',e=>{if(!view.hbOpen||!view.hbOpen.length)return;if(e.target.closest&&(e.target.closest('#head .hb')||e.target.closest('#pop')))return;document.querySelectorAll('#head .hb.open').forEach(h=>h.classList.remove('open'));view.hbOpen=[];if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#head'))document.activeElement.blur()},true);
document.addEventListener('click',e=>{if(hbSwallow&&Date.now()-hbSwallow<400){e.stopPropagation();e.preventDefault()}hbSwallow=0},true);
document.addEventListener('pointerdown',e=>{
  const w=e.target.closest&&e.target.closest('#head .hb-w[data-box]');if(!w||e.button!==0||hbDrag)return;
  if(e.target.closest('button,input,select,textarea,a,label,.chip,.s-t,.s-add'))return;
  const sx=e.clientX,sy=e.clientY;let lx=sx,ly=sy;w.classList.add('hb-arm');
  const stop=()=>{clearTimeout(tm);w.classList.remove('hb-arm');document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',stop);document.removeEventListener('pointercancel',stop)};
  const mv=ev=>{lx=ev.clientX;ly=ev.clientY;if(Math.hypot(lx-sx,ly-sy)>6)stop()};
  const tm=setTimeout(()=>{stop();hbStart(w,lx,ly)},450);
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop);
});
function hbStart(w,x,y){const L=layoutGet();const r=w.getBoundingClientRect();
  const g=w.cloneNode(true);g.classList.add('hb-ghost');g.removeAttribute('data-box');Object.assign(g.style,{width:r.width+'px',height:r.height+'px',left:r.left+'px',top:r.top+'px'});document.body.appendChild(g);
  const hint=document.createElement('div');hint.className='hb-hint';document.body.appendChild(hint);
  hbDrag={w,g,hint,key:w.dataset.box,ox:x-r.left,oy:y-r.top,L:{order:L.order.slice(),pos:L.pos},from:JSON.stringify({o:L.order,p:L.pos})};
  w.classList.add('hb-ph');document.body.classList.add('hb-dragging');if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}
  document.addEventListener('pointermove',hbMove);document.addEventListener('pointerup',hbEnd);document.addEventListener('keydown',hbKey);hbMove({clientX:x,clientY:y});
}
function hbMove(e){const d=hbDrag;if(!d)return;d.g.style.left=(e.clientX-d.ox)+'px';d.g.style.top=(e.clientY-d.oy)+'px';
  const hd=document.getElementById('head');const others=[...hd.querySelectorAll('.hb-w[data-box]')].filter(x=>x!==d.w);
  const n=others.filter(x=>{const r=x.getBoundingClientRect();return r.left+r.width/2<e.clientX}).length;
  const o=d.L.order.filter(k=>k!==d.key);o.splice(n,0,d.key);
  const pos=e.clientY>innerHeight*.55?'bottom':'top';
  if(o.join()!==d.L.order.join()||pos!==d.L.pos){d.L={order:o,pos};applyLayout(d.L)}
  const r=hd.getBoundingClientRect();d.hint.innerHTML=`<span>${pos==='bottom'?'↓ Encadrés en bas de la page':'↑ Encadrés en haut de la page'}</span>`;
  Object.assign(d.hint.style,{left:r.left+'px',width:r.width+'px',top:(pos==='bottom'?r.top-4:r.bottom)+'px'})}
function hbKey(e){if(e.key==='Escape'&&hbDrag){const d=hbDrag;d.L=normL({order:JSON.parse(d.from).o,pos:JSON.parse(d.from).p});d.cancel=true;hbEnd()}}
function hbEnd(){const d=hbDrag;if(!d)return;hbDrag=null;document.removeEventListener('pointermove',hbMove);document.removeEventListener('pointerup',hbEnd);document.removeEventListener('keydown',hbKey);
  d.g.remove();d.hint.remove();d.w.classList.remove('hb-ph');document.body.classList.remove('hb-dragging');hbSwallow=Date.now();
  if(d.cancel){applyLayout();return}
  if(JSON.stringify({o:d.L.order,p:d.L.pos})===d.from){applyLayout();return}
  saveMyLayout(d.L);applyLayout();toast('Disposition enregistrée pour vous · réinitialiser : badge du compte')}
function layoutPopHTML(){if(role()!=='centraliste')return '';const L=layoutGet();const src={perso:'la vôtre',centrale:'celle de la centrale',defaut:'celle par défaut'}[L.src];
  return `<p class="ps-sub">Disposition des encadrés</p><p class="muted" style="margin:0;font-size:12.5px">Actuelle : ${src} · ${L.order.map(k=>BOX_N[k]).join(' · ')} · ${L.pos==='bottom'?'en bas':'en haut'}</p>
   <button class="pop-b" data-pa="lay-reset">Réinitialiser la disposition</button><button class="pop-b" data-pa="lay-set">Définir comme disposition de la centrale</button>`}
const H30=()=>{const o=[];for(let m=360;m<=1320;m+=30)o.push([`${pad(Math.floor(m/60))}:${pad(m%60)}`,`${Math.floor(m/60)} h ${pad(m%60)}`]);return o};
function headHTML(iso){
  const dd=dayRO(iso);
  const ech=sens=>dd.ech.map((e,i)=>e.sens!==sens?'':`<span class="chip ${sens==='recu'?'info':''}">${esc(e.c)} ×${e.n} <small>${esc(e.per)}</small>${chipX('ech-x',i,e.c)}</span>`).join('');
  const et=dd.etat||{k:'ouverte'};
  const etW=etatWin(iso);const etChip=(!et.k||et.k==='ouverte'||et.k==='panne')?`<button class="chip ok" data-act="etat" title="État de la centrale · ajouter une panne">Ouverte</button>`:`<button class="chip bad" data-act="etat">Fermée ${esc(etW?etW.lbl:'')}${et.t?' · '+esc(et.t):''}</button>`;
  const pn=pannesOn(iso);const pannesLine=pn.length?`<div class="chips pannes">${pn.map((x,i)=>`<span class="chip panne ${x.fin?'fin':''}" title="${x.fin?'Panne terminée à '+esc(hm(x.fin))+(x.finBy?' · '+esc(x.finBy):''):'Panne en cours'}${x.by?' · notée par '+esc(x.by):''}"><b>Panne</b> ${esc(panneLbl(x))}${x.t?' · '+esc(x.t):''}${x.fin?' · terminée':''}${x.fin?'':`<button class="pn-b" data-act="panne-end" data-i="${i}" title="La panne est réparée : fermer la case">Terminée</button>`}<button class="x" data-act="panne-x" data-i="${i}" aria-label="Annuler cette panne" title="Annuler (panne notée par erreur)">×</button></span>`).join('')}</div>`:'';
  const det=ech('donne')+convChips(iso,'pret')+convChips(iso,'ailleurs');
  // encadrés vides : repliés (titre et boutons « + » seulement)
  const vEch=!dd.ech.length&&!det&&!convChips(iso,'abs'),vVie=!dd.presents.length&&!dd.passation.length&&!dd.events.length&&!dd.labo.length&&!pn.length&&(!et.k||et.k==='ouverte'),vAgg=!(dd.semis||[]).length&&!(dd.ciments||[]).length;
  return `<div class="hb-w ${vEch?'hb-vide':''}" data-box="ech"><div class="hb" data-act="hb">
      <div class="hb-h"><span class="lbl" title="Rester appuyé sur le bord ou le titre pour déplacer">// Planning camions</span></div>
      <div class="hb-body">
      <div class="chips"><span class="lbl" title="Camions qui viennent à la centrale">Renforts</span>${ech('recu')||'<span class="muted">—</span>'}</div>
      <div class="chips"><span class="lbl" title="Camions qui quittent la centrale">Détachements</span>${det||'<span class="muted">—</span>'}</div>
      ${convChips(iso,'abs')?`<div class="chips"><span class="lbl">Absents</span>${convChips(iso,'abs')}</div>`:''}
      </div>
      <div class="hb-add"><button class="chip add" data-act="ech-add" data-v="Renfort">+ Renfort</button><button class="chip add" data-act="ech-add" data-v="Détachement">+ Détachement</button><button class="chip add" data-act="ech-add" data-v="Camion absent">+ Absent</button></div>
    </div></div>
    <div class="hb-w ${vVie?'hb-vide':''}" data-box="vie"><div class="hb" data-act="hb">
      <div class="hb-h"><span class="lbl" title="Rester appuyé sur le bord ou le titre pour déplacer">// Journal de bord</span>${etChip}</div>
      <div class="hb-body">${pannesLine}
      ${dd.presents.length?`<div class="chips">${dd.presents.map((p,i)=>`<span class="chip ${p.rempl?'warn':''}" title="${p.rempl?'Remplaçant':'Centraliste'}"><b>${esc(p.n)}</b><small>${esc(p.pl)}${p.rempl?' · remplaçant':''}</small>${role()==='centraliste'?chipX('pres-x',i,p.n):''}</span>`).join('')}</div>`:''}
      ${dd.passation.length?`<div class="chips">${dd.passation.map((p,i)=>`<button class="chip ${p.on?'on':''}" data-act="pass" data-i="${i}" title="Posé par ${esc(p.by||'?')} · clic : fait / à faire">${esc(p.t)}<small>${esc(p.by||'')}</small><span class="x" data-act="pass-x" data-i="${i}" role="button" aria-label="Retirer">×</span></button>`).join('')}</div>`:''}
      ${dd.events.length||dd.labo.length?`<div class="chips">${dd.events.map((e,i)=>`<span class="chip ${e.k==='prod'?'prod':'dash'}">${e.h?`<b>${esc(hm(e.h))}</b> `:''}${esc(e.t)}${chipX('ev-x',i,e.t)}</span>`).join('')}${dd.labo.map((l,i)=>`<span class="chip ok">Labo ${esc(hm(l.h))} · ${esc(l.t)}${chipX('labo-x',i,l.t)}</span>`).join('')}</div>`:''}
      ${!dd.presents.length&&!dd.passation.length&&!dd.events.length&&!dd.labo.length?'<span class="muted">Rien de noté.</span>':''}
      </div>
      <div class="hb-add">${role()==='centraliste'?'<button class="chip add" data-act="pres-add">+ Présent</button>':''}<button class="chip add" data-act="pass-add">+ Passation</button><button class="chip add" data-act="ev-add">+ Événement</button><button class="chip add" data-act="prod-chg">+ Changement produit</button><button class="chip add" data-act="labo-add">+ RDV labo</button></div>
    </div></div>
    <div class="hb-w agg ${vAgg?'hb-vide':''}" data-box="agg"><div class="hb" data-act="hb" data-day="${iso}">
      <div class="hb-h"><span class="lbl" title="Rester appuyé sur le bord ou le titre pour déplacer">// Agrégats · ciments</span></div>
      <div class="hb-body">${aggInner(iso)}</div>
      <div class="hb-add"><button class="chip add" data-act="semi-add">+ Semi</button><button class="chip add" data-act="cim-add">+ Liant</button></div>
    </div></div>`;
}

function watchItems(iso){
  const os=ordersOn(iso).filter(o=>statut(o)!=='annulee');const it=[];
  os.forEach(o=>{const a=attente(o.f);if(a)it.push(`<button class="chip warn" data-act="focus" data-oid="${o.id}">${esc(a)} · ${esc(siteName(o))}</button>`)});
  const nx=step(iso,1);
  [...os,...ordersOn(nx).filter(o=>statut(o)!=='annulee')].forEach(o=>{if(o.pompe&&!o.pompe.bon)it.push(`<button class="chip warn" data-act="focus" data-oid="${o.id}">Bon de pompe · ${esc(dayShort(o.date))} · ${esc(o.pompe.f)}</button>`)});
  [...os,...ordersOn(nx).filter(o=>statut(o)!=='annulee')].forEach(o=>{if(o.pompe&&o.pompe.resa==='todo')it.push(`<button class="chip bad blink" data-act="focus" data-oid="${o.id}">Pompe à réserver · ${esc(pompeLabel(o.pompe))} · ${esc(dayShort(o.date))}</button>`);if(o.resa==='todo'&&o.cam)it.push(`<button class="chip bad blink" data-act="focus" data-oid="${o.id}">À réserver · ${esc(o.cam)} · ${esc(dayShort(o.date))}</button>`)});
  const pd=pendingOn(iso).length;if(pd)it.push(`<button class="chip bad blink" data-act="tab" data-v="planning">${pd} à valider ce jour</button>`);
  os.forEach(o=>{if(o.modv)it.push(`<button class="chip warn" data-act="focus" data-oid="${o.id}">Modif. à valider · ${esc(cl(o.cl).n)}</button>`)});
  os.forEach(o=>{if(o.pompe&&o.pompe.t==='BQA'&&!/bqa/i.test(o.f))it.push(`<button class="chip bad" data-act="focus" data-oid="${o.id}">BQA requise · ${esc(siteName(o))}</button>`)});
  S.orders.filter(o=>o.pay&&!o.pay.paye&&o.date<=iso&&o.kind!=='aplacer'&&statut(o)!=='annulee').forEach(o=>it.push(`<button class="chip bad" data-act="focus" data-oid="${o.id}">Paiement · ${esc(cl(o.cl).n)}</button>`));
  const ap=S.orders.filter(o=>o.kind==='aplacer').length;if(ap)it.push(`<button class="chip info" data-act="tab" data-v="demandes">${ap} à placer</button>`);
  const dm=S.demandes.filter(r=>!r.done).length;if(dm)it.push(`<button class="chip info" data-act="tab" data-v="demandes">${dm} demande${dm>1?'s':''}</button>`);
  return it;
}
function footHTML(iso){
  const t=totals(iso),dd=dayRO(iso),it=watchItems(iso);
  return `<div class="ft big"><b>${fmt(t.m3)}</b> m³</div>
    <div class="ft">chargés <b>${fmt(t.liv)}</b></div>
    <div class="ft">tours <b>${t.p}/${t.n}</b></div>
    <div class="grow"></div>
    ${view.tab==='planning'&&view.mode==='jour'?`<div class="seg vue vue-c" role="group" aria-label="Affichage des chantiers">${[['simple','Simple','Une ligne par chantier, le strict minimum'],['normal','Normal','Infos, bulles et commentaires'],['detail','Détaillé','Tous les détails de chaque chantier']].map(([k,l,t])=>`<button class="${(prefs.vue||'normal')===k?'on':''}" data-act="vue" data-v="${k}" title="${t}">${l}</button>`).join('')}</div>`:''}
    ${(()=>{const n=chatUnread();return `<button class="chat-b ${n?'has':''}" data-act="chat" title="Chat de la centrale${n?' · '+n+' nouveau'+(n>1?'x':''):''}" aria-label="Ouvrir le chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg><span>Chat</span>${n?`<b>${n}</b>`:''}</button>`})()}`;
}

/* ---------- une ligne = un chantier ---------- */
const phOpen=new Set();
function rowHTML(o,editors){
  if(prefs.vue==='simple'&&!isPhone())return rowCompact(o,editors);
  const SIM=simple();
  const c=cl(o.cl),ch=chan(o.ch),st=statut(o),fam=family(o.f);
  const tot=total(o),liv=livre(o),sap=sapOf(o),att=attente(o.f);
  const siteTxt=ch?(ch.nom||ch.adr):'Chantier ?';
  const siteTitle=ch?(ch.nom&&ch.adr?ch.adr:(ch.nom?'Chantier de fond':'Adresse seule'))+' · ouvrir la carte':'';
  const mapQ=ch?(ch.adr||ch.nom):'';
  const cap=capOf(o.cam,o.f);const DET2=prefs.vue==='detail'&&!SIM;
  const tours=o.tours.map((t,i)=>{const cp=t.v<cap-0.01;
    const lab=isBag(o)&&!DET2?`${t.p?esc(t.p):''}<sub>${nBags(t.v)}b</sub>`:DET2?`<b>${fmt(t.v)}${isBag(o)?' · '+nBags(t.v)+'b':''}</b><small>${t.c?esc(t.c):t.p?esc(t.p):'—'}</small>`:t.c?esc(t.c):`${t.p?esc(t.p):''}${cp?(t.p?`<sub>${fmt(t.v)}</sub>`:fmt(t.v)):''}`;
    const tl=`Tour ${i+1} · ${fmt(t.v)} m³${isBag(o)?' = '+nBags(t.v)+' bags':''} · ${t.s?'chargé':'prévu'}${t.p?' · '+t.p:''}${t.c?' · chargé par '+t.c:''}${t.x?' · tour ajouté':''}${t.mv&&byId(t.mv)?' · replacé vers '+siteName(byId(t.mv)):''}${t.plein?' · toupie rechargée pleine':''}${t.rf&&byId(t.rf)?' · venu de '+siteName(byId(t.rf)):''}`;
    return `<button class="t ${DET2?'t2':''} ${t.s?'on':''} ${cp?'cp':''} ${t.c?'ext':''} ${t.x&&!t.rf?'xtra':''} ${t.mv?'mv':''} ${t.rf?'rf':''} ${t.plein?'plein':''}" data-act="tour" data-i="${i}" data-long="1" title="${esc(tl)} · clic long : plaque, centrale, volume" aria-label="${esc(tl)}">${lab}</button>`}).join('');
  const cam=[o.cam,o.camNote].filter(Boolean).join(' ');
  const pom=o.pompe?`<button class="mo ${o.pompe.bon?'on':'warn'}" data-act="pompe" title="${o.pompe.bon?'Bon de pompe envoyé':'Bon de pompe à faire la veille'} · clic pour changer">${esc(pompeLabel(o.pompe))}</button>${pompeResa(o)}${o.pompe.t==='BQA'&&!/bqa/i.test(o.f)?'<span class="mo bad">BQA ?</span>':''}`:'<span class="faint">—</span>';
  const ed=editors[o.id];
  const ouv=o.ouv?`${o.ouv} · `:'';
  const nC=TR(o).filter(t=>t.s).length,nT=TR(o).length;
  const PH=isPhone(),OPEN=PH&&phOpen.has(o.id);
  const phT=PH?`<div class="r-tours ph-t" aria-label="Tours">${o.tours.length?o.tours.map((t,i)=>`<span class="t ${t.s?'on':''} ${t.c?'ext':''} ${t.mv?'mv':''} ${t.rf?'rf':''}" title="Tour ${i+1} · ${fmt(t.v)} m³ · ${t.s?'chargé':'prévu'}${t.p?' · '+esc(t.p):''}${t.c?' · '+esc(t.c):''}"><b>${fmt(t.v)}</b>${t.c?`<small>${esc(t.c)}</small>`:t.p?`<small>${esc(t.p)}</small>`:''}</span>`).join(''):'<span class="faint">Aucun tour</span>'}<span class="ph-n">${nC}/${nT} chargé${nC>1?'s':''}</span></div>`:'';
  return `<article class="row ${DET2&&!PH?'det2':''} st-${st} kind-${o.kind} ${ed?'editing':''} ${PH?'ph':''} ${OPEN?'open':''}" data-id="${o.id}" id="row-${o.id}">
    ${ed?`<span class="editby">Verrouillée · ${esc(ed)} modifie</span>`:''}
    <div class="r-time">${esc(o.h)}</div>
    <div class="c r-cl"><button class="r-client" data-act="edit" title="${esc(ouv+(c.note||(c.t==='comptant'?'Client comptant':'Client en compte')))} · modifier">${esc(c.n)}</button>${o.pay?`<button class="tag pay ${o.pay.paye?'ok':''}" data-act="pay" data-long="1" title="Client comptant · clic : payé / en attente · clic droit : paiements du client${payTxt(o.pay)?' · '+esc(payTxt(o.pay)):''}">${o.pay.paye?'PAYÉ':'€ ATTENTE'}${payTot(o.pay)?' '+esc(fmtE(payTot(o.pay))):''}</button>`:''}${o.spec?'<span class="tag spec" title="Mise en avant par le commercial">SPÉCIALE</span>':''}${o.modv?`<button class="tag modv" data-act="modv" title="Modifiée par ${esc(o.modv.by)} à ${esc(o.modv.at)}${role()==='centraliste'?' · clic : valider':''}">MODIF. À VALIDER</button>`:''}</div>
    <div class="r-vol ${liv>tot+0.01?'over':''}" data-act="vol" data-long="1" title="${nC}/${nT} tours${o.plus?' · + 1 tour à confirmer':''} · clic droit : modifier le cubage demandé"><b>${fmt(liv)}</b>/${fmt(tot)}${o.plus?'<i class="vplus" title="Et plus : 1 tour, quantité à confirmer">+</i>':''}${isBag(o)?`<small class="bags" title="Citybag : 1 bag = 0,5 m³">${nBags(liv)}/${nBags(tot)} bags</small>`:''}</div>
    <div class="c r-ch">${o.kind==='pour'?`<span class="tag pour" style="margin:0 5px 0 0">POUR ${esc(o.pour.toUpperCase())}</span>`:''}${ch?`<a class="r-site ${ch.nom?'':'adr'}" data-act="map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ+' 06')}" target="_blank" rel="noopener" title="${esc(siteTitle)}">${esc(siteTxt)}</a>`:''}${ch&&ch.ot?'<span class="tag" title="Adresse unique à ce coulage">OT</span>':''}${o.am?'<span class="tag" title="Déborde sur l\'après-midi">→ AM</span>':''}</div>
    <div class="c r-fo"><button class="r-form ${att?'att':'fam-'+fam}" data-act="formule" title="${esc(o.f)}${sap?' · SAP '+sap:' · pas de SAP'}${known(o.f)?'':' · formule non répertoriée'}">${esc(o.f||'Formule ?')}</button>${fLaboTag(o)}</div>
    <div class="r-cam">${cam?`<span class="mo">${esc(cam)}</span>`:'<span class="faint">8x4</span>'}${resaBadge(o)}</div>
    <div class="r-pom">${pom}</div>
    <div class="r-pills" ${o.pills.length>1?'data-more="1"':''}>${o.pompe&&o.pompe.beto?'<span class="mo bag" title="Betobag à prévoir (chantier avec pompe)">Betobag</span>':''}${pillsRow(o)}</div>
    <button class="r-menu" data-act="menu" aria-label="Actions sur la commande" title="Statut, modifier, dupliquer…">⋯</button>
    ${PH?phT:SIM?`<div class="r-tours r-st"><span class="st-dot ${st}"></span>${STATUTS[st]} · ${nC}/${nT} tours${o.plus?(role()==='centraliste'?' <button class="mo t-plus" data-act="plus">+1T à confirmer</button>':' <span class="mo t-plus" title="Complément prévu, à confirmer par le centraliste">+1T à confirmer</span>'):''}</div>`:`<div class="r-tours">${tours}${o.plus?`<button class="t t-plus ${DET2?'t2':''}" data-act="plus" data-long="1" title="Complément à confirmer : 1 tour, quantité inconnue · clic : confirmer ou retirer">${DET2?'<b>?</b><small>+1T</small>':'+?'}</button>`:''}${o.st==='terminee'||o.st==='annulee'?'':`<button class="t-add" data-act="addtour" title="Complément non prévu : charger un tour de plus, ou noter un complément prévu" aria-label="Ajouter un complément">+</button>`}</div>`}
    ${prefs.vue==='detail'||OPEN?detLine(o,c,ch,sap):''}
  </article>`;
}
function pompeResa(o){const p=o.pompe;if(!p||!p.resa)return '';return p.resa==='ok'?'<span class="resa ok" title="Pompe réservée">RÉSERVÉ</span>':`<button class="resa todo" data-act="presa" title="${peutValider()?'Clic : valider la réservation de la pompe':'En attente de réservation'}">À RÉSERVER</button>`}
function resaBadge(o){if(!o.cam||!o.resa)return '';
  return o.resa==='ok'?'<span class="resa ok" title="Petits camions réservés">RÉSERVÉ</span>':`<button class="resa todo" data-act="resa" title="${peutValider()?'Clic : valider la réservation':'En attente de réservation'}">À RÉSERVER</button>`}
function detLine(o,c,ch,sap){
  const d=[];
  if(o.tel)d.push(`<span><i>Contact</i><b class="mono">${esc(o.tel)}</b></span>`);
  if(ch&&ch.nom&&ch.adr)d.push(`<span><i>Adresse</i>${esc(ch.adr)}</span>`);
  if(o.ouv)d.push(`<span><i>Ouvrage</i>${esc(o.ouv)}</span>`);
  if(sap)d.push(`<span><i>SAP</i><b class="mono">${esc(sap)}</b></span>`);
  d.push(`<span><i>Client</i>${c.t==='comptant'?'comptant':'en compte'}${c.note?' · '+esc(c.note):''}</span>`);
  if(o.pay&&o.pay.note)d.push(`<span><i>Paiement</i>${esc(o.pay.note)}</span>`);
  d.push(`<span><i>Saisie</i>${esc(o.by||'?')}${o.maj?' · modifiée par '+esc(o.maj.by)+' à '+esc(hm(o.maj.at.slice(11))):''}</span>`);
  return `<div class="r-det">${d.join('')}</div>`;
}
function peekRender(){let pk=document.getElementById('peek');const o=view.apPeek?byId(view.apPeek):null;
  if(!o||o.kind!=='aplacer'||view.tab!=='planning'||view.mode!=='jour'||o.date!==view.date){if(view.apPeek&&(!o||o.kind!=='aplacer'))view.apPeek=null;if(pk)pk.remove();return}
  if(!pk){pk=document.createElement('div');pk.id='peek';pk.className='peek';document.body.appendChild(pk)}
  const c=cl(o.cl),CE=role()==='centraliste';const tb=document.querySelector('.top');const r=tb?tb.getBoundingClientRect():{bottom:70};const side=document.getElementById('side');const sl=side&&!side.hidden?side.getBoundingClientRect().right:0;
  pk.style.top=(r.bottom+8)+'px';pk.style.left=(sl+16)+'px';
  pk.innerHTML=`<div class="pk-in" data-id="${o.id}"><div class="pk-h"><span class="lbl">// Commande à valider · ${esc(dayLong(o.date))}</span><span class="muted">de ${esc(o.by)}${o.cre?' · reçue le '+esc(dayShort(o.cre)):''}</span><button class="pk-x" data-act="peek-x" aria-label="Fermer" title="Fermer">×</button></div>
   <div class="pk-l"><span class="r-time">${esc(o.h)}</span><b>${esc(c.n)}</b><span class="mono">${fmt(total(o))} m³</span><span>${esc(siteName(o))}</span><span class="mono">${esc(o.f)}</span>${o.cam?`<span class="mo">${esc(o.cam)}</span>`:'<span class="faint">8x4</span>'}${o.pompe?`<span class="mo">${esc(pompeLabel(o.pompe))}</span>`:''}${o.pompe&&o.pompe.beto?'<span class="mo bag">Betobag</span>':''}${o.pompe&&o.pompe.city?'<span class="mo bag">Citybag</span>':''}</div>
   ${o.souhait||o.pills.length?`<div class="pk-c">${o.souhait?`<span>Souhait : ${esc(o.souhait)}</span>`:''}${o.pills.map(p=>`<span class="chip">${esc(p.t)}</span>`).join('')}</div>`:''}
   <div class="pk-a">${peutValider()?'<button class="btn primary" data-act="ap-ok">Valider au planning</button>':'<span class="tag pour">EN ATTENTE DU CENTRALISTE</span>'}<button class="btn pk-m" data-act="ap-menu" aria-label="Modifier, commenter, autre jour" title="Modifier, commenter, autre jour">⋯</button><span class="muted pk-n">Le planning du jour est affiché dessous pour voir la place disponible.</span></div></div>`;
}
function pendRow(o){const c=cl(o.cl);const CE=role()==='centraliste';
  return `<article class="prow" data-id="${o.id}" id="row-${o.id}"><span class="r-time">${esc(o.h)}</span><b>${esc(c.n)}</b><span class="mono">${fmt(total(o))} m³</span><span>${esc(siteName(o))}</span><span class="mono">${esc(o.f)}</span>${o.cam?`<span class="mo">${esc(o.cam)}</span>`:''}${o.pompe?`<span class="mo">${esc(pompeLabel(o.pompe))}</span>`:''}<span class="muted">${esc(o.by)}${o.souhait?' · '+esc(o.souhait):''}</span>${inWin(o.h,closedWin(o.date))?`<span class="tag closed-tag" title="${esc(winTxt(closedWin(o.date)))}">CENTRALE FERMÉE</span>`:''}
    <span class="pacts">${peutValider()?'<button class="btn sm primary" data-act="ap-ok">Valider</button><button class="btn sm" data-act="edit">Modifier</button><button class="btn sm" data-act="ap-show">Afficher le planning</button>':'<span class="tag pour">EN ATTENTE DU CENTRALISTE</span><button class="btn sm" data-act="edit">Modifier</button>'}</span></article>`}
function rowCompact(o,editors){
  const c=cl(o.cl),ch=chan(o.ch),st=statut(o),fam=family(o.f),att=attente(o.f);
  const n=TR(o).length,k=TR(o).filter(t=>t.s).length,ed=editors[o.id];
  const bar=`<span class="prog" aria-hidden="true">${o.tours.map(t=>`<i class="${t.s?'on':''} ${t.c?'ext':''} ${t.mv||t.rf?'mv':''}"></i>`).join('')}</span>`;
  return `<article class="row st-${st} kind-${o.kind} ${ed?'editing':''}" data-id="${o.id}" id="row-${o.id}">
    ${ed?`<span class="editby">Verrouillée · ${esc(ed)} modifie</span>`:''}
    <div class="r-time">${esc(o.h)}</div>
    <div class="c r-cl"><button class="r-client" data-act="edit">${esc(c.n)}</button>${o.pay?`<button class="tag pay ${o.pay.paye?'ok':''}" data-act="pay" title="${o.pay.paye?'Payé · clic : remettre en attente':'Client comptant · clic : paiement reçu'}">${o.pay.paye?'PAYÉ':'€'}</button>`:''}${o.spec?'<span class="tag spec">SPÉC.</span>':''}</div>
    <div class="r-vol" data-act="vol" data-long="1"><b>${fmt(livre(o))}</b>/${fmt(total(o))}${o.plus?'<i class="vplus" title="Et plus : 1 tour, quantité à confirmer">+</i>':''}</div>
    <div class="c r-ch">${o.kind==='pour'?`<span class="tag pour" style="margin:0 5px 0 0">${esc(o.pour.toUpperCase())}</span>`:''}${esc(siteName(o))}</div>
    <div class="c r-fo"><button class="r-form ${att?'att':'fam-'+fam}" data-act="formule">${esc(o.f||'?')}</button>${fLaboTag(o)}</div>
    <div class="r-prog" title="${k}/${n} tours chargés">${bar}<span class="mono">${k}/${n}</span>${o.pompe?`<button class="mo ${o.pompe.bon?'on':'warn'}" data-act="pompe" title="${o.pompe.bon?'Bon de pompe fait':'Clic : bon de pompe fait'}">${esc(o.pompe.t==='BQA'?'BQA':o.pompe.t+' m')}</button>`+pompeResa(o):''}${o.cam?`<span class="mo">${esc(o.cam)}</span>`+resaBadge(o):''}${o.plus?'<button class="mo t-plus" data-act="plus" data-long="1" title="Complément à confirmer">+1T ?</button>':''}${o.pills.length?`<button class="tag" data-act="pills-all" title="${esc(o.pills.map(p=>p.t).join(' · '))}">${o.pills.length} info${o.pills.length>1?'s':''}</button>`:''}</div>
    <button class="r-menu" data-act="menu" aria-label="Actions sur la commande">⋯</button>
  </article>`;
}

/* créneau de fermeture ou de panne de la centrale : [début, fin, libellé] en minutes */
function etatWin(iso){const et=(dayRO(iso)||{}).etat;if(!et||et.k==='ouverte'||et.k==='panne')return null;const p=et.per||'journee';
  const w=p==='matin'?[0,720,'le matin']:p==='aprem'?[720,1440,'l\'après-midi']:p==='horaires'&&et.de&&et.a?[mins(et.de),mins(et.a),hm(et.de)+' – '+hm(et.a)]:[0,1440,'toute la journée'];
  return {de:w[0],a:w[1],lbl:w[2],k:et.k,t:et.t||''}}
/* pannes du jour : chacune est une case (de, à, cause), en cours ou terminée */
const pannesOn=iso=>((dayRO(iso)||{}).pannes||[]);
const panneLbl=x=>`${hm(x.de)} – ${hm(x.a)}`;
/* fenêtre(s) sans chargement : fermeture de la centrale + pannes */
function closedWin(iso){const L=[];const e=etatWin(iso);if(e)L.push(e);
  pannesOn(iso).forEach(x=>{if(x.de&&x.a&&mins(x.a)>mins(x.de))L.push({de:mins(x.de),a:mins(x.a),lbl:panneLbl(x)+(x.fin?' (terminée)':''),k:'panne',t:x.t||''})});
  if(!L.length)return null;if(L.length===1)return L[0];
  return {de:Math.min(...L.map(x=>x.de)),a:Math.max(...L.map(x=>x.a)),lbl:L.map(x=>x.lbl).join(' · '),k:L.some(x=>x.k==='fermee')?'fermee':'panne',t:L.map(x=>x.t).filter(Boolean).join(' · '),list:L}}
const inWin=(h,w)=>!!w&&(w.list?w.list.some(x=>mins(h)>=x.de&&mins(h)<x.a):mins(h)>=w.de&&mins(h)<w.a);
const winTxt=w=>w.list?`Centrale ${w.list.map(x=>(x.k==='panne'?'en panne ':'fermée ')+x.lbl+(x.t?' · '+x.t:'')).join(' ; ')}`:`Centrale ${w.k==='panne'?'en panne':'fermée'} ${w.lbl}${w.t?' · '+w.t:''}`;
function dayHTML(iso){
  if(isWE(iso)&&!weOpen(iso)&&!hasOrders(iso)&&!nuitVeille(iso).length)return `<div class="we-panel"><p class="lbl">// Week-end</p><h2>${esc(dayLong(iso))}</h2><p>La centrale n'a pas de journée planning ce jour.</p>${role()==='centraliste'?`<button class="btn primary" data-act="we-open" data-d="${iso}">Créer une journée planning ce jour</button><p class="muted">Ouverture exceptionnelle : le jour s'ajoute au planning et à la navigation.</p>`:'<p class="muted">Une commande passée ce jour proposera de créer l\'ouverture.</p>'}</div>`;
  if(isWE(iso)&&!weOpen(iso)&&!hasOrders(iso)){const v=nuitVeille(iso),ed=editingMap(),pv=addDays(iso,-1);const m=v.reduce((a,o)=>a+total(o),0),n=v.reduce((a,o)=>a+TR(o).length,0);
    return `<p class="half-l nuit-v">Nuit précédente · depuis ${esc(dayShort(pv).toLowerCase())} soir · ${fmt(m)} m³ · ${n} tour${n>1?'s':''}</p>${v.map(o=>rowHTML(o,ed).replace('class="row ','class="row veille ')).join('')}
    <div class="we-panel we-nuit"><p class="lbl">// Week-end</p><p>${esc(dayLong(iso))} : seule la fin de la nuit est affichée, pas de journée planning ce jour.</p>${role()==='centraliste'?`<button class="btn" data-act="we-open" data-d="${iso}">Créer une journée planning ce jour</button>`:''}</div>`}
  const os=ordersOn(iso).filter(o=>prefs.vue==='detail'||statut(o)!=='annulee');const editors=editingMap();
  const pend=pendingOn(iso);
  const am=os.filter(o=>mins(o.h)<720),pm=os.filter(o=>mins(o.h)>=720&&mins(o.h)<NUIT),nu=os.filter(o=>mins(o.h)>=NUIT);
  const prevD=addDays(iso,-1),veille=ordersOn(prevD).filter(o=>mins(o.h)>=NUIT&&statut(o)!=='annulee');
  const sub=list=>{const l=list.filter(o=>statut(o)!=='annulee');const m=l.reduce((a,o)=>a+total(o),0),n=l.reduce((a,o)=>a+TR(o).length,0);return `${fmt(m)} m³ · ${n} tour${n>1?'s':''}`};
  const nowM=iso===TODAY?(new Date().getHours()*60+new Date().getMinutes()):-1;
  const cw=closedWin(iso);
  const rows=(list,from,to)=>{let zi=0,h='',placed=nowM<from||nowM>=to;list.forEach(o=>{if(!placed&&mins(o.h)>nowM){h+=nowLine();placed=true}let r=rowHTML(o,editors);if(inWin(o.h,cw))r=r.replace('class="row ','class="row closed ');if(zi++%2)r=r.replace('class="row ','class="row alt ');h+=r});if(!placed)h+=nowLine();return h};
  const band=(()=>{if(!cw)return '';const l=os.filter(o=>statut(o)!=='annulee'&&inWin(o.h,cw));const tt=l.reduce((a,o)=>a.concat(TR(o).filter(t=>!t.s&&!t.c)),[]);const m=tt.reduce((a,t)=>a+t.v,0);
    return `<div class="closed-band" role="alert"><b>${esc(winTxt(cw))}</b><span>${role()==='centraliste'?(tt.length?`${tt.length} tour${tt.length>1?'s':''} à replacer · ${fmt(m)} m³`:(l.length?'Tous les tours du créneau sont replacés':'Aucune commande sur ce créneau')):'Pas de chargement à La Bocca sur ce créneau : voir avec le centraliste avant de placer un chantier.'}</span>${role()==='centraliste'&&tt.length?'<button class="btn sm" data-act="clo-rep">Replacer les tours dans une autre centrale…</button>':''}</div>`})();
  const conts=am.filter(o=>o.am&&statut(o)!=='annulee').map(o=>`<button class="cont" data-act="focus" data-oid="${o.id}"><span class="mono">↳</span><b>${esc(siteName(o))}</b>${esc(cl(o.cl).n)} · suite du coulage de ${esc(hm(o.h))} · ${fmt(livre(o))}/${fmt(total(o))} m³</button>`).join('');
  const SIM=simple();
  const CP=prefs.vue==='simple'&&!isPhone();
  const LH=`<div class="lh">${CP?'<span>Heure</span><span>Client</span><span class="r">m³</span><span>Chantier</span><span>Formule</span><span>Tours · pompe · infos</span><span></span>':'<span>Heure</span><span>Client</span><span class="r">m³</span><span>Chantier · adresse</span><span>Formule</span><span>Camion</span><span>Pompe</span><span>Commentaires</span><span></span>'}</div>`;
  return `  ${pend.length?`<p class="half-l val">À valider · ${pend.length} commande${pend.length>1?'s':''} du commercial</p>${pend.map(pendRow).join('')}`:''}
  ${(()=>{const t=totals(iso);return `<div class="day-stats"><span class="ft">camions <b>${t.k}</b></span><span class="ft">chantiers <b>${t.c}</b></span>${role()==='centraliste'?'<span class="legend"><span><i></i>prévu</span><span><i class="on"></i>chargé</span><span><i class="cp"></i>complément</span></span>':''}</div>`})()}${LH}${band}${veille.length?`<p class="half-l nuit-v">Nuit précédente · depuis ${esc(dayShort(prevD).toLowerCase())} soir · ${sub(veille)}</p>${veille.map(o=>rowHTML(o,editors).replace('class="row ','class="row veille ')).join('')}`:''}<p class="half-l ${cw&&cw.de<=0&&cw.a>=720?'closed':''}">Matin · ${sub(am)}</p>${am.length?rows(am,0,720):'<p class="empty">Aucune commande le matin.</p>'}
  <p class="half-l pm ${cw&&cw.de<=720&&cw.a>=1440?'closed':''}">Après-midi · ${sub(pm)}</p>${conts}${pm.length?rows(pm,720,NUIT):(conts?'':'<p class="empty">Aucune commande l\'après-midi.</p>')}
  ${nu.length?`<p class="half-l nuit">Nuit · à partir de ${NUIT/60} h, se poursuit le ${esc(dayShort(addDays(iso,1)).toLowerCase())} matin · ${sub(nu)}</p>${rows(nu,NUIT,1440)}`:''}`;
}
const NUIT=19*60;   // chantiers de nuit : à partir de 19 h, repris en haut du planning du lendemain
function nowLine(){const n=new Date();return `<div class="now" aria-label="Heure actuelle"><span>${pad(n.getHours())}:${pad(n.getMinutes())}</span></div>`}

function cardHTML(o){const st=statut(o),c=cl(o.cl),fam=family(o.f);
  return `<button class="card st-${st} kind-${o.kind}" data-act="focus" data-oid="${o.id}">
    <span class="c1"><span>${esc(o.h)}</span><span>${fmt(livre(o))}/${fmt(total(o))}${o.plus?' <b class="vplus">+</b>':''}</span></span>
    <span class="c2">${esc(c.n)}</span><span class="c3">${o.kind==='pour'?'Pour '+esc(o.pour)+' · ':''}${esc(siteName(o))}</span>
    <span class="c4 fam-${fam}">${esc(o.f)}</span>
    ${o.pompe||o.cam?`<span class="c3">${o.pompe?esc(pompeLabel(o.pompe)):''}${o.pompe&&o.cam?' · ':''}${esc(o.cam)}</span>`:''}
  </button>`}
function weekHTML(){
  const mon=mondayOf(view.date);
  const ds=[0,1,2,3,4,5,6].map(i=>addDays(mon,i)).filter((d,i)=>i<5||hasOrders(d));
  const idx=Object.fromEntries(ds.map((d,i)=>[d,i]));
  const by={};ds.forEach(d=>ordersOn(d).forEach(o=>{if(statut(o)==='annulee'||o.kind==='pour')return;(by[o.ch]=by[o.ch]||[]).push(o)}));
  const series=Object.keys(by).map(k=>{const l=by[k];return {l,dset:[...new Set(l.map(o=>o.date))].sort()}}).filter(s=>s.dset.length>1);
  let h=`<div class="wk-legend" aria-hidden="true"><span><i style="background:var(--ink)"></i>Matin</span><span><i style="background:var(--orange)"></i>Après-midi</span><span><i style="background:#3b4cc0"></i>Nuit</span><span>barre : m³ du jour, comparés au jour le plus chargé de la semaine</span></div><div class="wk-scroll"><div class="wk" style="grid-template-columns:repeat(${ds.length},minmax(160px,1fr))">`;
  // charge de chaque jour : m³ matin / après-midi / nuit, à l'échelle du jour le plus chargé de la semaine
  const ch=ds.map(d=>{const os=ordersOn(d).filter(o=>statut(o)!=='annulee'&&o.kind!=='pour');const sum=f=>os.filter(f).reduce((a,o)=>a+total(o),0);
    return {am:sum(o=>mins(o.h)<720),pm:sum(o=>mins(o.h)>=720&&mins(o.h)<NUIT),nu:sum(o=>mins(o.h)>=NUIT),pomp:os.filter(o=>o.pompe).length,av:pendingOn(d).length}});
  const mx=Math.max(1,...ch.map(c=>c.am+c.pm+c.nu));
  ds.forEach((d,i)=>{const t=totals(d),c=ch[i],w=v=>(100*v/mx).toFixed(1)+'%';
    h+=`<button class="wk-h ${d===TODAY?'today':''} ${d===view.date?'sel':''}" style="grid-column:${i+1};grid-row:1" data-act="goto" data-d="${d}" title="${fmt(c.am)} m³ le matin · ${fmt(c.pm)} m³ l'après-midi${c.nu?' · '+fmt(c.nu)+' m³ la nuit':''}"><span class="wk-d">${JC[dow(d)]} ${D(d).getUTCDate()}</span><span class="wk-t"><b>${fmt(t.m3)}</b> m³</span>
      <span class="wk-load" aria-hidden="true"><i class="am" style="width:${w(c.am)}"></i><i class="pm" style="width:${w(c.pm)}"></i><i class="nu" style="width:${w(c.nu)}"></i></span>
      <span class="wk-s">${t.n} tour${t.n>1?'s':''}${c.pomp?` · ${c.pomp} pompe${c.pomp>1?'s':''}`:''}${c.av?` · <em>${c.av} à valider</em>`:''}</span></button>`});
  series.forEach((s,k)=>{const a=idx[s.dset[0]],b=idx[s.dset[s.dset.length-1]];const m=s.l.reduce((x,o)=>x+total(o),0);
    h+=`<button class="wk-bar" style="grid-column:${a+1}/${b+2};grid-row:${k+2}" data-act="goto" data-d="${s.dset[0]}" title="Chantier sur ${s.dset.length} jours"><b>${esc(siteName(s.l[0]))}</b> ${esc(cl(s.l[0].cl).n)} · ${s.dset.length} jours · ${fmt(m)} m³</button>`});
  const r=series.length+2;
  ds.forEach((d,i)=>{const os=ordersOn(d).filter(o=>statut(o)!=='annulee');const am=os.filter(o=>mins(o.h)<720),pm=os.filter(o=>mins(o.h)>=720&&mins(o.h)<NUIT),nu=os.filter(o=>mins(o.h)>=NUIT);
    const cw=closedWin(d);h+=`<div class="wk-col ${cw?'closed':''}" style="grid-column:${i+1};grid-row:${r}">${cw?`<span class="wk-closed">${esc(winTxt(cw))}</span>`:''}${os.length?`${am.length?'<span class="wk-half">Matin</span>'+am.map(cardHTML).join(''):''}${pm.length?'<span class="wk-half">Après-midi</span>'+pm.map(cardHTML).join(''):''}${nu.length?'<span class="wk-half nuit">Nuit</span>'+nu.map(cardHTML).join(''):''}`:'<p class="empty">Rien de prévu</p>'}</div>`});
  return h+'</div></div>';
}

/* ---------- demandes : des lignes, la plus ancienne en haut ---------- */
const DEM_CAT={formule:'labo',compo:'labo',resultats:'labo',eprouvettes:'labo',contrat:'labo',chantier:'chantiers',info:'chantiers',visite:'chantiers',modif:'modifs',autre:'autres'};
function demandesHTML(){
  const f=view.dfilter==='envoyees'||view.dfilter==='moi'?view.dfilter:'tous';const CE=role()==='centraliste',ME=author();
  const live=S.orders.filter(o=>statut(o)!=='annulee'&&o.date>=addDays(TODAY,-30));
  const soon=o=>o.date>=TODAY&&o.date<=step(TODAY,1);
  const mine=o=>CE||o.by===ME||role()==='commercial';
  const fdem=r=>f==='moi'?r.pour===role():f==='envoyees'?(r.deRole===role()||r.de===ME):true;
  const dl=(cls,id,date,chip,pour,txt,de,acts)=>`<div class="dl ${cls}" ${id?`data-id="${id}"`:''}><span class="mono">${esc(dayShort(date))}</span><span>${chip}</span><span>${esc(pour)}</span><span class="c" style="white-space:normal">${txt}</span><span class="c muted">${esc(de)}</span><span class="acts">${acts}</span></div>`;
  const oTxt=o=>`<b>${esc(cl(o.cl).n)}</b> · <a href="#" data-act="focus" data-oid="${o.id}">${esc(siteName(o))}</a> · ${esc(hm(o.h))} · ${fmt(total(o))} m³`;
  const voir=o=>`<button class="btn sm" data-act="focus" data-oid="${o.id}">Voir</button>`;
  const cats=[];const add=(k,label,rows)=>{if(rows.length)cats.push({k,label,rows})};
  // 1. placement de chantier (commandes du commercial)
  add('place','Demandes de placement de chantier',f==='moi'&&!CE?[]:S.orders.filter(o=>o.kind==='aplacer'&&(CE||o.by===ME)).sort((a,b)=>(a.cre||a.date).localeCompare(b.cre||b.date)).map(o=>dl('ap',o.id,o.cre||o.date,'<span class="chip info">Placement</span>','Centraliste',`${oTxt(o)} · <span class="mono">${esc(o.f)}</span> · souhait ${esc(dayShort(o.date))}${o.souhait?' · '+esc(o.souhait):''}${o.pills.length?' · '+o.pills.map(p=>esc(p.t)).join(' · '):''}`,o.by,peutValider()?`<button class="btn sm primary" data-act="ap-ok">Placer le ${esc(dayShort(o.date))}</button><button class="btn sm" data-act="ap-show">Afficher le planning</button>`:'<span class="muted">En attente du centraliste</span>')));
  // 2. modifications à valider
  add('modv','Modifications à valider',peutValider()&&f!=='envoyees'?live.filter(o=>o.modv&&o.kind!=='aplacer').map(o=>dl('',o.id,o.date,'<span class="chip warn">Modification</span>','Centraliste',`${oTxt(o)} · modifiée par ${esc(o.modv.by)}${modTxt(o)?`<br><small class="mod-sum">${esc(modTxt(o))}</small>`:''}`,o.modv.by,`<button class="btn sm primary" data-act="modv">Valider</button>${voir(o)}`)):[]);
  // 3. pompes
  if(f!=='envoyees'){const P=[];live.filter(o=>o.pompe&&o.kind!=='aplacer'&&o.date>=TODAY&&mine(o)).sort((a,b)=>(a.date+a.h).localeCompare(b.date+b.h)).forEach(o=>{
      if(o.pompe.resa==='todo')P.push(dl('bad',o.id,o.date,'<span class="chip bad">À réserver</span>','Centraliste',`${oTxt(o)} · pompe ${esc(pompeLabel(o.pompe))}`,cl(o.cl).n,peutValider()?`<button class="btn sm primary" data-act="presa">Réservée</button>${voir(o)}`:voir(o)));
      if(!o.pompe.bon&&soon(o))P.push(dl('',o.id,o.date,'<span class="chip warn">Bon de pompe</span>','Centraliste',`${oTxt(o)} · ${esc(pompeLabel(o.pompe))}`,cl(o.cl).n,`<button class="btn sm primary" data-act="pompe">Bon fait</button>${voir(o)}`));
      if(o.pompe.t==='BQA'&&!/bqa/i.test(o.f))P.push(dl('bad',o.id,o.date,'<span class="chip bad">BQA requise</span>','Centraliste',`${oTxt(o)} · formule ${esc(o.f)}`,cl(o.cl).n,voir(o)))});
    add('pompes','Pompes',P);
    // 4. camions SP4 / SP6
    add('camions','Camions à réserver',live.filter(o=>o.resa==='todo'&&o.cam&&o.date>=TODAY&&mine(o)).map(o=>dl('bad',o.id,o.date,`<span class="chip bad">${esc(o.cam)}</span>`,'Centraliste',oTxt(o),cl(o.cl).n,peutValider()?`<button class="btn sm primary" data-act="resa">Réservé</button>${voir(o)}`:voir(o))));
    // 5. paiements
    add('pay','Paiements',S.orders.filter(o=>o.pay&&!o.pay.paye&&o.kind!=='aplacer'&&statut(o)!=='annulee'&&o.date<=step(TODAY,1)&&mine(o)).sort((a,b)=>a.date.localeCompare(b.date)).map(o=>dl('bad',o.id,o.date,'<span class="chip bad">Comptant</span>',o.date<TODAY?'En retard':'Avant chargement',oTxt(o),cl(o.cl).n,`<button class="btn sm primary" data-act="pay">Paiement reçu</button>${voir(o)}`)));
    // formules en attente
    var att=live.filter(o=>attente(o.f)&&o.date>=TODAY).map(o=>dl('',o.id,o.date,'<span class="chip warn">Formule</span>',/labo/i.test(attente(o.f))?'Labo':'Commercial',`${oTxt(o)} · ${esc(attente(o.f))}${o.fLabo?` · <b>labo : ${esc(o.fLabo.f)}</b>`:''}`,cl(o.cl).n,(role()==='labo'?`<button class="btn sm ${o.fLabo?'':'primary'}" data-act="formule">${o.fLabo?'Modifier la proposition':'Proposer la formule'}</button>`:o.fLabo?'<button class="btn sm primary" data-act="flabo">Appliquer la formule du labo</button>':'')+voir(o)))}
  // 6. demandes entre services, par thème
  const D=S.demandes.map((r,i)=>({r,i})).filter(x=>!x.r.done&&fdem(x.r)).sort((a,b)=>(a.r.le||'').localeCompare(b.r.le||''));
  const dline=({r,i},cls)=>{const o=r.oid?byId(r.oid):null;return dl((cls||'')+(r.done?' done':''),'',r.le,`<span class="chip ${r.pour==='labo'?'ok':'info'}">${esc(DEM_TYPES[r.type]||r.type)}</span>`,POUR[r.pour]||r.pour,`${esc(r.t)}${o?` · <a href="#" data-act="focus" data-oid="${o.id}">${esc(siteName(o))}, ${esc(dayShort(o.date))}</a>`:''}${(r.rep||[]).map(a=>`<span class="rep" style="display:block">↳ ${esc(a.by)} : ${esc(a.t)}</span>`).join('')}`,r.de,`<button class="btn sm" data-act="dem-rep" data-i="${i}">Répondre</button><button class="btn sm ${r.done?'':'primary'}" data-act="dem-done" data-i="${i}">${r.done?'Rouvrir':'Traité'}</button>`)};
  add('labo','Formules et labo',(typeof att!=='undefined'?att:[]).concat(D.filter(x=>DEM_CAT[x.r.type]==='labo').map(x=>dline(x))));
  add('modifs','Modifications de commande',D.filter(x=>DEM_CAT[x.r.type]==='modifs').map(x=>dline(x)));
  add('chantiers','Chantiers et clients',D.filter(x=>DEM_CAT[x.r.type]==='chantiers').map(x=>dline(x)));
  add('autres','Autres demandes',D.filter(x=>!DEM_CAT[x.r.type]||DEM_CAT[x.r.type]==='autres').map(x=>dline(x)));
  // demandes traitées : visibles 24 h après leur traitement, pour tout le monde, puis masquées (gardées dans les données)
  const done=S.demandes.map((r,i)=>({r,i})).filter(x=>x.r.done&&x.r.doneAt&&Date.now()-x.r.doneAt<864e5&&fdem(x.r)).sort((a,b)=>(b.r.le||'').localeCompare(a.r.le||'')).slice(0,30);
  const n=cats.reduce((a,c)=>a+c.rows.length,0);
  const fb=(v,l)=>`<button class="chip ${f===v?'on':''}" data-act="dfilter" data-v="${v}">${l}</button>`;
  return `<div class="sec-h dem-h"><h2>À traiter <b class="cnt">${n}</b></h2>${ME&&ME.role==='lecture'?'':'<button class="btn primary dem-new" data-act="dem-add">+ Nouvelle demande</button>'}<p>Rangé par thème, du plus urgent en haut au moins urgent en bas. Une catégorie n'apparaît que si elle a quelque chose à traiter.</p></div>
  <div class="filters" style="margin-bottom:10px">${fb('tous','Tout')}${fb('moi','Pour moi')}${fb('envoyees','Envoyées')}</div>
  <div class="dl-h"><span>Date</span><span>Type</span><span>Pour</span><span>Détail</span><span>De</span><span></span></div>
  ${cats.length?cats.map(c=>`<h3 class="dcat">${esc(c.label)} <b>${c.rows.length}</b></h3>${c.rows.join('')}`).join(''):'<p class="empty">Rien à traiter. Tout est à jour.</p>'}
  ${done.length?`<h3 class="dcat done">Traitées <b>${done.length}</b></h3><div class="dl-done">${done.map(x=>dline(x)).join('')}</div>`:''}`;
}

function aggTabHTML(){
  const mon=mondayOf(view.date);const ds=[0,1,2,3,4,5,6].map(i=>addDays(mon,i)).filter(d=>!isWE(d)||weOpen(d)||hasOrders(d));
  return `<div class="sec-h"><h2>Agrégats et ciments · semaine ${isoWeek(view.date)}</h2><p>Clic sur un produit : reçu (stabiloté). Clic long : modifier ou supprimer. Tout reste modifiable à tout moment.</p></div>
  <div class="grid3">${ds.map(d=>`<div class="panel agg-p ${d===view.date?'cur':''}" data-day="${d}"><h3>${esc(dayLong(d))}</h3>${aggInner(d)}<div class="chips agg-btns"><button class="chip add" data-act="semi-add">+ Semi</button><button class="chip add" data-act="cim-add">+ Liant</button></div></div>`).join('')}</div>`;
}

function truckEdit(code,anchor){if(role()!=='centraliste')return;const L=FLEET();const p=L.find(x=>x.c===code);if(!p)return;
  return formPop(anchor,'Modifier le camion',[{k:'c',label:'N° de parc ou repère (affiché sur les bulles)',val:p.c,ph:'7656 ou EF'},{k:'p',label:'Plaque entière (optionnel)',val:p.p||'',ph:'EF-507-VT'}],v=>{
    const nc=String(v.c||'').trim().toUpperCase().slice(0,8),np=String(v.p||'').trim().toUpperCase();if(!nc){toast('Le n° de parc ou repère est nécessaire');return 'keep'}
    if(nc!==code&&L.some(x=>x.c===nc)){toast('Ce repère existe déjà');return 'keep'}
    if(!S.config)S.config=CONFIG0();S.config.flotte=L.map(x=>x.c===code?{c:nc,p:np}:{c:x.c,p:x.p||''});
    if(nc!==code){Object.values(S.convocs||{}).forEach(cv=>{if(cv[code]){cv[nc]=cv[code];delete cv[code]}});S.orders.forEach(o=>o.tours.forEach(t=>{if(t.p===code)t.p=nc}))}
    toast('Camion modifié : '+(np||nc));if(drawerEl&&!drawerEl.hidden&&drawerEl.querySelector('#cfg-flotte'))setTimeout(openConfig)})}
document.addEventListener('contextmenu',e=>{const h=e.target.closest&&e.target.closest('[data-plq]');if(!h||role()!=='centraliste')return;e.preventDefault();truckEdit(h.dataset.plq,h)});
function camionsHTML(){
  const pl=FLEET();
  const mo=view.date.slice(0,7),y=+mo.slice(0,4),m=+mo.slice(5,7),nd=new Date(Date.UTC(y,m,0)).getUTCDate();
  const ds=[];for(let i=1;i<=nd;i++){const d=`${mo}-${pad(i)}`;if(!isWE(d)||weOpen(d)||hasOrders(d))ds.push(d)}
  const mn=MOISL[m-1];
  return `<div class="sec-h"><h2>Convocation</h2><div class="mnav"><button class="ib" data-act="cmonth" data-v="-1" aria-label="Mois précédent">‹</button><b>${esc(mn.charAt(0).toUpperCase()+mn.slice(1))} ${y}</b><button class="ib" data-act="cmonth" data-v="1" aria-label="Mois suivant">›</button></div><button class="btn sm" data-act="plaque-add">+ Camion</button><button class="btn sm" data-act="conv-print">Imprimer ${esc(mn)} (rempli ou vide)</button></div>
  <div class="tbl-wrap"><table class="conv zebra"><thead><tr><th>Jour</th>${pl.map(p=>`<th class="plq" data-plq="${esc(p.c)}" title="Clic droit pour modifier · repère sur les bulles : ${esc(p.c)}">${esc(plDisp(p))}</th>`).join('')}<th>Observations</th></tr></thead><tbody>
  ${ds.map(d=>{const cv=S.convocs[d]||{};const obs=(dayRO(d)||{}).convObs||'';
    return `<tr class="${d===TODAY?'today':''} ${dow(d)===1?'wk1':''} ${isWE(d)?'we':''}"><td class="d">${esc(dayShort(d))}</td>${pl.map(p=>{const x=cv[p.c];return `<td><button class="cell ${x&&x.st==='abs'?'abs':''}" data-act="conv" data-d="${d}" data-p="${esc(p.c)}">${!x?'<span class="muted">—</span>':x.st==='abs'?'<b class="abs-t">ABSENT</b>':`<b>${esc(hm(x.h))}${x.st==='pret'&&x.pc?' '+esc(x.pc):x.dep&&x.dep!==CENTRALE?' '+esc(x.dep):''}</b>${x.aff?`<span class="aff">${esc(x.aff)}</span>`:''}`}</button></td>`}).join('')}
    <td><button class="cell obs" data-act="conv-obs" data-d="${d}" title="Observation du jour">${obs?`<span class="obs-t">${esc(obs)}</span>`:'<span class="muted">—</span>'}</button></td></tr>`}).join('')}
  </tbody>${(()=>{const T=toursBy(mo+'-01',mo+'-'+pad(nd));const per=mo===TODAY.slice(0,7)?'depuis le 1er':'sur le mois';return `<tfoot><tr class="tours-r"><td class="d">Tours ${per}</td>${pl.map(p=>`<td><b>${T[p.c]||0}</b></td>`).join('')}<td class="tours-tot"><b>${pl.reduce((a,p)=>a+(T[p.c]||0),0)}</b> au total<br><button class="btn sm" data-act="tours-per">Imprimer par période</button></td></tr></tfoot>`})()}</table></div>`;
}
/* tours chargés par camion de la centrale entre deux dates (jusqu'à aujourd'hui) */
function toursBy(a,b){const T={};const hi=b<TODAY?b:TODAY;S.orders.forEach(o=>{if(o.date<a||o.date>hi||statut(o)==='annulee')return;o.tours.forEach(t=>{if(t.s&&t.p&&!t.mv)T[t.p]=(T[t.p]||0)+1})});return T}
const monthEnd=mo=>{const y=+mo.slice(0,4),m=+mo.slice(5,7);return `${mo}-${pad(new Date(Date.UTC(y,m,0)).getUTCDate())}`};
function monthsBetween(m1,m2){const out=[];let y=+m1.slice(0,4),m=+m1.slice(5,7);while(`${y}-${pad(m)}`<=m2&&out.length<36){out.push(`${y}-${pad(m)}`);m++;if(m>12){m=1;y++}}return out}
async function toursPDF(m1,m2,fm){const J=await loadPdf();const doc=new J({orientation:'landscape',unit:'mm',format:fm.toLowerCase()});const W=doc.internal.pageSize.getWidth(),M=9,big=fm==='A3';
  const pl=FLEET(),ms=monthsBetween(m1,m2);const lab=mm=>MOISL[+mm.slice(5,7)-1]+' '+mm.slice(0,4);
  doc.setFont('helvetica','bold');doc.setFontSize(big?20:15);doc.text(pdfT(`Tours par camion · ${ms.length>1?lab(m1)+' à '+lab(m2):lab(m1)} · ${CENTRALE}`),M,M+6);
  doc.setDrawColor(255,77,0);doc.setLineWidth(.8);doc.line(M,M+9,W-M,M+9);
  const rows=ms.map(mm=>{const T=toursBy(mm+'-01',monthEnd(mm));return [lab(mm)].concat(pl.map(p=>String(T[p.c]||0))).concat([String(pl.reduce((a,p)=>a+(T[p.c]||0),0))])});
  const tot=pl.map((p,i)=>rows.reduce((a,r)=>a+(+r[i+1]),0));
  doc.autoTable({startY:M+12,margin:{left:M,right:M},theme:'grid',head:[['Mois'].concat(pl.map(p=>plDisp(p))).concat(['Total'])].map(r=>r.map(pdfT)),
    body:rows.concat(ms.length>1?[['Total'].concat(tot.map(String)).concat([String(tot.reduce((a,b)=>a+b,0))])]:[]).map(r=>r.map(pdfT)),
    styles:{fontSize:big?12:10,cellPadding:big?3:2,lineColor:[180,180,175],lineWidth:.15,textColor:[21,21,21],halign:'center'},headStyles:{fillColor:[233,232,227],textColor:[21,21,21],fontStyle:'bold'},columnStyles:{0:{fontStyle:'bold',halign:'left'}}});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(pdfT(`Tours chargés notés sur le planning, arrêtés au ${dayShort(TODAY)}.`),M,doc.lastAutoTable.finalY+6);
  return doc.output('arraybuffer')}
function toursPop(anchor,per){const mo=view.date.slice(0,7);const pl=FLEET();
  const res=(m1,m2)=>{const ms=monthsBetween(m1,m2);const T=toursBy(m1+'-01',monthEnd(m2));return `<table class="tours-t"><thead><tr><th>Camion</th><th>Tours</th></tr></thead><tbody>${pl.map(p=>`<tr><td>${esc(plDisp(p))}</td><td><b>${T[p.c]||0}</b></td></tr>`).join('')}<tr class="tot"><td>Total · ${ms.length} mois</td><td><b>${pl.reduce((a,p)=>a+(T[p.c]||0),0)}</b></td></tr></tbody></table>`};
  openPop(anchor,`<div class="pop-h">${per?'Tours par camion sur une période':'Imprimer les tours du mois'}</div><form data-pa="go">
    <div class="pk-f"><label class="fl">${per?'Du mois':'Mois'}<input type="month" id="tp-1" value="${mo}"></label>${per?`<label class="fl">au mois<input type="month" id="tp-2" value="${mo}"></label>`:''}</div>
    <div id="tp-res">${res(mo,mo)}</div>
    <div class="fl">Format (paysage)<div class="radios"><label><input type="radio" name="tp-s" value="A4" checked><span>A4</span></label><label><input type="radio" name="tp-s" value="A3"><span>A3</span></label></div></div>
    <button class="btn primary" type="submit">Imprimer (PDF)</button></form>`,
  {go(f){const a=f.querySelector('#tp-1').value,b=per?f.querySelector('#tp-2').value:a;if(!/^\d{4}-\d{2}$/.test(a)||!/^\d{4}-\d{2}$/.test(b)||b<a){toast('Choisissez des mois dans l\'ordre');return 'keep'}const fm=f.querySelector('input[name="tp-s"]:checked').value;savePDF(`tours-camions-la-bocca-${a}${b!==a?'_'+b:''}-${fm}.pdf`,()=>toursPDF(a,b,fm))}});
  const upd=()=>{const a=popEl.querySelector('#tp-1').value,b=per?popEl.querySelector('#tp-2').value:a;if(/^\d{4}-\d{2}$/.test(a)&&/^\d{4}-\d{2}$/.test(b))popEl.querySelector('#tp-res').innerHTML=b<a?'<p class="muted">Le mois de fin doit suivre le mois de début.</p>':res(a,b)};
  popEl.querySelectorAll('input[type=month]').forEach(x=>x.addEventListener('input',upd));
}

function adjHTML(){
  const wk=weekKey(view.date);
  const keys=[[weekKey(addDays(view.date,-7)),'Semaine passée'],[wk,'Semaine en cours'],[weekKey(addDays(view.date,7)),'Semaine à venir']];
  const panel=([k,l])=>{const x=S.adjuvants[k]||[];return `<div class="panel ${k===wk?'cur':''}" data-wk="${k}"><h3>Semaine ${esc(k.split('-S')[1])}<small>${l}</small></h3>
    ${x.map((a,i)=>`<div class="adj-line ${a.on?'on':''}"><label class="adj-st" title="${a.on?'Reçu · clic : remettre en attente':'Clic : valider la réception'}"><input type="checkbox" id="adj-${k}-${i}" data-act="adj-on" data-i="${i}" ${a.on?'checked':''} aria-label="Réception de ${esc(a.t)}"><span class="adj-box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg></span></label><span>${esc(a.t)}</span><em class="adj-state">${a.on?'Reçu':'En attente'}</em><button class="chip" data-act="adj-x" data-i="${i}" aria-label="Retirer">×</button></div>`).join('')||'<span class="muted">Rien pour cette semaine</span>'}
    <form class="inline-f" data-form="adj"><input id="adjin-${k}" placeholder="1000 L Adjuvant 1" aria-label="Nouvelle ligne"><button class="btn sm">Ajouter</button></form></div>`};
  let year='';
  if(view.adjYear){const y=D(view.date).getUTCFullYear();let d=mondayOf(y+'-01-04');const rows=[];for(let i=0;i<53;i++){const k=weekKey(d);if(!k.startsWith(String(y)))break;rows.push(k);d=addDays(d,7)}
    year=`<div class="tbl-wrap" style="margin-top:10px"><table class="year"><tbody>${rows.map(k=>`<tr class="${k===wk?'cur':''}"><td>S${esc(k.split('-S')[1])}</td><td>${(S.adjuvants[k]||[]).map(a=>esc(a.t)+(a.on?' ✓':'')).join(' · ')||'<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>`}
  return `<div class="sec-h"><h2>Commande d'adjuvants</h2><p>Comme le tableau Velléda, semaine par semaine. Validée = reçue.</p><button class="btn sm" data-act="adj-year">${view.adjYear?'Masquer le tableau de l\'année':'Tableau de l\'année'}</button></div>
  <div class="grid3">${keys.map(panel).join('')}</div>${year}`;
}

/* ---- Mode d'emploi : un dépliant par élément ---- */
const AIDE=[
 ['Pour commencer',[
  ['tous','Se connecter et changer d\'utilisateur',`<p>À l'ouverture : <b>Se connecter avec Google</b>, avec une adresse inscrite par la centrale (Administration → Accès).</p><ul><li>Chacun entre <b>avec son badge et son prénom</b>, ceux de son compte : on ne choisit pas un autre prénom.</li><li>Le <b>rôle</b> (centraliste, commercial, tech labo, lecture seule) est imposé par le compte : les autres s'affichent grisés. Seul un <b>admin</b> choisit le rôle sous lequel il travaille.</li><li>En dessous : <b>les personnes connectées en ce moment</b>, rangées par rôle.</li><li>Lecture seule : un seul bouton, <b>Ouvrir le planning</b>.</li><li>Au poste de la centrale : badge du compte (rond en haut à droite) → <b>Page de connexion</b> à chaque prise de poste. <b>Se déconnecter</b> au même endroit.</li><li>Si l'admin change votre rôle ou votre accès, vous êtes <b>déconnecté automatiquement</b> (dans les 30 secondes), avec un message.</li></ul>`],
  ['tous','Ce que chaque rôle peut faire',`<ul><li><b>Centraliste</b> : tout le planning (tours, compléments, bulles, validations, clôture, journal de bord, agrégats).</li><li><b>Commercial</b> : passe et modifie ses commandes (à valider par la centrale), demandes, chat, tous les réglages de la centrale. Il voit les tours sans les charger ; il peut cocher [+] en passant une nouvelle commande.</li><li><b>Tech labo</b> : consulte le planning sans modifier aucune commande (ni paiement, ni pompe, ni statut, ni tours). Il peut : proposer une formule pour une commande en attente, <b>ajouter une info</b> (badge LABO, montrée au centraliste dès le premier camion chargé), et dans le menu ⋯ <b>demander au commercial ou au centraliste</b>. Demandes et chat aussi.</li><li><b>Lecture seule</b> : consulte uniquement (voir « Compte en lecture seule »).</li><li><b>Admin</b> : un rôle au choix à la connexion, plus la gestion des Accès.</li></ul>`],
  ['tous','Compte en lecture seule',`<p>Un compte en lecture seule <b>consulte</b> sans rien modifier :</p><ul><li>planning complet (jour et semaine), demandes en cours, carte du chantier, impression ;</li><li>en consultation : camions, pompes, fournisseurs, agence et raccourcis.</li></ul><p>Pas de menu ⋯ sur les commandes, pas de chat, ni notifications ni administration ; un clic sur une formule, une bulle ou une commande n'ouvre rien.</p>`],
  ['tous','Lire l\'écran du jour',`<p>Une ligne par chantier, de haut en bas dans l'ordre des heures, regroupées en <b>Matin</b>, <b>Après-midi</b> et, à partir de 19 h, <b>☾ Nuit</b>. Le trait rouge marque l'heure actuelle.</p><ul><li><b>Ligne 1</b> : heure, client, m³ livrés / total, chantier, formule, type de camion, pompe, commentaires à droite.</li><li><b>Ligne 2</b> : les bulles des tours (une bulle = un camion).</li><li>Au-dessus du premier chantier : nombre de camions et de chantiers, et la légende prévu · chargé · complément.</li><li>Une ligne sur deux est sur fond gris pour mieux suivre.</li><li><b>Barre à gauche</b> de la ligne = statut : orange en attente, vert en cours, bleu terminée.</li></ul>`],
  ['tous','Changer de jour, de semaine ou de vue',`<ul><li><b>‹ ›</b> autour de la date, ou les flèches <b>← →</b> du clavier. Sur tablette : glisser vers la gauche ou la droite.</li><li>Clic sur la <b>grande date</b> : calendrier ou date tapée pour aller à un jour précis. <b>Aujourd'hui</b> pour revenir.</li><li><b>Jour / Semaine</b> en haut à gauche. En semaine, chaque jour a sa <b>barre de charge</b> (m³ du matin, de l'après-midi, de la nuit, comparés au jour le plus chargé), avec le nombre de tours, de pompes et de commandes à valider.</li><li><b>Sur téléphone</b> : les commandes sont en vue simple avec la formule ; un <b>appui sur une commande</b> affiche ses chargements (tours) et tous ses détails, un nouvel appui à gauche (sur l'heure) la referme.</li><li>Sur ordinateur, en bas : <b>Simple</b> (lignes serrées), <b>Normal</b>, <b>Détaillé</b> (téléphone, notes, commandes annulées).</li><li><b>Recherche</b> « Client ou chantier » en haut : clic sur un résultat pour y aller.</li></ul>`]]],
 ['Commandes',[
  ['tous','Saisir une commande',`<ol><li><b>+ Commande</b> en haut à droite (ou la touche <b>N</b>).</li><li>Remplir dans l'ordre : <b>Qui</b> (client, contact sur place : nom et téléphone, paiement), <b>Quoi</b> (formule : saisie rapide ou cases, code SAP), <b>Combien</b> (m³), <b>Où</b> (chantier, adresse), <b>Quand</b> (date, heure), <b>Comment</b> (camion, pompe), <b>Pourquoi</b> (ouvrage, infos sur la ligne). « Commande spéciale » se coche à côté du titre.</li><li><b>Enregistrer</b>. Les tours sont créés selon le volume.</li></ol><p>Une note libre (« Prendre 1 journée ») va en commentaire. Si la centrale est fermée sur l'heure choisie, une alerte rouge s'affiche : un second clic sur Enregistrer place quand même la commande.</p><p><b>Chargement réduit</b> (chapes, et tout produit spécial réglé « Chargement réduit (fluide) » dans Administration → Formules) : jamais chargé au maximum. Les tours sont prévus à <b>7 m³ maxi en 8x4</b> (6 à 7 selon la route) et <b>3,5 m³ en 4x2 19 t</b> (SP4) ; un rappel s'affiche sous la quantité. Changer la formule pour une chape recalcule les tours pas encore chargés. Le maxi de chaque type de camion se règle dans Administration → Camions et pompes (case « fluide m³ »). Les Agilia sont en chargement plein par défaut (7,5 m³) : on peut les passer en réduit, ou baisser le cubage d'une bulle au cas par cas.</p><p><b>Sur téléphone</b> : un résumé reste affiché au-dessus d'« Enregistrer » (jour · heure · client · m³ · formule) ; ce qui manque est en orange.</p>`],
  ['tous','Saisir la formule (saisie rapide)',`<p>Section <b>Quoi</b> de la commande : une case <b>Formule</b> (large) et une case <b>Code SAP</b> (8 chiffres, facultatif).</p><ul><li>Taper comme dit le client : <b>25 20 s4 c1</b> = C25/30 D20 S4 XC1. Ce qui n'est pas dit prend la valeur de la centrale (D20, S4).</li><li><b>c16, c20, c30…</b> = toujours une <b>résistance</b> (C16/20, C20/25, C30/37). Chape Cemexa : <b>cem16</b> ou <b>cem20</b> (ou « cemexa c20 »).</li><li>Expositions sans le X : c1 = XC1, f1 = XF1, d2 = XD2, a1 = XA1 ; <b>xs1</b> pour XS (s1 = consistance). Une seule classe par formule : celle qui couvre les autres (XF1 couvre XC1 à XC4 et XD1).</li><li>Options : <b>ret</b> retardé, <b>acc</b> accéléré, <b>hm</b> hydrofuge, <b>fpp</b> fibres, <b>col pp152</b> colorant (référence tapée à chaque fois), <b>pm</b> liant PM.</li><li>Produits spéciaux : nom ou 3 lettres, puis variante (<b>agi mi plancher sf2</b>, <b>chr 15 10°</b>, <b>nivel</b>, <b>bag mortier ret 6 12°</b>, <b>des</b> désactivé, <b>hydro 4/6</b>, <b>bc3 f1</b>, <b>proj</b>…).</li><li><b>att</b> : produit en attente (badge ATT sur la ligne).</li><li><b>Tab</b> reprend une formule déjà commandée par le client.</li><li>On peut aussi composer avec les <b>cases</b> sous la saisie : Produit spécial, Produit en att., résistance, Dmax, consistance, exposition, liant, options. La saisie se réécrit toute seule.</li><li>Le liant <b>PM / SR PM</b> se met tout seul quand l'exposition l'impose (XS, XA…). Alertes non bloquantes en jaune (résistance trop faible ou bien au-dessus du minimum de l'exposition, Dmax hors centrale…). Rappel orange <b>entraîneur d'air</b> pour XF2 à XF4.</li><li>Un mot non reconnu : la formule est gardée telle quelle.</li></ul>`],
  ['centraliste','Erreurs du planning',`<p>Si le planning plante chez quelqu'un (téléphone ou PC), le message technique est envoyé automatiquement : prénom, rôle, heure, version, écran, appareil. <b>Aucune donnée de commande ni de client.</b> Hors connexion, l'erreur attend sur l'appareil et part au retour du réseau.</p><ul><li>Comptes admin : badge du compte → Centrale → Administration → <b>Erreurs</b>. Une ligne par erreur différente, avec le nombre de fois et qui l'a eue ; clic pour le détail.</li><li>À l'ouverture du planning, un message prévient s'il y a de nouvelles erreurs.</li><li><b>Copier pour Claude</b> : copie le détail, à coller dans la conversation pour la correction. <b>Tout effacer</b> une fois corrigé.</li><li>Les erreurs de plus de 30 jours s'effacent toutes seules.</li></ul>`],
  ['centraliste','Sauvegardes : vérifier et restaurer',`<p>Chaque nuit, le planning est sauvegardé dans un dépôt GitHub privé : un fichier par mois (<b>planning-AAAA-MM.json</b>, réécrit chaque nuit) et <b>listes.json</b> (clients, chantiers, demandes, réglages, catalogue). Le journal de bord, le chat et la liste des accès n'y sont pas.</p><ul><li><b>Vérifier une sauvegarde (sans rien changer)</b> (badge du compte → Sauvegarde, comptes admin) : choisir les fichiers téléchargés depuis GitHub. Un rapport compare la sauvegarde au planning actuel, mois par mois (identiques, modifiées depuis, ajoutées depuis, absentes), puis <b>Consulter la sauvegarde</b> pour la voir comme un planning. Rien n'est modifié.</li><li><b>Restaurer une sauvegarde</b> : le ou les fichiers d'un mois seuls → seuls ces mois sont remis, le reste ne bouge pas. Les fichiers des mois + listes.json → tout le planning est remplacé. Une confirmation est demandée.</li><li>Les changements faits depuis la sauvegarde de la nuit sont perdus pour les mois remis : vérifier d'abord.</li></ul>`],
  ['tous','Administration · catalogue de la centrale',`<p>Menu du compte (ou <b>Plus</b> sur téléphone) → <b>Centrale</b> → <b>Administration</b>. Ouvert au centraliste et au commercial.</p><ul><li><b>Formules</b> : gravillons de la centrale (le Dmax proposé en découle), résistances, consistances, chlorures (désactivés par défaut), expositions et couvertures (calculées depuis le tableau NA.F.1), liants (chacun Base, PM ou SR PM), liant imposé par exposition, fibres, produits spéciaux (gamme, variantes, options permises, gravillons permis, Dmax ou Dmin/Dmax, température, temps de retard, lien vers la fiche ; ⧉ pour dupliquer).</li><li><b>Camions et pompes</b>, <b>Fournisseurs</b>, <b>Agence</b>, <b>Raccourcis</b> : centraliste et commercial. <b>Accès</b> : comptes admin. Le labo et la lecture seule consultent sans modifier.</li><li>Les changements valent pour tous les postes.</li></ul>`],
  ['tous','Modifier, dupliquer, annuler une commande',`<ul><li>Menu <b>⋯</b> au bout de la ligne : <b>Modifier la commande</b>, <b>Dupliquer…</b> sur d'autres dates, statut (automatique, en attente, en cours, terminée, annulée), supprimer.</li><li>Statut passé à la main en <b>Terminée</b> ou <b>Annulée</b> : le complément prévu est retiré et plus aucun complément n'est proposé.</li><li><b>Clic droit sur le cubage</b> (appui long sur téléphone, centraliste) : changer le cubage demandé et cocher « Et plus » si le client veut un complément. Affichage <b>7,5/7,5+</b> avec complément, <b>7,5/7,5</b> sans. Les tours déjà chargés ne bougent pas, les autres sont recalculés.</li><li>Clic sur la <b>formule</b> pour la changer : la nouvelle formule est <b>confirmée</b> avant d'être appliquée. Le code SAP s'affiche au survol.</li><li>Annuler ou supprimer demande une <b>confirmation</b>. Les commandes annulées ne se voient qu'en vue Détaillé.</li><li>Tours et compléments (ajouter, charger une bulle) : <b>centraliste uniquement</b>. Le commercial et le labo les voient.</li></ul>`],
  ['centraliste','Valider une commande du commercial',`<p>Les commandes du commercial arrivent dans la bande rouge <b>« À valider »</b> en haut du jour, et dans la ligne À surveiller.</p><ol><li>Les modifier si besoin.</li><li><b>Valider</b> → confirmation → la commande prend sa place au planning.</li></ol><p>Une modification faite ensuite par le commercial est marquée <b>« Modif. à valider »</b> : la fenêtre de validation montre <b>ce qui a changé</b> (avant → après : jour, heure, cubage, formule, chantier, camion, pompe…). Si le commercial revient à la version validée, il n'y a plus rien à valider.</p>`],
  ['tous','Formule en attente : proposition du labo',`<ul><li>Une commande dont la formule est <b>en attente</b> (labo ou commercial) apparaît dans la page À traiter.</li><li>Le <b>labo</b> clique sur la formule et <b>propose</b> la sienne : elle s'affiche à côté, avec le badge <b>LABO</b>. La formule de la commande ne change pas.</li><li>Le <b>centraliste</b> ou le <b>commercial</b> clique sur le badge LABO → <b>appliquer</b> en un clic (avec confirmation). Ils sont prévenus par notification.</li></ul>`],
  ['tous','Paiements comptant',`<ul><li>L'étiquette <b>€ attente</b> sur la ligne : paiement non reçu. Clic dessus → <b>« Confirmer : paiement reçu ? »</b> → Oui.</li><li><b>Clic droit</b> (appui long sur téléphone) : le détail, <b>une ligne par paiement</b> du client : montant, mode (Carte, CB, Virement, Attente) et 4 chiffres CB. <b>+ Autre paiement</b> pour un client qui paie en plusieurs fois ; le total s'affiche.</li><li>Le paiement passe à « Payé » quand plus rien n'est en attente. Tant que ce n'est pas payé, l'alerte « Paiement · client » reste dans la ligne À surveiller.</li></ul>`],
  ['tous','Pompes, bon de pompe et réservations',`<ul><li>Camion SP4 / SP6 ou pompe <b>« À réserver »</b> (rouge clignotant) : le centraliste clique dessus quand c'est réservé → confirmation → <b>« Réservé »</b> en vert.</li><li><b>Bon de pompe</b> : clic sur l'étiquette quand il est fait → confirmation.</li><li>Pompe BQA sur une formule sans BQA : alerte « BQA requise ».</li><li><b>Betobag</b> (sac de lavage) : case dans la partie Pompe de la commande ; il s'affiche à côté de la pompe. Le Citybag est un produit (voir « Citybag et Betobag »).</li><li><b>Rappel chaque matin à 6 h 45</b> (notification) : les bons de pompe pas faits pour le prochain jour travaillé.</li></ul>`]]],
 ['Camions et bulles',[
  ['centraliste','Remplir une bulle (plaque du camion)',`<ul><li><b>Clic sur une bulle vide</b> : vos camions s'affichent, plus les autres plaques déjà notées. Un clic sur la plaque → la bulle passe <b>chargée</b> (verte).</li><li>Plaque inconnue : la taper dans « Noter la plaque », puis OK. Elle ne sert que pour ce chantier. Vos camions se gèrent dans Administration → Camions et pompes → Camions centrale.</li><li>Ordre des bulles, toujours le même : les tours, puis la bulle <b>orange « ? »</b> si un complément est <b>prévu</b>, puis le <b>[+] gris</b> pour un complément <b>non prévu</b>.</li><li><b>[+] gris</b> : choisir la plaque → le complément est chargé. Ou, s'il n'est pas encore chargé : <b>Complément prévu</b> → bulle orange.</li><li><b>Bulle orange</b> : « Le client le prend » → choix de la plaque, le complément est chargé ; ou « Pas de complément » → elle disparaît.</li><li>Après <b>chaque complément chargé</b>, le planning demande : <b>Encore un complément prévu ?</b> Oui → nouvelle bulle orange (gros chantiers à la pompe : on enchaîne autant que nécessaire) ; Non → c'était le dernier : la commande passe <b>Terminée</b>.</li><li>Tant qu'une bulle orange reste, le chantier n'est <b>pas terminé</b>.</li><li>Clic (ou clic droit) sur la bulle orange : <b>Complément confirmé</b> ouvre directement « Nouveau tour » (cubage, camion, plaque) ; <b>Pas de complément</b> la retire.</li><li>Clic sur une bulle déjà chargée : retirer le stabilo (avec confirmation).</li><li>Charger un tour <b>avant le jour du chantier</b> demande une validation.</li></ul>`],
  ['centraliste','Modifier une bulle (clic long ou clic droit)',`<p>Rester appuyé sur la bulle (ou clic droit) : changer la plaque, le volume, noter « chargé par une autre centrale », replacer le camion, supprimer le tour.</p><p>Légende : vide = prévu · vert = chargé · pointillé = complément · nom de centrale = chargé ailleurs · bleu = camion replacé · <b>P</b> bleu = toupie rechargée pleine.</p>`],
  ['centraliste','Replacer un camion déjà chargé sur un autre chantier',`<ol><li>Clic long sur la bulle chargée → <b>Replacer sur un autre chantier…</b></li><li>Choisir le chantier. Laisser cochée « Prévoir un nouveau tour » si le premier chantier attend encore ce béton.</li></ol><p>La bulle d'origine devient bleue barrée (ses m³ ne comptent plus). Une fenêtre demande les <b>m³ replacés</b> et si la <b>toupie a été rechargée pleine</b>, puis Valider. Le camion prend la <b>première bulle grise libre</b> du nouveau chantier (en bleu ↪) ; s'il n'y en a pas, une bulle est créée. Pour revenir en arrière : clic long sur la bulle barrée → <b>Annuler le replacement</b>.</p>`],
  ['centraliste','Planning camions : renforts, détachements, convocations',`<ul><li>Encadré <b>Planning camions</b> : <b>+ Renfort</b> (un camion vient à la centrale), <b>+ Détachement</b> (un camion part : nombre, camion prêté, convoqué ailleurs), <b>+ Absent</b>.</li><li>Page <b>04 Camions</b> : absents, prêtés, convoqués ailleurs (« 7 h 45 Grasse »).</li><li><b>Imprimer le mois</b> : PDF A4 ou A3 des convocations, avec horaires ou grille vide.</li><li>Ligne du bas : <b>tours chargés par camion</b> depuis le 1er du mois. <b>Imprimer par période</b> (sous le total) : d'un mois à un autre, ou un seul mois.</li><li>Onglet <b>Convocation</b> : le mois complet. Clic sur une case : <b>Convoqué</b> (heure et centrale : une autre centrale = le camion y est convoqué directement), <b>Absent</b> (période, raison) ou pas convoqué ; « Affecté au chantier » se remplit librement (badge, accès…). Colonne <b>Observations</b> : une note libre par jour.</li><li><b>Clic droit sur un camion</b> (en-tête de colonne, ou dans Administration → Camions centrale) pour modifier son n° de parc ou sa plaque entière (optionnelle).</li></ul>`]]],
 ['Centrale',[
  ['tous','Ouvrir la centrale un week-end',`<p>Le week-end n'a pas de journée planning. En allant sur un samedi ou un dimanche, le bouton <b>Créer une journée planning ce jour</b> ouvre la centrale exceptionnellement (avec confirmation). Une commande saisie un week-end propose aussi la création : second clic sur Enregistrer.</p>`],
  ['centraliste','Journal de bord',`<ul><li>Centralistes présents et horaires, remplaçant : <b>+ Présent</b>.</li><li>Passation entre postes : <b>+ Passation</b> ; clic pour la marquer faite.</li><li>Entretien et RDV labo : <b>+ Événement</b>, <b>+ RDV labo</b>.</li><li><b>+ Changement produit</b> : ciment, adjuvant, agrégat, silo ou formule, avec l'heure ; noté aussi au journal.</li><li>Tous les boutons <b>+</b> sont sur la ligne du bas de chaque encadré.</li></ul>`],
  ['tous','Centrale fermée ou en panne',`<p><b>Fermée</b> : clic sur l'état (<b>Ouverte</b>) dans le Journal de bord → Fermée, puis <b>Quand</b> (journée, matin, après-midi ou horaires) et la cause.</p><p><b>Panne</b> : même fenêtre → Panne, avec les heures et la cause. La panne s'ajoute comme une <b>case rouge</b> sous l'état de la centrale (plusieurs pannes possibles dans la journée) :</p><ul><li><b>Terminée</b> : la centrale repart ; la case se ferme et l'heure de fin est notée.</li><li><b>×</b> : annule une panne notée par erreur.</li></ul><p>Pendant une fermeture ou une panne, les commandes du créneau passent en rouge et le centraliste peut <b>replacer les tours dans une autre centrale</b>. Le commercial voit le même rouge.</p>`],
  ['centraliste','Agrégats et ciments',`<ul><li>Une ligne par <b>semi</b> : clic sur son nom pour mettre le prénom du chauffeur, l'heure, une remarque.</li><li>Une ligne par <b>liant</b> (ciment, chaux…) avec ses livraisons et leur heure.</li><li>En bas de l'encadré : <b>[+ Semi]</b> pour une nouvelle semi, <b>[+ Liant]</b> pour un nouveau liant (nom, puis l'heure : 6 h à 22 h, toutes les 30 min). Le <b>[+]</b> au bout d'une ligne ajoute le produit suivant demandé au chauffeur, ou une livraison de ce liant.</li><li><b>Stabilo</b> = reçu : clic sur un produit ou une livraison, il est surligné comme au stabilo sur la feuille. Nouveau clic pour l'enlever.</li><li>Clic sur le nom d'un liant pour le <b>modifier ou le supprimer</b> ; clic long sur un produit pour changer le produit ou la carrière, ou le supprimer.</li><li>Au repos, l'encadré montre la dernière semi reçue ; <b>au survol, il s'agrandit</b> et tout s'affiche, même avec 5 ou 6 tours et plusieurs liants. La fenêtre de saisie reste ouverte quand on tape ou sélectionne du texte.</li><li>Page <b>03 Agrégats</b> : la semaine entière, à remplir la veille, y compris un samedi ou un dimanche ouvert.</li></ul>`],
  ['centraliste','Adjuvants',`<p>Page <b>05 Adjuvants</b> : les commandes et livraisons des 3 dernières semaines, et le tableau de l'année.</p>`],
  ['centraliste','Raccourcis',`<p>Page <b>06 Raccourcis</b> : sites et formulaires utiles (agrégats, pompe, SP4, bon de pompe, accidents…), rangés par thème. Ils se modifient dans Administration → Raccourcis.</p>`]]],
 ['Notifications',[
  ['tous','Ligne « À surveiller »',`<p>Au-dessus des vues, en bas : bons de pompe, réservations, paiements, commandes à valider, demandes. Le nombre est à côté du titre.</p><ul><li>Clic sur une alerte → la ligne concernée.</li><li><b>Molette</b> de la souris pour faire défiler s'il y en a beaucoup.</li><li>Quand tout est réglé, la ligne disparaît.</li></ul>`],
  ['tous','Page À traiter (02 Demandes)',`<p>Tout ce qui attend une action, rangé par thème, du plus urgent en haut au moins urgent en bas. Une catégorie n'apparaît que si elle a quelque chose à traiter :</p><ol><li>Placement de chantier (commandes du commercial)</li><li>Modifications à valider</li><li>Pompes (réservation, bon de pompe, BQA)</li><li>Camions à réserver (SP4, SP6)</li><li>Paiements comptant</li><li>Formules et labo</li><li>Modifications de commande, chantiers et clients, autres demandes</li></ol><p>Chaque ligne a son bouton d'action (Réservée, Bon fait, Paiement reçu, Traité…). Les demandes traitées passent <b>en gris tout en bas</b>, restent visibles <b>24 h</b> après leur traitement puis disparaissent (elles restent dans les données). Filtres : Tout, Pour moi, Envoyées. <b>+ Nouvelle demande</b> en haut de la page pour écrire au centraliste, au commercial ou au labo.</p>`],
  ['tous','Chat de la centrale',`<p>Bouton <b>Chat</b> en bas à droite : une fenêtre s'ouvre. Toutes les personnes connectées au planning y écrivent (Entrée pour envoyer, Maj + Entrée pour aller à la ligne). Un chiffre orange signale les nouveaux messages.</p><ul><li>Une <b>réponse à une demande</b> est aussi envoyée dans le chat.</li><li>Les messages sont gardés <b>7 jours</b> puis s'effacent ; les réponses restent attachées à leur demande.</li></ul>`],
  ['tous','Lire une bulle de tour',`<p>En vue <b>Détaillé</b> et à l'impression, chaque bulle montre le <b>cubage chargé en haut</b> et la <b>plaque en bas</b>.</p><ul><li><b>Vert plein</b> : chargé · <b>contour</b> : prévu · <b>pointillé</b> : complément (moins qu'un camion plein).</li><li><b>Gris-vert</b> : chargé par une autre centrale (son nom en bas) · <b>bleu</b> : camion replacé.</li><li><b>Orange « ? / +1T »</b> : complément <b>prévu</b>, à confirmer (case [+] cochée à la saisie, ou noté depuis le [+] gris). Le chantier reste en cours tant qu'elle est là.</li><li><b>+</b> au bout des bulles : ajouter un tour. Le cubage est prérempli à un camion plein (7,5 m³ ou le maximum du camion) ; corrigez-le pour un complément.</li></ul>`],
  ['tous','Commentaires (pastilles)',`<ul><li><b>+ Info</b> sur la ligne : pastilles toutes prêtes ou texte libre. « Citybag 1er camion » et « Bétobag 1er camion » ne sont proposés que sur les chantiers avec pompe.</li><li>Clic sur une pastille pour la modifier ; <b>×</b> pour la supprimer (avec confirmation).</li></ul>`]]],
 ['Disposition de l\'écran',[
  ['centraliste','Déplacer les trois encadrés du haut',`<p>Un encadré <b>vide</b> se replie (titre et boutons « + ») et laisse sa place aux autres ; quand les trois sont vides, la bande devient une ligne fine qui se déplie au survol.</p><ol><li><b>Rester appuyé</b> un instant sur le bord ou le titre d'un encadré (Planning camions, Journal de bord, Agrégats). Le contour devient orange.</li><li>Sans relâcher, glisser à gauche ou à droite des autres encadrés.</li><li>Glisser vers le bas de l'écran : <b>les trois encadrés passent ensemble en bas</b> de la page ; vers le haut, ils remontent.</li><li>Relâcher. La disposition est gardée pour vous. <b>Échap</b> pendant le geste annule.</li></ol><p>Les lignes du planning ne bougent jamais.</p>`],
  ['tous','Ouvrir ou fermer ce mode d\'emploi',`<p>Il s'ouvre depuis le <b>badge du compte</b> → <b>Aide</b> → <b>Mode d'emploi</b> : un onglet s'ajoute au menu de gauche. Pour le fermer : <b>clic droit</b> sur l'onglet, ou <b>× Fermer l'onglet</b> en haut de cette page.</p><ul><li><b>? Qu'est-ce que c'est ?</b> (en haut de cette page, dans le badge du compte → Aide, ou la touche <b>?</b> du clavier) : touchez ensuite n'importe quel élément du planning (bulle, étiquette, bouton, encadré) : sa rubrique s'ouvre ici. Rien n'est modifié. Échap pour annuler.</li><li><b>Exemples à essayer</b> : cliquez dans l'exemple animé d'une rubrique, puis sur l'élément entouré d'orange pour passer à l'étape suivante, comme dans le vrai planning (rien n'est modifié). Après la dernière étape, un clic recommence.</li><li><b>◎ Montrer sur l'écran</b> (rubriques sans exemple) : retour au planning, l'élément est entouré en orange quelques secondes.</li><li>Les rubriques ouvertes restent ouvertes pendant que le planning se met à jour.</li></ul>`],
  ['centraliste','Réinitialiser la disposition',`<p><b>Badge du compte</b> → <b>Disposition des encadrés</b> :</p><ul><li><b>Réinitialiser la disposition</b> : revient à la disposition de la centrale (ou à celle par défaut).</li><li><b>Définir comme disposition de la centrale</b> : votre disposition devient celle de tous les centralistes qui n'ont pas la leur.</li></ul>`],
  ['centraliste','Réduire le menu de gauche',`<ul><li>Tirer le <b>bord droit</b> du menu pour l'élargir ou le réduire, jusqu'à des carrés avec icône et numéro.</li><li><b>Double-clic</b> sur ce bord : carrés ↔ menu normal. La taille est gardée.</li></ul>`],
  ['tous','Thème clair ou sombre',`<p>Badge du compte → <b>Centrale</b> → Thème auto, Clair ou Sombre.</p>`]]],
 ['Fin de journée, sauvegarde',[
  ['centraliste','Clôturer la journée',`<p>Badge du compte → <b>Clôturer la journée</b> → confirmation. Le PDF de clôture se télécharge et la clôture est notée au journal. Ensuite, le même bouton permet de retélécharger le PDF. Une journée clôturée ne peut plus être modifiée que par le centraliste.</p><p>Le <b>dernier jour ouvré du mois</b> (hors week-end), le badge propose aussi <b>Imprimer le mois</b> (convocations).</p>`],
  ['tous','Imprimer, PDF et journal',`<ul><li><b>Imprimer</b> : badge du compte → Journée → <b>Imprimer / PDF</b> : jour ou plusieurs jours, A4 ou A3.</li><li><b>Journal</b> : toutes les modifications du jour, avec l'heure et l'auteur.</li><li>Dans Claude, le téléchargement demande d'être connecté à un compte Claude ; la version en ligne télécharge directement.</li></ul>`],
  ['tous','Ouverture exceptionnelle et nuit',`<ul><li><b>Samedi ou dimanche</b> : aller sur le jour → <b>Créer une journée planning ce jour</b>. Le jour s'ajoute au planning, à la navigation et à l'onglet <b>Agrégats</b>.</li><li><b>Nuit</b> : saisir le chantier sur le jour où il <b>commence</b> (ex. mercredi 22 h 00). À partir de 19 h, il s'affiche dans une section <b>☾ Nuit</b>.</li><li>Le lendemain, le planning reprend ces chantiers tout en haut, dans <b>☾ Nuit précédente</b> (fond bleuté) : celui qui prend le poste le matin voit les tours chargés et ceux qui restent, et peut continuer à remplir les bulles.</li><li>Vendredi soir (ou veille d'un jour fermé) : le <b>samedi s'affiche tout seul</b> avec la fin de la nuit, sans ouvrir de journée ; bouton <b>Créer une journée planning ce jour</b> si on travaille aussi le samedi.</li></ul>`],
  ['tous','Une commande ouverte par quelqu\'un d\'autre (verrou)',`<ul><li>Quand quelqu'un ouvre une commande pour la modifier, sa ligne s'affiche <b>grisée</b> avec « <b>Verrouillée · nom modifie</b> » chez tous les autres.</li><li>Tant qu'elle est verrouillée, on ne peut ni l'ouvrir ni cliquer sur ses boutons (tours, pompe, paiement, formule…) : un message dit qui la modifie.</li><li>Le verrou se libère dès que la personne <b>valide ou ferme</b> la commande, ou après <b>5 minutes sans action</b> (rien n'est enregistré dans ce cas).</li><li>Le verrou est <b>tenu par la base</b> : même si l'affichage en direct d'un téléphone est en retard, la base refuse l'enregistrement d'une commande ouverte par quelqu'un d'autre (message « … modifie cette commande : votre changement n'a pas été enregistré »).</li><li>Si deux personnes ouvrent la même commande au même instant, la première garde la main ; l'autre voit un message et sa fenêtre se ferme.</li><li>Téléphone mis en veille avec une commande ouverte : au-delà de 5 minutes, la commande est libérée. Si quelqu'un d'autre l'a ouverte entre-temps, c'est lui qui garde la main.</li></ul>`],
  ['centraliste','Accès : qui peut se connecter',`<p>Réservé aux comptes <b>admin</b> : badge du compte → Centrale → <b>Administration</b> → <b>Accès</b>.</p><p>Sous la liste : <b>état de la base de données</b>. « ✓ à jour » ou la liste des scripts <code>supabase/</code> à exécuter dans Supabase → SQL Editor (un avertissement s'affiche aussi à l'ouverture du planning).</p><ul><li><b>Ajouter</b> : adresse Google de la personne, prénom, rôle (centraliste, commercial, tech labo, lecture seule).</li><li>Changer le <b>rôle</b>, <b>désactiver</b> (case Actif) ou <b>retirer</b> (×) une personne : la personne est <b>déconnectée automatiquement</b> dans les 30 secondes, avec un message.</li><li>Colonne <b>Connexion</b> : date de la première connexion, ou « jamais ».</li><li>Votre propre accès et le dernier admin ne peuvent pas être modifiés, pour ne jamais perdre la main.</li></ul>`],
  ['tous','Citybag et Betobag',`<ul><li><b>Betobag</b> : sac de lavage de la pompe, à cocher dans la partie pompe de la commande.</li><li><b>Citybag</b> : produit <b>BAG</b> (saisi dans la formule). Les sacs de 0,5 m³ sont remplis <b>à la centrale</b> par une toupie : on saisit la commande comme un chantier (heure d'enlèvement, cubage), puis chaque tour avec sa plaque et son volume.</li><li>Le planning compte les sacs : 4 m³ = <b>8 bags</b>, affichés sous le cubage (chargés / prévus) et dans chaque bulle.</li></ul>`],
  ['tous','Journée clôturée',`<ul><li>Une fois la journée clôturée par le centraliste, <b>seul le centraliste</b> peut encore la modifier (commandes, agrégats, liants).</li><li>Le commercial et le labo voient la journée, peuvent ouvrir la carte et <b>dupliquer</b> une commande vers un autre jour (menu ⋯), mais pas la modifier ni y déplacer une commande.</li><li>La règle est appliquée par la base : un enregistrement refusé affiche « Journée clôturée : seul le centraliste peut la modifier ».</li></ul>`],
  ['tous','Notifications sur le téléphone',`<p>Une fois l'application installée, le planning peut prévenir sur l'<b>écran de verrouillage</b>, même fermé.</p><ul><li>Badge du compte → Centrale → <b>Notifications sur cet appareil…</b> → <b>Activer les notifications</b>, puis accepter.</li><li><b>Centraliste</b> : commande du commercial à valider, modification à valider, demandes, chat.</li><li><b>Commercial</b> : ses commandes validées, modifiées ou annulées par la centrale, réponses à ses demandes, formule proposée par le labo.</li><li><b>Tech labo</b> : demandes et réponses qui le concernent.</li><li><b>Rappel du matin</b> (6 h 45) : les bons de pompe pas encore faits pour le prochain jour travaillé (centraliste ; le commercial peut l'activer).</li><li>Touchez une ligne pour couper ou remettre un type de notification. <b>Envoyer une notification de test</b> pour vérifier.</li><li>Toucher une notification ouvre le planning sur la commande concernée.</li><li>iPhone : seulement dans l'application installée (Safari → Partager → Sur l'écran d'accueil), iOS 16.4 ou plus récent.</li></ul>`],
  ['tous','Installer l\'application sur le téléphone',`<p>Le planning s'installe comme une application, sans magasin d'applications : une icône « <b>La Bocca</b> » sur l'écran d'accueil, en plein écran, mise à jour automatiquement.</p><ul><li><b>Android</b> : ouvrir le planning dans <b>Chrome</b> → menu <b>⋮</b> → <b>Installer l'application</b> (ou Ajouter à l'écran d'accueil).</li><li><b>iPhone</b> : ouvrir le planning dans <b>Safari</b> → bouton <b>Partager</b> → <b>Sur l'écran d'accueil</b> → Ajouter. Se connecter une fois avec Google dans l'application.</li><li>Raccourci : badge du compte → Aide → <b>Installer l'application sur cet appareil</b>.</li></ul>`],
  ['tous','Synchronisation et hors connexion',`<ul><li>Badge du compte <b>vert</b> = tout est synchronisé ; <b>rouge</b> = pas encore.</li><li>Sans réseau, on continue de travailler : les changements partent au retour du réseau.</li><li>Badge → <b>Forcer la synchronisation</b> en cas de doute.</li></ul>`],
  ['tous','Carte du chantier',`<p>Clic sur le nom du chantier : une petite fenêtre <b>Google Maps</b> s'ouvre (version en ligne), à déplacer par sa barre noire. <b>×</b> orange pour fermer, <b>Itinéraire ↗</b> pour ouvrir Google Maps.</p><ol><li><b>Placer le point exact</b> (en bas de la fenêtre).</li><li>Cliquer à l'endroit du chantier (zoom à la molette).</li><li><b>Valider ce point</b>. Il est gardé pour ce chantier, y compris quand on duplique la commande.</li></ol><p>Dans Claude, Google Maps s'ouvre dans un onglet.</p>`]]]
];

/* ===================== Chat de la centrale =====================
   Tous les connectés écrivent ; une fiche par message (pas de conflit à plusieurs).
   Conservation : 7 jours glissants (un fil d'exploitation, pas une archive) ;
   les messages plus anciens s'effacent d'eux-mêmes. Les réponses aux demandes restent aussi sur la demande. */
const CHAT_DAYS=7;
let chatWin=null;
const chatList=()=>{const lim=Date.now()-CHAT_DAYS*864e5;return (S.chat||[]).filter(m=>m.ts>=lim).sort((a,b)=>a.ts-b.ts)};
function chatPurge(){const lim=Date.now()-CHAT_DAYS*864e5;const n=(S.chat||[]).length;S.chat=(S.chat||[]).filter(m=>m.ts>=lim);return S.chat.length!==n}
function chatSend(t,ref){t=String(t||'').trim();if(!t)return false;S.chat=S.chat||[];S.chat.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),ts:Date.now(),by:author(),role:role(),t:t.slice(0,1000),ref:ref||null});chatPurge();prefs.chatSeen=Date.now();savePrefs();commit();return true}
function chatUnread(){const me=author();return chatList().filter(m=>m.ts>(prefs.chatSeen||0)&&m.by!==me).length}
const chatOn=()=>!!(chatWin&&!chatWin.hidden);
function chatNav(){if(isPhone()&&S)renderChrome()}
function chatToggle(){if(RO())return;if(chatWin&&!chatWin.hidden){chatWin.hidden=true;chatNav();return}chatOpen();chatNav()}
function chatOpen(){if(RO())return;
  if(!chatWin){chatWin=document.createElement('div');chatWin.className='chatwin';chatWin.setAttribute('role','dialog');chatWin.setAttribute('aria-label','Chat de la centrale');
    chatWin.innerHTML=`<div class="cw-h"><div><b>Chat · La Bocca</b><span class="cw-who"></span></div><button class="cw-x" aria-label="Fermer le chat" title="Fermer">×</button></div><div class="cw-l" aria-live="polite"></div>
      <form class="cw-f"><textarea rows="2" placeholder="Écrire un message… (Entrée pour envoyer)" aria-label="Message" maxlength="1000"></textarea><button class="btn primary" type="submit">Envoyer</button></form>
      <p class="cw-note">Messages gardés 7 jours, visibles par toutes les personnes connectées au planning.</p>`;
    document.body.appendChild(chatWin);
    chatWin.querySelector('.cw-x').onclick=()=>{chatWin.hidden=true;chatNav()};
    const f=chatWin.querySelector('.cw-f'),ta=f.querySelector('textarea');
    f.addEventListener('submit',e=>{e.preventDefault();if(chatSend(ta.value)){ta.value='';render()}ta.focus()});
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit()}if(e.key==='Escape'){chatWin.hidden=true;chatNav()}});
  }
  chatWin.hidden=false;if(chatPurge())commit();chatRender(true);prefs.chatSeen=Date.now();savePrefs();
  const fb=document.querySelector('.chat-b');if(fb){fb.classList.remove('has');const b=fb.querySelector('b');if(b)b.remove()}
  if(!isPhone())setTimeout(()=>chatWin.querySelector('textarea').focus(),30);
}
function chatRender(force){if(!chatWin||chatWin.hidden)return;const box=chatWin.querySelector('.cw-l');const atEnd=force||box.scrollTop+box.clientHeight>=box.scrollHeight-40;
  const me=author();let last='';const L=chatList();
  box.innerHTML=L.length?L.map(m=>{const d=new Date(m.ts);const iso=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;const sep=iso!==last?`<div class="cw-d">${esc(iso===TODAY?'Aujourd\'hui':dayShort(iso))}</div>`:'';last=iso;
    return `${sep}<div class="cw-m ${m.by===me?'mine':''} r-${esc(m.role||'')}"><div class="cw-a"><b>${esc(m.by)}</b><span>${pad(d.getHours())}:${pad(d.getMinutes())}</span></div>${m.ref?`<div class="cw-ref">↳ Réponse à « ${esc(m.ref.t)} »</div>`:''}<div class="cw-t">${esc(m.t)}</div></div>`}).join(''):'<p class="cw-empty">Aucun message ces 7 derniers jours. Écrivez le premier.</p>';
  if(atEnd)box.scrollTop=box.scrollHeight;
  const ps=(typeof peers!=='undefined'?peers:[]).filter(p=>p.kind==='viewer'&&p.presence&&p.presence.nom);const names=[...new Set(ps.map(p=>p.presence.nom))];
  chatWin.querySelector('.cw-who').textContent=names.length?' · en ligne : '+names.join(', '):MODE==='local'?' · démo sur cet appareil':'';
  if(force||atEnd){prefs.chatSeen=Date.now();savePrefs()}
}
function closeAide(){prefs.aideOn=false;savePrefs();if(view.tab==='aide')view.tab='planning';render(true);toast('Mode d\'emploi fermé · le rouvrir : badge du compte')}
document.addEventListener('contextmenu',e=>{const b=e.target.closest&&e.target.closest('.nav-b[data-v=aide]');if(!b)return;e.preventDefault();closeAide()});

/* Mode d'emploi : petites animations qui montrent le changement d'état */
let anStep={},anCurT='';
const anS=(states,h)=>{const k=anCurT,man=k in anStep,cur=anStep[k]||0,n=states.length;
  return `<div class="an an${n} ${man?'man':''}" data-an="${esc(k)}" data-n="${n}" style="--h:${(h||78)+16}px" role="button" tabindex="0" aria-label="Exemple à essayer : cliquer pour avancer">${states.map(([v,c],i)=>`<div class="an-s ${man&&i===cur?'cur':''}" style="--i:${i}"><div class="an-v">${v}</div><small>${c}</small><span class="an-step">${i+1}/${n}${i===n-1?' · cliquer pour recommencer':/an-go/.test(v)?' · cliquez sur l\'élément entouré':' · cliquer pour continuer'}</span></div>`).join('')}<span class="an-try">▶ Cliquez pour essayer</span></div>`};
function anGo(a,k,i){anStep[k]=i;a.classList.add('man');a.querySelectorAll('.an-s').forEach((x,j)=>x.classList.toggle('cur',j===i))}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('.an[data-an]');if(!a)return;const k=a.dataset.an,n=+a.dataset.n;
  if(!(k in anStep))return anGo(a,k,0);const cur=anStep[k];const st=a.querySelectorAll('.an-s')[cur];const go=st&&st.querySelector('.an-go');
  if(go&&!e.target.closest('.an-go')){go.classList.remove('an-nudge');void go.offsetWidth;go.classList.add('an-nudge');return}
  anGo(a,k,(cur+1)%n)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.an[data-an]')){e.preventDefault();const a=e.target,k=a.dataset.an;anGo(a,k,k in anStep?(anStep[k]+1)%(+a.dataset.n):0)}});
const bu=(v,p,cls)=>`<span class="t t2 ${cls||''}"><b>${v}</b><small>${p}</small></span>`;
const anRow=(c,txt,grad)=>`<div class="an-row" style="--c:${c};${grad?'':'--g:transparent'}"><b>07:30</b> <b>BATISUD</b> <span>30/30</span> <span class="muted">${txt}</span></div>`;
const AIDE_ANIM={
  'Paiements comptant':()=>anS([[`<b>MARTIN Paul</b> <span class="tag pay">€</span>`,'Client comptant : paiement en attente · clic sur €'],[`<b>MARTIN Paul</b> <span class="tag pay ok">PAYÉ</span>`,'Confirmé : le paiement est reçu']],106),
  'Pompes, bon de pompe et réservations':()=>anS([[`<button class="mo warn">Fica 42 m</button> <button class="mo warn an-go">À RÉSERVER</button>`,'Pompe à réserver, bon à faire'],[`<button class="mo warn an-go">Fica 42 m</button> <button class="mo on">RÉSERVÉ</button>`,'Clic sur À RÉSERVER : pompe réservée'],[`<button class="mo on">Fica 42 m</button> <button class="mo on">RÉSERVÉ</button>`,'Clic sur la pompe : bon de pompe fait']]),
  'Remplir une bulle (plaque du camion)':()=>anS([[bu('7,5','—','an-go')+bu('7,5','—'),'Tours prévus : cubage en haut'],[bu('7,5','GW','on')+bu('7,5','—'),'Clic sur la bulle, choix de la plaque : chargé'],[bu('7,5','GW','on')+bu('7,5','EF','on')+`<span class="t-add">+</span>`,'Tous chargés · + pour ajouter un tour (7,5 m³ prérempli)']],98),
  'Replacer un camion déjà chargé sur un autre chantier':()=>anS([[bu('7,5','GW','on an-go'),'Camion chargé pour BATISUD'],[bu('7,5','GW','on mv')+` <span class="mono">→</span> `+bu('7,5','GW','on rf'),'Replacé : barré ici, ↪ bleu sur le nouveau chantier']]),
  'Lire une bulle de tour':()=>anS([[bu('7,5','—'),'Prévu, pas encore chargé'],[bu('7,5','GW','on'),'Chargé : cubage en haut, plaque en bas'],[bu('5','V955','cp'),'Complément (moins qu\'un camion plein)'],[bu('7,5','Nice','on ext')+`<span class="t t2 t-plus"><b>?</b><small>+1T</small></span>`,'Autre centrale · 1 tour à confirmer']]),
  'Saisir une commande':()=>anS([[`<span class="an-q">15 m³</span><span class="plus-t an-go"><span>[+]</span></span>`,'Quantité · [+] si le client prendra un complément'],[`<span class="an-q">15 m³</span><span class="plus-t on"><span>[+]</span></span>`,'[+] coché : « 15 et plus »'],[bu('7,5','—')+bu('7,5','—')+`<span class="t t2 t-plus"><b>?</b><small>+1T</small></span>`,'Sur le planning : 15/15 + et la bulle orange']]),
  'Modifier, dupliquer, annuler une commande':()=>anS([[anRow('#FF8A00','En attente',1),'Statut En attente : barre et dégradé orange'],[anRow('#1E9E4A','En cours',0),'En cours : barre verte'],[anRow('#2F6FD6','Terminée',1),'Terminée : barre et dégradé bleus']],70),
  'Commentaires (pastilles)':()=>anS([[`<span class="chip on"><span class="pt">Appeler avant départ</span></span><span class="chip more an-go">+2</span><span class="chip add">+ Info</span>`,'Plus de 2 infos : la première et un compteur'],[`<div class="an-list"><span class="chip on"><span class="pt">Appeler avant départ</span></span><span class="chip"><span class="pt">Accès étroit</span></span><span class="chip"><span class="pt">Prévoir 2 hommes</span></span></div>`,'Survol ou clic sur +2 : toutes les infos']],124),
  'Planning camions : renforts, détachements, convocations':()=>anS([[`<span class="lbl">Absents</span> <span class="muted">—</span> <span class="chip add an-go">+ Absent</span>`,'+ Absent : plaque, Matin / Après-midi / Journée, raison'],[`<span class="lbl">Absents</span> <span class="chip bad"><b>7656</b> <small>Matin</small> <small>· Congé</small><span class="x">×</span></span>`,'× pour annuler · clic droit : menu']]),
  'Ligne « À surveiller »':()=>anS([[`<span class="chip bad an-go">Paiement · MARTIN</span><span class="chip info">2 à placer</span>`,'Ce qui demande une action aujourd\'hui'],[`<span class="chip info">2 à placer</span><span class="chip warn">Pompe à réserver</span>`,'Clic sur une alerte : la ligne concernée s\'ouvre']])
};
let aideOpen=new Set(),aideQ='';
const aideTxt=h=>h.replace(/<[^>]*>/g,' ').toLowerCase();
document.addEventListener('toggle',e=>{const d=e.target;if(!d.matches||!d.matches('.aide-d'))return;const t=d.dataset.t;if(d.open)aideOpen.add(t);else aideOpen.delete(t)},true);
function aideHTML(){const ce=role()==='centraliste';const q=aideQ.trim().toLowerCase();let nb=0;
  return `<div class="aide-top"><div class="aide-t"><h2>Mode d'emploi</h2><button class="btn sm aide-x" data-act="aide-close" title="Le rouvrir : badge du compte → Mode d'emploi">× Fermer l'onglet</button></div>
   <p class="muted">Un dépliant par élément : cliquez sur un titre pour l'ouvrir.</p>
   <div class="aide-bt"><button class="btn sm primary aide-pickb" data-act="aide-pick" title="Ou la touche ? du clavier">? Qu'est-ce que c'est ? Toucher un élément</button><button class="btn sm" data-act="aide-all" data-v="1">Tout ouvrir</button><button class="btn sm" data-act="aide-all" data-v="0">Tout fermer</button></div>
   <input class="aide-q" type="search" placeholder="Que voulez-vous faire ? (ex. plaque, paiement, réinitialiser)" aria-label="Chercher dans le mode d'emploi" data-act="aide-q" value="${esc(aideQ)}"></div>
   <div class="aide">${AIDE.map(([g,L])=>{const it=L.filter(x=>ce||x[0]==='tous');const vis=it.filter(([,t,b])=>!q||aideTxt(t+' '+b).includes(q));nb+=vis.length;return it.length?`<section class="aide-g" ${vis.length?'':'hidden'}><h3>${esc(g)}</h3>${it.map(([w,t,b])=>{const ok=!q||aideTxt(t+' '+b).includes(q);anCurT=t;return `<details class="aide-d" data-t="${esc(t)}" ${ok?'':'hidden'} ${(q?ok:aideOpen.has(t))?'open':''}><summary><span>${esc(t)}</span>${w==='centraliste'&&ce?'':''}</summary><div class="aide-b">${AIDE_ANIM[t]?AIDE_ANIM[t]():''}${b}${!AIDE_ANIM[t]&&AIDE_CIBLES.some(([,...ts])=>ts.includes(t))?`<button class="btn sm aide-show" data-act="aide-show" data-t="${esc(t)}">◎ Montrer sur l'écran</button>`:''}</div></details>`}).join('')}</section>`:''}).join('')}
   <p class="aide-none muted" ${nb?'hidden':''}>Rien trouvé : essayez un autre mot.</p></div>`}
document.addEventListener('input',e=>{if(!e.target.matches||!e.target.matches('.aide-q'))return;aideQ=e.target.value;const q=aideQ.trim().toLowerCase();let n=0;
  document.querySelectorAll('.aide-d').forEach(d=>{const ok=!q||d.textContent.toLowerCase().includes(q);d.hidden=!ok;if(ok)n++;d.open=!!q&&ok});
  document.querySelectorAll('.aide-g').forEach(g=>{g.hidden=![...g.querySelectorAll('.aide-d')].some(d=>!d.hidden)});
  const no=document.querySelector('.aide-none');if(no)no.hidden=n>0});
/* Mode d'emploi : animations des nouveautés */
const anMenu=(on)=>`<div class="an-mcol"><div class="an-mrow"><b>07:30</b> <b>BATISUD</b> <span class="muted">30 m³</span><span class="an-dots ${on?'on':'an-go'}">⋯</span></div>${on?`<div class="an-menu"><span>Modifier la commande</span><span>Dupliquer…</span><span class="an-go">Statut ▸</span><span class="bad">Supprimer</span></div>`:''}</div>`;
Object.assign(AIDE_ANIM,{
  'Se connecter et changer d\'utilisateur':()=>anS([[`<span class="an-badge">JO</span> <b>Jonathan</b> <span class="chip on">Centraliste</span><span class="chip an-off">Commercial</span><span class="chip an-off">Labo</span>`,'Votre badge, votre prénom, votre rôle (les autres grisés)'],[`<span class="an-badge">JO</span><span class="an-badge c">MO</span><span class="an-badge l">LE</span>`,'En dessous : les personnes connectées, par rôle']],104),
  'Changer de jour, de semaine ou de vue':()=>anS([[`<span class="seg an-seg"><span class="on">Jour</span><span class="an-go">Semaine</span></span>`,'Jour : le détail de la journée'],[`<div class="an-wk">${[[60,20,0],[90,40,0],[30,50,20],[100,30,0],[45,10,0]].map(([m,a,n],i)=>`<div><small>${'LMMJV'[i]}</small><i style="--m:${m}%;--a:${a}%;--n:${n}%"></i></div>`).join('')}</div>`,'Semaine : une barre de charge par jour (matin, après-midi, nuit)']]),
  'Modifier, dupliquer, annuler une commande':()=>anS([[anMenu(0),'Le menu ⋯ au bout de la ligne'],[anMenu(1),'Clic : modifier, dupliquer, statut, supprimer'],[anRow('#FF8A00','En attente',1),'Statut En attente : barre orange'],[anRow('#2F6FD6','Terminée',1),'Terminée : barre bleue, plus de complément']],172),
  'Valider une commande du commercial':()=>anS([[`<b>BATISUD</b> <span class="tag modv an-go">Modif. à valider</span>`,'Le commercial a modifié une commande validée'],[`<div class="an-diff"><span>Heure</span><s>07:30</s><b>09:30</b><span>Cubage</span><s>30 m³</s><b>36 m³</b></div><span class="chip on an-go">Valider</span>`,'Ce qui a changé, avant → après'],[`<b>BATISUD</b> <span class="muted">09:30 · 36 m³</span>`,'Valider : la commande est à jour']],94),
  'Formule en attente : proposition du labo':()=>anS([[`<button class="r-form att">Formule ?</button>`,'Formule en attente'],[`<button class="r-form att">Formule ?</button><span class="flabo an-go"><span>Labo</span></span>`,'Le labo propose sa formule : badge LABO'],[`<button class="r-form fam-b">C25/30 D20 S4 XC1</button>`,'Clic sur LABO → Appliquer : formule de la commande']]),
  'Paiements comptant':()=>anS([[`<b>MARTIN Paul</b> <span class="tag pay an-go">€</span>`,'Paiement en attente · clic : reçu'],[`<div class="an-diff an-pay"><span>200,00 €</span><b>CB · 4821</b><span>150,50 €</span><b>Virement</b><span>Total</span><b>350,50 €</b></div>`,'Clic droit : une ligne par paiement, + Autre paiement'],[`<b>MARTIN Paul</b> <span class="tag pay ok">PAYÉ</span>`,'Plus rien en attente : payé']],124),
  'Remplir une bulle (plaque du camion)':()=>anS([[bu('7,5','GW','on')+bu('7,5','EF','on')+`<span class="t t2 t-plus an-go"><b>?</b><small>+1T</small></span><span class="t-add">+</span>`,'Chargés · orange = complément prévu · [+] gris = non prévu'],[bu('7,5','GW','on')+bu('7,5','EF','on')+bu('4','V955','on cp')+`<span class="t-add">+</span>`,'Complément chargé'],[`<div class="an-ask"><b>Encore un complément prévu ?</b><span class="chip on">Oui</span><span class="chip an-go">Non, c'est le dernier</span></div>`,'Le planning demande à chaque fois'],[anRow('#2F6FD6','Terminée',1),'Non : la commande passe Terminée']],100),
  'Agrégats et ciments':()=>anS([[`<span class="lbl">Semi 1</span> <span class="chip an-go">0/4 Carrière</span><span class="chip">4/10</span><span class="chip add">+</span>`,'Produits demandés au chauffeur'],[`<span class="lbl">Semi 1</span> <span class="chip an-stab">0/4 Carrière</span><span class="chip">4/10</span><span class="chip add">+</span>`,'Clic : reçu, surligné comme au stabilo'],[`<span class="chip add">+ Semi</span><span class="chip add">+ Liant</span>`,'En bas de l\'encadré : nouvelle semi, nouveau liant']]),
  'Une commande ouverte par quelqu\'un d\'autre (verrou)':()=>anS([[anRow('#1E9E4A','En cours',0),'Ligne normale'],[`<div class="an-row an-lock"><b>07:30</b> <b>BATISUD</b> <span>Verrouillée · Morgan modifie</span></div>`,'Ouverte ailleurs : grisée jusqu\'à la validation']],88),
  'Journée clôturée':()=>anS([[`<span class="chip ok">Ouverte</span> <b>Mer. 26 nov.</b> <span class="chip an-go">Clôturer</span>`,'Journée en cours · clôturer en fin de journée'],[`<span class="chip">🔒 Clôturée 18:00</span> <b>Mer. 26 nov.</b>`,'Clôturée : seul le centraliste la modifie']]),
  'Ouverture exceptionnelle et nuit':()=>anS([[`<span class="lbl">Matin</span><span class="lbl">Après-midi</span>`,'Avant 19 h : matin et après-midi'],[`<span class="lbl">Matin</span><span class="lbl">Après-midi</span><span class="lbl an-nuit">☾ Nuit · 22:00</span>`,'À partir de 19 h : la section Nuit'],[`<span class="lbl an-nuit">Nuit précédente · 22:00</span>`,'Le lendemain matin : la nuit de la veille']]),
  'Déplacer les trois encadrés du haut':()=>anS([[`<span class="an-box">Planning camions<br><small>2 renforts</small></span><span class="an-box">Journal<br><small>—</small></span><span class="an-box">Agrégats<br><small>Semi 1</small></span>`,'Encadrés remplis'],[`<span class="an-box">Planning camions<br><small>2 renforts</small></span><span class="an-box mini">Journal +</span><span class="an-box">Agrégats<br><small>Semi 1</small></span>`,'Un encadré vide se replie et laisse sa place']]),
  'Notifications sur le téléphone':()=>anS([[`<div class="an-notif"><b>La Bocca · Commande à valider</b><small>BATISUD · jeu. 26 nov. 07:30 · 8 m³</small></div>`,'Sur l\'écran de verrouillage, même fermé'],[`<div class="an-notif"><b>La Bocca · Bons de pompe</b><small>Demain : 2 bons à faire</small></div>`,'Chaque matin à 6 h 45 : les bons de pompe']],84),
  'Synchronisation et hors connexion':()=>anS([[`<span class="an-badge ok">JO</span>`,'Vert : tout est synchronisé'],[`<span class="an-badge ko">JO</span>`,'Rouge : modifications pas encore envoyées']]),
  'Compte en lecture seule':()=>anS([[anMenu(0)+'',`Compte normal : menu ⋯ et boutons`],[`<div class="an-mrow"><b>07:30</b> <b>BATISUD</b> <span class="muted">30 m³</span></div>`,'Lecture seule : on consulte, rien ne s\'ouvre']])
});

/* Mode d'emploi relié à l'écran : « Qu'est-ce que c'est ? » (clic sur un élément → sa rubrique) et « Montrer sur l'écran » */
const AIDE_CIBLES=[
  ['.flabo','Formule en attente : proposition du labo'],
  ['.t-plus,.t-add,[data-act=addtour]','Remplir une bulle (plaque du camion)','Lire une bulle de tour'],
  ['[data-act=tour]','Remplir une bulle (plaque du camion)','Lire une bulle de tour'],
  ['[data-act=formule]','Saisir la formule (saisie rapide)'],
  ['[data-act=pay]','Paiements comptant'],
  ['[data-act=pompe],[data-act=presa],[data-act=resa]','Pompes, bon de pompe et réservations'],
  ['[data-act=modv]','Valider une commande du commercial'],
  ['[data-act=ap-ok],[data-act=ap-show],[data-act=ap-menu]','Valider une commande du commercial'],
  ['[data-act=menu]','Modifier, dupliquer, annuler une commande'],
  ['[data-act=pill],[data-act=addpill],[data-act=pills-all],[data-act=pill-x],[data-act=pills-edit]','Commentaires (pastilles)'],
  ['[data-act=map]','Carte du chantier'],
  ['[data-act=we-open]','Ouvrir la centrale un week-end'],
  ['[data-act^=semi],[data-act^=cim],.hb-w.agg','Agrégats et ciments'],
  ['[data-act=etat],[data-act^=panne]','Centrale fermée ou en panne'],
  ['[data-act=pres-add],[data-act^=pass],[data-act=ev-add],[data-act=labo-add],[data-act=prod-chg]','Journal de bord'],
  ['[data-act=ech-add],[data-act^=conv],[data-act=tours-per]','Planning camions : renforts, détachements, convocations'],
  ['[data-act=dem-add],[data-act^=dem-],[data-act=dfilter]','Page À traiter (02 Demandes)'],
  ['.nav-b[data-v=demandes]','Page À traiter (02 Demandes)'],
  ['.nav-b[data-v=agregats]','Agrégats et ciments'],
  ['.nav-b[data-v=camions]','Planning camions : renforts, détachements, convocations'],
  ['.nav-b[data-v=adjuvants],[data-act^=adj]','Adjuvants'],
  ['.nav-b[data-v=liens],[data-act=liens-cfg]','Raccourcis'],
  ['.nav-b[data-v=aide]','Ouvrir ou fermer ce mode d\'emploi'],
  ['#watchbar','Ligne « À surveiller »'],
  ['.chat-b,[data-act=chat]','Chat de la centrale'],
  ['#sync','Synchronisation et hors connexion'],
  ['#me,#who','Se connecter et changer d\'utilisateur'],
  ['[data-act=vue]','Lire une bulle de tour'],
  ['.wk-load','Changer de jour, de semaine ou de vue'],
  ['#seg,#dlabel,[data-act=prev],[data-act=next],[data-act=today],[data-act=mode],[data-act=pickdate]','Changer de jour, de semaine ou de vue'],
  ['.row.veille','Ouverture exceptionnelle et nuit'],
  ['.hb-h','Déplacer les trois encadrés du haut'],
  ['.hb-w:not(.agg)','Planning camions : renforts, détachements, convocations'],
  ['.row','Lire l\'écran du jour'],
];
const aideTitres=()=>{const ce=role()==='centraliste';const r=new Set();AIDE.forEach(([,L])=>L.forEach(([w,t])=>{if(ce||w==='tous')r.add(t)}));return r};
function aideCible(el){const T=aideTitres();for(const [sel,...ts] of AIDE_CIBLES){const m=el.closest&&el.closest(sel);if(m){const t=ts.find(x=>T.has(x));if(t)return {el:m,t}}}return null}
function aideOuvrir(t){prefs.aideOn=true;savePrefs();view.tab='aide';render(true);
  setTimeout(()=>{const d=[...document.querySelectorAll('.aide-d')].find(x=>x.querySelector('summary span').textContent===t);if(!d)return;
    document.querySelectorAll('.aide-d[open]').forEach(x=>{if(x!==d)x.open=false});d.open=true;d.scrollIntoView({block:'center',behavior:'smooth'});
    d.classList.remove('aide-flash');void d.offsetWidth;d.classList.add('aide-flash')},60)}
let aidePick=false,aideHl=null;
function aidePickSet(on){aidePick=!!on;document.body.classList.toggle('aide-pick',aidePick);if(aideHl){aideHl.classList.remove('aide-hl');aideHl=null}
  let b=document.getElementById('aidepickbar');
  if(aidePick&&!b){b=document.createElement('div');b.id='aidepickbar';b.className='aide-pickbar';b.innerHTML=`<span>Touchez un élément du planning pour voir son mode d'emploi</span><button class="btn sm" type="button">Annuler (Échap)</button>`;document.body.appendChild(b);b.querySelector('button').onclick=()=>aidePickSet(false)}
  if(!aidePick){if(b)b.remove();const t=document.getElementById('aidepicktip');if(t)t.remove()}
  if(aidePick){if(view.tab==='aide'){view.tab='planning';render(true)}if(typeof closePop==='function')try{closePop()}catch(_){}}}
const aidePickStop=e=>{if(!aidePick)return;if(e.target.closest&&e.target.closest('#aidepickbar'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()};
['pointerdown','mousedown','touchstart','contextmenu','dblclick'].forEach(ev=>window.addEventListener(ev,aidePickStop,{capture:true,passive:false}));
window.addEventListener('click',e=>{if(!aidePick)return;if(e.target.closest&&e.target.closest('#aidepickbar'))return;aidePickStop(e);
  const c=aideCible(e.target);if(!c){toast('Pas de rubrique pour cet élément : essayez une bulle, une étiquette, un bouton');return}
  aidePickSet(false);aideOuvrir(c.t)},true);
window.addEventListener('mouseover',e=>{if(!aidePick)return;const c=aideCible(e.target);const el=c&&c.el;if(el===aideHl)return;if(aideHl)aideHl.classList.remove('aide-hl');aideHl=el;
  let tip=document.getElementById('aidepicktip');if(!el){if(tip)tip.remove();return}el.classList.add('aide-hl');
  if(!tip){tip=document.createElement('div');tip.id='aidepicktip';tip.className='aide-tip pick';document.body.appendChild(tip)}tip.textContent='? '+c.t;
  const b=el.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,b.left))+'px';tip.style.top=(b.top>50?b.top-tip.offsetHeight-6:b.bottom+6)+'px'},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&aidePick){aidePickSet(false);return}
  if(e.key==='?'&&!e.ctrlKey&&!e.metaKey&&!(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))&&ME&&(document.getElementById('gate')||{hidden:true}).hidden){e.preventDefault();aidePickSet(!aidePick)}});
function aideMontrer(t){const r=AIDE_CIBLES.find(([,...ts])=>ts.includes(t));if(!r)return;
  view.tab='planning';if(view.mode!=='jour'&&!/wk-load/.test(r[0]))view.mode='jour';if(/wk-load/.test(r[0]))view.mode='semaine';render(true);
  setTimeout(()=>{const vis=[...document.querySelectorAll(r[0])].filter(x=>x.offsetParent||x.getClientRects().length);const el=vis[0];
    if(!el){toast('Pas visible sur ce jour (rien de ce type aujourd\'hui) : essayez un autre jour');return}
    el.scrollIntoView({block:'center',behavior:'smooth'});
    document.querySelectorAll('.aide-spot').forEach(x=>x.classList.remove('aide-spot'));document.querySelectorAll('.aide-tip').forEach(x=>x.remove());
    el.classList.add('aide-spot');const tip=document.createElement('div');tip.className='aide-tip';tip.textContent=t;document.body.appendChild(tip);
    const place=()=>{const b=el.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,b.left))+'px';tip.style.top=(b.top>60?b.top-tip.offsetHeight-8:b.bottom+8)+'px'};
    setTimeout(place,350);const fin=()=>{el.classList.remove('aide-spot');tip.remove();removeEventListener('scroll',place,true)};addEventListener('scroll',place,true);setTimeout(fin,4500)},80)}
function liensHTML(){
  const L=S.liens||[];const cats=[...new Set(L.map(l=>l.cat))];
  return `<div class="sec-h"><h2>Raccourcis</h2><p>Les sites et formulaires de la centrale à portée de clic, utiles pour un remplaçant.</p>${role()==='centraliste'?'<button class="btn sm" data-act="liens-cfg">Modifier dans les réglages</button>':''}</div>
  <div class="aide lk-list">${cats.map(c=>`<section class="aide-g"><h3>${esc(c)}</h3>${L.map((l,i)=>{if(l.cat!==c)return '';let host='';try{host=l.u?new URL(l.u).hostname.replace(/^www\./,''):''}catch(_){}
      return l.u?`<a class="lk-r" href="${esc(l.u)}" target="_blank" rel="noopener"><span>${esc(l.n)}</span><small>${esc(host)}</small><i aria-hidden="true">↗</i></a>`:`<div class="lk-r nourl"><span>${esc(l.n)}</span><small>lien à renseigner${role()==='centraliste'?' dans les réglages':''}</small></div>`}).join('')}</section>`).join('')||'<p class="muted">Aucun raccourci pour l\'instant.</p>'}</div>`;
}

/* ---------- présence (qui modifie quoi) ---------- */
let room=null,peers=[];
function editingMap(){const m={};Object.keys(dbLocks).forEach(id=>{const w=dbLockOther(id);if(w)m[id]=w});peers.forEach(p=>{if(p.sameTab)return;const pr=p.presence||{};if(pr.edit&&pr.nom)m[pr.edit]=`${pr.nom}${pr.role?' ('+(ROLES[pr.role]||pr.role).toLowerCase()+')':''}`});return m}
let myEdit=null,myEditAt=0,idleT=null;const LOCK_IDLE=5*60e3;
function setEditing(id){if(id&&ME&&ME.role==='lecture')id=null;   // lecture seule : n'ouvre jamais de verrou
  if((id||null)===myEdit){if(id){clearTimeout(idleT);idleT=setTimeout(lockIdle,LOCK_IDLE)}return}   // même commande : on garde le verrou tel quel
  dbLockSet(id);
  myEdit=id||null;myEditAt=id?Date.now():0;clearTimeout(idleT);if(id)idleT=setTimeout(lockIdle,LOCK_IDLE);if(room)room.presence({edit:myEdit,editAt:myEditAt}).catch(()=>{})}
function lockIdle(){if(!myEdit)return;closePop();closeDrawer();toast('5 minutes sans action : la commande est libérée, rien n\'a été enregistré')}
['input','pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(myEdit){clearTimeout(idleT);idleT=setTimeout(lockIdle,LOCK_IDLE)}},true));
// retour de veille (téléphone dans la poche) : au-delà de 5 min le verrou est rendu ; sinon on se ré-annonce comme le plus récent,
// pour que celui qui a ouvert la commande pendant l'absence garde la main
let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();return}
  if(!myEdit||!hiddenAt)return;const away=Date.now()-hiddenAt;hiddenAt=0;if(away>=LOCK_IDLE){lockIdle();return}
  myEditAt=Date.now();if(room)room.presence({edit:myEdit,editAt:myEditAt}).catch(()=>{})});
const lockedBy=id=>editingMap()[id]||null;
/* Verrou tenu par la base (supabase/09_verrous.sql) : ne dépend pas de la présence en direct.
   La base donne le verrou au premier qui ouvre la commande et refuse les enregistrements des autres. */
let dbLocks={},LOCKS_ON=false,MYUID=null,myDbLock=null,lockQ=Promise.resolve(),lockBeat=null;
const LOCK_MS=5*60e3;
function dbLockOther(id){const v=dbLocks[id];if(!v||!LOCKS_ON||v.par===MYUID)return null;if(Date.now()-Date.parse(v.vu_le||v.depuis||0)>=LOCK_MS)return null;return v.nom||'Un collègue'}
function lockCall(fn){lockQ=lockQ.then(fn).catch(()=>{});return lockQ}
function dbLockSet(id){
  if(!LOCKS_ON||!SB)return;id=id||null;const prev=myDbLock;
  if(prev&&prev!==id){myDbLock=null;delete dbLocks[prev];lockCall(()=>SB.rpc('rendre_verrou',{p_commande:prev}))}
  clearInterval(lockBeat);lockBeat=null;if(!id)return;
  myDbLock=id;const take=()=>lockCall(async()=>{
    const {data,error}=await SB.rpc('prendre_verrou',{p_commande:id,p_nom:author()});if(error||!data||!data[0])return;
    const v=data[0];dbLocks[id]={commande:id,par:v.par,nom:v.nom,depuis:v.depuis,vu_le:new Date().toISOString()};
    if(!v.a_moi&&myEdit===id){myDbLock=null;clearInterval(lockBeat);lockBeat=null;closePop();closeDrawer();toast(`${v.nom||'Un collègue'} modifie cette commande : elle se libère dès sa validation`);render()}});
  take();lockBeat=setInterval(()=>{if(myEdit===id&&document.visibilityState==='visible')take()},60e3);
}
async function verrousInit(){
  try{MYUID=(await SB.auth.getSession()).data.session.user.id}catch(e){return}
  const load=async()=>{const {data,error}=await SB.from('verrous').select('commande,par,nom,depuis,vu_le');if(error)return false;
    const m={};data.forEach(v=>m[v.commande]=v);dbLocks=m;if(myDbLock&&!dbLocks[myDbLock])dbLocks[myDbLock]={commande:myDbLock,par:MYUID,vu_le:new Date().toISOString()};return true};
  if(!await load())return;   // 09_verrous.sql pas encore exécuté : on reste sur le verrou par présence
  LOCKS_ON=true;if(myEdit)dbLockSet(myEdit);
  const redraw=()=>{if(!S)return;if(popEl.hidden&&drawerEl.hidden)render();else renderChrome()};
  SB.channel('documents-direct-verrous-'+Math.random().toString(36).slice(2,8),{config:{private:true}})
    .on('postgres_changes',{event:'*',schema:'public',table:'verrous'},pl=>{
      if(pl.eventType==='DELETE'){const k=(pl.old||{}).commande;if(k&&k!==myDbLock)delete dbLocks[k]}else if(pl.new)dbLocks[pl.new.commande]=pl.new;
      const w=myEdit&&dbLockOther(myEdit);if(w&&dbLocks[myEdit].depuis&&myDbLock===myEdit){/* un autre a la main : on vérifie auprès de la base */dbLockSet(myEdit)}
      redraw()})
    .subscribe();
  // filet : relecture régulière (réseau mobile, veille), sans boucle de reconnexion
  setInterval(()=>{if(document.visibilityState==='visible')load().then(ok=>{if(ok)redraw()})},20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load().then(ok=>{if(ok)redraw()})});
  window.addEventListener('pagehide',()=>{if(myDbLock)try{SB.rpc('rendre_verrou',{p_commande:myDbLock})}catch(e){}});
}
// journée clôturée : seul le centraliste la modifie (appliqué aussi par la base, 12_journee_cloturee.sql)
function closedStop(d){if(!d||role()==='centraliste')return false;const c=(dayRO(d)||{}).cloture;if(!c)return false;toast(`Journée clôturée${c.by?' par '+c.by:''} : seul le centraliste peut la modifier`);return true}
// ---------- comptant : paiements faits par le client (clic droit sur le paiement) ----------
const PAY_MODES=[['carte','Carte'],['cb','CB'],['virement','Virement'],['attente','Attente']];
const fmtE=n=>(Math.round(n*100)/100).toLocaleString('fr-FR',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+' €';
const payTot=p=>(p&&p.lignes||[]).reduce((a,l)=>a+(+l.m||0),0);
const payTxt=p=>(p&&p.lignes||[]).map(l=>`${fmtE(+l.m||0)} ${(PAY_MODES.find(x=>x[0]===l.mode)||['',''])[1]}${l.code?' ·'+l.code:''}`).join(' + ');
function payPop(o,anchor){const id=o.id;const L=(o.pay.lignes&&o.pay.lignes.length?o.pay.lignes:[{m:'',mode:'cb',code:''}]).map(l=>({...l}));
  const line=(l,k)=>`<div class="pay-l" data-k="${k}"><input class="pay-m" type="text" inputmode="decimal" placeholder="Montant" value="${l.m===''||l.m==null?'':esc(String(l.m).replace('.',','))}" aria-label="Montant en euros"><span class="pay-eur">€</span>
    <select class="pay-mode" aria-label="Mode de paiement">${PAY_MODES.filter(([v])=>k===0||v!=='attente'||l.mode==='attente').map(([v,t])=>`<option value="${v}" ${l.mode===v?'selected':''}>${t}</option>`).join('')}</select>
    <input class="pay-code" type="text" inputmode="numeric" maxlength="4" placeholder="4 chiffres CB" value="${esc(l.code||'')}" aria-label="4 derniers chiffres de la carte">
    ${k?'<button type="button" class="pay-x" data-pa="del" title="Retirer cette ligne">×</button>':'<span></span>'}</div>`;
  const body=()=>`<div class="pop-h">Paiements · ${esc(cl(o.cl).n)}</div><form data-pa="save" class="pay-f"><div class="pay-ls">${L.map(line).join('')}</div>
    <div class="pay-foot"><button type="button" class="chip add pay-add" data-pa="add">+ Autre paiement</button><span class="pay-tot"></span></div>
    <div class="pop-cf"><button class="btn primary" type="submit">Enregistrer</button><button type="button" class="btn" data-pa="no">Annuler</button></div></form>`;
  const read=()=>[...popEl.querySelectorAll('.pay-l')].map(r=>({m:(v=>isNaN(v)?'':v)(num(r.querySelector('.pay-m').value)),mode:r.querySelector('.pay-mode').value,code:r.querySelector('.pay-code').value.replace(/\D/g,'').slice(0,4)}));
  const tot=()=>{const ls=read(),t=ls.reduce((a,l)=>a+(l.m||0),0),el=popEl.querySelector('.pay-tot');if(el)el.innerHTML=ls.length>1?`Total <b>${esc(fmtE(t))}</b>`:''};
  const h={add(){const ls=read();ls.forEach((l,k)=>Object.assign(L[k],l));L.push({m:'',mode:'cb',code:''});draw();setTimeout(()=>{const r=popEl.querySelectorAll('.pay-m');r[r.length-1].focus()});return 'keep'},
    del(el){const k=+el.closest('.pay-l').dataset.k;const ls=read();ls.forEach((l,j)=>Object.assign(L[j],l));L.splice(k,1);draw();return 'keep'},
    no(){return 'close'},
    save(){const ls=read().filter(l=>l.m>0||l.mode==='attente');if(ls.some(l=>l.code&&l.code.length!==4)){toast('Le code CB fait 4 chiffres');return 'keep'}
      const x=byId(id);x.pay.lignes=ls;const t=payTot(x.pay);x.pay.paye=ls.length>0&&t>0&&!ls.some(l=>l.mode==='attente');
      jlog(x.date,`Paiement ${siteName(x)} : ${payTxt(x.pay)||'effacé'}`);toast(x.pay.paye?`Paiement enregistré : ${fmtE(t)}`:'Paiement enregistré (en attente)')}};
  const draw=()=>{openPop(anchor,body(),h);popEl.querySelector('.pay-f').addEventListener('input',tot);tot()};
  draw();
}
function lockStop(id){const who=id&&lockedBy(id);if(!who)return false;toast(`${who} modifie cette commande : elle se libère dès sa validation`);return true}
// deux personnes au même instant : la première garde la main, l'autre est sortie
function lockRace(){if(!myEdit)return;const riv=peers.find(p=>!p.sameTab&&p.presence&&p.presence.edit===myEdit&&(p.presence.editAt||0)<myEditAt);if(!riv)return;const n=riv.presence.nom||'Quelqu\'un';closePop();closeDrawer();toast(`${n} a la main sur cette commande : votre saisie n'a pas été enregistrée`)}
function whoHTML(){
  const list=peers.filter(p=>p.kind==='viewer'&&!p.isMe);
  const seen=new Set();
  return list.filter(p=>{const k=(p.presence&&p.presence.nom||'')+(p.presence&&p.presence.role||'')+(p.isMe?'me':'');if(seen.has(k))return false;seen.add(k);return true}).slice(0,6).map(p=>{const pr=p.presence||{};const n=pr.nom||'?';return `<span class="av r-${esc(pr.role||'')} ${p.isMe?'me':''}" title="${p.isMe?'Vous : ':''}${esc(n)} · ${esc(ROLES[pr.role]||'')}${pr.edit?' · en cours de modification':''}">${esc(n.slice(0,2))}</span>`}).join('');
}

/* ---------- rendu global ---------- */
let renderPending=false,lastAnim='';
const typingInMain=()=>{const a=document.activeElement;return !!(a&&a.matches&&a.matches('input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]')&&!a.closest('#pop,#drawer,#gate'))};
document.addEventListener('focusout',()=>setTimeout(()=>{if(renderPending&&!typingInMain()&&popEl.hidden&&drawerEl.hidden)render()},0));
const migDone=new WeakSet();
/* Mise à jour fine de l'écran : on calcule toute la page, mais on ne touche qu'aux éléments qui ont changé
   (ligne ouverte, défilement, saisie en cours, encadré déplié restent en place). */
function morphAttrs(a,b){
  for(const at of [...a.attributes])if(!b.hasAttribute(at.name))a.removeAttribute(at.name);
  for(const at of [...b.attributes])if(a.getAttribute(at.name)!==at.value)a.setAttribute(at.name,at.value);
  if(a!==document.activeElement){
    if(a.tagName==='INPUT'){if(a.type==='checkbox'||a.type==='radio')a.checked=b.hasAttribute('checked');else if(a.value!==(b.getAttribute('value')||''))a.value=b.getAttribute('value')||''}
    else if(a.tagName==='TEXTAREA'&&a.value!==b.textContent)a.value=b.textContent;
  }
}
function morphKids(a,b){
  const nk=[...b.childNodes];const ids=new Map();for(const n of a.childNodes)if(n.nodeType===1&&n.id)ids.set(n.id,n);
  let i=0;
  for(const nn of nk){
    let cur=a.childNodes[i]||null;
    if(nn.nodeType===1&&nn.id&&ids.has(nn.id)){const o=ids.get(nn.id);if(o!==cur){a.insertBefore(o,cur);cur=o}}
    if(cur&&cur.nodeType===nn.nodeType&&cur.nodeName===nn.nodeName&&(cur.nodeType!==1||cur.id===nn.id)){
      if(cur.nodeType===1){if(!cur.isEqualNode(nn)){morphAttrs(cur,nn);if(cur.tagName==='TEXTAREA')cur.textContent=nn.textContent;else morphKids(cur,nn)}}
      else if(cur.nodeValue!==nn.nodeValue)cur.nodeValue=nn.nodeValue;
    }else a.insertBefore(nn,cur);
    i++;
  }
  while(a.childNodes.length>nk.length)a.removeChild(a.lastChild);
}
function morph(el,html){const t=document.createElement('template');t.innerHTML=html;morphKids(el,t.content)}

let _labT;function render(force){clearTimeout(_labT);_labT=setTimeout(()=>{try{labInfoCheck()}catch(e){}},400);if(typeof gateDay==='function'&&!document.getElementById('gate').hidden)gateDay();
  plRefresh();
  if(!S)return;
  if(histNeed())return;
  if(!migDone.has(S)){migDone.add(S);let ch=false;(S.orders||[]).forEach(o=>o.tours.forEach(t=>{if(t.p==='S1'){t.p='FK218';ch=true}else if(t.p==='S2'){t.p='HD470';ch=true}}));if(ch)setTimeout(commit)}
  if(!force&&(!popEl.hidden||!drawerEl.hidden)){renderPending=true;renderChrome();return}
  // mise à jour venue d'un autre poste pendant une saisie (adjuvants, agrégats…) : on attend la fin de la saisie
  if(!force&&typingInMain()){renderPending=true;renderChrome();return}
  renderPending=false;
  renderChrome();
  const m=document.getElementById('main'),hd=document.getElementById('head');
  peekRender();
  if(role()!=='centraliste'&&!['planning','demandes','aide'].includes(view.tab))view.tab='planning';
  const t=view.tab,jour=t==='planning'&&view.mode==='jour';
  hd.hidden=!jour||simple()||(isWE(view.date)&&!weOpen(view.date)&&!hasOrders(view.date));
  if(jour){hd.innerHTML=headHTML(view.date);hd.querySelectorAll('.hb').forEach((el,i)=>{if(view.hbOpen.includes(i))el.classList.add('open')})}
  applyLayout();
  m.classList.toggle('cols',jour);m.classList.toggle('simple',simple());m.classList.toggle('compact',jour&&prefs.vue==='simple'&&!isPhone());
  const ak=t+view.mode+view.date;const anim=ak!==lastAnim;lastAnim=ak;m.classList.remove('anim');
  const mh=t==='planning'?(view.mode==='jour'?dayHTML(view.date):weekHTML()):t==='demandes'?demandesHTML():t==='agregats'?aggTabHTML():t==='camions'?camionsHTML():t==='liens'?liensHTML():t==='aide'?aideHTML():adjHTML();
  if(anim||!m.firstChild||window.NO_MORPH)m.innerHTML=mh;else morph(m,mh);   // changement d'onglet ou de jour : page neuve (animation d'entrée)
  document.getElementById('foot').innerHTML=footHTML(view.date);
  {let pv=document.getElementById('phviews');const on=false;
   if(on&&!pv){pv=document.createElement('div');pv.id='phviews';pv.className='phviews';pv.setAttribute('role','group');pv.setAttribute('aria-label','Affichage des chantiers');document.body.appendChild(pv)}
   if(pv){pv.hidden=!on;document.body.classList.toggle('has-phv',on);if(on)pv.innerHTML=[['simple','Simple'],['normal','Normal'],['detail','Détaillé']].map(([k,l])=>`<button class="${(prefs.vue||'normal')===k?'on':''}" data-act="vue" data-v="${k}">${l}</button>`).join('')}}
  {const wb=document.getElementById('watchbar');const it=watchItems(view.date);const sl=wb.querySelector('.wb-in');const x=sl?sl.scrollLeft:0;
   wb.hidden=!it.length;wb.innerHTML=it.length?`<span class="lbl">// À surveiller <b>${it.length}</b></span><div class="wb-in">${it.join('')}</div>`:'';
   const ni=wb.querySelector('.wb-in');if(ni){ni.scrollLeft=x;ni.addEventListener('wheel',e=>{if(ni.scrollWidth<=ni.clientWidth)return;e.preventDefault();ni.scrollLeft+=(Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX)},{passive:false})}}
  if(anim&&jour){m.querySelectorAll('.row,.half-l,.cont').forEach((el,k)=>el.style.setProperty('--k',Math.min(k,24)));void m.offsetWidth;m.classList.add('anim')}
  if(view.focus){const el=document.getElementById('row-'+view.focus);view.focus=null;if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('flash')}}
  chatRender();
}
/* menu : un bloc noir qui glisse vers la rubrique choisie, un reflet qui suit la souris, libellé qui se décode */
let navTop=null,navH=null;
const SIDE_MIN=72,SIDE_SQ=118;
function applySide(w){const app=document.getElementById('app');if(!app)return;let v=w!=null?w:(prefs.sideW||176);if(innerWidth<=900&&innerWidth>760)v=SIDE_MIN;
  const mini=v<SIDE_SQ;app.style.setProperty('--sideW',(mini?SIDE_MIN:v)+'px');app.classList.toggle('side-mini',mini)}
let navSz=null;
document.addEventListener('pointerdown',ev=>{const h=ev.target.closest&&ev.target.closest('.side-rz');if(!h)return;ev.preventDefault();navSz={x:ev.clientX,w:document.getElementById('side').offsetWidth};document.body.classList.add('rz-on');
  const mv=e=>{const w=Math.max(56,Math.min(300,navSz.w+e.clientX-navSz.x));applySide(w);navSz.cur=w};
  const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.body.classList.remove('rz-on');if(navSz&&navSz.cur!=null){prefs.sideW=navSz.cur<SIDE_SQ?SIDE_MIN:Math.round(navSz.cur);savePrefs();applySide();navTop=null;const sd=document.getElementById('side');navMotion(sd)}navSz=null};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up)});
document.addEventListener('dblclick',ev=>{if(!ev.target.closest||!ev.target.closest('.side-rz'))return;prefs.sideW=(prefs.sideW||176)<SIDE_SQ?176:SIDE_MIN;savePrefs();applySide();navTop=null;navMotion(document.getElementById('side'))});
addEventListener('resize',()=>applySide());
// texte coupé faute de place : le survol affiche tout (bulle du navigateur)
document.addEventListener('mouseover',e=>{const el=e.target;if(!el||!el.closest||!el.closest('.row,.hb,.cols'))return;
  for(const x of [el,el.parentElement]){if(!x||x.hasAttribute('title')&&!x.dataset.autoT)continue;
    const coupe=x.scrollWidth>x.clientWidth+1||x.scrollHeight>x.clientHeight+2;const t=(x.innerText||'').trim().replace(/\s+/g,' ');
    if(coupe&&t){x.title=t;x.dataset.autoT='1'}else if(x.dataset.autoT&&!coupe){x.removeAttribute('title');delete x.dataset.autoT}}},true);
let _hlT;addEventListener('resize',()=>{clearTimeout(_hlT);_hlT=setTimeout(()=>applyLayout(),120)});
function navMotion(sd){
  const wrap=sd.querySelector('.nav-wrap');if(!wrap)return;const ind=wrap.querySelector('.nav-ind'),hov=wrap.querySelector('.nav-hov');const on=wrap.querySelector('.nav-b.on');
  const place=(el,b)=>{el.style.transform=`translateY(${b.offsetTop}px)`;el.style.height=b.offsetHeight+'px'};
  if(on){if(navTop!=null){ind.style.transition='none';ind.style.transform=`translateY(${navTop}px)`;ind.style.height=navH+'px';void ind.offsetWidth;ind.style.transition=''}
    requestAnimationFrame(()=>{place(ind,on);ind.classList.add('ready');navTop=on.offsetTop;navH=on.offsetHeight})}
  else ind.style.opacity='0';
  wrap.querySelectorAll('.nav-b').forEach(b=>{
    b.addEventListener('mouseenter',()=>{place(hov,b);hov.classList.add('show')});
  });
  wrap.addEventListener('mouseleave',()=>hov.classList.remove('show'));
}
/* ---------- carte du chantier : petite fenêtre déplaçable ---------- */
let mapWin=null,mapObj=null;
const geoCache=lsGet('planning-bocca-geo-v1')||{};
const BOCCA=[43.5506,6.9497];
// Leaflet (carte pour poser le point exact) : chargé seulement quand on en a besoin
let leafletP=null;
function loadLeaflet(){if(window.L)return Promise.resolve();if(leafletP)return leafletP;
  leafletP=new Promise((ok,ko)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet/leaflet.css';document.head.appendChild(l);
    const sc=document.createElement('script');sc.src='vendor/leaflet/leaflet.js';sc.onload=()=>ok();sc.onerror=()=>{leafletP=null;ko()};document.head.appendChild(sc)});
  return leafletP}
function openMap(o){
  const ch=chan(o.ch);if(!ch)return;
  if(!mapWin){mapWin=document.createElement('div');mapWin.className='mapwin';mapWin.innerHTML=`<div class="mw-h"><span class="mw-t"></span><a class="mw-g" target="_blank" rel="noopener">Itinéraire ↗</a><button class="mw-x" aria-label="Fermer la carte" title="Fermer">×</button></div><div class="mw-body"><iframe class="mw-gm" title="Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="mw-m" hidden></div></div><div class="mw-f"><span class="mw-s"></span><span class="mw-b"></span></div>`;document.body.appendChild(mapWin);
    mapWin.querySelector('.mw-x').onclick=()=>{mapWin.hidden=true};
    const hd=mapWin.querySelector('.mw-h');let sx,sy,ox,oy,drag=false;
    hd.addEventListener('pointerdown',ev=>{if(ev.target.closest('a,button'))return;drag=true;sx=ev.clientX;sy=ev.clientY;const r=mapWin.getBoundingClientRect();ox=r.left;oy=r.top;hd.setPointerCapture(ev.pointerId)});
    hd.addEventListener('pointermove',ev=>{if(!drag)return;const x=Math.min(Math.max(0,ox+ev.clientX-sx),innerWidth-80),y=Math.min(Math.max(0,oy+ev.clientY-sy),innerHeight-40);mapWin.style.left=x+'px';mapWin.style.top=y+'px';mapWin.style.right='auto';mapWin.style.bottom='auto'});
    hd.addEventListener('pointerup',()=>{drag=false});
  }
  mapWin.hidden=false;
  const q=(ch.adr||ch.nom)+'';const id=ch.id;
  const gm=mapWin.querySelector('.mw-gm'),mm=mapWin.querySelector('.mw-m'),st=mapWin.querySelector('.mw-s'),bt=mapWin.querySelector('.mw-b');
  mapWin.querySelector('.mw-t').textContent=(ch.nom||ch.adr)+(ch.nom&&ch.adr?' · '+ch.adr:'');
  const qq=()=>{const c=chan(id);return c&&c.geo?c.geo.join(','):q+', Alpes-Maritimes'};
  const google=msg=>{mm.hidden=true;gm.hidden=false;const k=qq();if(gm.dataset.q!==k){gm.dataset.q=k;gm.src='https://maps.google.com/maps?q='+encodeURIComponent(k)+'&z='+(chan(id).geo?18:16)+'&output=embed'}
    mapWin.querySelector('.mw-g').href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(k);
    st.textContent=msg||(chan(id).geo?'Point du chantier enregistré.':'Position d\'après l\'adresse.');bt.innerHTML='<button class="btn sm" data-mw="place">Placer le point exact</button>';
    bt.querySelector('[data-mw=place]').onclick=place};
  const place=()=>{if(!window.L){st.textContent='Chargement de la carte…';loadLeaflet().then(place,()=>google('Carte indisponible : vérifiez la connexion.'));return}
    gm.hidden=true;mm.hidden=false;let tmp=null;
    if(!mapObj){mapObj=L.map(mm,{zoomControl:true,scrollWheelZoom:true}).setView(BOCCA,12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(mapObj)}
    setTimeout(()=>mapObj.invalidateSize(),30);if(mapObj._pin){mapObj.removeLayer(mapObj._pin);mapObj._pin=null}
    const c=chan(id),start=c.geo||geoCache[q.toLowerCase()];mapObj.setView(start||BOCCA,start?17:12);
    const pin=ll=>{if(mapObj._pin)mapObj.removeLayer(mapObj._pin);mapObj._pin=L.circleMarker(ll,{radius:10,color:'#151515',weight:2,fillColor:'#ff4d00',fillOpacity:.95}).addTo(mapObj)};
    if(c.geo)pin(c.geo);
    st.textContent='Cliquez à l\'endroit exact du chantier, puis validez.';
    bt.innerHTML='<button class="btn sm" data-mw="no">Annuler</button><button class="btn sm primary" data-mw="ok" disabled>Valider ce point</button>';
    const ok=bt.querySelector('[data-mw=ok]');
    mapObj.off('click');mapObj.on('click',ev=>{tmp=[+ev.latlng.lat.toFixed(6),+ev.latlng.lng.toFixed(6)];pin(tmp);ok.disabled=false;st.textContent='Point posé. Validez pour l\'enregistrer.'});
    bt.querySelector('[data-mw=no]').onclick=()=>google();
    ok.onclick=()=>{if(!tmp)return;const x=chan(id);if(!x)return;x.geo=tmp;S.chantiers.forEach(y=>{if(y!==x&&x.adr&&y.adr===x.adr)y.geo=tmp.slice()});commit();toast('Point du chantier validé');google('Point du chantier validé et enregistré.')}};
  google();
  if(!ch.geo&&!geoCache[q.toLowerCase()])fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q='+encodeURIComponent(q+', Alpes-Maritimes')).then(r=>r.json()).then(j=>{if(j&&j[0]){geoCache[q.toLowerCase()]=[+j[0].lat,+j[0].lon];lsSet('planning-bocca-geo-v1',geoCache)}}).catch(()=>{});
}
const NAV_IC={chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',planning:'<path d="M3 21h18"/><path d="M5 21V9h5v12"/><path d="M5 9l2.5-4L10 9"/><path d="M10 13h10v8"/><path d="M13 13v-3h5v3"/><path d="M14 21v-4h3v4"/>',demandes:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',agregats:'<path d="M2 20h20"/><circle cx="8" cy="16" r="3.2"/><circle cx="15.8" cy="16.6" r="2.6"/><circle cx="12.2" cy="10.6" r="2.6"/><circle cx="18.6" cy="11.4" r="1.6"/><circle cx="5.6" cy="10.4" r="1.3"/>',camions:'<path d="M2 17v-5h3.5l2-3.5H10V17"/><ellipse cx="16" cy="11" rx="6" ry="3.6" transform="rotate(-14 16 11)"/><path d="M12.6 8.6l5.6 4.6"/><path d="M10 17h12"/><circle cx="6" cy="18.2" r="2"/><circle cx="18" cy="18.2" r="2"/>',adjuvants:'<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/><path d="M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8"/>',aide:'<circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 3.9"/><path d="M12 17.2h.01"/>',liens:'<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'};
const NAV_C={chat:'#2f5d55',planning:'#151515',demandes:'#FF4D00',agregats:'#FFC21A',camions:'#00B140',adjuvants:'#1E8CFF',liens:'#FF2E93'};
NAV_IC.plus='<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>';NAV_C.plus='#151515';
let navRest=[];
function navMore(el){
  if(document.querySelector('.sheet-scrim'))return closeSheet();
  const nChat=chatUnread();
  const sc=document.createElement('div');sc.className='sheet-scrim';
  const u=prefs.user||{};const who=u.nom||(ME&&ME.nom)||'';
  sc.innerHTML=`<div class="sheet" role="dialog" aria-label="Plus"><div class="sheet-grab" aria-hidden="true"></div>
    <button class="sheet-me" data-me="1"><i class="sheet-av">${esc(String(who||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase())}</i><span><b>${esc(who||'Mon compte')}</b><small>${esc(ROLE_NOM[(ME&&ME.role)||'']||'')} · compte et réglages</small></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 6l6 6-6 6"/></svg></button>
    <div class="sheet-list" ${navRest.length?'':'hidden'}>${navRest.map(([k,l])=>`<button class="sheet-it ${k===view.tab?'on':''}" data-v="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NAV_IC[k]||''}</svg><span>${esc(l)}</span>${k==='chat'&&nChat?`<i class="n">${nChat}</i>`:''}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 6l6 6-6 6"/></svg></button>`).join('')}</div></div>`;
  document.body.appendChild(sc);el.classList.add('open');
  sc.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-me]')){closeSheet();setTimeout(()=>{settingsPop(el);popEl.classList.add('as-sheet','sheet-scroll');popEl.insertAdjacentHTML('afterbegin','<div class="sheet-grab" role="button" aria-label="Fermer"></div>');popEl.scrollTop=0;document.documentElement.classList.add('sheet-open');if(!popEl._drag){popEl._drag=1;sheetDrag(popEl,popEl,closePop,()=>popEl.classList.contains('as-sheet'))}popEl.querySelector('.sheet-grab').onclick=()=>closePop()},200);return}const it=e.target.closest('.sheet-it');if(it){const v=it.dataset.v;closeSheet();setTimeout(()=>act(v==='chat'?'chat':'tab',{dataset:{v}},null,{}),60);return}if(e.target===sc)closeSheet()});
  // glisser vers le bas pour fermer (sans déclencher l'actualisation de la page)
  const sh=sc.querySelector('.sheet');sheetDrag(sh,sh,closeSheet);
  sc.addEventListener('touchmove',e=>{if(e.target===sc)e.preventDefault()},{passive:false});
  document.documentElement.classList.add('sheet-open');
  requestAnimationFrame(()=>sc.classList.add('in'));
}
/* Glisser une feuille vers le bas pour la fermer. Le geste est capté (preventDefault) pour que le navigateur
   n'actualise pas la page (« tirer pour actualiser »). Au-delà de 70 px ou d'un geste rapide : fermeture. */
function sheetDrag(sheet,zone,onClose,actif){
  // actif() : la fenêtre flottante (#pop) sert aussi aux autres menus ; le glisser ne vaut que quand elle est en feuille
  let y0=null,t0=0,dy=0,scroller=null;
  zone.addEventListener('touchstart',e=>{if(actif&&!actif()){y0=null;return}
    scroller=e.target.closest('.sheet-scroll');
    if(scroller&&scroller.scrollTop>0&&!e.target.closest('.sheet-grab')){y0=null;return}
    y0=e.touches[0].clientY;t0=Date.now();dy=0;sheet.style.transition='none';sheet.classList.add('dragging')},{passive:true});
  zone.addEventListener('touchmove',e=>{if(y0===null)return;dy=e.touches[0].clientY-y0;
    if(dy<=0&&scroller&&!e.target.closest('.sheet-grab')){dy=0;return}
    e.preventDefault();dy=Math.max(0,dy);sheet.style.transform=`translateY(${dy}px)`},{passive:false});
  const end=()=>{if(y0===null)return;sheet.style.transition='';sheet.classList.remove('dragging');
    const fast=dy>30&&Date.now()-t0<250;if(dy>70||fast)onClose();else sheet.style.transform='';y0=null};
  zone.addEventListener('touchend',end);zone.addEventListener('touchcancel',end);
}
function closeSheet(){const sc=document.querySelector('.sheet-scrim');if(!sc)return;if(!popEl.classList.contains('as-sheet'))document.documentElement.classList.remove('sheet-open');document.querySelectorAll('.nav-b.open').forEach(b=>b.classList.remove('open'));sc.classList.remove('in');sc.classList.add('out');
  const sh=sc.querySelector('.sheet');if(sh)sh.style.transform='';setTimeout(()=>sc.remove(),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:260)}
function sideHTML(){
  const nd=S.orders.filter(o=>o.kind==='aplacer').length+S.demandes.filter(r=>!r.done).length;
  const mine=S.demandes.filter(r=>!r.done&&r.pour===role()).length;
  const nd2=role()==='centraliste'?nd:mine;
  const all=[['planning',role()==='centraliste'?'Aujourd\'hui':(isPhone()?'Planning':'Commandes'),role()==='centraliste'?'Aujourd.':'Commandes'],['demandes','Demandes','Demandes'],['agregats','Agrégats','Agrégats'],['camions','Camions','Camions'],['adjuvants','Adjuvants','Adjuv.'],['liens','Raccourcis','Liens']];
  const it=(role()==='centraliste'?all:all.slice(0,2)).concat(prefs.aideOn?[['aide','Mode d\'emploi','Aide']]:[]).concat(isPhone()&&!RO()?[['chat','Chat','Chat']]:[]);
  // Téléphone : Aujourd'hui, Demandes, Chat toujours visibles ; le reste dans « Plus »
  navRest=[];
  if(isPhone()){const keep=['planning','demandes','chat'];navRest=it.filter(x=>!keep.includes(x[0]));const main=keep.map(k=>it.find(x=>x[0]===k)).filter(Boolean);it.length=0;it.push(...main);it.push(['plus','Plus','Plus'])}
  const nChat=chatUnread();
  return `<div class="brand"><b>La Bocca</b><span>// Planning centrale</span></div>
  <div class="nav-wrap"><span class="nav-ind" aria-hidden="true"></span><span class="nav-hov" aria-hidden="true"></span>
  ${it.map(([k,l,ic],i)=>`${i===1?'<div class="nav-sep">// Centrale</div>':''}<button class="nav-b ${role()!=='centraliste'?'named':''} ${i===0?'main':''} ${(k==='chat'?chatOn():k==='plus'?navRest.some(x=>x[0]===view.tab||(x[0]==='chat'&&chatOn())):view.tab===k&&!(isPhone()&&chatOn()))?'on':''}" ${k==='chat'?'data-act="chat"':k==='plus'?'onclick="event.stopPropagation();navMore(this)"':`data-act="tab" data-v="${k}"`} title="${l}" style="--c:${NAV_C[k]}"><span class="sq" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NAV_IC[k]||''}</svg><i>${pad(i+1)}</i></span><span class="ix">${pad(i+1)}</span><span class="nt">${l}</span>${k==='demandes'&&nd2?`<span class="n">${nd2}</span>`:''}${k==='chat'&&nChat?`<span class="n">${nChat}</span>`:''}</button>`).join('')}
  </div><div class="side-rz" title="Glisser pour élargir ou réduire le menu · double-clic : carrés / normal" aria-hidden="true"></div>
  <div class="grow"></div>
`;
}
let lastDec='',decId=0;
function decodeDate(dl){
  const el=dl.querySelector('.d');if(!el)return;const txt=el.textContent;if(txt===lastDec)return;const first=!lastDec;lastDec=txt;
  if(true||first||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  const id=++decId;const G='▓▒░·:▪';const due=[...txt].map(()=>80+Math.random()*320);const t0=performance.now();
  const tick=t=>{if(id!==decId||!el.isConnected)return;const dt=t-t0;let out='',done=true;[...txt].forEach((c,k)=>{if(c===' '||dt>=due[k])out+=c;else{done=false;out+=G[Math.floor(Math.random()*G.length)]}});el.textContent=out;if(!done)requestAnimationFrame(tick);else el.textContent=txt};
  requestAnimationFrame(tick);
}
function renderChrome(){
  {const sg=document.getElementById('seg');if(sg)sg.hidden=view.tab!=='planning'}
  const wk=isoWeek(view.date),d=D(view.date);
  const dl=document.getElementById('dlabel');
  if(view.mode==='semaine'&&view.tab==='planning'){const mon=mondayOf(view.date),fri=addDays(mon,4);dl.innerHTML=`<span class="d">Semaine ${wk}</span><span class="w">${D(mon).getUTCDate()} – ${D(fri).getUTCDate()} ${MOISL[D(fri).getUTCMonth()]} ${D(fri).getUTCFullYear()}</span>`}
  else dl.innerHTML=`<span class="d" data-dec="${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOISL[d.getUTCMonth()]}">${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOISL[d.getUTCMonth()]}</span><span class="w">Semaine ${wk} · ${d.getUTCFullYear()}${view.date===TODAY?'<em>Aujourd\'hui</em>':view.date<TODAY?'<span>passé</span>':''}</span>`;
  decodeDate(dl);
  document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('on',b.dataset.v===view.mode));

  // menu de gauche : reconstruit seulement s'il a changé (sinon le repère orange de l'onglet clignotait à chaque mise à jour)
  {const sd=document.getElementById('side'),sh=sideHTML();if(sd.dataset.h!==sh||!sd.firstChild){sd.innerHTML=sh;sd.dataset.h=sh;navMotion(sd)}applySide()}
  document.getElementById('who').innerHTML=whoHTML();
  const u=prefs.user;const me=document.getElementById('me');me.className='me '+(u?'r-'+u.role:'');me.textContent=u?u.nom.slice(0,2).toUpperCase():'?';me.title=u?`${author()} · réglages`:'Réglages';
  renderSync();
  const b=document.getElementById('banner');
  const n=new Date();const mk=`${n.getFullYear()}-${n.getMonth()}`;
  if(role()==='centraliste'&&n.getDate()<=3&&prefs.banner!==mk){const pm=MOISL[(n.getMonth()+11)%12];b.className='banner';b.innerHTML=`Début de mois : pensez à imprimer ou sauvegarder le planning de ${pm}. <button class="btn sm" data-act="export">Imprimer</button><button class="btn sm ghost" data-act="banner-ok">C'est fait</button>`}
  else{b.className='';b.innerHTML=''}
}

/* =====================================================================
   Popover générique
   ===================================================================== */
const popEl=document.getElementById('pop'),drawerEl=document.getElementById('drawer');
let popH={},popAnchor=null;
function openPop(anchor,html,handlers){
  document.querySelectorAll('.hb.pop-hold').forEach(h=>h.classList.remove('open','pop-hold'));{const hb=anchor&&anchor.closest&&anchor.closest('.hb');if(hb)hb.classList.add('open','pop-hold')}
  popH=handlers||{};popAnchor=anchor;popEl.innerHTML=html;popEl.hidden=false;placePop();
  const f=popEl.querySelector('input:not([type=checkbox]),select,textarea');if(f&&window.matchMedia('(pointer:fine)').matches)f.focus();
}
function placePop(){if(!popAnchor)return;let r=popAnchor.getBoundingClientRect();if(!r.width&&lastRect)r=lastRect;const w=popEl.offsetWidth,h=popEl.offsetHeight;
  let x=Math.min(Math.max(8,r.left),window.innerWidth-w-8),y=r.bottom+6;if(y+h>window.innerHeight-8)y=Math.max(8,r.top-h-6);popEl.style.left=x+'px';popEl.style.top=y+'px'}
function closePop(){if(popEl.hidden)return;popEl.hidden=true;document.querySelectorAll('.hb.pop-hold').forEach(h=>h.classList.remove('open','pop-hold'));if(popEl.classList.contains('as-sheet')){popEl.classList.remove('as-sheet','sheet-scroll');popEl.style.transform='';document.documentElement.classList.remove('sheet-open')}popEl.innerHTML='';popH={};popAnchor=null;setEditing(!drawerEl.hidden&&formCtx&&formCtx.id?formCtx.id:null);if(renderPending)render()}
function runPop(el){const fn=popH[el.dataset.pa];if(!fn)return;const ar=popAnchor&&popAnchor.getBoundingClientRect();lastRect=ar;const r=fn(el);if(r==='keep')return;if(r==='close'){closePop();return}commit();closePop();render()}
let lastRect=null;
/* Double sécurité : petite fenêtre de confirmation. anchor=null remplace la fenêtre déjà ouverte. */
function confirmPop(anchor,title,detail,okLabel,fn,danger){
  const html=`<div class="pop-h">${esc(title)}</div>${detail?`<p class="muted" style="margin:0">${esc(detail)}</p>`:''}<div class="pop-cf"><button class="btn ${danger?'danger':'primary'}" data-pa="cfok">${esc(okLabel)}</button><button class="btn" data-pa="cfno">Annuler</button></div>`;
  const h={cfok(){return fn()},cfno(){return 'close'}};
  if(anchor===null&&!popEl.hidden){popH=h;popEl.innerHTML=html;placePop();setTimeout(()=>{const b=popEl.querySelector('[data-pa=cfok]');if(b)b.focus()},20);return 'keep'}
  openPop(anchor,html,h);setTimeout(()=>{const b=popEl.querySelector('[data-pa=cfok]');if(b)b.focus()},20);return 'keep';
}
const ordLbl=o=>`${cl(o.cl).n} · ${siteName(o)} · ${dayShort(o.date)}`;
// modification du commercial à valider : ce qui a changé depuis la version validée
const modSnap=o=>({date:o.date,h:o.h,m3:total(o),f:o.f,sap:o.sap||'',cl:o.cl,ch:o.ch,tel:o.tel||'',cam:o.cam||'',ouv:o.ouv||'',
  pompe:o.pompe?`${o.pompe.t==='BQA'?'BQA':o.pompe.t+' m'}${o.pompe.f?' · '+o.pompe.f:''}${o.pompe.beto?' · Betobag':''}`:'',pills:(o.pills||[]).map(p=>p.t)});
function modDiff(a,o){if(!a)return [];const b=modSnap(o),r=[];
  if(a.date!==b.date)r.push(['Jour',dayShort(a.date),dayShort(b.date)]);
  if(a.h!==b.h)r.push(['Heure',hm(a.h),hm(b.h)]);
  if(Math.abs((a.m3||0)-b.m3)>0.01)r.push(['Cubage',fmt(a.m3)+' m³',fmt(b.m3)+' m³']);
  if(a.f!==b.f)r.push(['Formule',a.f||'—',b.f||'—']);
  if(a.sap!==b.sap)r.push(['SAP',a.sap||'—',b.sap||'—']);
  if(a.cl!==b.cl)r.push(['Client',cl(a.cl).n,cl(b.cl).n]);
  if(a.ch!==b.ch){const lab=id=>{const c=S.chantiers.find(x=>x.id===id);return c?[c.nom,c.adr].filter(Boolean).join(' · '):''};const la=lab(a.ch),lb=lab(b.ch);if(la!==lb)r.push(['Chantier',la||'—',lb||'—'])}   // même chantier recréé à l'identique : rien à signaler
  if(a.tel!==b.tel)r.push(['Contact',a.tel||'—',b.tel||'—']);
  if(a.cam!==b.cam)r.push(['Camion',a.cam||'standard',b.cam||'standard']);
  if(a.pompe!==b.pompe)r.push(['Pompe',a.pompe||'sans',b.pompe||'sans']);
  if(a.ouv!==b.ouv)r.push(['Ce que fait le client',a.ouv||'—',b.ouv||'—']);
  const add=b.pills.filter(t=>!a.pills.includes(t)),del=a.pills.filter(t=>!b.pills.includes(t));
  if(add.length||del.length)r.push(['Infos',del.length?'retiré : '+del.join(', '):'',add.length?'ajouté : '+add.join(', '):'']);
  return r}
const modTxt=o=>{const d=modDiff(o.modv&&o.modv.base,o);return d.length?d.map(([k,a,b])=>k==='Infos'?`${k} : ${[a,b].filter(Boolean).join(' · ')}`:`${k} : ${a} → ${b}`).join(' · '):''};

function fieldHTML(f,i){const id='pf'+i;
  if(f.type==='select')return `<label class="fl">${esc(f.label)}<select id="${id}">${f.opts.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${String(f.val)===String(v)?'selected':''}>${esc(l)}</option>`}).join('')}</select></label>`;
  if(f.type==='check')return `<label class="ck"><input type="checkbox" id="${id}" ${f.val?'checked':''}> ${esc(f.label)}</label>`;
  const dl=f.list?`<datalist id="${id}-dl">${f.list.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`:'';
  return `<label class="fl">${esc(f.label)}<input id="${id}" type="${f.type||'text'}" ${f.step?`step="${f.step}"`:''} value="${esc(f.val==null?'':f.val)}" ${f.list?`list="${id}-dl"`:''} ${f.ph?`placeholder="${esc(f.ph)}"`:''} autocomplete="off">${dl}</label>`;
}
function formPop(anchor,title,fields,onSave,extra){
  openPop(anchor,`<div class="pop-h">${esc(title)}</div>${extra||''}<form data-pa="save">${fields.map(fieldHTML).join('')}<button class="btn primary" type="submit">Enregistrer</button></form>`,
    Object.assign({save(form){const v={};fields.forEach((f,i)=>{const el=form.querySelector('#pf'+i);v[f.k]=f.type==='check'?el.checked:el.value.trim()});return onSave(v)}},popH.__extra||{}));
}
function listPop(anchor,title,items,onPick,freeLabel){
  openPop(anchor,`<div class="pop-h">${esc(title)}</div><div class="pop-grid">${items.map((x,i)=>`<button class="pop-c txt" data-pa="pick" data-i="${i}">${esc(x)}</button>`).join('')}</div>${freeLabel?`<form data-pa="free"><label class="fl">${esc(freeLabel)}<input id="pfree" autocomplete="off"></label><button class="btn primary" type="submit">Ajouter</button></form>`:''}`,
    {pick(el){return onPick(items[+el.dataset.i])},free(f){const v=f.querySelector('#pfree').value.trim();if(!v)return 'keep';return onPick(v)}});
}
function toast(msg,ms){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),ms||2600)}

/* ---------- mini-calendrier (duplication, placement) ---------- */
function calHTML(month,title){const m=D(month+'-01');const y=m.getUTCFullYear(),mo=m.getUTCMonth();const first=month+'-01';const off=(dow(first)+6)%7;const nd=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
  let g='';['L','M','M','J','V','S','D'].forEach(x=>g+=`<span class="wd">${x}</span>`);for(let i=0;i<off;i++)g+='<span></span>';
  for(let d=1;d<=nd;d++){const iso=`${y}-${pad(mo+1)}-${pad(d)}`;g+=`<button data-pa="pickday" data-d="${iso}" class="${iso===TODAY?'td':''} ${isWE(iso)?'we':''} ${hasOrders(iso)?'has':''}" aria-label="${esc(dayLong(iso))}">${d}</button>`}
  return `<div class="pop-h">${esc(title)}</div><div class="cal-h"><button class="ib" data-pa="calprev" aria-label="Mois précédent">‹</button><b>${MOISL[mo]} ${y}</b><button class="ib" data-pa="calnext" aria-label="Mois suivant">›</button></div><div class="cal">${g}</div>`}
function calPop(anchor,title,onPick,startMonth){let month=startMonth||TODAY.slice(0,7);
  const h={pickday(el){return onPick(el.dataset.d)},calprev(){const d=D(month+'-01');d.setUTCMonth(d.getUTCMonth()-1);month=toIso(d).slice(0,7);popEl.innerHTML=calHTML(month,title);return 'keep'},calnext(){const d=D(month+'-01');d.setUTCMonth(d.getUTCMonth()+1);month=toIso(d).slice(0,7);popEl.innerHTML=calHTML(month,title);return 'keep'}};
  openPop(anchor,calHTML(month,title),h)}

/* =====================================================================
   Actions
   ===================================================================== */
let histBusy=false,IMPORTING=false;
// date plus ancienne que la période chargée : on va la chercher, puis on affiche
function histNeed(){
  if(MODE!=='shared'||!DB||!DB.from||view.tab!=='planning')return false;
  const need=view.mode==='semaine'?mondayOf(view.date):view.date;
  if(need>=DB.from())return false;
  if(histBusy)return true;
  histBusy=true;renderChrome();
  document.getElementById('head').hidden=true;
  document.getElementById('main').innerHTML='<p class="empty">Chargement de l\'historique…</p>';
  const d0=need.slice(0,8)+'01';
  DB.extend(addDays(d0,-7)).then(()=>{histBusy=false;render(true)}).catch(()=>{histBusy=false;toast('Historique indisponible sans connexion');view.date=TODAY;render(true)});
  return true;
}
function go(d){view.date=d;render(true);window.scrollTo({top:0})}
// Journal : une ligne = un document à part (collection « journal »), jamais réécrit.
// Il ne grossit plus le document de la journée, que tout le monde modifie.
function jAdd(d,at,t){const ts=Date.now();const id=`${d}_${ts}_${Math.random().toString(36).slice(2,6)}`;pending['journal/'+id]={body:{d,at,by:author(),t,ts},j:'j'}}
function jlog(d,t){const n=new Date();jAdd(d,`${pad(n.getHours())}:${pad(n.getMinutes())}`,t);lsSet(LS_PEND,pending);clearTimeout(jlog.t);jlog.t=setTimeout(flush,50)}
// Lignes d'une journée : anciennes lignes gardées dans la journée + lignes de la base + lignes pas encore envoyées
async function jget(d){
  const m=new Map();(dayRO(d).journal||[]).forEach((e,i)=>m.set('old'+i,Object.assign({ts:i},e)));
  if(DB&&DB.journal)(await DB.journal(d)).forEach(r=>m.set(r.id,r.data));
  Object.keys(pending).forEach(p=>{const b=pending[p].body;if(p.startsWith('journal/')&&b&&b.d===d)m.set(p.slice(8),b)});
  return [...m.values()].sort((a,b)=>String(a.at).localeCompare(String(b.at))||(a.ts||0)-(b.ts||0));
}
function unmove(id,i){const x=byId(id).tours[i];if(!x)return;
  if(x.mv){const d=byId(x.mv);if(d){const k=d.tours.findIndex(u=>u.rf===id&&(u.p||'')===(x.p||''));if(k>=0){const u=d.tours[k];if(u.free){u.s=0;delete u.p;delete u.rf;delete u.free;delete u.plein;if(u.fv!=null){u.v=u.fv;delete u.fv}}else d.tours.splice(k,1)}}}
  if(x.rf){const s0=byId(x.rf);if(s0){const u=s0.tours.find(u=>u.mv===id&&(u.p||'')===(x.p||''));if(u)delete u.mv}}}
function tourPop(o,i,anchor){const id=o.id;const t=o.tours[i];const fl=FLEET().concat(onSite(o));
  setEditing(id);
  const html=`<div class="pop-h">Tour ${i+1} · ${fmt(t.v)} m³</div>
  <button class="pop-b ${t.s?'':'on'}" data-pa="toggle">${t.s?'Retirer le stabilo (pas chargé)':'Stabiloter : chargé'}</button>
  ${t.mv?`<p class="muted" style="margin:0">Replacé vers <b>${esc(byId(t.mv)?siteName(byId(t.mv)):'?')}</b>, compté là-bas.</p><button class="pop-b" data-pa="unmv">Annuler le replacement</button>`:''}${t.rf?`<p class="muted" style="margin:0">Camion venu de <b>${esc(byId(t.rf)?siteName(byId(t.rf)):'?')}</b> (déjà chargé).</p>`:''}${t.s&&!t.mv&&!t.rf?'<button class="pop-b" data-pa="move" style="color:#2f6fd6">Replacer sur un autre chantier…</button>':''}
  <div class="pop-l">Plaque</div><div class="pop-grid">${fl.map(p=>{const ab=absentOn(o.date,p.c),x=convOf(o.date,p.c);return `<button class="pop-c ${t.p===p.c?'on':''} ${ab?'off':''}" data-pa="plaque" data-v="${esc(p.c)}" title="${esc(p.p||'')}${ab?' · absent ce jour':x&&x.st==='pret'?' · prêté à '+esc(x.pc)+' ('+esc(x.per)+')':''}">${esc(p.c)}</button>`}).join('')}<button class="pop-c" data-pa="plaque" data-v="">—</button></div>
  <form data-pa="typed" class="pk-f"><input id="pk-t" placeholder="Autre plaque (ex. EF507VT)" aria-label="Autre plaque" autocomplete="off"><button class="btn" type="submit">OK</button></form>
  <div class="pop-l">Chargé par une autre centrale</div><div class="pop-grid">${AG().map(c=>`<button class="pop-c txt ${t.c===c?'on':''}" data-pa="ext" data-v="${c}">${c}</button>`).join('')}${t.c?'<button class="pop-c txt" data-pa="ext" data-v="">Aucune</button>':''}</div>
  <form data-pa="vol"><label class="fl">Volume du tour (m³)<input id="pv" type="text" value="${fmt(t.v)}" inputmode="decimal" autocomplete="off"></label><button class="btn" type="submit">Changer le volume</button></form>
  <button class="pop-b danger" data-pa="del">Supprimer ce tour</button>`;
  const T=()=>byId(id).tours[i];
  openPop(anchor,html,{typed(f){const v=f.querySelector('#pk-t').value;if(!plN(v))return 'keep';const c=plateOf(v,byId(id));return early(o,null,()=>{const x=T();x.p=c;x.s=1})},toggle(){const x=T();if(!x.s)return early(o,null,()=>{T().s=1});return confirmPop(null,'Retirer le stabilo ?',`Tour ${i+1}${x.p?' · '+x.p:''} · ${fmt(x.v)} m³ est noté chargé.`,'Oui, pas chargé',()=>{T().s=0},true)},plaque(el){const c=el.dataset.v;if(!c||T().s){const x=T();x.p=c;if(c)x.s=1;return}return early(o,null,()=>{const x=T();x.p=c;x.s=1})},ext(el){const c=el.dataset.v;const x=T();if(!c){delete x.c;x.s=0;return}x.c=c;x.s=1},vol(f){const v=num(f.querySelector('#pv').value);if(v>0)T().v=v},del(){return confirmPop(null,'Supprimer ce tour ?',`Tour ${i+1} · ${fmt(T().v)} m³`,'Oui, supprimer',()=>{unmove(id,i);byId(id).tours.splice(i,1)},true)},
    move(){const os=ordersOn(byId(id).date).filter(x=>x.id!==id&&statut(x)!=='annulee'&&x.kind!=='pour'&&x.kind!=='demande');
      if(!os.length){toast('Aucun autre chantier ce jour');return 'keep'}
      popEl.innerHTML=`<div class="pop-h">Replacer ${esc(T().p||'le camion')} · ${fmt(T().v)} m³</div><p class="muted" style="margin:0;font-size:12.5px">Vers quel chantier ?</p><div class="pop-list">${os.map(x=>`<button class="pop-b" data-pa="mvto" data-v="${x.id}"><b>${esc(x.h)}</b> ${esc(cl(x.cl).n)} · ${esc(siteName(x))}</button>`).join('')}</div><label class="ck"><input type="checkbox" id="mv-re" checked> Prévoir un nouveau tour pour ${esc(siteName(byId(id)))}</label><button class="btn" data-pa="cfno">Annuler</button>`;
      placePop();return 'keep'},
    cfno(){return 'close'},
    mvto(el){const dId=el.dataset.v,dst=byId(dId);if(!dst)return 'close';const re=popEl.querySelector('#mv-re').checked;const x0=T();
      const k=dst.tours.findIndex(u=>!u.s&&!u.c&&!u.mv&&!u.rf&&!u.p);
      popEl.innerHTML=`<div class="pop-h">${esc(x0.p||'Camion')} → ${esc(siteName(dst))}</div>
        <p class="muted" style="margin:0;font-size:12.5px">${k>=0?`Il prendra le tour ${k+1}, première bulle libre.`:'Aucune bulle libre : une bulle sera créée.'}</p>
        <form data-pa="mvgo" class="mv-f"><label class="fl">m³ replacés<input id="mv-v" type="text" value="${fmt(x0.v)}" inputmode="decimal" autocomplete="off" required></label>
        <label class="ck"><input type="checkbox" id="mv-full"> Toupie rechargée pleine à la centrale</label>
        <div class="pop-cf"><button class="btn primary" type="submit">Valider</button><button class="btn" type="button" data-pa="cfno">Annuler</button></div></form>`;
      popEl.dataset.mv=JSON.stringify({dId,re,k});placePop();setTimeout(()=>{const n=popEl.querySelector('#mv-v');if(n){n.focus();n.select()}},20);return 'keep'},
    mvgo(f){const {dId,re,k}=JSON.parse(popEl.dataset.mv||'{}');const v=num(f.querySelector('#mv-v').value);const full=f.querySelector('#mv-full').checked;if(!(v>0)){toast('Indiquez les m³ replacés');return 'keep'}
      const o0=byId(id),x=T(),d=byId(dId);if(!d)return 'close';x.mv=dId;
      const nt={s:1,p:x.p||'',rf:id,v};if(full)nt.plein=1;
      if(k<0)d.tours.push(Object.assign(nt,{x:1}));else{const u=d.tours[k];u.fv=u.v;Object.assign(u,nt,{free:1})}
      if(re)o0.tours.push({v:x.v,s:0,x:1});
      jlog(o0.date,`Camion ${x.p||''} chargé replacé : ${siteName(o0)} → ${siteName(d)} · ${fmt(v)} m³${full?' · rechargé plein':''}${k<0?' · bulle créée':''}`);
      toast(`Camion replacé sur ${siteName(d)} · ${fmt(v)} m³${full?' · plein':''}`)},
    unmv(){const x=T();unmove(id,i);delete x.mv;toast('Replacement annulé')}});
}
function orderMenu(o,anchor){const id=o.id;
  if(LABO())return openPop(anchor,`<div class="pop-h">${esc(cl(o.cl).n)} · ${esc(siteName(o))}</div><p class="muted" style="margin:0;font-size:12.5px">${esc(dayShort(o.date))} · ${esc(o.h||'')} · ${fmt(total(o))} m³ · ${esc(o.f||'')}</p>
    <button class="pop-b" data-pa="askcom">Demander au commercial…</button><button class="pop-b" data-pa="askcen">Demander au centraliste…</button><button class="pop-b" data-pa="info">Ajouter une info…</button>`,
    {askcom(){const a=popAnchor;setTimeout(()=>demPop(a,id,'modif','commercial'));return 'close'},askcen(){const a=popAnchor;setTimeout(()=>demPop(a,id,'modif','centraliste'));return 'close'},
     info(){const a=popAnchor;setTimeout(()=>act('addpill',a,byId(id),{}));return 'close'}});
  setEditing(id);
  openPop(anchor,`<div class="pop-h">${esc(cl(o.cl).n)} · ${esc(siteName(o))}</div>${o.maj?`<p class="muted" style="margin:0;font-size:12.5px">Dernière modification : ${esc(o.maj.by)}, ${esc(dayShort(o.maj.at.slice(0,10)))} à ${esc(hm(o.maj.at.slice(11)))}</p>`:''}<p class="muted" style="margin:0;font-size:12.5px">Saisie par ${esc(o.by||'?')}</p>
    ${role()==='centraliste'?`<div class="pop-l">Statut</div><div class="pop-grid">${[['','Auto'],['attente','En attente'],['encours','En cours'],['terminee','Terminée'],['annulee','Annulée']].map(([k,l])=>`<button class="pop-c txt ${(o.st||'')===k?'on':''}" data-pa="st" data-v="${k}">${l}</button>`).join('')}</div>`:`<button class="pop-b" data-pa="askc">Demander une modification au centraliste…</button>`}
    <button class="pop-b" data-pa="edit">Modifier la commande</button>
    <button class="pop-b" data-pa="pedit">Modifier les infos${o.pills.length?` (${o.pills.length})`:''}</button>
    <button class="pop-b" data-pa="dup">Dupliquer…</button>
    <button class="pop-b" data-pa="spec">${o.spec?'Retirer la mise en avant':'Mettre en avant (commande spéciale)'}</button>
    <button class="pop-b" data-pa="ask">${role()==='centraliste'?'Demander au commercial ou au labo…':role()==='labo'?'Demander au commercial…':'Demander au labo…'}</button>
    ${role()==='centraliste'?'<button class="pop-b danger" data-pa="del">Supprimer…</button>':''}`,
  {edit(){setTimeout(()=>openOrderForm(byId(id)));return 'close'},pedit(){const a=popAnchor;setTimeout(()=>pillsPop(a,id));return 'close'},dup(){const a=popAnchor;setTimeout(()=>calPop(a,'Dupliquer vers quel jour ?',d=>{setTimeout(()=>openOrderForm(byId(id),{dup:true,date:d}));return 'close'}));return 'close'},
   spec(){const x=byId(id);x.spec=!x.spec},st(el){const v=el.dataset.v||null,x=byId(id);if(v==='annulee'&&x.st!=='annulee')return confirmPop(null,'Annuler cette commande ?',ordLbl(x),'Oui, annuler la commande',()=>{byId(id).st='annulee';toast('Commande annulée')},true);x.st=v},
   ask(){const a=popAnchor;setTimeout(()=>demPop(a,id));return 'close'},askc(){const a=popAnchor;setTimeout(()=>demPop(a,id,'modif','centraliste'));return 'close'},
   del(){popEl.innerHTML=`<div class="pop-h">Supprimer cette commande ?</div><p class="muted" style="margin:0">${esc(cl(o.cl).n)} · ${esc(siteName(o))} · ${esc(dayShort(o.date))}</p><button class="btn" data-pa="delok" style="color:var(--bad-ink)">Supprimer définitivement</button><button class="pop-b" data-pa="cancel">Annuler</button>`;return 'keep'},
   delok(){S.orders=S.orders.filter(x=>x.id!==id);toast('Commande supprimée')},cancel(){}});
}
function demPop(anchor,oid,typeDef,pourDef){
  formPop(anchor,'Nouvelle demande',[
    {k:'type',label:'Type',type:'select',opts:Object.entries(DEM_TYPES),val:typeDef||'formule'},
    {k:'pour',label:'Pour',type:'select',opts:Object.entries(POUR).filter(([k])=>k!==role()),val:pourDef||(role()==='labo'?'commercial':'labo')},
    {k:'t',label:'Demande',val:'',ph:'Ex. formule C25/30 fibrée pour jeudi'}],
  v=>{if(!v.t)return 'keep';S.demandes.push({id:'r'+Date.now().toString(36),type:v.type,pour:v.pour,t:v.t,oid:oid||null,de:author(),deRole:role(),le:TODAY,done:false,rep:[]});toast('Demande envoyée')});
}

// lecture seule : consulter uniquement (planning, demandes, carte, impression) ; aucune fenêtre de modification
const RO=()=>!!(ME&&ME.role==='lecture');
// Tech labo : ne modifie aucune commande. Il peut ajouter une info, proposer une formule en attente, demander (menu ⋯), consulter.
const LABO=()=>role()==='labo'&&!RO();
const LABO_OK=['focus','pills-all','map','menu','formule','flabo','addpill','ap-show','peek-x','vol'];
const LABO_MSG='Tech labo : les commandes ne se modifient pas ici. Ajoutez une info (+ Info) ou ⋯ → Demander au commercial / au centraliste.';
const RO_ACTS=['prev','next','today','mode','tab','goto','focus','pickdate','vue','settings','banner-ok','dfilter','hb','adj-year','map','aide-q','aide-close','aide-all','aide-pick','aide-show','export','tours-print','tours-per','conv-print','cmonth','ap-show','peek-x','pills-all'];
// tours et compléments : réservés au centraliste (le commercial et le labo voient, sans pouvoir ajouter ni charger)
const TOUR_ACTS=['plus','addtour','cpl-add','tour'];
function act(a,el,o,e){
  if(RO()&&!RO_ACTS.includes(a)){if(e&&e.preventDefault)e.preventDefault();return}
  if(o&&LABO()&&!LABO_OK.includes(a)){if(e&&e.preventDefault)e.preventDefault();toast(LABO_MSG,5000);return}
  if(o&&TOUR_ACTS.includes(a)&&role()!=='centraliste'){toast('Tours et compléments : réservés au centraliste');return}
  if(o&&!['focus','pills-all','map','menu'].includes(a)&&closedStop(o.date))return;
  if(!o&&/^(semi|cim|s-)/.test(a||'')){const dd=el.closest&&el.closest('[data-day]');if(dd&&closedStop(dd.dataset.day))return}
  if(o&&a!=='focus'&&a!=='pills-all'&&lockStop(o.id))return;
  const D_=view.date;const i=+el.dataset.i;
  switch(a){
    case 'prev':return go(view.mode==='semaine'&&view.tab==='planning'?addDays(mondayOf(view.date),-7):step(view.date,-1));
    case 'next':return go(view.mode==='semaine'&&view.tab==='planning'?addDays(mondayOf(view.date),7):step(view.date,1));
    case 'today':{TODAY=realToday();view.tab='planning';view.mode='jour';if(isPhone()&&chatOn())chatWin.hidden=true;let d=TODAY;while(isWE(d)&&!hasOrders(d)&&!weOpen(d)&&!nuitVeille(d).length)d=addDays(d,1);return go(d)}
    case 'mode':view.mode=el.dataset.v;view.tab='planning';return render(true);
    case 'tab':if(isPhone()&&chatOn())chatWin.hidden=true;if(el.dataset.v==='planning'&&role()==='centraliste'){TODAY=realToday();view.mode='jour';if(view.tab==='planning'||view.date!==TODAY){view.tab='planning';return go(TODAY)}}view.tab=el.dataset.v;return render(true);
    case 'goto':view.date=el.dataset.d;view.mode='jour';view.tab='planning';document.getElementById('qres').hidden=true;return render(true);
    case 'focus':{e.preventDefault();document.getElementById('qres').hidden=true;const x=byId(el.dataset.oid);if(!x)return;view.tab='planning';view.mode='jour';view.date=x.date;view.focus=x.id;return render(true)}
    case 'new':return openOrderForm(null);
    case 'pickdate':return calPop(el,'Aller au planning du…',d=>{view.tab='planning';view.mode='jour';go(d);return 'close'},view.date.slice(0,7));
    case 'vue':prefs.vue=el.dataset.v;savePrefs();lastAnim='';return render(true);
    case 'settings':return settingsPop(el);

    case 'banner-ok':{const n=new Date();prefs.banner=`${n.getFullYear()}-${n.getMonth()}`;savePrefs();return render(true)}
    // ligne commande
    case 'edit':return openOrderForm(o);
    case 'menu':return orderMenu(o,el);
    case 'tour':{const t=o.tours[i];if(t.mv)return tourPop(o,i,el);if(!t.s&&!t.p&&!t.c)return platePick(o,i,el);if(!t.s){if(o.date>TODAY){const id=o.id;setEditing(id);return early(o,el,()=>{byId(id).tours[i].s=1})}t.s=1;break}const id=o.id;setEditing(id);return confirmPop(el,'Retirer le stabilo ?',`Tour ${i+1}${t.p?' · '+t.p:''} · ${fmt(t.v)} m³ est noté chargé.`,'Oui, pas chargé',()=>{byId(id).tours[i].s=0},true)}
    case 'plus':{const id=o.id;setEditing(id);return openPop(el,`<div class="pop-h">Complément prévu</div><p class="muted" style="margin:0;font-size:13px">${esc(cl(o.cl).n)} · ${fmt(total(o))} m³ <b>et plus</b> : le client doit confirmer un tour de plus.</p><button class="pop-b on" data-pa="add">Le client le prend : charger le complément…</button><button class="pop-b" data-pa="no">Pas de complément : retirer</button>`,
      {add(){const a=popAnchor;platePick(byId(id),null,a,{fromPlus:true});return 'keep'},
       no(){const x=byId(id);x.plus=false;jlog(x.date,`Pas de complément : ${siteName(x)}`);toast(statut(x)==='terminee'?'Pas de complément : chantier terminé':'Complément retiré')}})}
    case 'addtour':return platePick(o,null,el,{cpl:true});
    case 'cpl-add':o.plus=true;jlog(o.date,`Complément à confirmer : ${siteName(o)}`);toast('Complément à confirmer ajouté');break;
    case 'pill':o.pills[i].on=!o.pills[i].on;break;
    case 'pill-x':{e.stopPropagation();const id=o.id;setEditing(id);return confirmPop(el,'Supprimer ce commentaire ?',o.pills[i].t,'Oui, supprimer',()=>{byId(id).pills.splice(i,1)},true)}
    case 'pills-all':return plShow(el);
    case 'pills-edit':{const id=o.id;return setTimeout(()=>pillsPop(plAnchor&&document.body.contains(plAnchor)?plAnchor:document.querySelector(`#row-${id} .r-menu`)||el,id))}
    case 'addpill':{const id=o.id;if(!LABO())setEditing(id);return listPop(el,LABO()?'Info du labo (affichée au centraliste au premier chargement)':'Ajouter une info sur la ligne',pPre(o),v=>{const p={t:v,on:false,by:author()};if(LABO())p.lab=1;byId(id).pills.push(p)},'Ou texte libre (retard, consigne…)')}
    case 'flabo':{const id=o.id;if(role()==='labo')return act('formule',el,o,e);if(!o.fLabo)return;setEditing(id);
      return confirmPop(el,'Appliquer la formule du labo ?',`${o.f||'—'}  →  ${o.fLabo.f}${o.fLabo.sap?' · SAP '+o.fLabo.sap:''} (proposée par ${o.fLabo.by||'le labo'})`,'Oui, appliquer',()=>{const x=byId(id);const f0=x.f;x.f=x.fLabo.f;reCap(x,f0);if(x.fLabo.sap)x.sap=x.fLabo.sap;learnFormule(x.f,x.sap||'');jlog(x.date,`Formule du labo appliquée : ${siteName(x)} · ${x.f}`);delete x.fLabo;toast('Formule appliquée')})}
    case 'vol':return;   // clic simple : rien (clic droit = volPop)
    case 'formule':{const id=o.id;setEditing(id);
      if(role()==='labo'){if(!attente(o.f)&&!o.fLabo){toast('Formule renseignée : seuls le centraliste et le commercial la modifient');return}
        if(!window.FX)return;const nomC=cl(o.cl).n;
        openPop(el,`<div class="pop-h">Proposer la formule · ${esc(nomC)}</div><p class="muted" style="margin:0 0 6px">Elle s'affichera comme une info du labo ; le centraliste ou le commercial l'appliquera à la commande.</p><form data-pa="save" class="pf-fx"><div class="fxw" id="pf-fx"></div><button class="btn primary" type="submit">Envoyer la proposition</button></form>`,
          {save(){const q=document.getElementById('fx-q'),sp=document.getElementById('fx-sap');const f=FX.line(q?q.value:'').trim(),sap=(sp?sp.value:'').trim();
            if(!f||attente(f)){toast('Indiquez la formule');return 'keep'}if(sap&&!/^\d{8}$/.test(sap)){toast('Le SAP doit faire 8 chiffres');return 'keep'}
            const x=byId(id);const n=new Date();x.fLabo={f,sap,by:author(),at:`${dayShort(TODAY)} ${pad(n.getHours())}:${pad(n.getMinutes())}`};jlog(x.date,`Formule proposée par le labo : ${siteName(x)} · ${f}`);toast('Proposition envoyée')}});
        FX.setCfg(fxCat());FX.mount(popEl.querySelector('#pf-fx'),{value:o.fLabo?o.fLabo.f:'',sap:o.fLabo?o.fLabo.sap||'':'',last:lastFormules(nomC)});placePop();return}
      if(window.FX){const nomC=cl(o.cl).n;
      openPop(el,`<div class="pop-h">Formule · ${esc(nomC)}</div><form data-pa="save" class="pf-fx"><div class="fxw" id="pf-fx"></div><button class="btn primary" type="submit">Enregistrer</button></form>`,
        {save(){const q=document.getElementById('fx-q'),sp=document.getElementById('fx-sap');const f=FX.line(q?q.value:'').trim(),sap=(sp?sp.value:'').trim();
          if(!f){toast('Formule vide');return 'keep'}if(sap&&!/^\d{8}$/.test(sap)){toast('Le SAP doit faire 8 chiffres');return 'keep'}
          const x=byId(id);if(f===(x.f||'')&&sap===(sapOf(x)||''))return;
          return confirmPop(null,'Changer la formule ?',`${x.f||'—'}${sapOf(x)?' · SAP '+sapOf(x):''}  →  ${f}${sap?' · SAP '+sap:''}`,'Oui, changer la formule',()=>{const y=byId(id);const f0=y.f;y.f=f;y.sap=sap;reCap(y,f0);learnFormule(f,sap);jlog(y.date,`Formule changée : ${siteName(y)} · ${f}`)})}});
      FX.setCfg(fxCat());FX.mount(popEl.querySelector('#pf-fx'),{value:o.f||'',sap:sapOf(o)||'',last:lastFormules(nomC)});placePop();return}
      return formPop(el,'Formule',[{k:'f',label:'Formule (comme sur le papier)',val:o.f,list:S.formules.map(x=>x.f)},{k:'sap',label:'N° SAP (8 chiffres, facultatif)',val:sapOf(o),ph:'60012481'}],v=>{if(v.sap&&!/^\d{8}$/.test(v.sap)){toast('Le SAP doit faire 8 chiffres');return 'keep'}const x=byId(id);{const f0=x.f;x.f=v.f;reCap(x,f0)}x.sap=v.sap;learnFormule(v.f,v.sap)})}
    case 'pompe':{const id=o.id,b=o.pompe.bon;setEditing(id);return confirmPop(el,b?'Remettre le bon de pompe à faire ?':'Confirmer : bon de pompe fait ?',ordLbl(o),b?'Oui, pas encore fait':'Oui, le bon est fait',()=>{byId(id).pompe.bon=!b;toast(b?'Bon de pompe à faire':'Bon de pompe fait')},b)}
    case 'pay':{const id=o.id,p=o.pay.paye;setEditing(id);return confirmPop(el,p?'Remettre le paiement en attente ?':'Confirmer : paiement reçu ?',ordLbl(o),p?'Oui, pas encore payé':'Oui, le client a payé',()=>{byId(id).pay.paye=!p;toast(p?'Paiement en attente':'Paiement validé')},p)}
    case 'modv':{if(!peutValider()){toast('Le centraliste valide la modification');return}const id=o.id;setEditing(id);const dd=modDiff(o.modv&&o.modv.base,o);
      return openPop(el,`<div class="pop-h">Valider la modification ?</div><p class="muted" style="margin:0 0 6px">${esc([cl(o.cl).n,siteName(o),dayShort(o.date)].filter(Boolean).join(' · '))} · modifiée par <b>${esc(o.modv.by||'?')}</b>${o.modv.at?' à '+esc(o.modv.at):''}</p>
        ${dd.length?`<table class="mod-diff">${dd.map(([k,a,b])=>`<tr><th>${esc(k)}</th>${k==='Infos'?`<td colspan="3">${a?`<s>${esc(a)}</s> `:''}${b?`<b>${esc(b)}</b>`:''}</td>`:`<td><s>${esc(a)}</s></td><td>→</td><td><b>${esc(b)}</b></td>`}</tr>`).join('')}</table>`:'<p class="muted" style="margin:0">Détail non disponible (modification faite avant cette mise à jour).</p>'}
        <div class="pop-cf"><button class="btn primary" data-pa="ok">Oui, valider</button><button class="btn" data-pa="edit">Voir la commande</button><button class="btn" data-pa="no">Annuler</button></div>`,
        {ok(){const x=byId(id);delete x.modv;jlog(x.date,`Modification validée : ${siteName(x)}`);toast('Modification validée')},edit(){setTimeout(()=>openOrderForm(byId(id)));return 'close'},no(){return 'close'}})}
    case 'presa':{if(!peutValider()){toast('Le centraliste valide la réservation');return}const id=o.id;return openPop(el,`<div class="pop-h">Réservation pompe · ${esc(pompeLabel(o.pompe))}</div><p class="muted" style="margin:0">${esc(cl(o.cl).n)} · ${esc(siteName(o))} · ${esc(dayShort(o.date))}</p><div class="pop-cf"><button class="btn primary" data-pa="ok">Oui, pompe réservée</button><button class="btn" data-pa="no">Annuler</button></div>`,{no(){return 'close'},ok(){byId(id).pompe.resa='ok';toast('Pompe réservée')}})}
    case 'resa':{if(!peutValider()){toast('Le centraliste valide la réservation');return}const id=o.id;return openPop(el,`<div class="pop-h">Réservation ${esc(o.cam)}</div><p class="muted" style="margin:0">${esc(cl(o.cl).n)} · ${esc(siteName(o))} · ${esc(dayShort(o.date))}</p><div class="pop-cf"><button class="btn primary" data-pa="ok">Oui, c'est réservé</button><button class="btn" data-pa="no">Annuler</button></div>`,{no(){return 'close'},ok(){byId(id).resa='ok';toast('Réservation validée')}})}
    case 'statut':{const id=o.id;return listPop(el,'Statut',['Automatique','En attente','En cours','Terminée','Annulée'],v=>{const m={'Automatique':null,'En attente':'attente','En cours':'encours','Terminée':'terminee','Annulée':'annulee'};const x=byId(id);if(m[v]==='annulee'&&x.st!=='annulee')return confirmPop(null,'Annuler cette commande ?',ordLbl(x),'Oui, annuler la commande',()=>{const y=byId(id);y.st='annulee';y.plus=false;toast('Commande annulée')},true);x.st=m[v];if(m[v]==='terminee'&&x.plus){x.plus=false;toast('Commande terminée : complément prévu retiré')}})}
    case 'ap-ok':{if(!peutValider()){toast('Seul le centraliste valide');return}const id=o.id;setEditing(id);return confirmPop(el,'Valider cette commande ?',ordLbl(o)+' · '+o.h+' · '+fmt(total(o))+' m³','Oui, valider au planning',()=>{const x=byId(id);x.kind='cmd';if(view.apPeek===id)view.apPeek=null;view.focus=id;toast('Commande validée et placée le '+dayShort(x.date))})}
    case 'ap-show':{view.tab='planning';view.mode='jour';view.date=o.date;view.apPeek=o.id;render(true);window.scrollTo({top:0});return}
    case 'peek-x':view.apPeek=null;return render(true);
    case 'ap-menu':{const id=o.id;return openPop(el,`<div class="pop-h">Commande à valider</div><button class="pop-b" data-pa="ed">Modifier la commande et ajouter des infos…</button><button class="pop-b" data-pa="com">Ajouter un commentaire…</button><button class="pop-b" data-pa="day">Placer un autre jour…</button>`,
      {ed(){setTimeout(()=>openOrderForm(byId(id)));return 'close'},com(){const a=popAnchor;setTimeout(()=>act('ap-com',a,byId(id),{}));return 'close'},day(){const a=popAnchor;setTimeout(()=>act('ap-day',a,byId(id),{}));return 'close'}})}
    case 'ap-day':{const id=o.id;return calPop(el,'Placer quel jour ?',d=>{const x=byId(id);x.date=d;x.kind='cmd';toast('Commande placée le '+dayShort(d))})}
    case 'ap-com':{const id=o.id;return formPop(el,'Commentaire pour le commercial',[{k:'t',label:'Commentaire',val:'',ph:'Ex. plutôt 9 h, pompe indisponible'}],v=>{if(!v.t)return 'keep';byId(id).pills.push({t:v.t,on:false,by:author()})})}
    // demandes
    case 'dfilter':view.dfilter=el.dataset.v;return render(true);
    case 'dem-done':{const r=S.demandes[i];r.done=!r.done;if(r.done){r.doneAt=Date.now();r.doneBy=author()}else{delete r.doneAt;delete r.doneBy}break}
    case 'dem-rep':{const r=S.demandes[i];return formPop(el,'Répondre',[{k:'t',label:'Réponse',val:'',ph:'Ex. formule créée, SAP 60012481'}],v=>{if(!v.t)return 'keep';(r.rep=r.rep||[]).push({by:author(),t:v.t,at:TODAY});chatSend(v.t,{t:String(r.t).slice(0,70),dem:i});toast('Réponse envoyée · visible dans le chat (en bas à droite)');setTimeout(chatOpen,60)})}
    case 'dem-add':return demPop(el,null);
    // en-tête du jour
    case 'pres-add':{if(role()!=='centraliste'){toast('La présence est remplie par le centraliste');return}const d=dayOf(el);return formPop(el,'Centraliste présent',[{k:'n',label:'Prénom',val:prefs.user&&prefs.user.role==='centraliste'?prefs.user.nom:''},{k:'pl',label:'Présence',type:'select',opts:['Matin','Après-midi','Journée'],val:'Journée'},{k:'r',label:'Remplaçant',type:'check',val:false}],v=>{if(!v.n)return 'keep';day(d).presents.push({n:v.n,pl:v.pl,rempl:v.r})})}
    case 'pres-x':if(role()!=='centraliste'){toast('La présence est remplie par le centraliste');return}day(dayOf(el)).presents.splice(i,1);break;
    case 'pass':day(dayOf(el)).passation[i].on=!day(dayOf(el)).passation[i].on;break;
    case 'pass-x':{e.stopPropagation();const d=dayOf(el);return confirmPop(el,'Supprimer cette passation ?',day(d).passation[i].t,'Oui, supprimer',()=>{day(d).passation.splice(i,1)},true)}
    case 'pass-add':{const d=dayOf(el);return listPop(el,'Pastille de passation',P_ENTRETIEN.concat(ZONES.map(z=>'Nettoyage : '+z)),v=>{day(d).passation.push({t:v,on:false,by:author()})},'Ou consigne libre')}
    case 'prod-chg':{const d=dayOf(el);return formPop(el,'Changement de produit',[{k:'ty',label:'Quoi',type:'select',opts:['Changement de ciment','Changement d\'adjuvant','Changement d\'agrégat','Changement de silo','Changement de formule'],val:'Changement de ciment'},{k:'t',label:'Détail',val:'',ph:'Ex. silo 2 : CEM II → CEM I'},{k:'h',label:'Heure',type:'select',opts:H30(),val:'10:00'}],
      v=>{const dd=day(d);dd.events.push({t:v.ty+(v.t?' · '+v.t:''),h:v.h,k:'prod'});dd.events.sort((a,b)=>(a.h||'99').localeCompare(b.h||'99'));jlog(d,`${v.ty}${v.t?' · '+v.t:''} à ${hm(v.h)}`)})}
    case 'ev-add':{const d=dayOf(el);return listPop(el,'Événement à venir',['Entrée d\'agrégats','Évacuation de bennes','Changement d\'agrégat','Vider les fosses','Entretien centrale','Contrôle'],v=>{day(d).events.push({t:v})},'Ou texte libre')}
    case 'ev-x':day(dayOf(el)).events.splice(i,1);break;
    case 'labo-add':{const d=dayOf(el);return formPop(el,'RDV tech labo à la centrale',[{k:'h',label:'Heure',type:'time',val:'09:00',step:900},{k:'t',label:'Objet',val:'',ph:'Prélèvements, réglage formule…'}],v=>{if(!v.t)return 'keep';day(d).labo.push({h:v.h,t:v.t})})}
    case 'labo-x':day(dayOf(el)).labo.splice(i,1);break;
    case 'ech-add':{const d=dayOf(el);const a0=el;const go=v=>{
        const pl=FLEET().map(p=>p.c);
        if(v.startsWith('Camion prêté'))setTimeout(()=>formPop(a0,'Camion prêté',[{k:'p',label:'Plaque',type:'select',opts:pl,val:pl[0]},{k:'pc',label:'À quelle centrale',type:'select',opts:AG(),val:AG()[0]},{k:'per',label:'Période',type:'select',opts:['Journée','Matin','Après-midi'],val:'Journée'}],x=>{S.convocs[d]=S.convocs[d]||{};const o=S.convocs[d][x.p]||{h:'06:00',dep:CENTRALE};S.convocs[d][x.p]=Object.assign(o,{st:'pret',pc:x.pc,per:x.per})}));
        else if(v.startsWith('Convoqué'))setTimeout(()=>formPop(a0,'Convoqué dans une autre centrale',[{k:'p',label:'Plaque',type:'select',opts:pl,val:pl[0]},{k:'h',label:'Heure',type:'time',val:'07:45',step:900},{k:'dep',label:'Centrale',type:'select',opts:AG(),val:AG()[0]}],x=>{S.convocs[d]=S.convocs[d]||{};const o=S.convocs[d][x.p]||{};S.convocs[d][x.p]=Object.assign(o,{st:'conv',h:x.h,dep:x.dep})}));
        else if(v.startsWith('Camion absent'))setTimeout(()=>formPop(a0,'Chauffeur / camion absent',[{k:'p',label:'Plaque',type:'select',opts:pl,val:pl[0]},{k:'per',label:'Absent',type:'select',opts:['Journée','Matin','Après-midi'],val:'Journée'},{k:'raison',label:"Raison de l'absence",val:'',ph:'Ex. congé, maladie, garage, formation'}],x=>{S.convocs[d]=S.convocs[d]||{};S.convocs[d][x.p]={st:'abs',h:'',dep:CENTRALE,aff:'',per:x.per,raison:x.raison};jlog(d,`Absent : ${x.p} · ${x.per}${x.raison?' · '+x.raison:''}`)}));
        else{const sens=/renfort/i.test(v)?'recu':'donne';setTimeout(()=>formPop(a0,sens==='recu'?'Renfort · camions qui viennent à la centrale':'Détachement · camions qui partent',[{k:'c',label:sens==='recu'?'Venant de':'Vers',type:'select',opts:AG(),val:AG()[0]},{k:'n',label:'Nombre de camions',type:'number',val:1},{k:'per',label:'Période',type:'select',opts:['Journée','Matin','Après-midi'],val:'Journée'}],x=>{day(d).ech.push({sens,c:x.c,n:Math.max(1,parseInt(x.n)||1),per:x.per})}))}
        return 'close'};
      if(el.dataset.v==='Renfort'||el.dataset.v==='Camion absent')return go(el.dataset.v);
      if(el.dataset.v==='Détachement')return listPop(el,'Détachement',['Détachement (nombre de camions)','Camion prêté (plaque)','Convoqué dans une autre centrale'],go);
      return listPop(el,'Planning camions',['Renfort (vient à la centrale)','Détachement (nombre de camions)','Camion prêté (plaque)','Convoqué dans une autre centrale','Camion absent'],go)}

    case 'ech-x':day(dayOf(el)).ech.splice(i,1);break;
    case 'etat':{const d=dayOf(el);const et=dayRO(d).etat||{};return formPop(el,'État de la centrale',[{k:'k',label:'État',type:'select',opts:[['ouverte','Ouverte'],['fermee','Fermée'],['panne','Panne']],val:et.k||'ouverte'},{k:'per',label:'Quand',type:'select',opts:[['journee','Toute la journée'],['matin','Le matin'],['aprem','L\'après-midi'],['horaires','Horaires précis']],val:et.per||'journee'},{k:'de',label:'Si horaires : de',type:'time',step:900,val:et.de||'10:00'},{k:'a',label:'à',type:'time',step:900,val:et.a||'12:00'},{k:'t',label:'Cause',val:et.t||'',ph:'Ex. tapis peseur, coupure EDF'}],v=>{if(v.k==='ouverte'){day(d).etat={k:'ouverte',t:''};return}if(v.per==='horaires'&&!(v.de&&v.a&&mins(v.a)>mins(v.de))){toast('Indiquez une heure de fin après le début');return 'keep'}
      if(v.k==='panne'){const h=v.per==='matin'?['06:00','12:00']:v.per==='aprem'?['12:00','18:00']:v.per==='journee'?['06:00','18:00']:[v.de,v.a];const dd=day(d);dd.pannes=dd.pannes||[];dd.pannes.push({de:h[0],a:h[1],t:v.t||'',by:author()});dd.pannes.sort((a,b)=>a.de.localeCompare(b.de));if(dd.etat&&dd.etat.k==='panne')dd.etat={k:'ouverte',t:''};jlog(d,`Panne ${hm(h[0])} – ${hm(h[1])}${v.t?' · '+v.t:''}`);toast('Panne ajoutée sous l\'état de la centrale');return}
      day(d).etat={k:v.k,t:v.t,per:v.per,de:v.per==='horaires'?v.de:'',a:v.per==='horaires'?v.a:''};jlog(d,winTxt(closedWin(d)))})}
    case 'panne-end':{e.stopPropagation();const d=dayOf(el),i=+el.dataset.i;const x=pannesOn(d)[i];if(!x)return;const n=new Date(),now=`${pad(n.getHours())}:${pad(n.getMinutes())}`;
      return confirmPop(el,'Panne terminée ?',`Panne ${panneLbl(x)}${x.t?' · '+x.t:''}. La case se ferme${d===TODAY&&mins(now)>mins(x.de)&&mins(now)<mins(x.a)?' et la fin passe à '+hm(now):''}.`,'Oui, la centrale repart',()=>{const y=day(d).pannes[i];if(!y)return;if(d===TODAY&&mins(now)>mins(y.de)&&mins(now)<mins(y.a))y.a=now;y.fin=now;y.finBy=author();jlog(d,`Fin de panne ${panneLbl(y)}${y.t?' · '+y.t:''}`)})}
    case 'panne-x':{e.stopPropagation();const d=dayOf(el),i=+el.dataset.i;const x=pannesOn(d)[i];if(!x)return;return confirmPop(el,'Annuler cette panne ?',`Panne ${panneLbl(x)}${x.t?' · '+x.t:''} : elle sera retirée (notée par erreur).`,'Oui, annuler la panne',()=>{const L=day(d).pannes;const y=L[i];L.splice(i,1);jlog(d,`Panne annulée ${y?panneLbl(y):''}`)},true)}
    // en-tête : ouvrir / refermer un cadre (écrans tactiles)
    case 'hb':{const all=[...document.querySelectorAll('#head .hb')];const k=all.indexOf(el);if(k<0)return;const on=el.classList.toggle('open');view.hbOpen=on?view.hbOpen.concat([k]):view.hbOpen.filter(x=>x!==k);return}
    // agrégats : une ligne par semi
    case 'semi-add':{const d=dayOf(el);return semiAddPop(el,d)}
    case 'semi-t':{const x=day(dayOf(el)).semis[i].tours[+el.dataset.k];x.s=x.s?0:1;break}
    case 'semi-tadd':{const d=dayOf(el);return semiTourPop(el,d,i,null)}
    case 'semi-ed':{const d=dayOf(el);const x=day(d).semis[i];return formPop(el,'Semi',[{k:'nom',label:'Nom affiché (Semi 1 ou prénom du chauffeur)',val:x.nom},{k:'ch',label:'Prénom du chauffeur',val:x.ch||''},{k:'h',label:'Heure de départ',type:'time',val:x.h,step:900},{k:'note',label:'Remarque (provenance particulière…)',val:x.note||''},{k:'rep',label:'Reporter au lendemain',type:'check',val:false},{k:'del',label:'Supprimer cette semi',type:'check',val:false}],
      v=>{const L=day(d).semis;if(v.del)return confirmPop(null,'Supprimer '+x.nom+' ?','La semi et ses tours du jour.','Oui, supprimer',()=>{day(d).semis.splice(day(d).semis.indexOf(x),1)},true);Object.assign(x,{nom:v.nom||x.nom,ch:v.ch,h:v.h||x.h,note:v.note});if(v.rep){L.splice(i,1);const nd=step(d,1);x.tours.forEach(t=>t.s=0);x.note=(x.note?x.note+' · ':'')+'reporté du '+dayShort(d).toLowerCase();day(nd).semis.push(x);toast('Semi reportée au '+dayShort(nd))}})}
    case 'cim-add':{const d=dayOf(el);return formPop(el,'Livraison de liant',[{k:'prod',label:'Liant (ciment)',val:'',ph:'Ex. '+CIML().slice(0,3).join(', ')},{k:'hs',label:'Heure prévue',type:'select',opts:H30(),val:'07:00'}],
      v=>{if(!v.prod){toast('Indiquez le ciment');return 'keep'}learnList('cim',v.prod,CIMENTS);const hs=[v.hs];const L=day(d).ciments;const ex=L.find(c=>c.prod.toLowerCase()===v.prod.toLowerCase());if(ex)hs.forEach(h=>ex.rec.push({h,s:0}));else L.push({prod:v.prod,rec:hs.map(h=>({h,s:0}))});sortCim(ex||L[L.length-1])})}
    case 'cim-ed':{const d=dayOf(el);const c=day(d).ciments[i];if(!c)return;
      return openPop(el,`<div class="pop-h">Liant · ${esc(c.prod)}</div><form data-pa="ren"><label class="fl">Nom du liant (ciment)<input id="pf-cn" value="${esc(c.prod)}" autocomplete="off"></label><button class="btn primary" type="submit">Enregistrer</button></form><button class="pop-b" data-pa="addl">+ Une livraison de ${esc(c.prod)}</button><button class="pop-b danger" data-pa="del">Supprimer ce liant et ses ${c.rec.length} livraison${c.rec.length>1?'s':''}</button>`,
        {ren(f){const v=f.querySelector('#pf-cn').value.trim();if(!v){toast('Indiquez le liant');return 'keep'}const x=day(d).ciments[i];x.prod=v;learnList('cim',v,CIMENTS)},
         addl(){const x=day(d).ciments[i];return formPop(popAnchor,'Livraison '+x.prod,[{k:'h',label:'Heure',type:'time',val:'12:00',step:900}],v=>{if(!v.h)return 'keep';x.rec.push({h:v.h,s:0});sortCim(x)})},
         del(){return confirmPop(null,'Supprimer ce liant ?',c.prod+' · '+c.rec.length+' livraison'+(c.rec.length>1?'s':''),'Oui, supprimer',()=>{day(d).ciments.splice(i,1)},true)}})}
    case 'cim-t':{const x=day(dayOf(el)).ciments[i].rec[+el.dataset.k];x.s=x.s?0:1;break}
    case 'cim-tadd':{const d=dayOf(el);const c=day(d).ciments[i];return formPop(el,'Livraison '+c.prod,[{k:'h',label:'Heure',type:'time',val:'12:00',step:900}],v=>{if(!v.h)return 'keep';c.rec.push({h:v.h,s:0});sortCim(c)})}
    case 'journal':{const d=view.date;const h=`<div class="pop-h">Journal · ${esc(dayShort(d))}</div>`;openPop(el,h+'<p class="muted" style="margin:0">Chargement…</p>',{});
      jget(d).then(l=>{const j=l.reverse();if(popEl.hidden||popAnchor!==el)return;popEl.innerHTML=h+(j.length?`<ol class="journal-l">${j.map(e=>`<li><span class="mono">${esc(e.at)}</span><b>${esc(e.by)}</b> ${esc(e.t)}</li>`).join('')}</ol>`:'<p class="muted" style="margin:0">Chaque modification d\'une commande s\'inscrit ici : qui, quoi, à quelle heure.</p>');placePop()})
       .catch(()=>{if(!popEl.hidden&&popAnchor===el)popEl.innerHTML=h+'<p class="muted" style="margin:0">Journal indisponible sans connexion.</p>'});return}
    case 'adj-year':view.adjYear=!view.adjYear;return render(true);
    case 'conv-print':return convPrintPop(el);
    // camions
    case 'conv':{const d=el.dataset.d,p=el.dataset.p;return convPop(el,d,p)}
    case 'conv-obs':{const d=el.dataset.d;return formPop(el,'Observation · '+dayShort(d),[{k:'t',label:'Observation',val:(dayRO(d)||{}).convObs||'',ph:''}],v=>{day(d).convObs=String(v.t||'').trim().slice(0,200)})}
    case 'conv-x':{const d=el.dataset.d,p=el.dataset.p,x=(S.convocs[d]||{})[p];if(!x)return;const lbl=x.st==='abs'?"l'absence":'cette ligne';return confirmPop(el,`Annuler ${lbl} de ${p} ?`,dayShort(d),'Oui, annuler',()=>{delete S.convocs[d][p];if(x.st==='abs')jlog(d,`Absence annulée : ${p}`);toast('Annulé')},true)}
    case 'plaque-add':return formPop(el,'Ajouter un camion',[{k:'c',label:'N° de parc ou repère (affiché sur les bulles)',val:'',ph:'7656 ou EF'},{k:'p',label:'Plaque entière (optionnel)',val:'',ph:'EF-507-VT'}],v=>{if(!v.c)return 'keep';if(!S.config)S.config=CONFIG0();S.config.flotte=FLEET().concat([{c:v.c.toUpperCase().slice(0,8),p:v.p}])});
    case 'export':return exportPop(el);
    case 'tours-print':return toursPop(el,false);
    case 'tours-per':return toursPop(el,true);
    case 'cmonth':{const d=D(view.date.slice(0,7)+'-01');d.setUTCMonth(d.getUTCMonth()+(+el.dataset.v));let n=toIso(d);while(isWE(n)&&!weOpen(n))n=addDays(n,1);view.date=n;return render(true)}
    case 'chat':return chatToggle();
    case 'we-open':{const d=el.dataset.d;return confirmPop(el,'Ouvrir la centrale ce jour ?',dayLong(d)+' · ouverture exceptionnelle du week-end','Oui, créer la journée',()=>{const x=day(d);const n=new Date();x.ouvert={by:author(),at:`${pad(n.getHours())}:${pad(n.getMinutes())}`};jlog(d,'Ouverture exceptionnelle du week-end');toast('Journée planning créée : '+dayShort(d))})}
    case 'aide-q':return;
    case 'aide-close':return closeAide();
    case 'aide-pick':return aidePickSet(true);
    case 'aide-show':return aideMontrer(el.dataset.t);
    case 'aide-all':document.querySelectorAll('.aide-d:not([hidden])').forEach(d=>d.open=el.dataset.v==='1');return;
    case 'clo-rep':{const d=view.date;return listPop(el,'Replacer les tours non chargés vers…',AG(),c=>{const w=closedWin(d);let n=0,m=0;ordersOn(d).filter(o=>statut(o)!=='annulee'&&inWin(o.h,w)).forEach(o=>TR(o).forEach(t=>{if(!t.s&&!t.c){t.c=c;t.s=1;n++;m+=t.v}}));if(n)jlog(d,`${n} tour${n>1?'s':''} replacé${n>1?'s':''} à ${c} (${fmt(m)} m³) · centrale fermée`);toast(n?`${n} tour${n>1?'s':''} replacé${n>1?'s':''} à ${c}`:'Aucun tour à replacer')})}
    case 'map':{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();return openMap(o)}
    case 'liens-cfg':return openConfig('cfg-liens');
    case 'clot':{const d=dayOf(el);const dd=day(d);const pdf=()=>savePDF(`cloture-la-bocca-${d}.pdf`,()=>planningPDF([d],'A4'));if(dd.cloture){pdf();return}
      return confirmPop(el,'Clôturer la journée ?',dayShort(d)+' · le PDF de clôture sera téléchargé.','Oui, clôturer',()=>{const x=day(d);const n=new Date();x.cloture={by:author(),at:`${pad(n.getHours())}:${pad(n.getMinutes())}`};jlog(d,'Journée clôturée');pdf()})}
    case 'lien-add':case 'lien-edit':{const L=S.liens=S.liens||[];const x=a==='lien-edit'?L[i]:{cat:'Commandes',n:'',u:''};
      return formPop(el,a==='lien-add'?'Nouveau raccourci':'Modifier le raccourci',[{k:'n',label:'Nom',val:x.n},{k:'u',label:'Adresse (https://…)',val:x.u,ph:'https://forms.gle/…'},{k:'cat',label:'Rubrique',val:x.cat,list:['Commandes','Formulaires','Sécurité','Contacts']},...(a==='lien-edit'?[{k:'del',label:'Supprimer ce raccourci',type:'check',val:false}]:[])],
        v=>{if(v.del){L.splice(i,1);return}if(!v.n)return 'keep';if(v.u&&!/^https?:\/\//i.test(v.u))v.u='https://'+v.u;const y={cat:v.cat||'Commandes',n:v.n,u:v.u};if(a==='lien-add')L.push(y);else L[i]=y})}
    // adjuvants
    case 'adj-on':{const k=el.closest('[data-wk]').dataset.wk;S.adjuvants[k][i].on=el.checked;break}
    case 'adj-x':{const k=el.closest('[data-wk]').dataset.wk;S.adjuvants[k].splice(i,1);break}
    default:return;
  }
  commit();render(true);
}
// encadré de la semaine (Agrégats) élargi au survol : ne dépasse pas à droite de l'écran
document.addEventListener('mouseover',e=>{const p=e.target.closest&&e.target.closest('.grid3>.panel.agg-p');if(!p||p.dataset.sh)return;p.dataset.sh='1';
  requestAnimationFrame(()=>{const over=p.getBoundingClientRect().right-(innerWidth-12);if(over>0)p.style.transform=`translateX(${-over}px)`})});
document.addEventListener('mouseout',e=>{const p=e.target.closest&&e.target.closest('.grid3>.panel.agg-p');if(!p||(e.relatedTarget&&p.contains(e.relatedTarget)))return;delete p.dataset.sh;p.style.transform=''});
// clic commencé dans une fenêtre (ex. sélection de texte glissée jusqu'à l'extérieur) : ne ferme pas la fenêtre
let downInPop=false;document.addEventListener('pointerdown',e=>{downInPop=!popEl.hidden&&popEl.contains(e.target)},true);
function dayOf(el){const p=el.closest('[data-day]');return p?p.dataset.day:view.date}
function learnFormule(f,sap){if(!f||attente(f))return;const k=S.formules.find(x=>x.f.toLowerCase()===f.toLowerCase());if(k){if(sap)k.sap=sap}else if(sap)S.formules.push({f,sap})}

function pillEdit(o,i,anchor){const id=o.id;setEditing(id);const p=o.pills[i];
  openPop(anchor,`<div class="pop-h">Modifier le commentaire</div><p class="muted" style="margin:0;font-size:12.5px">Posé par ${esc(p.by||'?')}</p>
    <form data-pa="save"><label class="fl">Texte<input id="pe-t" value="${esc(p.t)}" autocomplete="off"></label>
    <label class="ck"><input type="checkbox" id="pe-on" ${p.on?'checked':''}> Fait (stabiloté)</label>
    <button class="btn primary" type="submit">Enregistrer</button></form>
    <button class="pop-b danger" data-pa="del">Supprimer ce commentaire</button>`,
  {save(f){const v=f.querySelector('#pe-t').value.trim();if(!v)return 'keep';const x=byId(id).pills[i];x.t=v;x.on=f.querySelector('#pe-on').checked;x.by=x.by||author()},del(){return confirmPop(null,'Supprimer ce commentaire ?',byId(id).pills[i].t,'Oui, supprimer',()=>{byId(id).pills.splice(i,1)},true)}});
  setTimeout(()=>{const inp=popEl.querySelector('#pe-t');if(inp){inp.focus();inp.select()}},20);
}
function longAct(el){const a=el.dataset.act,i=+el.dataset.i;const row=el.closest('[data-id]');
  if(RO())return;
  if(row&&LABO()){toast(LABO_MSG,5000);return}
  if(row&&TOUR_ACTS.includes(a)&&role()!=='centraliste'){toast('Tours et compléments : réservés au centraliste');return}
  if(row&&(closedStop((byId(row.dataset.id)||{}).date)||lockStop(row.dataset.id)))return;
  if(a==='pay'&&row){const o=byId(row.dataset.id);if(o&&o.pay){setEditing(o.id);return payPop(o,el)}}
  if(a==='conv'){const d=el.dataset.d,p=el.dataset.p;return openPop(el,`<div class="pop-h">${esc(p)} · ${esc(dayShort(d))}</div><button class="pop-b" data-pa="mod">Modifier…</button><button class="pop-b danger" data-pa="del">Annuler l'absence</button>`,{mod(){setTimeout(()=>convPop(el,d,p));return 'close'},del(){const x=(S.convocs[d]||{})[p];delete S.convocs[d][p];if(x&&x.st==='abs')jlog(d,`Absence annulée : ${p}`);toast('Absence annulée')}})}
  if(a==='plus'&&row)return act('plus',el,byId(row.dataset.id),{});
  if(a==='vol'&&row){if(role()!=='centraliste'){toast('Cubage : clic droit réservé au centraliste (le commercial passe par Modifier la commande)');return}return volPop(byId(row.dataset.id),el)}
  if(a==='tour'&&row)return tourPop(byId(row.dataset.id),i,el);
  if(a==='pill'&&row)return pillEdit(byId(row.dataset.id),i,el);
  if(a==='semi-t')return semiTourPop(el,dayOf(el),i,+el.dataset.k);
  if(a==='cim-t'){const d=dayOf(el),k=+el.dataset.k;const c=day(d).ciments[i];
    return openPop(el,`<div class="pop-h">${esc(c.prod)} · ${esc(hm(c.rec[k].h))}</div><button class="pop-b danger" data-pa="del">Supprimer cette livraison</button>${c.rec.length===1?'':''}<button class="pop-b danger" data-pa="delall">Supprimer la ligne ${esc(c.prod)}</button>`,
      {del(){return confirmPop(null,'Supprimer cette livraison ?',c.prod+' · '+hm(c.rec[k].h),'Oui, supprimer',()=>{c.rec.splice(k,1);if(!c.rec.length)day(d).ciments.splice(i,1)},true)},delall(){return confirmPop(null,'Supprimer la ligne '+c.prod+' ?','Toutes ses livraisons du jour.','Oui, supprimer',()=>{day(d).ciments.splice(i,1)},true)}})}
}
const normH=x=>{const m=/^(\d{1,2})[:h]?(\d{2})?$/.exec(x);if(!m)return '';const h=+m[1],mi=+(m[2]||0);if(h>23||mi>59)return '';return pad(h)+':'+pad(mi)};
const sortCim=c=>{if(c)c.rec.sort((a,b)=>mins(a.h)-mins(b.h))};
function semiAddPop(anchor,d){
  const dd=day(d);const last=dd.semis[dd.semis.length-1];
  const nextH=last?(()=>{const m=mins(last.h)+15;return pad(Math.floor(m/60)%24)+':'+pad(m%60)})():'07:30';
  let prod=last&&last.tours[0]?last.tours[0].prod:'6/16',carr=last&&last.tours[0]?last.tours[0].carr:'CALLAS';
  const html=()=>`<div class="pop-h">Nouvelle semi · ${esc(dayShort(d))}</div>
    <form data-pa="save"><label class="fl">Heure de départ<input id="sm-h" type="time" step="900" value="${esc(nextH)}"></label>
    <div class="pop-l">Produit de départ</div><div class="pop-grid">${AGGL().map(p=>`<button type="button" class="pop-c ${p===prod?'on':''}" data-pa="prod" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <label class="fl">Autre produit (ajouté à la liste)<input id="sm-p" placeholder="Ex. 2/6" autocomplete="off"></label>
    <div class="pop-l">Provenance</div><div class="pop-grid">${CARRL().map(c=>`<button type="button" class="pop-c txt ${c===carr?'on':''}" data-pa="carr" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <label class="fl">Autre provenance (ajoutée à la liste)<input id="sm-c" value="${CARRL().includes(carr)?'':esc(carr)}" placeholder="Carrière particulière" autocomplete="off"></label>
    <label class="fl">Prénom du chauffeur (facultatif)<input id="sm-n" placeholder="Remplace « Semi n »"></label>
    <div class="row2"><button class="btn primary" type="submit">Ajouter</button><button class="btn" type="button" data-pa="more">Ajouter et une autre</button></div></form>`;
  const add=f=>{const h=normH(f.querySelector('#sm-h').value)||'07:30';const oc=f.querySelector('#sm-c').value.trim().toUpperCase();const n=f.querySelector('#sm-n').value.trim();const op=f.querySelector('#sm-p').value.trim();
    if(op){prod=op;learnList('agg',op,AGG)}if(oc)learnList('carr',oc,CARRS);
    const L=day(d).semis;L.push({nom:n||('Semi '+(L.length+1)),ch:n?'':'',h,tours:[{prod,carr:oc||carr,s:0}]});L.sort((a,b)=>mins(a.h)-mins(b.h));return h};
  openPop(anchor,html(),{
    prod(el){prod=el.dataset.v;popEl.querySelector('#sm-p').value='';popEl.querySelectorAll('[data-pa="prod"]').forEach(b=>b.classList.toggle('on',b===el));return 'keep'},
    carr(el){carr=el.dataset.v;popEl.querySelector('#sm-c').value='';popEl.querySelectorAll('[data-pa="carr"]').forEach(b=>b.classList.toggle('on',b===el));return 'keep'},
    save(f){add(f)},
    more(el){const f=el.closest('form');const h=add(f);commit();render(true);f.querySelector('#sm-p').value='';const m=mins(h)+15;f.querySelector('#sm-h').value=pad(Math.floor(m/60)%24)+':'+pad(m%60);f.querySelector('#sm-n').value='';toast('Semi ajoutée');return 'keep'}});
}
function semiTourPop(anchor,d,i,k){
  const x=day(d).semis[i];const t=k==null?null:x.tours[k];
  const prev=x.tours[x.tours.length-1];let carr=t?t.carr:(prev?prev.carr:'CALLAS');
  openPop(anchor,`<div class="pop-h">${esc(x.nom)} · ${t?'tour '+(k+1):'tour suivant'}</div>
    ${t?`<button class="pop-b ${t.s?'':'on'}" data-pa="tog">${t.s?'Retirer le stabilo (pas reçu)':'Stabiloter : reçu'}</button>`:''}
    <div class="pop-l">Provenance</div><div class="pop-grid">${CARRL().map(c=>`<button class="pop-c txt ${c===carr?'on':''}" data-pa="carr" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="pop-l">${t?'Changer le produit':'Produit'}</div><div class="pop-grid">${AGGL().map(p=>`<button class="pop-c ${t&&t.prod===p?'on':''}" data-pa="prod" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <form data-pa="other" class="row2"><input id="st-p" placeholder="Autre produit" aria-label="Autre produit" autocomplete="off" style="min-width:0;height:30px;border:1px solid var(--line-strong);padding:0 8px;background:var(--bg)"><input id="st-c" placeholder="Autre provenance" aria-label="Autre provenance" autocomplete="off" style="min-width:0;height:30px;border:1px solid var(--line-strong);padding:0 8px;background:var(--bg)"><button class="btn sm" type="submit">OK</button></form>
    ${t?'<button class="pop-b danger" data-pa="del">Supprimer ce tour</button>':''}`,
  {carr(el){carr=el.dataset.v;popEl.querySelectorAll('[data-pa="carr"]').forEach(b=>b.classList.toggle('on',b===el));if(t){t.carr=carr;commit();render(true)}return 'keep'},
   prod(el){if(t){t.prod=el.dataset.v;t.carr=carr}else{if(x.tours.length>=SEMI_MAX){toast(SEMI_MAX+' tours maximum par semi');return}x.tours.push({prod:el.dataset.v,carr,s:0})}},
   other(f){const op=f.querySelector('#st-p').value.trim(),oc=f.querySelector('#st-c').value.trim().toUpperCase();if(!op&&!oc)return 'keep';if(oc){carr=oc;learnList('carr',oc,CARRS)}if(op)learnList('agg',op,AGG);
     if(t){if(op)t.prod=op;t.carr=carr}else{if(!op){toast('Indiquez le produit');return 'keep'}if(x.tours.length>=SEMI_MAX){toast(SEMI_MAX+' tours maximum par semi');return}x.tours.push({prod:op,carr,s:0})}},
   tog(){t.s=t.s?0:1},del(){x.tours.splice(k,1)}});
}
function convPop(anchor,d,p){const x=(S.convocs[d]||{})[p]||{};
  // un camion « prêté » = convoqué directement dans l'autre centrale
  const dep0=x.st==='pret'&&x.pc?x.pc:(x.dep||CENTRALE);
  formPop(anchor,`Camion ${p} · ${dayShort(d)}`,[
    {k:'st',label:'Ce jour-là',type:'select',opts:[['conv','Convoqué'],['abs','Absent'],['none','Pas convoqué']],val:x.st==='abs'?'abs':'conv'},
    {k:'h',label:'Heure de convocation',type:'time',val:x.h||'06:00',step:900},
    {k:'dep',label:'Convoqué à (centrale)',type:'select',opts:[CENTRALE].concat(AG()),val:dep0},
    {k:'per',label:'Si absent : période',type:'select',opts:['Journée','Matin','Après-midi'],val:x.per||'Journée'},
    {k:'raison',label:"Si absent : raison",val:x.raison||'',ph:'Ex. congé, maladie, garage'},
    {k:'aff',label:'Affecté au chantier (badge, accès…)',val:x.aff||'',ph:''}],
  v=>{S.convocs[d]=S.convocs[d]||{};if(v.st==='none'){delete S.convocs[d][p];return}
    S.convocs[d][p]={st:v.st,h:v.st==='abs'?'':v.h,dep:v.st==='abs'?CENTRALE:v.dep,aff:v.aff,per:v.st==='abs'?v.per:'',raison:v.st==='abs'?v.raison:''}});
}
const convOf=(d,p)=>(S.convocs[d]||{})[p]||null;
const absentOn=(d,p)=>{const x=convOf(d,p);return !!(x&&x.st==='abs')};
function convPrintPop(anchor){
  openPop(anchor,`<div class="pop-h">Imprimer les convocations du mois</div><form data-pa="go">
    <label class="fl">Mois<input type="month" id="cp-m" value="${esc(view.date.slice(0,7))}"></label>
    <div class="fl">Contenu<div class="radios"><label><input type="radio" name="cp-f" value="1" checked><span>Horaires déjà notés</span></label><label><input type="radio" name="cp-f" value="0"><span>Grille vide</span></label></div></div>
    <div class="fl">Format (paysage)<div class="radios"><label><input type="radio" name="cp-s" value="A4" checked><span>A4</span></label><label><input type="radio" name="cp-s" value="A3"><span>A3</span></label></div></div>
    <button class="btn primary" type="submit">Télécharger</button></form>`,
  {go(f){const mo=f.querySelector('#cp-m').value;if(!/^\d{4}-\d{2}$/.test(mo)){toast('Choisissez un mois');return 'keep'}const fi=f.querySelector('input[name="cp-f"]:checked').value==='1';const fm=f.querySelector('input[name="cp-s"]:checked').value;savePDF(`convocations-la-bocca-${mo}-${fm}${fi?'':'-vide'}.pdf`,()=>convPDF(mo,fi,fm))}});
}

/* ---------- application installable (PWA) ---------- */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
window.addEventListener('appinstalled',()=>{installEvt=null;toast('Application installée : retrouvez « La Bocca » sur l\'écran d\'accueil')});
const isInstalled=()=>!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone);
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
async function installApp(anchor){
  if(installEvt){const e=installEvt;installEvt=null;e.prompt();try{await e.userChoice}catch(_){}return}
  const ios=isIOS();
  openPop(anchor,`<div class="pop-h">Installer l'application</div>${ios?
   `<ol class="inst-ol"><li>Ouvrez cette page dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li><li>Ouvrez « La Bocca » depuis l'icône et connectez-vous une fois avec Google.</li></ol>`:
   `<ol class="inst-ol"><li>Ouvrez cette page dans <b>Chrome</b>.</li><li>Touchez le menu <b>⋮</b> en haut à droite.</li><li>Choisissez <b>Installer l'application</b> (ou <b>Ajouter à l'écran d'accueil</b>).</li><li>Ouvrez « La Bocca » depuis l'icône.</li></ol>`}
   <p class="muted" style="margin:6px 0 0;font-size:12.5px">Sur ordinateur, Chrome et Edge proposent aussi l'installation : icône à droite de la barre d'adresse.</p>`)
}
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

/* ---------- notifications sur le téléphone (supabase/10_notifications.sql + fonction notifs) ---------- */
const NOTIF_CATS=[['valider','Commande du commercial à valider',['centraliste']],['modv','Modification d\'une commande à valider',['centraliste']],
  ['mes','Mes commandes : validée, modifiée ou annulée par la centrale',['commercial','labo','centraliste']],['pompe','Rappel du matin : bons de pompe à faire pour le lendemain',['centraliste','commercial']],['demandes','Demandes et réponses',['centraliste','commercial','labo']],['chat','Messages du chat',['centraliste','commercial','labo']]];
const NOTIF_DEF={centraliste:{valider:1,modv:1,demandes:1,chat:1,mes:1,pompe:1},commercial:{demandes:1,mes:1},labo:{demandes:1,mes:1}};
const b64uBytes=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const r=atob(s);return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function notifSub(){if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;const reg=await navigator.serviceWorker.getRegistration();return reg?await reg.pushManager.getSubscription():null}
async function notifSave(sub,extra){const j=sub.toJSON();const row=Object.assign({endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,role:(prefs.user&&prefs.user.role)||null,nom:author(),appareil:(navigator.userAgent.match(/iPhone|iPad|Android|Windows|Macintosh|Linux/)||['?'])[0]},extra||{});
  const {error}=await SB.from('push_abonnements').upsert(row,{onConflict:'endpoint'});if(error)throw error}
// à chaque ouverture : l'abonnement garde le bon nom (celui qui reçoit « mes commandes »)
async function notifRefresh(){try{if(!SB||!('Notification' in window)||Notification.permission!=='granted')return;const sub=await notifSub();if(sub)await notifSave(sub)}catch(e){}}
async function notifPop(anchor){
  const R=(prefs.user&&prefs.user.role)||'centraliste';
  const box=(t,b)=>openPop(anchor,`<div class="pop-h">Notifications sur cet appareil</div>${t}`,b||{});
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
    if(isIOS()&&!isInstalled())return box(`<p class="muted" style="margin:0">Sur iPhone, les notifications ne marchent que dans l'application installée : Safari → <b>Partager</b> → <b>Sur l'écran d'accueil</b>, puis ouvrez « La Bocca » depuis l'icône et revenez ici.</p>`);
    return box(`<p class="muted" style="margin:0">Ce navigateur ne permet pas les notifications. Utilisez Chrome (Android, ordinateur) ou l'application installée sur iPhone.</p>`)}
  if(isIOS()&&!isInstalled())return box(`<p class="muted" style="margin:0">Sur iPhone, installez d'abord l'application : Safari → <b>Partager</b> → <b>Sur l'écran d'accueil</b>. Ouvrez « La Bocca » depuis l'icône, puis revenez ici.</p>`);
  if(Notification.permission==='denied')return box(`<p class="muted" style="margin:0">Les notifications sont bloquées pour le planning. Autorisez-les dans les réglages du téléphone (Notifications → La Bocca) ou du navigateur (cadenas à gauche de l'adresse), puis revenez ici.</p>`);
  box('<p class="muted" style="margin:0">Chargement…</p>');
  let sub=null,row=null;try{sub=await notifSub();if(sub){const {data}=await SB.from('push_abonnements').select('prefs').eq('endpoint',sub.endpoint);row=data&&data[0]}}catch(e){}
  if(!sub||!row)return box(`<p class="muted" style="margin:0 0 8px">Recevez sur l'écran de verrouillage ce qui vous concerne : ${R==='centraliste'?'commandes et modifications à valider, demandes, chat':'vos commandes validées ou modifiées par la centrale, les réponses à vos demandes'}.</p><button class="pop-b on" data-pa="on">Activer les notifications</button>`,
    {async on(){try{const perm=await Notification.requestPermission();if(perm!=='granted'){toast('Notifications non autorisées');return 'close'}
      const reg=await navigator.serviceWorker.ready;const r=await fetch(SUPA_URL+'/functions/v1/notifs',{headers:{apikey:SUPA_KEY}});const {publicKey}=await r.json();if(!publicKey)throw new Error('clé');
      const s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uBytes(publicKey)});await notifSave(s,{prefs:{}});toast('Notifications activées sur cet appareil');setTimeout(()=>notifPop(anchor))}
      catch(e){toast('Activation impossible : '+(e&&e.message||e))}return 'keep'}});
  const pr=Object.assign({},NOTIF_DEF[R]||{},row.prefs||{});
  box(`<p class="muted" style="margin:0 0 6px">Activées. Touchez une ligne pour la couper ou la remettre.</p>${NOTIF_CATS.filter(c=>c[2].includes(R)).map(([k,l])=>`<button class="pop-b ${pr[k]?'on':''}" data-pa="tg" data-k="${k}">${pr[k]?'✓':'—'}  ${esc(l)}</button>`).join('')}
    <div class="pop-row" style="margin-top:8px"><button class="pop-b" data-pa="test">Envoyer une notification de test</button><button class="pop-b" data-pa="off">Désactiver</button></div>`,
    {async tg(el){const k=el.dataset.k;const np=Object.assign({},row.prefs||{},{[k]:!pr[k]});const {error}=await SB.from('push_abonnements').update({prefs:np}).eq('endpoint',sub.endpoint);if(error)toast('Réglage non enregistré');setTimeout(()=>notifPop(anchor));return 'keep'},
     async test(){const {error}=await SB.rpc('push_test');toast(error?'Test impossible : '+error.message:'Notification de test envoyée : elle arrive dans quelques secondes');return 'keep'},
     async off(){try{await SB.from('push_abonnements').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}catch(e){}toast('Notifications désactivées sur cet appareil');return 'close'}});
}
// ouvrir le planning au bon endroit (clic sur une notification)
function navFromUrl(search){const q=new URLSearchParams(search||'');if(![...q.keys()].length)return;
  const go=()=>{if(!S||!ready.o){setTimeout(go,300);return}
    if(q.get('d')){view.tab='planning';view.mode='jour';view.date=q.get('d')}if(q.get('o'))view.focus=q.get('o');
    if(q.get('tab'))view.tab=q.get('tab');render(true);if(q.get('chat')&&typeof chatOpen==='function')chatOpen();
    try{history.replaceState(history.state,'',location.pathname)}catch(e){}};go()}
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.nav)try{navFromUrl(new URL(e.data.nav).search)}catch(_){}});

function settingsPop(anchor){
  const u=prefs.user||{};const ce=role()==='centraliste';const d=view.date;const c=dayRO(d).cloture;
  const lastWD=(()=>{if(isWE(d))return false;let n=addDays(d,1);while(isWE(n))n=addDays(n,1);return n.slice(0,7)!==d.slice(0,7)})();
  const moisN=MOISL[D(d).getUTCMonth()];
  openPop(anchor,`<div class="pop-h">Réglages</div>
   <section class="ps ps-who"><div class="pop-l">Vous êtes${isAdmin()?' <span class="ps-adm">Admin</span>':''}</div>
     <p class="ps-me ps-line"><span><b>${esc(u.nom||'?')}</b> · ${esc(ROLES[u.role]||'')}</span><span class="ps-mail">${esc(ME?ME.email:'')}</span></p>
     <div class="pop-row"><button class="pop-b" data-pa="who">Page de connexion</button><button class="pop-b" data-pa="logout">Se déconnecter</button></div></section>
   ${isAdmin()?`<section class="ps"><div class="pop-l">Sauvegarde</div><button class="pop-b" data-pa="verifsauv">Vérifier une sauvegarde (sans rien changer)…</button><button class="pop-b" data-pa="importer">Restaurer une sauvegarde…</button></section>`:''}
   ${ce?`<section class="ps"><div class="pop-l">Journée du ${esc(dayShort(d).toLowerCase())}</div>
     <button class="pop-b" data-pa="print">Imprimer / PDF (A3 · A4)…</button></section>
   <section class="ps"><div class="pop-l">Fin de mois</div>
     ${lastWD?`<p class="ps-note">Dernier jour ouvré du mois : pensez à la clôture</p>`:''}
     <button class="pop-b ${lastWD?'strong':''}" data-pa="moisclot">Clôture de fin de mois : ${esc(moisN)} (PDF + .json)</button>
     <button class="pop-b" data-pa="archive">Consulter un mois archivé (.json)…</button></section>`:''}
   <section class="ps"><div class="pop-l">Centrale</div>${RO()?'<button class="pop-b" data-pa="cfgro">Camions, pompes, agence, raccourcis (consultation)</button>':(ce||role()==='commercial'||isAdmin()?'<button class="pop-b" data-pa="cfg">Administration · catalogue de la centrale</button>':'')}${MODE==='shared'&&!RO()?'<button class="pop-b" data-pa="notifs">Notifications sur cet appareil…</button>':''}
     <div class="pop-grid">${[['auto','Thème auto'],['light','Clair'],['dark','Sombre']].map(([v,l])=>`<button class="pop-c txt ${prefs.theme===v?'on':''}" data-pa="theme" data-v="${v}">${l}</button>`).join('')}</div>${ce?layoutPopHTML():''}</section>
   <section class="ps"><div class="pop-l">Aide</div><button class="pop-b" data-pa="aide">Mode d'emploi${prefs.aideOn?' (onglet ouvert)':''}</button><button class="pop-b" data-pa="aidepick">Qu'est-ce que c'est ? (toucher un élément)</button>${isInstalled()?'':'<button class="pop-b" data-pa="install">Installer l\'application sur cet appareil</button>'}</section>

   ${RO()?'':`<section class="ps"><div class="pop-l">Journal</div><button class="pop-b" data-pa="journal">Voir le journal du ${esc(dayShort(view.date).toLowerCase())}</button></section>`}
   <section class="ps ps-sync"><div class="pop-l">Synchronisation et état</div><div class="sync-box">${syncDetail()}</div><button class="pop-b" data-pa="force">Forcer la synchronisation</button></section>`,
  {install(){const a=popAnchor;setTimeout(()=>installApp(a));return 'close'},notifs(){const a=popAnchor;setTimeout(()=>notifPop(a));return 'close'},journal(){setTimeout(()=>act('journal',document.querySelector('.top .me')||document.body,null,{}));return 'close'},aide(){prefs.aideOn=true;savePrefs();view.tab='aide';setTimeout(()=>render(true));return 'close'},aidepick(){setTimeout(()=>aidePickSet(true),50);return 'close'},
   'lay-reset'(){const k=meKey();const had=prefs.layouts&&prefs.layouts[k];if(had){delete prefs.layouts[k];savePrefs()}applyLayout();toast(had?'Disposition réinitialisée : '+(S.config&&S.config.layout?'celle de la centrale':'celle par défaut'):'Déjà sur la disposition de la centrale');return 'close'},
   'lay-set'(){const L=layoutGet();S.config.layout={order:L.order.slice(),pos:L.pos};const k=meKey();if(prefs.layouts&&prefs.layouts[k]){delete prefs.layouts[k];savePrefs()}toast('Disposition de la centrale enregistrée pour tous les centralistes')},
   moisclot(){setTimeout(()=>clotureMois(view.date));return 'close'},archive(){setTimeout(consulterArchive);return 'close'},print(){const a=popAnchor;setTimeout(()=>act('export',a,null,{}));return 'close'},force(){forceSync().then(()=>{const b=popEl.querySelector('.sync-box');if(b)b.innerHTML=syncDetail()});return 'keep'},cfg(){setTimeout(openConfig);return 'close'},cfgro(){setTimeout(()=>openConfig(null,{ro:true}));return 'close'},theme(el){prefs.theme=el.dataset.v;savePrefs();applyTheme()},who(){prefs.gate='';savePrefs();setTimeout(showGate);return 'close'},logout(){setTimeout(supaLogout);return 'close'},importer(){setTimeout(importerSauvegarde);return 'close'},verifsauv(){setTimeout(verifierSauvegarde);return 'close'}});
}
function openConfig(focus,opt){const ro=!!(opt&&opt.ro)||RO();
  if(!S.config||!S.config.camions)S.config=CONFIG0();
  const c=S.config;
  const list=(k,items,fmtI)=>`<div class="cfg-l">${items.map((x,i)=>`<span class="chip">${fmtI(x)}<button type="button" class="x" data-cfg="del" data-k="${k}" data-i="${i}" aria-label="Retirer">×</button></span>`).join('')}</div>`;
  const centraleH=()=>`
      <h3 class="adm-g" id="adm-camions"><span>Camions et pompes</span><small>Calcul des tours, bulles de chargement, convocations</small></h3>
      <div class="q" id="cfg-flotte"><div class="ql">Camions centrale<small>Toupies 8x4</small></div><div>${list('flotte',FLEET(),x=>`<b class="plq" data-plq="${esc(x.c)}" title="Clic droit pour modifier">${esc(plDisp(x))}</b>`)}
        <form class="inline-f" data-cfgform="flotte"><input id="cf-pc" placeholder="N° de parc ou repère (ex. 7656, EF)" aria-label="N° de parc ou repère" style="max-width:220px"><input id="cf-pp" placeholder="Plaque entière (optionnel, ex. EF-507-VT)" aria-label="Plaque entière, optionnel"><button class="btn sm">Ajouter</button></form>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Les camions attitrés à ${CENTRALE}. Ils servent aux bulles de chargement, aux convocations et à l'impression.</p></div></div>
      <div class="q"><div class="ql">Camions<small>Type · m³ par tour · m³ maxi en chape ou produit très fluide</small></div><div>${list('camions',c.camions,x=>`<b>${esc(x.t)}</b><small>${fmt(x.cap)} m³ · fluide ${fmt(Math.min(x.cap,capFl(x)))} m³</small>`)}
        <form class="inline-f" data-cfgform="camions"><input id="cf-ct" placeholder="Type (ex. SP8)" aria-label="Type de camion"><input id="cf-cc" type="text" inputmode="decimal" autocomplete="off" placeholder="m³" aria-label="Capacité" style="max-width:80px"><input id="cf-cf" type="text" inputmode="decimal" autocomplete="off" placeholder="fluide m³" aria-label="m³ maxi en chape ou produit très fluide" title="Chape, autoplaçant, S5 : m³ maxi par tour (vide = automatique)" style="max-width:96px"><button class="btn sm">Ajouter</button></form></div></div>
      <div class="q"><div class="ql">Pompes<small>Tailles</small></div><div>${list('pompes',c.pompes,x=>x==='BQA'?'BQA (tuyaux)':esc(x)+' m')}
        <form class="inline-f" data-cfgform="pompes"><input id="cf-p" placeholder="Taille (ex. 38 ou BQA)" aria-label="Taille de pompe"><button class="btn sm">Ajouter</button></form></div></div>
      <div class="q"><div class="ql">Fournisseurs<small>Pompes</small></div><div>${list('fourn',c.fourn,x=>esc(x))}
        <form class="inline-f" data-cfgform="fourn"><input id="cf-f" placeholder="Fournisseur (4 lettres)" aria-label="Fournisseur"><button class="btn sm">Ajouter</button></form></div></div>
      <h3 class="adm-g" id="adm-agence"><span>Agence</span><small>Centrales voisines et provenances</small></h3>
      <div class="q"><div class="ql">Agence<small>Centrales voisines</small></div><div>${list('agence',AG(),x=>esc(x))}
        <form class="inline-f" data-cfgform="agence"><input id="cf-a" placeholder="Centrale (ex. Mandelieu)" aria-label="Centrale de l'agence"><button class="btn sm">Ajouter</button></form>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Elles servent aux tours chargés ailleurs, aux camions prêtés ou reçus, et aux convocations dans une autre centrale (« 7 h 45 Grasse »).</p></div></div>
      <div class="q"><div class="ql">Carrières<small>Provenances</small></div><div>${list('carr',CARRL(),x=>esc(x))}
        <form class="inline-f" data-cfgform="carr"><input id="cf-r" placeholder="Carrière (ex. LA ROQUE)" aria-label="Carrière"><button class="btn sm">Ajouter</button></form></div></div>
      <h3 class="adm-g" id="adm-liens"><span>Raccourcis</span><small>Liens utiles, par thème</small></h3>
      <div class="q" id="cfg-liens"><div class="ql">Raccourcis<small>Par thème</small></div><div>
        ${[...new Set((S.liens||[]).map(l=>l.cat))].map(cat=>`<div class="cfg-th"><span class="lbl">// ${esc(cat)}</span><div class="cfg-l">${(S.liens||[]).map((l,i)=>l.cat!==cat?'':`<span class="chip ${l.u?'':'warn'}" title="${esc(l.u||'Lien à renseigner')}"><button type="button" class="lk-ed" data-cfg="lien" data-i="${i}">${esc(l.n)}</button><button type="button" class="x" data-cfg="del" data-k="liens" data-i="${i}" aria-label="Retirer">×</button></span>`).join('')}</div></div>`).join('')}
        <form class="cfg-lf" data-cfgform="liens"><span class="cfg-lf-t">Nouveau raccourci : nom, adresse, thème</span><input id="cf-ln" placeholder="Nom (ex. Bon de pompe)" aria-label="Nom du raccourci"><input id="cf-lu" placeholder="https://…" aria-label="Adresse"><input id="cf-lc" list="cf-cats" placeholder="Thème (ex. Formulaires)" aria-label="Thème"><datalist id="cf-cats">${[...new Set(['Commandes','Formulaires','Sécurité','Contacts'].concat((S.liens||[]).map(l=>l.cat)))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist><button class="btn sm">Ajouter</button></form>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Cliquez sur un raccourci pour le modifier. Un nouveau thème se crée en tapant son nom.</p></div></div>
`;
  const ce=ro||role()==='centraliste'||role()==='commercial'||isAdmin();   // réglages de la centrale ; lecture seule : consultation
  const adm=!ro&&isAdmin()&&MODE==='shared'&&SB;
  const navH=[...(adm?[['adm-acces','Accès'],['adm-erreurs','Erreurs']]:[]),...(ro?[]:[['adm-formules','Formules']]),...(ce?[['adm-camions','Camions et pompes'],['adm-agence','Agence'],['adm-liens','Raccourcis']]:[])].map(([h,t])=>`<a href="#${h}" data-adm="${h}">${t}</a>`).join('');
  drawerEl.innerHTML=`<div class="scrim" data-act="dr-close-bg"><div class="drawer wide ${ro?'cfg-ro':''}" role="dialog" aria-label="Administration · catalogue de la centrale">
    <div class="dr-h"><h2>${ro?'Réglages de la centrale <span class="adm-h">· consultation</span>':'Administration <span class="adm-h">· catalogue de la centrale</span>'}</h2><button type="button" class="ib" data-act="dr-close" aria-label="Fermer">×</button></div>
    <div class="dr-b">
      <p class="muted adm-intro">Réglages propres à la centrale de ${CENTRALE}. Ils servent à la prise de commande, à la saisie des formules et au calcul des tours.</p>
      <nav class="adm-nav" aria-label="Sections">${navH}</nav>
      ${adm?`<h3 class="adm-g" id="adm-acces"><span>Accès</span><small>Qui peut se connecter au planning, et avec quel rôle</small></h3><div id="acces-box" class="acces-box"><p class="muted">Chargement…</p></div>${baseHTML()}<h3 class="adm-g" id="adm-erreurs"><span>Erreurs</span><small>Plantages du planning chez les utilisateurs (30 derniers jours)</small></h3><div id="err-box" class="err-box"><p class="muted">Chargement…</p></div>`:''}
      ${ro?'':`<h3 class="adm-g" id="adm-formules"><span>Formules</span><small>Commun au centraliste et au commercial</small></h3>
      <div class="q" id="cfg-formules"><div class="ql">Catalogue<small>Formules béton</small></div><div><p class="muted" style="font-size:12.5px;margin:0 0 8px">Ce que la saisie des formules propose à ${CENTRALE} (expositions, gravillons, liants, options, produits spéciaux), avec les contrôles de la NF EN 206+A2/CN. Les changements valent pour tous les postes.</p><div class="fxw fxadm" id="fx-adm"></div></div></div>
      `}${ce?centraleH():'<p class="muted adm-note">Camions, pompes, agence et raccourcis : réglés par le centraliste.</p>'}
    </div></div></div>`;
  drawerEl.hidden=false;
  if(adm){accesLoad();errLoad()}
  if(ro)drawerEl.querySelectorAll('.cfg-ro input,.cfg-ro select,.cfg-ro textarea').forEach(i=>{i.disabled=true});
  {const el=drawerEl.querySelector('#fx-adm');if(el&&window.FX){FX.setCfg(fxCat());FX.admin(el,{onSave:cf=>{S.formcat=cf;commit()}})}}
  drawerEl.querySelectorAll('[data-adm]').forEach(a=>a.onclick=e=>{e.preventDefault();const t=drawerEl.querySelector('#'+a.dataset.adm);if(t)t.scrollIntoView({block:'start',behavior:'smooth'})});
  if(focus){const t=drawerEl.querySelector('#'+focus);if(t)t.scrollIntoView({block:'start'})}
}
/* ---------- Accès : liste des personnes autorisées (table autorisations, réservée à l'admin par la base) ---------- */
const ACC_ROLES=[['centraliste','Centraliste'],['commercial','Commercial'],['labo','Tech labo'],['lecture','Lecture seule'],['admin','Admin']];
async function errLoad(){errLoadImpl()}
async function errLoadImpl(){const box=document.getElementById('err-box');if(!box||!SB)return;
  const {data,error}=await SB.from('erreurs').select('at,nom,role,msg,src,pile,vue,version,appareil,n').order('at',{ascending:false}).limit(200);
  if(error){box.innerHTML=`<p class="muted">${/erreurs|42P01|PGRST/.test(error.message+error.code)?'Script <code>15_erreurs.sql</code> pas encore exécuté dans Supabase.':'Lecture impossible : '+esc(error.message)}</p>`;return}
  prefs.errVu=Date.now();savePrefs();const L=data||[];const g=new Map();L.forEach(e=>{const k=e.msg;const x=g.get(k)||{msg:k,n:0,last:e.at,qui:new Set(),v:new Set(),ex:e};x.n+=e.n||1;x.qui.add(e.nom||e.role||'?');if(e.version)x.v.add(e.version);g.set(k,x)});
  const tot=L.reduce((t,e)=>t+(e.n||1),0),sem=L.filter(e=>Date.now()-new Date(e.at)<7*864e5).reduce((t,e)=>t+(e.n||1),0);
  const quand=t=>{const d=new Date(t);return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})};
  box.innerHTML=!L.length?`<p class="base-etat ok">✓ Aucune erreur enregistrée.</p>`:`<p class="err-sum"><b>${sem}</b> erreur${sem>1?'s':''} ces 7 derniers jours · ${tot} sur 30 jours · ${g.size} différente${g.size>1?'s':''}</p>
    <div class="err-l">${[...g.values()].map(x=>`<details class="err-d"><summary><span class="err-n">${x.n}×</span><span class="err-m">${esc(x.msg)}</span><small>${quand(x.last)} · ${esc([...x.qui].join(', '))}</small></summary>
      <div class="err-x"><div><b>Version</b> ${esc([...x.v].join(', ')||'—')} · <b>Écran</b> ${esc(x.ex.vue||'—')}</div><div><b>Appareil</b> ${esc(x.ex.appareil||'—')}</div>${x.ex.src?`<div><b>Endroit</b> ${esc(x.ex.src)}</div>`:''}${x.ex.pile?`<pre>${esc(x.ex.pile)}</pre>`:''}</div></details>`).join('')}</div>
    <div class="err-a"><button type="button" class="btn sm" id="err-copy">Copier pour Claude</button><button type="button" class="btn sm" id="err-clear">Tout effacer</button></div>`;
  const c=box.querySelector('#err-copy');if(c)c.onclick=()=>{const t=[...g.values()].map(x=>`${x.n}× ${x.msg}\n  ${[...x.v].join(', ')} · ${x.ex.vue||''} · ${x.ex.appareil||''}\n  ${x.ex.src||''}\n${(x.ex.pile||'').split('\n').slice(0,6).map(l=>'    '+l).join('\n')}`).join('\n\n');
    (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copié : collez-le dans la conversation avec Claude'),()=>toast('Copie impossible'))};
  const k=box.querySelector('#err-clear');if(k)k.onclick=()=>confirmPop(k,'Effacer toutes les erreurs ?','Elles ne seront plus visibles ici.','Oui, effacer',async()=>{const {error}=await SB.from('erreurs').delete().gt('id',0);toast(error?'Non effacé : '+error.message:'Erreurs effacées');errLoad()});
}
async function accesLoad(){const box=document.getElementById('acces-box');if(!box)return;
  const [a,p]=await Promise.all([SB.from('autorisations').select('email,nom,role,actif,cree_le').order('nom'),SB.from('profils').select('email,cree_le')]);
  if(a.error){box.innerHTML=`<p class="muted">Liste indisponible : ${esc(a.error.message)}</p>`;return}
  const vu={};(p.data||[]).forEach(x=>{if(x.email)vu[x.email.toLowerCase()]=x.cree_le});
  const me=((ME&&ME.email)||'').toLowerCase();const rows=a.data||[];
  const nAdm=rows.filter(r=>r.role==='admin'&&r.actif).length;
  box.innerHTML=`<table class="acc-t"><thead><tr><th>Nom</th><th>Adresse</th><th>Rôle</th><th>Actif</th><th>Connexion</th><th></th></tr></thead><tbody>
    ${rows.map(r=>{const self=r.email.toLowerCase()===me,last=r.role==='admin'&&r.actif&&nAdm<=1,lock=self||last;const v=vu[r.email.toLowerCase()];
      return `<tr data-em="${esc(r.email)}" class="${r.actif?'':'off'}"><td><input class="acc-nom" value="${esc(r.nom||'')}" placeholder="Prénom" aria-label="Nom affiché"></td><td class="acc-em">${esc(r.email)}${self?' <small>(vous)</small>':''}</td>
        <td><select class="acc-role" ${lock?'disabled title="Votre propre accès, ou dernier admin : non modifiable"':''}>${ACC_ROLES.map(([k,l])=>`<option value="${k}" ${r.role===k?'selected':''}>${l}</option>`).join('')}</select></td>
        <td><input type="checkbox" class="acc-actif" ${r.actif?'checked':''} ${lock?'disabled':''} aria-label="Actif"></td>
        <td class="muted">${v?'depuis le '+esc(new Date(v).toLocaleDateString('fr-FR')):'jamais'}</td>
        <td>${lock?'':'<button type="button" class="ib acc-del" title="Retirer l\'accès" aria-label="Retirer">×</button>'}</td></tr>`}).join('')}
    </tbody></table>
    <form class="inline-f acc-add"><input id="acc-nm" placeholder="Prénom" aria-label="Prénom" style="max-width:150px"><input id="acc-em" type="email" placeholder="adresse Google (ex. prenom.nom@gmail.com)" aria-label="Adresse" required>
      <select id="acc-rl" aria-label="Rôle">${ACC_ROLES.filter(x=>x[0]!=='admin').map(([k,l])=>`<option value="${k}" ${k==='commercial'?'selected':''}>${l}</option>`).join('')}</select><button class="btn sm primary">Ajouter</button></form>
    <p class="muted" style="font-size:12.5px;margin:6px 0 0">La personne se connecte avec ce compte Google. Un compte désactivé, retiré ou dont le rôle change est déconnecté automatiquement. Le prénom est celui affiché sur son badge.</p>`;
  const upd=async(em,patch,msg)=>{const {error}=await SB.from('autorisations').update(patch).eq('email',em);toast(error?'Non enregistré : '+error.message:msg);accesLoad()};
  box.querySelectorAll('tr[data-em]').forEach(tr=>{const em=tr.dataset.em;
    tr.querySelector('.acc-role').onchange=e=>upd(em,{role:e.target.value},'Rôle modifié');
    tr.querySelector('.acc-actif').onchange=e=>upd(em,{actif:e.target.checked},e.target.checked?'Accès réactivé':'Accès désactivé');
    tr.querySelector('.acc-nom').onchange=e=>upd(em,{nom:e.target.value.trim()||null},'Prénom enregistré');
    const d=tr.querySelector('.acc-del');if(d)d.onclick=ev=>{ev.stopPropagation();confirmPop(d,'Retirer l\'accès ?',em,'Oui, retirer',async()=>{const {error}=await SB.from('autorisations').delete().eq('email',em);toast(error?'Non retiré : '+error.message:'Accès retiré');accesLoad()},true)}});
  box.querySelector('.acc-add').onsubmit=async e=>{e.preventDefault();const em=box.querySelector('#acc-em').value.trim().toLowerCase(),nm=box.querySelector('#acc-nm').value.trim(),rl=box.querySelector('#acc-rl').value;
    if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(em)){toast('Adresse e-mail invalide');return}
    if(rows.some(r=>r.email.toLowerCase()===em)){toast('Cette adresse a déjà un accès');return}
    const {error}=await SB.from('autorisations').insert({email:em,nom:nm||null,role:rl,actif:true});toast(error?'Non ajouté : '+error.message:`Accès ajouté : ${em}`);accesLoad()};
}
function cfgAction(el){
  if(el.dataset.cfg==='lien'){const i=+el.dataset.i;const l=S.liens[i];return formPop(el,'Modifier le raccourci',[{k:'n',label:'Nom',val:l.n},{k:'u',label:'Adresse (https://…)',val:l.u},{k:'cat',label:'Thème',val:l.cat,list:[...new Set(S.liens.map(x=>x.cat))]}],v=>{if(!v.n)return 'keep';if(v.u&&!/^https?:\/\//i.test(v.u))v.u='https://'+v.u;S.liens[i]={n:v.n,u:v.u,cat:v.cat||l.cat};setTimeout(openConfig)})}
  const nm=((el.parentElement&&el.parentElement.textContent)||'').replace('×','').trim();
  if(el.dataset.k==='liens'){const i=+el.dataset.i;return confirmPop(el,'Supprimer ce raccourci ?',nm,'Oui, supprimer',()=>{S.liens.splice(i,1);setTimeout(openConfig)},true)}const k=el.dataset.k,i=+el.dataset.i;const D0={agence:AG0,agg:AGG,carr:CARRS,cim:CIMENTS};if(D0[k]&&!S.config[k])S.config[k]=D0[k].slice();if(k==='flotte'&&!S.config.flotte)S.config.flotte=FLEET().slice();if(k==='ext'&&!S.config.ext)S.config.ext=EXT().slice();if(k==='flotte'&&S.config.flotte.length<=1){toast('Il faut au moins un camion');return}const L=S.config[k];if(k==='camions'&&L.length<=1){toast('Il faut au moins un type de camion');return}const T0={flotte:'ce camion',camions:'ce type de camion',pompes:'cette pompe',agence:'cette centrale',agg:'ce produit',carr:'cette carrière',cim:'ce ciment',four:'ce fournisseur'};return confirmPop(el,'Supprimer '+(T0[k]||'cet élément')+' ?',nm,'Oui, supprimer',()=>{S.config[k].splice(i,1);setTimeout(openConfig)},true)}
function cfgSubmit(f){const k=f.dataset.cfgform;const c=S.config;
  if(k==='camions'){const t=f.querySelector('#cf-ct').value.trim().toUpperCase().replace(/^8X4$/,'8x4');const cap=num(f.querySelector('#cf-cc').value);if(!t||!(cap>0)){toast('Indiquez le type et les m³ par tour');return}const fl=num(f.querySelector('#cf-cf').value);c.camions.push(fl>0?{t,cap,fl:Math.min(fl,cap)}:{t,cap})}
  if(k==='pompes'){const v=f.querySelector('#cf-p').value.trim().toUpperCase().replace(/\s*M$/,'');if(!v)return;if(!c.pompes.includes(v))c.pompes.push(v)}
  if(k==='flotte'){const c0=f.querySelector('#cf-pc').value.trim().toUpperCase().slice(0,8);const p0=f.querySelector('#cf-pp').value.trim();if(!c0){toast('Indiquez le n° de parc ou le repère du camion');return}const L=FLEET().slice();if(L.some(x=>x.c===c0)){toast('Ce camion existe déjà');return}L.push({c:c0,p:p0});c.flotte=L}
  if(k==='agg'){learnList('agg',f.querySelector('#cf-g').value,AGG)}
  if(k==='carr'){learnList('carr',f.querySelector('#cf-r').value.trim().toUpperCase(),CARRS)}
  if(k==='cim'){learnList('cim',f.querySelector('#cf-m').value,CIMENTS)}
  if(k==='agence'){const v=f.querySelector('#cf-a').value.trim();if(!v)return;c.agence=c.agence||AG0.slice();if(!c.agence.includes(v))c.agence.push(v)}
  if(k==='liens'){const n=f.querySelector('#cf-ln').value.trim();let u=f.querySelector('#cf-lu').value.trim();const cat=f.querySelector('#cf-lc').value.trim()||'Commandes';if(!n){toast('Indiquez le nom du raccourci');return}if(u&&!/^https?:\/\//i.test(u))u='https://'+u;S.liens=(S.liens||[]).concat([{n,u,cat}]);commit();openConfig();render(true);setTimeout(()=>{const x=drawerEl.querySelector('#cf-ln');if(x)x.focus()},20);return}
  if(k==='fourn'){const v=f.querySelector('#cf-f').value.trim();if(!v)return;if(!c.fourn.includes(v))c.fourn.push(v)}
  commit();openConfig();render(true);setTimeout(()=>{const n=drawerEl.querySelector(`[data-cfgform="${k}"] input`);if(n)n.focus()},20)}
function applyTheme(){const r=document.documentElement;if(prefs.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',prefs.theme)}

/* =====================================================================
   Formulaire de commande (QQOQCP)
   ===================================================================== */
let formCtx=null;
function openOrderForm(o,opt){if(RO())return;if(LABO()){toast(o?LABO_MSG:'Tech labo : les commandes sont saisies par le commercial ou la centrale. Utilisez « Demandes » pour en demander une.',5000);return}
  if(o&&o.id&&!(opt&&opt.dup)&&(closedStop(o.date)||lockStop(o.id)))return;
  if(o&&o.id&&MODE==='shared'&&room&&room.live&&!room.live())toast('Direct interrompu : les autres ne voient pas que vous modifiez cette commande. Reconnexion en cours…');
  opt=opt||{};const isNew=!o||opt.dup;
  const base=o?clone(o):{date:view.mode==='jour'&&view.tab==='planning'?view.date:TODAY,h:'07:00',cl:'',ch:'',ouv:'',f:'',m3:'',cam:'',camNote:'',pompe:null,am:false,spec:false,pills:[]};
  if(opt.dup){base.date=opt.date;base.st=null;base.kind=base.kind==='aplacer'?'cmd':base.kind}
  const c=o?cl(o.cl):null,ch=o?chan(o.ch):null;
  const m3=o?total(o):'';
  const role=prefs.user?prefs.user.role:'centraliste';
  formCtx={id:o&&!opt.dup?o.id:null,src:o?o.id:null};
  if(formCtx.id)setEditing(formCtx.id);
  const p=base.pompe||{t:'',f:'',ml:0,bon:false,resa:''};
  drawerEl.innerHTML=`<div class="scrim" data-act="dr-close-bg"><form class="drawer" id="oform" role="dialog" aria-label="Commande">
   <div class="dr-h"><h2>${opt.dup?'Dupliquer la commande':o?'Modifier la commande':'Nouvelle commande'}</h2><label class="ck dr-spec"><input type="checkbox" id="f-spec" ${base.spec?'checked':''}> Commande spéciale</label><button type="button" class="ib" data-act="dr-close" aria-label="Fermer">×</button></div>
   <div class="dr-b">
    <div class="q"><div class="ql">Qui<small>Client</small></div><div class="fields">
      <label class="fl full">Client<input id="f-cl" list="dl-cl" value="${esc(c?c.n:'')}" required autocomplete="off" placeholder="Nom du client ou NOM Prénom (particulier)"></label>
      <label class="fl full">Contact sur place (nom, téléphone)<input id="f-tel" value="${esc(base.tel||'')}" type="text" inputmode="text" autocomplete="off" autocapitalize="words" placeholder="Paul · 06 12 34 56 78"></label>
      <label class="fl full">Paiement (nouveau client)<select id="f-ct"><option value="compte">En compte</option><option value="comptant">Comptant</option></select></label>
    </div></div>
    <div class="q"><div class="ql">Quoi<small>Formule</small></div><div class="fields">
      <div class="fl full">Formule<div class="fxw" id="f-fx"></div><input type="hidden" id="f-f" value="${esc(base.f)}"><input type="hidden" id="f-sap" value="${esc(o?o.sap||'':'')}"></div>
    </div></div>
    <div class="q"><div class="ql">Combien<small>Quantité</small></div><div class="fields">
      <div class="fl">Quantité (m³)<div class="qplus"><input id="f-m3" type="text" value="${esc(m3==null?'':String(m3).replace('.',','))}" required inputmode="decimal" autocomplete="off" aria-label="Quantité en m³">${(prefs.user?prefs.user.role:'centraliste')==='centraliste'||((prefs.user||{}).role==='commercial'&&!o)?`<label class="plus-t" title="Le client prendra sans doute un complément : 1 tour de plus, quantité à confirmer"><input type="checkbox" id="f-plus" ${base.plus?'checked':''}><span>[+]</span></label>`:''}</div><small class="plus-h">[+] = et plus : 1 tour à confirmer</small></div>
      <div class="full" id="f-hint"></div>
    </div></div>
    <div class="q"><div class="ql">Où<small>Chantier</small></div><div class="fields">
      <label class="fl full">Nom du chantier<input id="f-chn" list="dl-ch" value="${esc(ch?ch.nom:'')}" autocomplete="off" placeholder="Chantier de fond : le nom suffit"></label>
      <label class="fl full">Adresse<input id="f-cha" list="dl-adr" value="${esc(ch?ch.adr:'')}" autocomplete="off" placeholder="Visible au survol si le chantier a un nom"></label>
      <label class="ck full"><input type="checkbox" id="f-ot" ${ch&&ch.ot?'checked':''}> OT : adresse unique à ce coulage (ne sera pas reproposée)</label>
    </div></div>
    <div class="q"><div class="ql">Quand<small>Date, heure</small></div><div class="fields">
      <label class="fl">Date<input id="f-d" type="date" value="${esc(base.date)}" required></label>
      <label class="fl">Heure du 1er camion<input id="f-h" type="time" step="900" value="${esc(base.h)}" required></label>
      <label class="ck full"><input type="checkbox" id="f-am" ${base.am?'checked':''}> Le chantier déborde sur l'après-midi</label>
    </div></div>
    <div class="q"><div class="ql">Comment<small>Camion, pompe</small></div><div class="fields">
      <div class="full"><span class="fl">Type de camion</span><div class="radios" id="f-ctype">${CFG().camions.map(c=>`<label><input type="radio" name="f-ct" value="${esc(c.t)}" ${camParse(base.cam).t===c.t?'checked':''}><span>${esc(c.t)}</span></label>`).join('')}</div></div>
      <input type="hidden" id="f-cam" value="${esc(base.cam)}">
      <label class="fl" id="f-nb-w" ${camParse(base.cam).t===CFG().camions[0].t?'hidden':''}>Précision : nombre de camions<input id="f-nb" type="number" min="1" step="1" value="${esc(camParse(base.cam).n)}" placeholder="3"></label>
      <div class="full" id="f-resa-w" ${camParse(base.cam).t===CFG().camions[0].t?'hidden':''}><span class="fl">Réservation des camions</span><div class="radios resa">
        <label><input type="radio" name="f-resa" value="ok" ${base.resa==='ok'?'checked':''}><span class="r-ok">Réservé</span></label>
        <label><input type="radio" name="f-resa" value="todo" ${base.resa!=='ok'?'checked':''}><span class="r-todo">À réserver</span></label></div></div>
      <label class="ck full"><input type="checkbox" id="f-pp" ${base.pompe?'checked':''}> Pompe</label>
      <div class="fields full" id="f-pump" ${base.pompe?'':'hidden'}>
        <div class="full"><span class="fl">Pompe</span><div class="radios">${CFG().pompes.map(t=>`<label><input type="radio" name="f-pt" value="${esc(t)}" ${String(p.t)===t?'checked':''}><span>${t==='BQA'?'BQA (tuyaux)':esc(t)+' m'}</span></label>`).join('')}</div></div>
        <div class="full"><span class="fl">Fournisseur</span><div class="radios">${CFG().fourn.map(t=>`<label><input type="radio" name="f-pf" value="${esc(t)}" ${p.f===t?'checked':''}><span>${esc(t)}</span></label>`).join('')}</div></div>
        <label class="fl">Précision : tuyaux (ML)<input id="f-pml" type="number" step="5" min="0" value="${esc(p.ml||'')}" placeholder="0"></label>
        <label class="ck"><input type="checkbox" id="f-pb" ${p.bon?'checked':''}> Bon de pompe envoyé</label>
        <div class="full"><span class="fl">Sac de lavage de la pompe</span><div class="radios"><label><input type="checkbox" id="f-beto" ${p.beto?'checked':''}><span>Betobag</span></label></div></div>
        <div class="full"><span class="fl">Réservation de la pompe</span><div class="radios resa">
          <label><input type="radio" name="f-presa" value="ok" ${p.resa==='ok'||(base.pompe&&!p.resa)?'checked':''}><span class="r-ok">Réservé</span></label>
          <label><input type="radio" name="f-presa" value="todo" ${p.resa==='todo'||!base.pompe?'checked':''}><span class="r-todo">À réserver</span></label></div></div>
      </div>
      ${role!=='centraliste'&&isNew?`<p class="hint full" style="background:var(--info);color:var(--info-ink)">La commande part au centraliste, qui la valide sur le planning.</p><label class="fl full">Souhait<input id="f-sh" placeholder="Ex. 2 camions ensemble au démarrage"></label>`:''}
      ${role==='centraliste'&&o&&o.kind==='aplacer'&&!opt.dup?`<label class="ck full"><input type="checkbox" id="f-val" checked> Valider et placer au planning en enregistrant</label>`:''}
    </div></div>
    <div class="q"><div class="ql">Pourquoi<small>Ouvrage, infos</small></div><div class="fields"><label class="fl full">Ce que fait le client<input id="f-ouvx" value="${esc(base.ouv||'')}" autocomplete="off"></label>
      <div class="full pe-wrap" id="f-pills"><span class="fl">Infos sur la ligne</span>${pillsEditor(base.pills,base)}</div>
    </div></div>
   </div>
   <p class="f-warn" id="f-closed" role="alert" hidden></p>
   <div class="dr-f"><div class="dr-sum" id="f-sum" aria-live="polite"></div><button type="button" class="btn" data-act="dr-close">Annuler</button><button type="submit" class="btn primary">${opt.dup?'Valider la copie':'Enregistrer'}</button></div>
   <datalist id="dl-cl">${S.clients.map(c=>`<option value="${esc(c.n)}">`).join('')}</datalist>
   <datalist id="dl-ch">${S.chantiers.filter(c=>c.nom&&!c.ot).map(c=>`<option value="${esc(c.nom)}">`).join('')}</datalist>
   <datalist id="dl-adr">${S.chantiers.filter(c=>c.adr&&!c.ot).map(c=>`<option value="${esc(c.adr)}">`).join('')}</datalist>
   <datalist id="dl-cam"><option value="8x4"><option value="1SP4"><option value="2SP4"><option value="3SP4"><option value="4SP4"></datalist>
  </form></div>`;
  drawerEl.hidden=false;
  const f=document.getElementById('oform');
  const rv=n=>(f.querySelector(`input[name="${n}"]:checked`)||{}).value||'';
  const hint=()=>{const fv=f.querySelector('#f-f').value,pp=f.querySelector('#f-pp').checked,pt=rv('f-pt');const h=[];
    if(pp&&pt==='BQA'&&!/bqa/i.test(fv))h.push('Pompe à tuyaux : la formule doit être une BQA.');
    const m=num(f.querySelector('#f-m3').value),cam=f.querySelector('#f-cam').value,cap=capOf(cam,fv);if(isFluide(fv))h.push(flTxt(cam));if(m>0&&isBag({f:fv}))h.push(`Citybag : ${fmt(m)} m³ = ${nBags(m)} bags (1 bag = 0,5 m³), remplis à la centrale.`);if(m>0){const n=Math.floor(m/cap+1e-9),r=Math.round((m-n*cap)*10)/10;h.push(n?`${n} tour${n>1?'s':''} de ${fmt(cap)} m³${r>0.05?' + complément de '+fmt(r)+' m³':''}.`:`1 tour de ${fmt(r)} m³.`)}
    f.querySelector('#f-hint').innerHTML=h.map(x=>`<div class="hint">${esc(x)}</div>`).join('')};
  const syncCam=()=>{const d0=CFG().camions[0].t;const t=(f.querySelector('input[name="f-ct"]:checked')||{}).value||d0;const n=parseInt(f.querySelector('#f-nb').value)||'';
    f.querySelector('#f-cam').value=t===d0?'':(n?n:'')+t;f.querySelector('#f-nb-w').hidden=t===d0;f.querySelector('#f-resa-w').hidden=t===d0};
  f.addEventListener('input',e=>{if(e.target.name==='f-ct'||e.target.id==='f-nb')syncCam();
    if(e.target.id==='f-pp')f.querySelector('#f-pump').hidden=!e.target.checked;
    if(e.target.id==='f-chn'){const k=S.chantiers.find(c=>c.nom&&!c.ot&&c.nom.toLowerCase()===e.target.value.trim().toLowerCase());if(k){f.querySelector('#f-cha').value=k.adr;if(!f.querySelector('#f-cl').value)f.querySelector('#f-cl').value=cl(k.cl).n}}
    if(e.target.id==='f-cha'){const k=S.chantiers.find(c=>c.adr&&!c.ot&&c.adr===e.target.value);if(k&&!f.querySelector('#f-chn').value)f.querySelector('#f-chn').value=k.nom}
    if(e.target.name==='f-pt'&&e.target.value==='BQA'&&!/bqa/i.test(f.querySelector('#f-f').value)){const b=S.formules.find(x=>/^bqa/i.test(x.f));if(b&&fxc)fxc.set(b.f)}
    if(e.target.id==='f-cl'&&window.FX)FX.setLast(lastFormules(e.target.value));
    hint()});
  hint();
  // résumé fixe au-dessus d'Enregistrer (téléphone) : jour · heure · client · m³ · formule, ce qui manque en orange
  const sumUpd=()=>{const el=f.querySelector('#f-sum');if(!el)return;const v=k=>((f.querySelector('#'+k)||{}).value||'').trim();
    const miss=t=>`<i>${t} ?</i>`;const d=v('f-d'),h=v('f-h'),c=v('f-cl'),m=v('f-m3'),fo=v('f-f');
    el.innerHTML=[d?esc(dayShort(d)):miss('jour'),h?esc(h):miss('heure'),c?`<b>${esc(c)}</b>`:miss('client'),m?esc(String(m).replace('.',','))+' m³':miss('m³'),fo?esc(fo):miss('formule')].join(' · ')};
  f.addEventListener('input',sumUpd);f.addEventListener('change',sumUpd);
  // saisie de la formule : module formules.js (saisie rapide + cases), réglé par le catalogue de la centrale
  let fxc=null;
  if(window.FX){FX.setCfg(fxCat());const sync=()=>{const q=document.getElementById('fx-q');if(!q)return;f.querySelector('#f-f').value=FX.line(q.value);f.querySelector('#f-sap').value=(document.getElementById('fx-sap')||{}).value||'';hint();sumUpd()};
    fxc=FX.mount(f.querySelector('#f-fx'),{value:base.f||'',sap:o?o.sap||'':'',last:lastFormules(c?c.n:''),onChange:sync});f.querySelector('#f-f').value=base.f||'';}
  sumUpd();
  f.dataset.init=JSON.stringify(serF(f));
  setTimeout(()=>{const first=f.querySelector(o?'#f-m3':'#f-cl');if(first)first.focus()},30);
}
// dernières formules commandées par un client (les plus récentes d'abord)
function lastFormules(nom){const c=S.clients.find(x=>x.n.toLowerCase()===String(nom||'').trim().toLowerCase());if(!c)return [];return [...new Set(S.orders.filter(o=>o.cl===c.id&&o.f).sort((a,b)=>(b.date+b.h).localeCompare(a.date+a.h)).map(o=>o.f))].slice(0,6)}
function serF(f){return [...f.querySelectorAll('input,select,textarea')].map(x=>x.type==='checkbox'||x.type==='radio'?(x.checked?1:0):x.value)}
function changedF(f){const a=JSON.parse(f.dataset.init||'[]'),b=serF(f),els=[...f.querySelectorAll('input,select,textarea')];const out=[];
  els.forEach((x,i)=>{if(a[i]===b[i])return;const l=x.closest('label');let t=(l?l.textContent:x.name||x.id||'').replace(/\s+/g,' ').trim();if(x.type==='radio'){const g=x.closest('.full,.fields');const s=g&&g.querySelector('.fl');t=s?s.textContent.trim():t}t=t.slice(0,32);if(t&&!out.includes(t))out.push(t)});return out}
function closeDrawer(){drawerEl.hidden=true;drawerEl.innerHTML='';formCtx=null;setEditing(null);if(renderPending)render(true)}
function closedCheck(f){const w=f.querySelector('#f-closed');if(!w)return null;const d=(f.querySelector('#f-d')||{}).value,h=(f.querySelector('#f-h')||{}).value;const cw=d&&h?closedWin(d):null;const bad=cw&&inWin(h,cw)?cw:null;
  const we=d&&isWE(d)&&!weOpen(d);const again=f.dataset.cok===d+h;
  w.hidden=!bad&&!we;if(we)w.innerHTML=`<b>${esc(dayLong(d))} : pas de journée planning (week-end).</b> ${again?'Cliquez encore sur Enregistrer pour <b>créer une ouverture exceptionnelle</b> ce jour et placer la commande.':'La centrale est fermée le week-end.'}`;
  else if(bad)w.innerHTML=`<b>Attention : ${esc(winTxt(bad))}.</b> Le ${esc(dayShort(d).toLowerCase())} à ${esc(hm(h))}, la commande tombe pendant la fermeture.${again?' Cliquez encore sur Enregistrer pour la placer quand même.':''}`;return bad||(we?{we:1}:null)}
document.addEventListener('input',e=>{const f=e.target.closest&&e.target.closest('#oform');if(f&&(e.target.id==='f-d'||e.target.id==='f-h'))closedCheck(f)});
function saveOrderForm(f){
  const g=id=>f.querySelector('#'+id);
  {const x0=formCtx.id?byId(formCtx.id):null;if(x0&&x0.kind==='aplacer'&&f.dataset.vok!=='1'){const ch=changedF(f);if(ch.length){const btn=f.querySelector('button[type=submit]');const pl=g('f-val')&&g('f-val').checked;confirmPop(btn,pl?'Valider les modifications et placer la commande ?':'Valider les modifications ?','Modifié : '+ch.join(' · ')+(pl?' · la commande sera placée au planning':''),pl?'Oui, enregistrer et placer':'Oui, enregistrer',()=>{f.dataset.vok='1';setTimeout(()=>f.requestSubmit(),0);return 'close'});return}}}
  {const bad=closedCheck(f);const key=g('f-d').value+g('f-h').value;if(bad&&f.dataset.cok!==key){f.dataset.cok=key;closedCheck(f);toast(bad.we?'Week-end : pas de journée planning':'Centrale fermée sur ce créneau');const w=g('f-closed');if(w)w.scrollIntoView({block:'nearest'});return}
   const d0=g('f-d').value;if(bad&&bad.we){const x=day(d0);const n=new Date();x.ouvert={by:author(),at:`${pad(n.getHours())}:${pad(n.getMinutes())}`};jlog(d0,'Ouverture exceptionnelle du week-end (commande)')}}
  const cn=g('f-cl').value.trim(),fv=g('f-f').value.trim(),m3=num(g('f-m3').value);
  if(!cn||!fv||!(m3>0)){toast('Client, formule et quantité sont nécessaires');return}
  const sap=g('f-sap').value.trim();if(sap&&!/^\d{8}$/.test(sap)){toast('Le SAP doit faire 8 chiffres');return}
  let c=S.clients.find(x=>x.n.toLowerCase()===cn.toLowerCase());
  if(!c){c={id:'c'+Date.now().toString(36),n:cn,t:g('f-ct').value};S.clients.push(c)}
  const chn=g('f-chn').value.trim(),cha=g('f-cha').value.trim(),ot=g('f-ot').checked;
  let ch=null;
  if(chn&&!ot)ch=S.chantiers.find(x=>!x.ot&&x.nom.toLowerCase()===chn.toLowerCase());
  if(!ch&&!chn&&cha&&!ot)ch=S.chantiers.find(x=>!x.ot&&!x.nom&&x.adr===cha);
  if(!ch&&formCtx.id){const cur=chan((byId(formCtx.id)||{}).ch);if(cur&&(cur.nom||'')===chn&&(cur.adr||'')===cha&&!!cur.ot===!!ot)ch=cur}   // même chantier qu'avant : on le garde (plus de doublon vide)
  if(ch){if(cha&&ch.adr!==cha){ch.adr=cha;delete ch.geo}}
  else{ch={id:'h'+Date.now().toString(36),nom:chn,adr:cha,cl:c.id,ot};const tw=S.chantiers.find(x=>x.geo&&cha&&x.adr===cha);if(tw)ch.geo=tw.geo.slice();S.chantiers.push(ch)}
  const cam=g('f-cam').value.trim();const cap=capOf(cam,g('f-f').value);
  const pills=peValues(f);
  const rv=n=>(f.querySelector(`input[name="${n}"]:checked`)||{}).value||'';
  const pompe=g('f-pp').checked?{t:rv('f-pt')||CFG().pompes[0],f:rv('f-pf')||CFG().fourn[0],ml:parseInt(g('f-pml').value)||0,bon:g('f-pb').checked,resa:rv('f-presa')||'todo',beto:g('f-beto').checked}:null;
  const R=prefs.user?prefs.user.role:'centraliste';const isNewO=!formCtx.id;const ap=R!=='centraliste'&&isNewO;const val=g('f-val')&&g('f-val').checked;
  let o=formCtx.id?byId(formCtx.id):null;
  const src=formCtx.src?byId(formCtx.src):null;
  if(!o){o={id:'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),seq:Date.now(),by:author(),tours:[],pills:src?src.pills.filter(p=>!P_COMMENT.includes(p.t)).map(p=>({t:p.t,on:false,by:p.by})):[],kind:src&&src.kind==='pour'?'pour':'cmd',pour:src?src.pour:'',souhait:'',st:null};S.orders.push(o)}
  if(o.camNote){if(!o.pills.some(p=>p.t===o.camNote))o.pills.push({t:o.camNote,on:false,by:o.by||author()})}
  const oldCap=o.tours.length?capOf(o.cam,o.f):cap;const modBase=o.modv&&o.modv.base?o.modv.base:(formCtx.id&&o.kind==='cmd'?modSnap(o):null);
  Object.assign(o,{date:g('f-d').value,h:g('f-h').value,cl:c.id,ch:ch.id,ouv:g('f-ouvx').value.trim(),f:fv,sap,cam,camNote:'',tel:g('f-tel').value.trim(),resa:cam?((f.querySelector('input[name="f-resa"]:checked')||{}).value||'todo'):null,pompe,am:g('f-am').checked,spec:g('f-spec').checked,plus:g('f-plus')?g('f-plus').checked:!!o.plus});
  if(ap){o.kind='aplacer';o.souhait=(g('f-sh')||{value:''}).value.trim();o.cre=TODAY}
  if(val){o.kind='cmd';delete o.modv}
  const modPending=R!=='centraliste'&&!isNewO&&o.kind==='cmd';
  if(c.t==='comptant'&&!o.pay)o.pay={paye:false,note:''};if(c.t!=='comptant')o.pay=null;
  // infos cochées
  o.pills=mergePills(o.pills,pills);
  // tours : on régénère si la quantité ou la capacité change, en gardant les tours déjà chargés
  if(Math.abs(total(o)-m3)>0.01||oldCap!==cap||!o.tours.length){const nt=genTours(m3,cap);nt.forEach((t,i)=>{const old=o.tours[i];if(old&&!formCtx.src||old&&formCtx.id){t.s=old.s;if(old.p)t.p=old.p;if(old.c)t.c=old.c}});if(!formCtx.id)nt.forEach(t=>{t.s=0;delete t.c});o.tours=nt}
  if(modPending){o.modv={by:author(),at:new Date().toTimeString().slice(0,5),base:modBase};if(modBase&&!modDiff(modBase,o).length)delete o.modv}   // revenu à la version validée : rien à valider
  learnFormule(fv,sap);
  commit();
  const placed=o.kind!=='aplacer'||role()==='centraliste'||true;
  closeDrawer();
  if(placed){view.tab='planning';view.mode='jour';view.date=o.date;view.focus=o.id}else{view.tab='demandes'}
  toast(o.kind==='aplacer'&&role()!=='centraliste'?'Commande envoyée au centraliste pour validation':'Commande enregistrée');
  render(true);
}

/* =====================================================================
   Accès : connexion avec un compte Google autorisé, puis prise de poste
   (prénoms des personnes autorisées, lus dans Supabase)
   ===================================================================== */
const G_SVG=`<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const G_J=['DIM.','LUN.','MAR.','MER.','JEU.','VEN.','SAM.'],G_M=['JANV.','FÉVR.','MARS','AVR.','MAI','JUIN','JUIL.','AOÛT','SEPT.','OCT.','NOV.','DÉC.'];
let gClockT=null,gNoms=null;
const gInit=n=>String(n||'?').trim().split(/[\s.\-_@]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const gPrenom=n=>{const s=String(n||'').trim();if(!s)return'';const w=s.includes('@')?s.split('@')[0].split(/[._-]/)[0]:s.split(/\s+/)[0];return w.charAt(0).toUpperCase()+w.slice(1)};
function gClock(){const d=new Date();const t=`${pad(d.getHours())}:${pad(d.getMinutes())} · ${G_J[d.getDay()]} ${d.getDate()} ${G_M[d.getMonth()]}`;document.querySelectorAll('#gate [data-gclock]').forEach(e=>e.textContent=t)}
function gStartClock(){gClock();clearInterval(gClockT);gClockT=setInterval(()=>{if(document.getElementById('gate').hidden){clearInterval(gClockT);return}gClock()},15000)}
const gCorners='<i class="g2-cn g2-c1"></i><i class="g2-cn g2-c2"></i><i class="g2-cn g2-c3"></i><i class="g2-cn g2-c4"></i>';
function gSideBrand(){return `<aside class="g2-side" aria-hidden="true">${gCorners}
  <div class="g2-top"><span class="g2-lbl"><i class="g2-led g2-pulse"></i>// Planning centrale</span><span class="g2-clock" data-gclock></span></div>
  <div class="g2-brand"><h1>${esc(String(CENTRALE||'La Bocca')).replace(/\s+/,'<br>')}</h1><p>Centrale de Cannes La Bocca — planning des livraisons béton.</p></div>
  <div class="g2-ruler"><span>Connexion <b>Google</b></span><span>Données <b>en Europe</b></span><span>Version <b>bêta</b></span></div></aside>`}
function gSideDay(){return `<aside class="g2-side">${gCorners}
  <div class="g2-top"><span class="g2-lbl"><i class="g2-led g2-pulse"></i>// Journée du jour</span><span class="g2-clock" data-gclock></span></div>
  <div id="g2-day"></div>
  <div class="g2-ruler"><span>Synchro <b id="g2-sync">en cours</b></span></div></aside>`}
// Chiffres de la journée : remplis dès que les données arrivent (appelé aussi par render)
function gateOnline(){const box=document.getElementById('g2-people');if(!box)return;
  const ps=(typeof peers!=='undefined'?peers:[]).filter(p=>p.kind==='viewer'&&p.presence&&p.presence.nom&&!p.isMe);
  const seen=new Set(),list=[];ps.forEach(p=>{const k=p.presence.nom.toLowerCase();if(seen.has(k))return;seen.add(k);list.push({p:p.presence.nom,r:p.presence.role||''})});
  if(!list.length){box.innerHTML='<span class="g2-loading">Personne d\'autre n\'est connecté pour l\'instant.</span>';return}
  const GR=[['centraliste','Centralistes'],['commercial','Commerciaux'],['labo','Tech labo']];
  const card=x=>`<span class="g2-person"><i class="g2-av">${esc(gInit(x.p))}</i><b>${esc(x.p)}</b>${x.r?`<small>${esc(ROLE_NOM[x.r]||x.r)}</small>`:''}</span>`;
  box.innerHTML=GR.map(([k,l])=>{const g=list.filter(x=>x.r===k);return g.length?`<div class="g2-org"><span class="g2-org-l">${l}</span><div class="g2-org-p">${g.map(card).join('')}</div></div>`:''}).join('')
    +(list.some(x=>!GR.some(z=>z[0]===x.r))?`<div class="g2-org"><span class="g2-org-l">Autres</span><div class="g2-org-p">${list.filter(x=>!GR.some(z=>z[0]===x.r)).map(card).join('')}</div></div>`:'')}
function gateDay(){gateOnline();
  const box=document.getElementById('g2-day');if(!box)return;
  const d=D(TODAY);const jour=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d.getUTCDay()];
  let t={m3:0,n:0,c:0},ap=0,first=null,ok=false;
  try{if(S&&S.orders){t=totals(TODAY);ap=S.orders.filter(o=>o.kind==='aplacer').length;first=ordersOn(TODAY).filter(o=>statut(o)!=='annulee')[0]||null;ok=true}}catch(e){}
  const ps=(typeof peers!=='undefined'?peers:[]).filter(p=>p.kind==='viewer'&&p.presence&&p.presence.nom&&!p.isMe);
  const names=[...new Set(ps.map(p=>p.presence.nom))];
  const v=x=>ok?esc(String(x)):'–';
  let fl='';if(first){let cn='';try{cn=cl(first.cl).n}catch(e){}fl=`<div class="g2-first">Premier départ : <b>${esc(first.h||'')} · ${esc(cn)}</b>${siteName(first)?' · '+esc(siteName(first)):''} · ${fmt(total(first))} m³</div>`}
  box.innerHTML=`<p class="g2-date">${jour}<br>${d.getUTCDate()} ${G_M[d.getUTCMonth()].toLowerCase()}</p>
    <div class="g2-week">Semaine ${typeof isoWeek==='function'?isoWeek(TODAY):''} · ${d.getUTCFullYear()}</div>
    <div class="g2-kpis"><div class="g2-kpi"><b>${ok?fmt(t.m3):'–'}</b><span>m³ prévus</span></div><div class="g2-kpi"><b>${v(t.c)}</b><span>chantiers</span></div>
      <div class="g2-kpi"><b>${v(t.n)}</b><span>tours</span></div><div class="g2-kpi"><b>${v(ap)}</b><span>${ap?'<i class="g2-led g2-pulse"></i>':''}à valider</span></div></div>
    ${fl}${names.length?`<div class="g2-online"><i class="g2-led ok"></i>En ligne : ${names.map(esc).join(', ')}</div>`:''}`;
  const sy=document.getElementById('g2-sync');if(sy)sy.textContent=ok?'en direct':'en cours';
}
// Prénoms des personnes autorisées (Supabase), puis ceux déjà utilisés sur cet appareil
async function gateNoms(){
  const out=[];const seen=new Set();
  const add=(n,r)=>{const p=gPrenom(n);if(!p)return;const k=p.toLowerCase();if(seen.has(k)){if(r){const x=out.find(y=>y.p.toLowerCase()===k);if(x&&!x.r)x.r=r}return}seen.add(k);out.push({p,r:r||''})};
  (prefs.recents||[]).forEach(n=>add(n));
  if(prefs.user&&prefs.user.nom)add(prefs.user.nom);
  let rows=null;
  try{const r=await SB.rpc('prenoms_poste');if(!r.error&&Array.isArray(r.data))rows=r.data.map(x=>({n:x.prenom,r:x.role}))}catch(e){}
  if(!rows&&isAdmin()){try{const r=await SB.from('autorisations').select('nom,email,role,actif').eq('actif',true);if(!r.error&&r.data)rows=r.data.map(x=>({n:x.nom||x.email,r:x.role}))}catch(e){}}
  if(ME)add(ME.nom||ME.email,ME.role);
  (rows||[]).filter(x=>x.r!=='lecture').sort((a,b)=>String(a.n).localeCompare(String(b.n),'fr')).forEach(x=>add(x.n,x.r));
  return out;
}
// prénom attribué au compte (liste des accès) : seul choix possible pour un compte qui n'est pas admin
const gAssigned=()=>gPrenom((ME&&(ME.nom||ME.email))||'');
function gatePeople(list){
  const box=document.getElementById('g2-people');if(!box)return;
  const libre=isAdmin();const mine=gAssigned();
  if(!libre&&mine&&!list.some(x=>x.p.toLowerCase()===mine.toLowerCase()))list=[{p:mine,r:ME.role},...list];
  if(!libre&&mine){const i=document.getElementById('g-nom');if(i)i.value=mine}
  const cur=(document.getElementById('g-nom')||{}).value||'';
  const card=x=>{const off=!libre&&x.p.toLowerCase()!==mine.toLowerCase();return `<button type="button" class="g2-person" data-gp="${esc(x.p)}" data-gr="${esc(ROLE_UI[x.r]||'')}" aria-pressed="${x.p.toLowerCase()===cur.toLowerCase()}" ${off?'disabled title="Vous vous connectez avec votre prénom attribué"':''}><i class="g2-av">${esc(gInit(x.p))}</i><b>${esc(x.p)}</b>${x.r?`<small>${esc(ROLE_NOM[x.r]||x.r)}</small>`:''}</button>`};
  const GR=[['admin','Admin'],['centraliste','Centralistes'],['commercial','Commerciaux'],['labo','Tech labo'],['','Sur cet appareil']];
  box.innerHTML=GR.map(([k,l])=>{const g=list.filter(x=>(x.r||'')===k||(k===''&&x.r&&!GR.some(z=>z[0]===x.r)));return g.length?`<div class="g2-org"><span class="g2-org-l">${l}</span><div class="g2-org-p">${g.map(card).join('')}</div></div>`:''}).join('')
    +(libre?`<div class="g2-org"><span class="g2-org-l">&nbsp;</span><div class="g2-org-p"><button type="button" class="g2-person" data-gp="" aria-pressed="false"><i class="g2-av">+</i><b>Autre</b><small>Prénom libre</small></button></div></div>`:'');
  box.querySelectorAll('.g2-person:not([disabled])').forEach(b=>b.onclick=()=>{
    box.querySelectorAll('.g2-person').forEach(x=>x.setAttribute('aria-pressed',x===b));
    const inp=document.getElementById('g-nom'),oth=document.getElementById('g2-other');
    if(b.dataset.gp){inp.value=b.dataset.gp;oth.hidden=true;const r=b.dataset.gr&&document.querySelector(`#gate input[name="g-role"][value="${b.dataset.gr}"]`);if(r)r.checked=true;document.getElementById('g-err').textContent=''}
    else{inp.value='';oth.hidden=false;inp.focus()}
  });
}
function showGate(){
  const g=document.getElementById('gate');g.classList.remove('g2-leaving');
  if(!ME||!ME.actif){
    const refus=!!ME;const off=!navigator.onLine;
    g.innerHTML=`<div class="g2">${gSideBrand()}<main class="g2-main"><form id="gateform" class="g2-card" autocomplete="off" data-step="${refus?'refus':'login'}">
      <span class="g2-lbl"><i class="g2-led"></i>// Connexion</span>
      <h2>Ouvrir le planning</h2>
      ${refus?`<div class="g2-state" role="alert"><b>Ce compte n'est pas autorisé</b><span class="mono">${esc(ME.email)}</span> n'est pas dans la liste des accès de la centrale. Demandez à l'administrateur de l'ajouter, puis reconnectez-vous.</div>
        <button class="g2-gbtn" type="submit">${G_SVG}<span>Changer de compte Google</span><i class="g2-prog"></i></button>`
      :`<p class="g2-intro">Connectez-vous avec votre compte Google. Seules les adresses autorisées par la centrale ont accès au planning.</p>
        <button class="g2-gbtn" type="submit" id="g2-gbtn">${G_SVG}<span id="g2-glabel">Se connecter avec Google</span><i class="g2-prog"></i></button>
        <p class="g2-hint">Période de test : utilisez l'adresse ajoutée par l'administrateur.</p>
        ${off?`<div class="g2-state off" role="status"><b>Pas de réseau</b>La connexion sera possible dès le retour du réseau.</div>`:''}`}
      <p class="err" id="g-err" role="alert">${prefs.accesMsg?esc(prefs.accesMsg):''}</p>
      <div class="g2-foot"><span>Données hébergées en Europe</span><span>Planning ${esc(String(CENTRALE||''))}</span></div>
    </form></main></div>`;
    g.hidden=false;gStartClock();
    const gb=document.getElementById('g2-gbtn');if(gb)gb.addEventListener('click',()=>{gb.classList.add('busy');const l=document.getElementById('g2-glabel');if(l)l.textContent='Ouverture de Google…'});
    return;
  }
  if(prefs.accesMsg){delete prefs.accesMsg;savePrefs()}
  const u=prefs.user||{};
  const nom0=u.nom||gPrenom(ME.nom||ME.email)||'';
  const adm=isAdmin(),monR=ROLE_UI[ME.role]||'commercial',lect=ME.role==='lecture';
  const roleUI=lect?`<p class="g2-small">Accès en <b>consultation</b> : vous voyez le planning sans pouvoir le modifier.</p>`:`<div class="g2-field"><span class="g2-flbl">${adm?'Ouvrir en tant que (admin)':'Votre rôle'}</span><div class="g2-roles ${adm?'':'fixe'}" role="radiogroup">${Object.entries(ROLES).map(([k,l])=>`<label ${!adm&&k!==monR?'class="off" title="Rôle attribué par l\'administrateur"':''}><input type="radio" name="g-role" value="${k}" ${(adm?(u.role||'centraliste'):monR)===k?'checked':''} ${adm?'':'disabled'}><span>${l}</span></label>`).join('')}</div></div>`;
  g.innerHTML=`<div class="g2">${gSideDay()}<main class="g2-main"><form id="gateform" class="g2-card" autocomplete="off" data-step="nom">
    <div class="g2-acct"><i class="g2-av">${esc(gInit(ME.nom||ME.email))}</i><span>${esc(ME.email)} · ${esc(ROLE_NOM[ME.role]||'')}</span></div>
    <span class="g2-lbl"><i class="g2-led"></i>// Prise de poste</span>
    <h2>Bonjour ${esc(gAssigned()||'')}&nbsp;!</h2>
    <input type="hidden" id="g-nom" value="${esc(gAssigned()||nom0)}">
    ${lect?'':`<div class="g2-field"><span class="g2-flbl">Vous</span><div class="g2-org-p"><span class="g2-person g2-self" aria-pressed="true"><i class="g2-av">${esc(gInit(gAssigned()||nom0))}</i><b>${esc(gAssigned()||nom0)}</b><small>${esc(ROLE_NOM[ME.role]||ME.role)}</small></span></div></div>
    <div class="g2-field"><span class="g2-flbl">Connectés en ce moment</span><div class="g2-people" id="g2-people" aria-live="polite"></div></div>`}
    ${roleUI}
    <p class="err" id="g-err" role="alert"></p>
    <button class="g2-go" type="submit"><span><i class="g2-led"></i>Ouvrir le planning →</span><kbd>Entrée</kbd></button>
    <p class="g2-small">Votre prénom apparaît auprès des autres et dans le journal à chaque modification.</p>
    <button class="g2-out" type="button" onclick="supaLogout()">Pas vous ? Se déconnecter</button>
  </form></main></div>`;
  g.hidden=false;gStartClock();gateDay();
  const fill=list=>{gNoms=list;gatePeople(list);if(!list.length){document.getElementById('g2-other').hidden=false}};
  if(prefs.recents){delete prefs.recents;savePrefs()}   // anciens prénoms libres : effacés
  gateOnline();
}
function gateSubmit(f){
  const step=f.dataset.step;
  if(step==='login')return supaLogin();
  if(step==='refus')return supaLogout();
  const nom=(gAssigned()||f.querySelector('#g-nom').value).trim();if(!nom){f.querySelector('#g-err').textContent='Choisissez votre prénom.';return}
  const r=f.querySelector('input[name="g-role"]:checked');
  prefs.user={nom:nom.slice(0,24),role:isAdmin()&&r?r.value:(ROLE_UI[ME.role]||'commercial')};prefs.gate=TODAY;prefs.email=ME.email;
  savePrefs();
  const g=document.getElementById('gate');
  const done=()=>{g.hidden=true;g.classList.remove('g2-leaving');clearInterval(gClockT)};
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)done();else{g.classList.add('g2-leaving');setTimeout(done,280)}
  if(room)room.presence({nom:prefs.user.nom,role:prefs.user.role,edit:null}).catch(()=>{});
  render(true);
}

/* =====================================================================
   Données partagées (db), copie sur l'appareil et hors ligne
   ===================================================================== */
const LS_MIRROR='planning-bocca-mirror-v1',LS_PEND='planning-bocca-pending-v1';
let DB=null;const synced={};const inflight={};const ready={o:false,d:false,r:false};
let pending=lsGet(LS_PEND)||{};             // chemin -> {body,j}  (body null = suppression)
const sync={online:true,last:null,cache:false,err:''};
const REF_KEYS=['clients','chantiers','formules','demandes','convocs','plaquesX','adjuvants','liens','config','formcat'];
// catalogue des formules : document à part (le commercial peut le modifier) ; repris de config.formCat s'il n'existe pas encore
const fxCat=()=>S.formcat||(S.config&&S.config.formCat)||null;
function docsOf(){const m={};S.orders.forEach(o=>m['orders/'+o.id]=o);(S.chat||[]).forEach(c=>m['chat/'+c.id]=c);Object.keys(S.days).forEach(k=>m['days/'+k]=S.days[k]);REF_KEYS.forEach(k=>{if(k==='formcat'&&S[k]==null)return;m['ref/'+k]={v:S[k]}});return m}
const known_=p=>pending[p]?pending[p].j:synced[p];
let mirrorT=null;
function saveMirror(){clearTimeout(mirrorT);mirrorT=setTimeout(()=>lsSet(LS_MIRROR,S),400)}
function summarize(a,b){
  if(!a)return 'nouvelle commande'+(b.kind==='aplacer'?' (à placer)':'');
  if(!b)return 'commande supprimée';
  const r=[];const ca=a.tours.filter(t=>t.s).length,cb=b.tours.filter(t=>t.s).length;
  if(b.tours.length>a.tours.length)r.push('tour ajouté');if(b.tours.length<a.tours.length)r.push('tour supprimé');
  if(cb>ca)r.push(`tour chargé (${cb}/${b.tours.length})`);if(cb<ca)r.push(`stabilo retiré (${cb}/${b.tours.length})`);
  const ta=total(a),tb=total(b);if(Math.abs(ta-tb)>0.01)r.push(`cubage ${fmt(ta)} → ${fmt(tb)} m³`);
  if(a.date!==b.date)r.push('déplacée au '+dayShort(b.date));if(a.h!==b.h)r.push(`heure ${hm(a.h)} → ${hm(b.h)}`);
  if(a.f!==b.f)r.push('formule : '+b.f);if((a.pompe&&a.pompe.resa)!==(b.pompe&&b.pompe.resa)&&b.pompe&&b.pompe.resa)r.push(b.pompe.resa==='ok'?'pompe réservée':'pompe à réserver');if(a.resa!==b.resa&&b.resa)r.push(b.resa==='ok'?'camions réservés':'camions à réserver');if(a.st!==b.st)r.push('statut : '+(b.st?STATUTS[b.st]:'automatique'));
  if(a.kind!==b.kind&&b.kind==='cmd')r.push('validée et placée au planning');if(!a.modv&&b.modv)r.push('modifiée par le commercial, à valider');if(a.modv&&!b.modv)r.push('modification validée');
  if((a.pompe&&a.pompe.bon)!==(b.pompe&&b.pompe.bon))r.push(b.pompe&&b.pompe.bon?'bon de pompe envoyé':'bon de pompe à refaire');
  if((a.pay&&a.pay.paye)!==(b.pay&&b.pay.paye))r.push(b.pay&&b.pay.paye?'paiement reçu':'paiement en attente');
  if(stable(a.pills)!==stable(b.pills))r.push('infos de la ligne');
  return r.join(', ')||'modifiée';
}
function logLine(o,txt,stamp){jAdd(o.date,stamp,`${cl(o.cl).n} · ${siteName(o)} : ${txt}`)}
function extValides(){(S&&S.orders||[]).forEach(o=>(o.tours||[]).forEach(t=>{if(t.c&&!t.s)t.s=1}))}
function commit(){
  if(ME&&ME.role==='lecture'&&MODE==='shared'){const m=docsOf();if(Object.keys(m).some(p=>known_(p)&&known_(p)!==stable(m[p]))){toast('Lecture seule : modification impossible');forceSync(true)}return}
  extValides();
  const now=new Date();const stamp=`${pad(now.getHours())}:${pad(now.getMinutes())}`;
  // journal : chaque changement de commande est tracé dans la journée concernée
  // on ne regarde en détail que les commandes qui ont réellement changé
  const J={};
  {const cur={};S.orders.forEach(o=>{const p='orders/'+o.id;cur[p]=o;J[p]=stable(o)});
   const strip=x=>{const y=clone(x);delete y.maj;return stable(y)};
   Object.keys(cur).forEach(p=>{const k=known_(p);if(k===J[p])return;if(k&&strip(JSON.parse(k))===strip(cur[p]))return;const prev=k?JSON.parse(k):null;logLine(cur[p],summarize(prev,cur[p]),stamp);delete J[p]});
   Object.keys(synced).concat(Object.keys(pending)).forEach(p=>{if(p.startsWith('orders/')&&!cur[p]){const k=known_(p);if(k){const prev=JSON.parse(k);logLine(prev,'commande supprimée',stamp)}}})}
  if(MODE!=='shared')return;
  const m=docsOf();const from=DB&&DB.from?DB.from():'';
  Object.keys(m).forEach(p=>{
    if(!IMPORTING&&p.startsWith('days/')&&from&&p.slice(5)<from&&!known_(p))return;   // journée ancienne non chargée : on n'y touche pas
    let j=J[p]||stable(m[p]);if(known_(p)===j)return;
    if(p.startsWith('orders/')){m[p].maj={by:author(),at:TODAY+' '+stamp};j=stable(m[p])}
    const old=pending[p];   // version de départ : celle sur laquelle la modification a été faite
    pending[p]={body:clone(m[p]),j,base:old?old.base:(synced[p]||null),ver:old?old.ver:(DB&&DB.ver?DB.ver(p):null)};
  });
  Object.keys(synced).concat(Object.keys(pending)).forEach(p=>{if((p.startsWith('orders/')||p.startsWith('chat/'))&&!m[p]&&!(pending[p]&&pending[p].body===null))pending[p]={body:null,j:null}});
  lsSet(LS_PEND,pending);saveMirror();flush();
}
function withTimeout(pr,ms){return Promise.race([pr,new Promise((_,rej)=>setTimeout(()=>rej({code:'timeout'}),ms))])}
/* Enregistrements simultanés : la base refuse un document modifié par quelqu'un d'autre depuis
   la version connue (fonction doc_set). La page relit alors la version de la base, fusionne les deux
   modifications et renvoie. Aucune modification n'est perdue sans prévenir. */
const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function merge3(b,m,t){
  const sm=stable(m),st=stable(t);if(sm===st)return t;
  const sb=b===undefined?undefined:stable(b);
  if(sm===sb)return t;if(st===sb)return m;
  if(isObj(m)&&isObj(t)){const o={},B=isObj(b)?b:{};
    new Set([...Object.keys(t),...Object.keys(m)]).forEach(k=>{
      const inM=k in m,inT=k in t,inB=k in B;
      if(inM&&inT)o[k]=merge3(inB?B[k]:undefined,m[k],t[k]);
      else if(inM){if(!inB||stable(m[k])!==stable(B[k]))o[k]=m[k]}       // supprimé par l'autre : gardé seulement si je l'ai modifié
      else if(!inB||stable(t[k])!==stable(B[k]))o[k]=t[k]});            // supprimé par moi : idem
    return o}
  if(Array.isArray(m)&&Array.isArray(t))return mergeArr(Array.isArray(b)?b:[],m,t);
  return m;   // même valeur modifiée des deux côtés : la mienne
}
function mergeArr(b,m,t){
  const ids=a=>a.every(x=>isObj(x)&&x.id!=null);
  if(ids(m)&&ids(t)&&ids(b)){const B=new Map(b.map(x=>[x.id,x])),T=new Map(t.map(x=>[x.id,x])),M=new Set(m.map(x=>x.id));const out=[];
    m.forEach(x=>{if(T.has(x.id))out.push(merge3(B.get(x.id),x,T.get(x.id)));else if(!B.has(x.id)||stable(x)!==stable(B.get(x.id)))out.push(x)});
    t.forEach(x=>{if(!M.has(x.id)&&(!B.has(x.id)||stable(x)!==stable(B.get(x.id))))out.push(x)});
    return out}
  if(m.length===t.length&&b.length===m.length)return m.map((x,i)=>merge3(b[i],x,t[i]));   // ex. tours : même place
  // listes simples : ma liste, moins ce que l'autre a supprimé, plus ce qu'il a ajouté
  const cnt=a=>{const c=new Map();a.forEach(x=>{const y=stable(x);c.set(y,(c.get(y)||0)+1)});return c};
  const cb=cnt(b),ct=cnt(t),out=[];const dec=(c,y)=>{if((c.get(y)||0)>0){c.set(y,c.get(y)-1);return true}return false};
  m.forEach(x=>{const y=stable(x);if(dec(cb,y)){if(dec(ct,y))out.push(x)}else{dec(ct,y);out.push(x)}});
  t.forEach(x=>{const y=stable(x);if(dec(ct,y)&&!dec(cb,y))out.push(x)});
  return out;
}
async function sendDoc(path,P){
  let body=P.body,expected=P.ver||null,merged=false;
  for(let i=0;;i++){
    try{const ver=await DB.doc(path).set(body,expected);return {ver,body,merged}}
    catch(e){
      if(!e||e.code!=='conflict'||i>=3)throw e;
      const srv=await DB.doc(path).fetch();
      expected=srv?srv.ver:null;
      if(srv&&srv.data){const nb=merge3(P.base?JSON.parse(P.base):undefined,body,srv.data);merged=merged||stable(nb)!==stable(body);body=nb}
    }
  }
}
function applyDoc(path,b){const i=path.indexOf('/'),col=path.slice(0,i),id=path.slice(i+1);
  if(col==='orders'){S.orders=S.orders.filter(o=>o.id!==id);if(b)S.orders.push(clone(b))}
  else if(col==='chat'){S.chat=(S.chat||[]).filter(c=>c.id!==id);if(b)S.chat.push(clone(b))}
  else if(col==='days'){if(b)S.days[id]=clone(b)}
  else if(col==='ref'&&b)S[id]=clone(b.v)}
function flush(){
  if(!DB)return;
  Object.keys(pending).forEach(path=>{
    if(inflight[path])return;
    const P=pending[path];const {body,j}=P;inflight[path]=true;renderSync();
    const ref=DB.doc(path),jr=path.startsWith('journal/');
    const run=body===null?ref.delete():jr?ref.add(body):sendDoc(path,P);
    withTimeout(run,15000).then(res=>{
      sync.online=true;sync.err='';sync.last=new Date();
      if(jr){delete pending[path];return}
      if(body===null){if(pending[path]===P)delete pending[path];delete synced[path];return}
      const sent=res.body,sj=stable(sent);synced[path]=sj;
      const cur=pending[path];
      if(cur===P||(cur&&cur.j===j))delete pending[path];
      else if(cur&&cur.body){   // modifiée encore pendant l'envoi : on repart de ce qui vient d'être enregistré
        if(res.merged){cur.body=merge3(body,cur.body,sent);cur.j=stable(cur.body)}
        cur.base=sj;cur.ver=res.ver}
      if(res.merged){applyDoc(path,pending[path]?pending[path].body:sent);saveMirror();render();toast('Modification fusionnée avec celle d\'un collègue')}
    }).catch(err=>{
      const c=err&&err.code;
      if(c==='closed'){delete pending[path];toast(String(err.message||'Journée clôturée : seul le centraliste peut la modifier'));clearTimeout(flush.t);flush.t=setTimeout(()=>forceSync(true),300)}
      else if(c==='locked'){delete pending[path];const who=String(err.message||'').replace(/^.*verrouillée par\s*/i,'')||'Un collègue';toast(`${who} modifie cette commande : votre changement n'a pas été enregistré`);clearTimeout(flush.t);flush.t=setTimeout(()=>forceSync(true),300)}
      else if(c==='not_granted'||c==='permission_denied'){delete pending[path];if(ME&&ME.role==='lecture')sync.err='Lecture seule : ce compte ne peut pas modifier le planning.';else{toast('Action refusée : réservée au centraliste');clearTimeout(flush.t);flush.t=setTimeout(()=>forceSync(true),300)}}
      else sync.online=false;
    }).finally(()=>{delete inflight[path];lsSet(LS_PEND,pending);renderSync();if(pending[path]&&pending[path]!==P&&sync.online)flush()});
  });
}
function overlayPending(){
  extValides();
  Object.keys(pending).forEach(p=>{const [col,id]=p.split('/');const b=pending[p].body;
    if(col==='orders'){S.orders=S.orders.filter(o=>o.id!==id);if(b)S.orders.push(clone(b))}
    else if(col==='chat'){S.chat=(S.chat||[]).filter(c=>c.id!==id);if(b)S.chat.push(clone(b))}
    else if(col==='days'){if(b)S.days[id]=clone(b)}
    else if(col==='ref'&&b)S[id]=clone(b.v)});
}
function applySnap(){overlayPending();saveMirror();if(ready.o&&ready.d&&ready.r)render();else renderSync()}
function startShared(db){
  DB=db;MODE='shared';
  const mir=lsGet(LS_MIRROR);
  S=mir&&mir.orders?mir:{chat:[],orders:[],days:{},clients:[],chantiers:[],formules:[],demandes:[],convocs:{},plaquesX:[],adjuvants:{},liens:[]};
  if(mir&&mir.orders){sync.cache=true;ready.o=ready.d=ready.r=true;render()}
  const timer=setTimeout(()=>{if(!sync.last){sync.online=false;renderSync();if(!(mir&&mir.orders))document.getElementById('main').innerHTML='<p class="empty">Le serveur ne répond pas et aucune copie n\'est enregistrée sur cet appareil. La page se mettra à jour seule dès que la connexion revient.</p>'}},10000);
  const fresh=s=>{if(!s.metadata.fromCache){sync.cache=false;sync.online=true;sync.last=new Date();clearTimeout(timer)}};
  db.collection('orders').onSnapshot(s=>{if(s.metadata.fromCache&&s.empty&&mir&&mir.orders)return;S.orders=s.docs.map(d=>{const x=clone(d.data());x.id=d.id;return x});
      S.orders.forEach(o=>{synced['orders/'+o.id]=stable(o)});ready.o=true;fresh(s);applySnap()},()=>{sync.online=false;renderSync()});
  db.collection('days').onSnapshot(s=>{if(s.metadata.fromCache&&s.empty&&mir&&mir.orders)return;S.days={};s.docs.forEach(d=>{S.days[d.id]=clone(d.data());synced['days/'+d.id]=stable(S.days[d.id])});ready.d=true;fresh(s);applySnap()},()=>{sync.online=false;renderSync()});
  db.collection('ref').onSnapshot(s=>{if(s.metadata.fromCache&&s.empty&&mir&&mir.orders)return;s.docs.forEach(d=>{const b=d.data();if(REF_KEYS.includes(d.id)){S[d.id]=clone(b.v);synced['ref/'+d.id]=stable({v:b.v})}});ready.r=true;fresh(s);applySnap()},()=>{sync.online=false;renderSync()});
  db.collection('chat').onSnapshot(s=>{S.chat=s.docs.map(d=>{const x=clone(d.data());x.id=d.id;return x});S.chat.forEach(c=>{synced['chat/'+c.id]=stable(c)});fresh(s);applySnap()},()=>{});
  if(Object.keys(pending).length)flush();
  window.addEventListener('online',()=>{sync.online=true;flush();renderSync()});
  window.addEventListener('offline',()=>{sync.online=false;renderSync()});
  setInterval(()=>{if(Object.keys(pending).length)flush()},15000);
}

function syncHTML(){
  const n=Object.keys(pending).length;const t=sync.last?`${pad(sync.last.getHours())}:${pad(sync.last.getMinutes())}`:'';
  if(MODE==='local')return `<span class="sync s-local" title="Les données restent sur cet appareil">Démo locale</span>`;
  if(MODE!=='shared')return `<span class="sync s-wait">Connexion…</span>`;
  if(sync.err||(ME&&ME.role==='lecture'))return `<span class="sync s-local" title="Ce compte consulte le planning sans pouvoir le modifier">Lecture seule</span>`;
  if(!sync.online||(!navigator.onLine))return `<span class="sync s-bad" title="Vous pouvez continuer à remplir le planning : tout est gardé sur cet appareil et sera envoyé au retour de la connexion.">Hors ligne${n?` · ${n} modif. en attente`:''}</span>`;
  if(n)return `<span class="sync s-wait" title="Envoi des modifications">Envoi… ${n}</span>`;
  if(sync.cache)return `<span class="sync s-wait" title="Copie de cet appareil, en attente du serveur">Copie locale</span>`;
  return `<span class="sync s-ok" title="Tout est enregistré et partagé">Synchronisé${t?' · '+t:''}</span>`;
}
function syncDetail(){
  const n=Object.keys(pending).length;const t=d=>d?`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`:'—';
  const etat=MODE==='local'?'Démo locale : les données restent sur cet appareil':MODE!=='shared'?'Connexion en cours…':sync.err?sync.err:(!sync.online||!navigator.onLine)?'Hors ligne : vous pouvez continuer, tout sera envoyé au retour du réseau':n?'Envoi des modifications en cours':sync.cache?'Copie de cet appareil, en attente du serveur':'En ligne et synchronisé';
  return `<div class="sd"><span class="lbl">État</span><span>${syncHTML()} ${esc(etat)}</span></div>
    <div class="sd"><span class="lbl">Dernière synchro</span><span class="mono">${t(sync.last)}</span></div>
    <div class="sd"><span class="lbl">En attente</span><span class="mono">${n} modification${n>1?'s':''}</span></div>
    <div class="sd"><span class="lbl">Réseau</span><span>${navigator.onLine?'connecté':'pas de réseau'}</span></div>
    <div class="sd"><span class="lbl">Copie locale</span><span>${MODE==='shared'?'oui, sur cet appareil':'—'}</span></div>`;
}
async function forceSync(quiet){
  if(MODE!=='shared'||!DB)return;
  if(!quiet)toast('Synchronisation…');flush();
  try{
    const [o,d,r]=await Promise.all(['orders','days','ref'].map(c=>withTimeout(DB.collection(c).get(),12000)));
    S.orders=o.docs.map(x=>{const v=clone(x.data());v.id=x.id;synced['orders/'+x.id]=stable(v);return v});
    S.days={};d.docs.forEach(x=>{S.days[x.id]=clone(x.data());synced['days/'+x.id]=stable(S.days[x.id])});
    r.docs.forEach(x=>{const b=x.data();if(REF_KEYS.includes(x.id)){S[x.id]=clone(b.v);synced['ref/'+x.id]=stable({v:b.v})}});
    overlayPending();saveMirror();sync.online=true;sync.cache=false;sync.err='';sync.last=new Date();render(true);if(!quiet)toast('Planning synchronisé')
  }catch(e){sync.online=false;renderSync();toast('Pas de connexion au serveur : les modifications restent sur cet appareil')}
}
function syncState(){const n=Object.keys(pending).length;if(MODE==='local')return 'local';if(MODE!=='shared')return 'wait';if(sync.err||!sync.online||!navigator.onLine)return 'bad';if(n||sync.cache)return 'wait';if((DB&&DB.live&&!DB.live())||(room&&room.live&&!room.live()))return 'wait';return 'ok'}
function renderSync(){const el=document.getElementById('sync');if(el)el.innerHTML=syncHTML();
  const me=document.getElementById('me');if(!me)return;const st=syncState();const u=prefs.user;
  me.className='me sy-'+st;me.textContent=u?u.nom.slice(0,2).toUpperCase():'?';
  const cut=MODE==='shared'&&((DB&&DB.live&&!DB.live())||(room&&room.live&&!room.live()));const lab={ok:'synchronisé en direct',bad:'pas synchronisé (hors ligne)',wait:cut?'direct interrompu, reconnexion en cours':'synchronisation en cours',local:'démo locale sur cet appareil'}[st];
  me.title=`${u?author():'Utilisateur'} · ${lab} · réglages`;me.setAttribute('aria-label',me.title)}

/* =====================================================================
   Export imprimable (A3 / A4 paysage) et sauvegarde
   ===================================================================== */
let DL=null;
function exportDays(kind,from,to){
  if(kind==='jour')return [view.date];
  if(kind==='semaine'){const m=mondayOf(view.date);return [0,1,2,3,4,5,6].map(i=>addDays(m,i)).filter((d,i)=>i<5||hasOrders(d))}
  if(kind==='avenir'){const ds=[...new Set(S.orders.filter(o=>o.kind!=='aplacer'&&o.date>=TODAY).map(o=>o.date))];if(!ds.includes(TODAY)&&!isWE(TODAY))ds.push(TODAY);return ds.sort()}
  const out=[];let d=from;for(let i=0;i<62&&d<=to;i++){if(!isWE(d)||hasOrders(d))out.push(d);d=addDays(d,1)}return out;
}
function printHTML(days,fmtP){
  const big=fmtP==='A3';
  const css=`@page{size:${fmtP} landscape;margin:7mm}*{box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;font-size:${big?'10pt':'7.6pt'};color:#151515;margin:0}
  .pg{break-after:page;page-break-after:always}.pg:last-child{break-after:auto}
  .hd{display:flex;align-items:baseline;gap:4mm;border-bottom:.7mm solid #ff4d00;padding-bottom:1.2mm;margin-bottom:1.6mm}.hd b{font-size:${big?'17pt':'14pt'}}.hd span{font-size:${big?'10pt':'8.4pt'};color:#69695f;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:.25mm solid #b9b9b4;padding:.7mm 1.2mm;vertical-align:middle;text-align:left;overflow-wrap:anywhere}
  th{background:#e9e8e3;font-size:.8em;text-transform:uppercase}tbody{break-inside:avoid}
  tr.half td{background:#151515;color:#fff;font-weight:bold;font-size:.9em}td.h{font-weight:bold;vertical-align:top}td.b{font-weight:bold}td.inf{font-size:.88em}
  .tl{display:flex;flex-wrap:wrap;gap:.8mm;padding:.4mm 0}
  .bu{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-width:${big?'9.4mm':'7.2mm'};height:${big?'8.4mm':'6.4mm'};padding:0 .8mm;border:.3mm solid #6e6e69;border-radius:3.2mm;line-height:1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .bu b{font-size:${big?'8.6pt':'6.8pt'}}.bu i{font-style:normal;font-size:${big?'7.2pt':'5.6pt'}}
  .bu.on{background:#12a150;border-color:#12a150;color:#fff}.bu.ext{background:#7fa39c;border-color:#2f5d55;color:#fff}.bu.mv{background:#78a0e2;border-color:#2f6fd6;color:#fff}.bu.cp{border-style:dashed}.bu.plus{border:.3mm dashed #ff8a00;background:#fff0e0;color:#c46500}
  .foot{margin-top:1.5mm;font-size:6.5pt;color:#777}`;
  const bulles=o=>{const cap=capOf(o.cam,o.f);return `<div class="tl">${o.tours.map(u=>{const cp=u.v<cap-.01;const cls=u.s?(u.mv||u.rf?'mv':u.c?'ext':'on'):'';return `<span class="bu ${cls} ${cp&&!u.s?'cp':''}"><b>${fmt(u.v)}</b><i>${esc(u.c||u.p||'—')}</i></span>`}).join('')}${o.plus?'<span class="bu plus"><b>?</b><i>+1T</i></span>':''}</div>`};
  const pg=d=>{const t=totals(d),dt=D(d);const os=ordersOn(d).filter(o=>statut(o)!=='annulee');
    const am=os.filter(o=>mins(o.h)<720),pm=os.filter(o=>mins(o.h)>=720&&mins(o.h)<NUIT),nu=os.filter(o=>mins(o.h)>=NUIT),vv=nuitVeille(d);
    const sub=l=>`${fmt(l.reduce((a,o)=>a+total(o),0))} m³ · ${l.reduce((a,o)=>a+TR(o).length,0)} tours`;
    const rows=l=>l.map(o=>{const L=printLine(o,cl(o.cl),chan(o.ch));return `<tbody><tr><td class="h" rowspan="2">${esc(String(o.h||'').slice(0,5))}</td><td class="b">${esc(L.client).replace(/\n/g,'<br>')}</td><td class="b">${esc(L.m3)}</td><td>${esc(L.adr)}</td><td>${esc(L.formule)}</td><td>${esc(L.cam)}</td><td>${esc(L.pompe)}</td><td class="inf">${esc(L.infos)}</td></tr><tr><td colspan="7">${bulles(o)}</td></tr></tbody>`}).join('');
    return `<section class="pg"><div class="hd"><b>${esc(`${JOURS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MOIS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`)}</b><span>SEMAINE ${isoWeek(d)}  ·  ${esc(CENTRALE.toUpperCase())}  ·  ${fmt(t.m3)} m³  ·  ${t.n} TOURS${t.k?'  ·  '+t.k+' CAMIONS':''}</span></div>
    <table><colgroup><col style="width:4.8%"><col style="width:13%"><col style="width:7%"><col style="width:19%"><col style="width:12.5%"><col style="width:7.5%"><col style="width:12%"><col></colgroup>
    <thead><tr><th>Heure</th><th>Client</th><th>m³</th><th>Adresse</th><th>Formule</th><th>Camion</th><th>Pompe / réservé</th><th>Infos</th></tr></thead>
    ${vv.length?`<tbody><tr class="half"><td colspan="8">NUIT PRÉCÉDENTE (DEPUIS LA VEILLE AU SOIR) · ${sub(vv)}</td></tr></tbody>${rows(vv)}`:''}
    <tbody><tr class="half"><td colspan="8">MATIN · ${sub(am)}</td></tr></tbody>${rows(am)||'<tbody><tr><td colspan="8">Aucune commande le matin</td></tr></tbody>'}
    <tbody><tr class="half"><td colspan="8">APRÈS-MIDI · ${sub(pm)}</td></tr></tbody>${rows(pm)||'<tbody><tr><td colspan="8">Aucune commande l\'après-midi</td></tr></tbody>'}${nu.length?`<tbody><tr class="half"><td colspan="8">NUIT · SE POURSUIT LE LENDEMAIN MATIN · ${sub(nu)}</td></tr></tbody>${rows(nu)}`:''}</table>
    <p class="foot">Bulle : cubage en haut, plaque en bas · vert = chargé · contour = prévu (pointillé = complément) · gris-vert = autre centrale · orange = 1 tour à confirmer · imprimé le ${esc(dayLong(TODAY))}</p></section>`};
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Planning ${CENTRALE} ${days[0]||''}</title><style>${css}</style></head><body>${days.map(pg).join('')}</body></html>`;
}

// une ligne d'impression : client | m³ | adresse | formule | camion | pompe / réservé | infos
function printLine(o,c,ch){const sap=sapOf(o);
  return {client:c.n+(o.spec?' · SPÉCIALE':'')+(o.kind==='pour'?'\nTour pour '+o.pour:''),
    m3:`${fmt(livre(o))}/${fmt(total(o))}${o.plus?' +':''}`,
    adr:ch?[ch.nom,ch.adr].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' — ')+(ch.ot?' (OT)':''):'',
    formule:o.f,
    cam:(o.cam||CFG().camions[0].t)+(o.cam&&o.resa?(o.resa==='ok'?' · réservé':' · À RÉSERVER'):''),
    pompe:o.pompe?pompeLabel(o.pompe)+(o.pompe.resa==='todo'?' · À RÉSERVER':o.pompe.resa==='ok'?' · réservée':'')+(o.pompe.bon?'':' · bon à faire'):'—',
    infos:[o.tel?'Tél. '+o.tel:'',o.pay?(o.pay.paye?'Payé':'ATTENTE PAIEMENT'):'',o.plus?'+1 tour à confirmer':'',o.am?"Déborde l'après-midi":'',o.ouv?o.ouv:'',sap?'SAP '+sap:''].concat(o.pills.map(p=>(p.on?'[x] ':'')+p.t)).filter(Boolean).join(' · ')};
}
let PDFLIB=null;
function loadPdf(){if(PDFLIB)return PDFLIB;
  const add=src=>new Promise((ok,ko)=>{const el=document.createElement('script');el.src=src;el.onload=ok;el.onerror=ko;document.head.appendChild(el)});
  PDFLIB=(window.jspdf?Promise.resolve():add('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js')).then(()=>window.jspdf.jsPDF.API.autoTable?null:add('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js')).then(()=>window.jspdf.jsPDF).catch(e=>{PDFLIB=null;throw e});
  return PDFLIB}
const pdfT=t=>String(t==null?'':t).replace(/m³/g,'m3').replace(/→/g,'->').replace(/[✓✔]/g,'x').replace(/[‘’]/g,"'").replace(/[«»]/g,'"').replace(/[^\x00-\xFF€œŒ–—…·³]/g,'');
async function planningPDF(days,fm){
  // Une journée = une page qui se remplit au mieux ; journée très chargée = 2 pages (matin, après-midi).
  const J=await loadPdf();const opt={orientation:'landscape',unit:'mm',format:fm.toLowerCase()};
  const doc=new J(opt);const big=fm==='A3';let first=true;
  const KS=[1,.95,.9,.85,.8,.75,.7];
  const fits=(d,k,part)=>{const t=new J(opt);dayPage(t,d,k,part,big,null);return t.getNumberOfPages()===1};
  const best=(d,part)=>{for(const k of KS)if(fits(d,k,part))return k;return null};
  const SPLIT_UNDER=.8;  // en dessous, on passe à 2 pages pour rester lisible
  days.forEach(d=>{
    const os=ordersOn(d).filter(o=>statut(o)!=='annulee');
    const hasAm=os.some(o=>mins(o.h)<720),hasPm=os.some(o=>mins(o.h)>=720);
    const k=best(d,null);
    const parts=(k!=null&&k>=SPLIT_UNDER)||!(hasAm&&hasPm)?[[null,k==null?KS[KS.length-1]:k]]:[['am',best(d,'am')||KS[KS.length-1]],['pm',best(d,'pm')||KS[KS.length-1]]];
    parts.forEach(([part,kk])=>{if(!first)doc.addPage();first=false;dayPage(doc,d,kk,part,big,parts.length)});
  });
  const n=doc.getNumberOfPages(),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(big?7:5.8);doc.setTextColor(120);
    doc.text(pdfT('Bulle : cubage en haut, plaque en bas  ·  vert = chargé  ·  contour = prévu (pointillé = complément)  ·  gris-vert = autre centrale  ·  orange = 1 tour à confirmer  ·  imprimé le '+dayLong(TODAY)),7,H-3);
    doc.text(pdfT(`${CENTRALE} · page ${i}/${n}`),W-7,H-3,{align:'right'})}
  return doc.output('arraybuffer');
}
function dayPage(doc,d,k,part,big,nParts){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=7,fs=(big?9.4:6.9)*k;
  const GREEN=[18,161,80],OR=[255,77,0],INK=[21,21,21],MUTE=[105,105,100];
  const t=totals(d),dt=D(d);
  // en-tête sur une seule ligne : date en gras + infos
  const hs=big?17:14;doc.setTextColor(...INK);doc.setFont('helvetica','bold');doc.setFontSize(hs);
  const dTxt=pdfT(`${JOURS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MOIS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`);
  doc.text(dTxt,M,M+4.6);const dw=doc.getTextWidth(dTxt);
  doc.setFont('helvetica','normal');doc.setFontSize(big?10:8.4);doc.setTextColor(...MUTE);
  const partLbl=part?`  ·  ${part==='am'?'MATIN':'APRÈS-MIDI'} (${part==='am'?1:2}/2)`:'';
  doc.text(pdfT(`SEMAINE ${isoWeek(d)}  ·  ${CENTRALE.toUpperCase()}  ·  ${fmt(t.m3)} m³  ·  ${t.n} TOURS${t.k?'  ·  '+t.k+' CAMIONS':''}${partLbl}`),M+dw+4,M+4.6);
  doc.setDrawColor(...OR);doc.setLineWidth(.7);doc.line(M,M+6.6,W-M,M+6.6);
  // tableau, comme la vue détaillée : ligne principale, puis tours + détails
  const os=ordersOn(d).filter(o=>statut(o)!=='annulee');
  const head=[['Heure','Client','m³','Adresse','Formule','Camion','Pompe / réservé','Infos'].map(pdfT)];
  const body=[],meta=[];
  const sec=l=>{body.push([{content:pdfT(l),colSpan:8,styles:{fillColor:INK,textColor:255,fontStyle:'bold',fontSize:fs*.88,cellPadding:{top:.8*k,bottom:.8*k,left:2,right:2}}}]);meta.push(null)};
  const row=o=>{const c=cl(o.cl),ch=chan(o.ch);const L=printLine(o,c,ch);
    body.push([{content:pdfT(String(o.h||'').slice(0,5)),rowSpan:2,styles:{fontStyle:'bold',valign:'top'}},
      pdfT(L.client),pdfT(L.m3),pdfT(L.adr),pdfT(L.formule),pdfT(L.cam),pdfT(L.pompe),{content:pdfT(L.infos),styles:{fontSize:fs*.86}}]);meta.push({o,ty:'main'});
    body.push([{content:'',colSpan:7,styles:{cellPadding:{top:.5*k,bottom:.5*k,left:1,right:1}}}]);meta.push({o,ty:'tours'})};
  const sub=l=>`${fmt(l.reduce((a,o)=>a+total(o),0))} m³ · ${l.reduce((a,o)=>a+TR(o).length,0)} tours`;
  const am=os.filter(o=>mins(o.h)<720),pm=os.filter(o=>mins(o.h)>=720&&mins(o.h)<NUIT),nu=os.filter(o=>mins(o.h)>=NUIT),vv=nuitVeille(d);
  if(part!=='pm'&&vv.length){sec('NUIT PRÉCÉDENTE (DEPUIS LA VEILLE AU SOIR)  ·  '+sub(vv));vv.forEach(row)}
  if(part!=='pm'){sec('MATIN  ·  '+sub(am));am.forEach(row);if(!am.length){body.push([{content:pdfT('Aucune commande le matin'),colSpan:8,styles:{textColor:MUTE}}]);meta.push(null)}}
  if(part!=='am'){sec('APRÈS-MIDI  ·  '+sub(pm));pm.forEach(row);if(!pm.length){body.push([{content:pdfT("Aucune commande l'après-midi"),colSpan:8,styles:{textColor:MUTE}}]);meta.push(null)}
    if(nu.length){sec('NUIT  ·  SE POURSUIT LE LENDEMAIN MATIN  ·  '+sub(nu));nu.forEach(row)}}
  const tw=W-2*M;const BW=(big?9.4:7.2)*k,BH=(big?8.4:6.4)*k,G=(big?1.1:.8)*k;
  const colW=[.048,.13,.07,.19,.125,.075,.12,.242].map(x=>x*tw);
  const per=w=>Math.max(1,Math.floor((w-2)/(BW+G)));
  doc.autoTable({head,body,startY:M+8.4,margin:{left:M,right:M,top:M,bottom:6},theme:'grid',rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:fs,cellPadding:{top:.6*k,bottom:.6*k,left:1.2,right:1.2},lineColor:[185,185,180],lineWidth:.15,textColor:INK,valign:'middle',overflow:'linebreak'},
    headStyles:{fillColor:[233,232,227],textColor:INK,fontStyle:'bold',fontSize:Math.max(5.6,fs*.8),cellPadding:{top:.7,bottom:.7,left:1.2,right:1.2}},
    columnStyles:Object.fromEntries(colW.map((w,i)=>[i,{cellWidth:w}])),
    didParseCell:x=>{if(x.section!=='body')return;const m=meta[x.row.index];if(!m)return;
      if(m.ty==='main'&&(x.column.index===1||x.column.index===2))x.cell.styles.fontStyle='bold';
      if(m.ty==='tours'&&x.column.index===1){const n=TR(m.o).length+(m.o.plus?1:0);const w=colW.slice(1).reduce((a,b)=>a+b,0);x.cell.styles.minCellHeight=Math.ceil(Math.max(1,n)/per(w))*(BH+G)+.6}},
    didDrawCell:x=>{if(x.section!=='body')return;const m=meta[x.row.index];if(!m||m.ty!=='tours'||x.column.index!==1)return;
      const o=m.o,cap=capOf(o.cam,o.f),pp=per(x.cell.width);
      const at=i=>[x.cell.x+1+(i%pp)*(BW+G),x.cell.y+.6+Math.floor(i/pp)*(BH+G)];
      const bulle=(bx,by,top,bot,fill,line,txt,dash)=>{doc.setLineWidth(.25);if(dash)doc.setLineDashPattern([.6,.5],0);
        if(fill){doc.setFillColor(...fill);doc.setDrawColor(...line);doc.roundedRect(bx,by,BW,BH,BH*.42,BH*.42,'FD')}else{doc.setDrawColor(...line);doc.roundedRect(bx,by,BW,BH,BH*.42,BH*.42,'S')}
        doc.setLineDashPattern([],0);doc.setTextColor(...txt);
        doc.setFont('helvetica','bold');doc.setFontSize(Math.max(4,BH*1.05));doc.text(pdfT(top),bx+BW/2,by+BH*.44,{align:'center'});
        doc.setFont('helvetica','normal');let f2=Math.max(3.6,BH*.88);doc.setFontSize(f2);const tw2=doc.getTextWidth(pdfT(bot));if(tw2>BW-1)doc.setFontSize(f2*(BW-1)/tw2);doc.text(pdfT(bot),bx+BW/2,by+BH*.85,{align:'center'});
        doc.setTextColor(...INK);doc.setFont('helvetica','normal')};
      o.tours.forEach((u,i)=>{const [bx,by]=at(i);const cp=u.v<cap-.01;const B=u.mv||u.rf;
        const bot=u.c?u.c.slice(0,5):(u.p||'—');
        if(u.s)bulle(bx,by,fmt(u.v),bot,B?[120,160,226]:u.c?[127,163,156]:GREEN,B?[47,111,214]:u.c?[47,93,85]:GREEN,[255,255,255],false);
        else bulle(bx,by,fmt(u.v),bot,null,[110,110,105],[40,40,38],cp)});
      if(o.plus){const [bx,by]=at(o.tours.length);bulle(bx,by,'?','+1T',[255,240,224],[255,138,0],[196,101,0],true)}}});
}
async function convPDF(month,filled,fm){
  const J=await loadPdf();const big=fm==='A3';
  const pl=FLEET();const y=+month.slice(0,4),m=+month.slice(5,7);const nd=new Date(Date.UTC(y,m,0)).getUTCDate();const ds=[];for(let i=1;i<=nd;i++){const d=`${month}-${pad(i)}`;if(!isWE(d)||weOpen(d))ds.push(d)}
  const body=ds.map(d=>{const cv=S.convocs[d]||{};return [dayShort(d)].concat(pl.map(p=>{const x=cv[p.c];if(!filled||!x)return '';if(x.st==='abs')return 'ABSENT';return hm(x.h)+(x.dep&&x.dep!==CENTRALE?' '+x.dep:'')+(x.st==='pret'?'\nprêté -> '+x.pc+' ('+x.per+')':'')+(x.aff?'\n'+x.aff:'')})).concat([filled?((dayRO(d)||{}).convObs||''):''])}).map(r=>r.map(pdfT));
  const head=[['Jour'].concat(pl.map(p=>plDisp(p))).concat(['Observations'])].map(r=>r.map(pdfT));
  // Le mois tient toujours sur une seule page : on réduit le texte jusqu'à ce que tout tienne.
  let doc=null;
  for(let fs=big?11:8.5;fs>=4;fs-=.5){
    doc=new J({orientation:'landscape',unit:'mm',format:fm.toLowerCase()});const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=8;
    doc.setFont('helvetica','bold');doc.setFontSize(big?18:13);doc.text(pdfT(`Convocation · ${MOISL[m-1]} ${y} · ${CENTRALE}`),M,M+5);
    doc.setDrawColor(255,77,0);doc.setLineWidth(.7);doc.line(M,M+7.5,W-M,M+7.5);
    const top=M+10,avail=H-top-M,rowH=Math.max(4,(avail-1)/(ds.length+1)-.05);const dayW=big?24:17;const colW=(W-2*M-dayW)/(pl.length+1);
    const cs={0:{fontStyle:'bold',cellWidth:dayW}};for(let k=1;k<=pl.length+1;k++)cs[k]={cellWidth:colW};
    doc.autoTable({startY:top,margin:{left:M,right:M,top:M,bottom:M},theme:'grid',head,body,tableWidth:W-2*M,rowPageBreak:'avoid',
      styles:{fontSize:fs,cellPadding:Math.min(1.6,fs/6),lineColor:[180,180,175],lineWidth:.15,textColor:[21,21,21],minCellHeight:rowH,valign:'middle',overflow:'linebreak'},
      headStyles:{fillColor:[233,232,227],textColor:[21,21,21],fontStyle:'bold',minCellHeight:Math.min(rowH,9)},columnStyles:cs});
    if(doc.getNumberOfPages()===1)break;
  }
  return doc.output('arraybuffer');
}


async function savePDF(name,make){toast('Préparation du PDF…');try{const buf=await make();saveFile(name,new Blob([buf],{type:'application/pdf'}))}catch(e){toast('PDF impossible pour l\'instant (bibliothèque non chargée, vérifiez la connexion)')}}
function exportPop(anchor){
  const mon=mondayOf(view.date);
  openPop(anchor,`<div class="pop-h">Imprimer ou sauvegarder</div>
    <form data-pa="go">
      <label class="fl">Période<select id="ex-k"><option value="avenir">Aujourd'hui et tous les jours à venir déjà notés</option><option value="jour">Le jour affiché</option><option value="semaine">La semaine affichée</option><option value="plage">Choisir les dates</option></select></label>
      <div class="row2" id="ex-dates" hidden><label class="fl">Du<input type="date" id="ex-a" value="${esc(view.date)}"></label><label class="fl">Au<input type="date" id="ex-b" value="${esc(addDays(mon,4))}"></label></div>
      <div class="fl">Format (paysage)<div class="radios"><label><input type="radio" name="ex-f" value="A3" checked><span>A3</span></label><label><input type="radio" name="ex-f" value="A4"><span>A4</span></label></div></div>
      <button class="btn primary" type="submit">Télécharger le PDF</button>
      <p class="muted" style="margin:0;font-size:12.5px">Un fichier PDF, une page par jour, avec des lignes vides pour écrire à la main. Prêt à imprimer.</p>
    </form>
    <button class="pop-b" data-pa="html">Version page web (.html), sans PDF</button>
    <button class="pop-b" data-pa="json">Sauvegarde complète, tout l'historique (.json)</button>`,
  {go(f){const k=f.querySelector('#ex-k').value;const ds=exportDays(k,f.querySelector('#ex-a').value,f.querySelector('#ex-b').value);if(!ds.length){toast('Aucun jour dans cette période');return 'keep'}
      const fm=f.querySelector('input[name="ex-f"]:checked').value;savePDF(`planning-la-bocca-${ds[0]}${ds.length>1?'_'+ds[ds.length-1]:''}-${fm}.pdf`,()=>planningPDF(ds,fm))},
   html(){const f=popEl.querySelector('form');const k=f.querySelector('#ex-k').value;const ds=exportDays(k,f.querySelector('#ex-a').value,f.querySelector('#ex-b').value);if(!ds.length){toast('Aucun jour dans cette période');return 'keep'}const fm=f.querySelector('input[name="ex-f"]:checked').value;saveFile(`planning-la-bocca-${ds[0]}${ds.length>1?'_'+ds[ds.length-1]:''}-${fm}.html`,printHTML(ds,fm))},
   json(){sauvegardeComplete()}});
  const sel=popEl.querySelector('#ex-k'),dt=popEl.querySelector('#ex-dates');if(sel&&dt)sel.addEventListener('change',()=>{dt.hidden=sel.value!=='plage';placePop()});
}
function saveFile(name,data){
  const go=dl=>dl.save({filename:name,data}).then(()=>toast('Fichier prêt : '+name)).catch(e=>{if(e&&e.code==='cancelled')return;toast('Téléchargement impossible ici')});
  if(DL)return go(DL);
  const direct=()=>{try{const blob=data instanceof Blob?data:new Blob([data],{type:/\.pdf$/.test(name)?'application/pdf':'text/html'});const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Fichier prêt : '+name)}catch(e){toast('Téléchargement impossible ici')}};
  if(window.STANDALONE)return direct();
  const c=window.claude;if(c&&c.use)c.use('downloads').then(dl=>{if(!dl){toast('Téléchargement réservé aux personnes connectées à claude.ai. Utilisez la version autonome du planning.');return}DL=dl;go(dl)});else direct();
}

/* =====================================================================
   Connexion Google et données partagées (Supabase)
   La clé ci-dessous est la clé publique du projet : elle est faite pour
   être dans la page. Ce sont les règles de la base (rôles) qui protègent
   les données, pas cette clé.
   ===================================================================== */
const SUPA_URL='https://apedxvyezcitbphlzlfr.supabase.co';
const SUPA_KEY='sb_publishable_M5zlEKqHdyao-lh1lt0rDg_DbimP0TS';
let SB=null,ME=null;
const ROLE_UI={admin:'centraliste',centraliste:'centraliste',commercial:'commercial',labo:'labo',lecture:'commercial'};
const ROLE_NOM={admin:'Admin',centraliste:'Centraliste',commercial:'Commercial',labo:'Tech labo',lecture:'Lecture seule'};
const isAdmin=()=>!!(ME&&ME.actif&&ME.role==='admin');
/* Erreurs du planning : envoyées à Supabase (table erreurs, lisible par les admins). Aucune donnée de commande. */
const APP_V=(()=>{try{const sc=[...document.scripts].find(x=>/app\.js/.test(x.src));const m=sc&&/v=(\d+)/.exec(sc.src);return 'app '+(m?m[1]:'?')}catch(e){return 'app ?'}})();
const ERR_KEY='plb-erreurs';let errVues=new Set(),errNb=0;
function errQueue(){try{return JSON.parse(localStorage.getItem(ERR_KEY)||'[]')}catch(e){return []}}
function errSave(q){try{localStorage.setItem(ERR_KEY,JSON.stringify(q.slice(-20)))}catch(e){}}
function errNote(msg,src,pile){msg=String(msg||'').slice(0,300);if(!msg)return;
  if(/ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|The user aborted|Load failed$|Failed to fetch|NetworkError/i.test(msg))return;
  if(/^(chrome|moz|safari)-extension:/.test(src||''))return;
  if(errVues.has(msg)||errNb>=20)return;errVues.add(msg);errNb++;
  const e={msg,src:String(src||'').replace(location.origin,'').slice(0,200),pile:String(pile||'').replace(new RegExp(location.origin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),'').slice(0,1500),
    vue:(typeof view!=='undefined'&&view?view.tab+(view.mode?'/'+view.mode:''):'')+(document.getElementById('drawer')&&!document.getElementById('drawer').hidden?' · fenêtre':''),
    version:APP_V,appareil:(navigator.userAgent||'').slice(0,160),nom:(prefs&&prefs.user&&prefs.user.nom)||'',at:Date.now()};
  const q=errQueue();q.push(e);errSave(q);errFlush()}
let errEnvoi=false;
async function errFlush(){if(errEnvoi||!SB||!ME||!ME.actif||!navigator.onLine)return;const q=errQueue();if(!q.length)return;errEnvoi=true;
  try{for(const e of q){const r=await SB.rpc('erreur_log',{p:e});if(r.error)break;const rest=errQueue().filter(x=>!(x.at===e.at&&x.msg===e.msg));errSave(rest)}}catch(_){}
  errEnvoi=false}
window.addEventListener('error',ev=>{if(ev.target&&ev.target!==window&&ev.target.tagName)return;errNote(ev.error&&ev.error.message?(ev.error.name||'Error')+': '+ev.error.message:String(ev.message||'').replace(/^Uncaught /,''),ev.filename?ev.filename+':'+ev.lineno+':'+ev.colno:'',ev.error&&ev.error.stack)});
window.addEventListener('unhandledrejection',ev=>{const r=ev.reason;errNote(r&&r.message?(r.name||'Error')+': '+r.message:String(r),'',r&&r.stack)});
window.addEventListener('online',()=>errFlush());
/* État de la base Supabase (comptes admin) : scripts supabase/ pas encore exécutés → avertissement */
const BASE_V=16;let BASE_ETAT=null;const BASE_F={"01": "01_structure.sql", "02": "02_roles.sql", "03": "03_documents.sql", "04": "04_droits.sql", "05": "05_concurrence.sql", "06": "06_prenoms_poste.sql", "07": "07_catalogue_formules.sql", "08": "08_temps_reel_prive.sql", "09": "09_verrous.sql", "10": "10_notifications.sql", "11": "11_rappel_pompes.sql", "12": "12_journee_cloturee.sql", "13": "13_reglages_commercial.sql", "14": "14_etat_base.sql", "15": "15_erreurs.sql", "16": "16_labo.sql"};
async function baseCheck(){if(!isAdmin()||!SB)return;
  try{const r=await SB.rpc('etat_base');
    if(r.error){BASE_ETAT={manque:[String(BASE_V)],inconnu:true}}else if(r.data){BASE_ETAT={manque:(r.data.manque||[]).concat(r.data.version<BASE_V?[String(BASE_V)]:[])}}
  }catch(e){return}
  if(BASE_ETAT&&BASE_ETAT.manque.length)toast('Base Supabase pas à jour : script'+(BASE_ETAT.manque.length>1?'s ':' ')+BASE_ETAT.manque.join(', ')+' à exécuter (Administration → Accès)',8000);
  const b=document.getElementById('base-etat');if(b)b.outerHTML=baseHTML();
  try{const {count}=await SB.from('erreurs').select('id',{count:'exact',head:true}).gt('at',new Date(prefs.errVu||Date.now()-7*864e5).toISOString());
    if(count>0)setTimeout(()=>toast(count+' erreur'+(count>1?'s':'')+' du planning chez les utilisateurs : Administration → Erreurs',8000),BASE_ETAT&&BASE_ETAT.manque.length?8500:0)}catch(e){}}
function baseHTML(){const e=BASE_ETAT;
  if(!e)return `<p id="base-etat" class="base-etat muted">Base de données : vérification…</p>`;
  if(!e.manque.length)return `<p id="base-etat" class="base-etat ok" title="Tous les scripts supabase/ du dépôt GitHub (01 à ${BASE_V}) sont passés dans Supabase">✓ Base de données à jour (Supabase + GitHub)</p>`;
  return `<div id="base-etat" class="base-etat warn"><b>⚠ Base de données pas à jour.</b> À exécuter dans Supabase → SQL Editor, dans l'ordre : ${e.manque.map(n=>`<code>${esc(BASE_F[n]||n)}</code>`).join(', ')}${e.inconnu?' (puis rechargez : les scripts précédents seront vérifiés à leur tour)':''}. Chaque script se relance sans risque.</div>`}
function supaErr(e){const msg=(e&&e.message)||'';if(e&&e.code==='55P03')return {code:'locked',message:msg};if(e&&e.code==='PLB01')return {code:'closed',message:msg};const denied=(e&&e.code==='42501')||/row-level security|permission denied/i.test(msg);return {code:denied?'permission_denied':'unavailable',message:msg}}

// Même interface que la base précédente : collection(n).onSnapshot(cb) et doc(chemin).set()/delete()
function supaDb(sb){
  const cache={},subs={},ver={};let chan=null;   // ver : date de modification connue de chaque document (contrôle des enregistrements simultanés)
  const snap=name=>{const m=cache[name]||new Map();const docs=[...m.entries()].map(([id,d])=>({id,data:()=>d}));return {docs,empty:!docs.length,metadata:{fromCache:false}}};
  const emit=name=>(subs[name]||[]).forEach(s=>{try{s.cb(snap(name))}catch(e){console.error(e)}});
  // Période chargée : les 2 derniers mois et tout l'avenir. Les dates plus anciennes sont chargées à la demande.
  let FROM=addDays(realToday(),-62),lastLoad=0;
  const inWin=(name,id,d)=>name==='orders'?(d&&(d.kind==='aplacer'||String(d.date||'')>=FROM)):name==='days'?id>=FROM:true;
  async function page(build){const all=[];const step=1000;
    for(let from=0;;from+=step){const {data,error}=await build().order('id').range(from,from+step-1);if(error)throw error;all.push(...data);if(data.length<step)break}
    return all}
  const base=name=>sb.from('documents').select('id,data,modifie_le').eq('collection',name);
  const keep=(name,rows)=>{const m=new Map();rows.forEach(r=>{m.set(r.id,r.data);if(r.modifie_le)ver[name+'/'+r.id]=r.modifie_le});return m};
  async function fetchAll(name,from){
    if(name==='orders'&&from){const [a,b]=await Promise.all([page(()=>base(name).gte('data->>date',from)),page(()=>base(name).eq('data->>kind','aplacer'))]);return keep(name,a.concat(b))}
    if(name==='days'&&from)return keep(name,await page(()=>base(name).gte('id',from)));
    return keep(name,await page(()=>base(name)));
  }
  async function load(name){lastLoad=Date.now();cache[name]=await fetchAll(name,FROM);emit(name)}
  const fail=(name,e)=>(subs[name]||[]).forEach(s=>s.err&&s.err(supaErr(e)));
  function reloadAll(){Object.keys(subs).forEach(n=>load(n).catch(e=>fail(n,e)))}
  let live=false,retryT=null,tries=0;
  // jeton à jour pour le direct (après une mise en veille, le jeton a pu expirer)
  async function freshAuth(){try{const {data}=await sb.auth.getSession();if(data&&data.session&&sb.realtime&&sb.realtime.setAuth)sb.realtime.setAuth(data.session.access_token)}catch(e){}}
  function retry(){if(retryT)return;live=false;const ms=Math.min(30000,1500*Math.pow(2,tries++));retryT=setTimeout(async()=>{retryT=null;const old=chan;chan=null;try{if(old)await sb.removeChannel(old)}catch(e){}await freshAuth();ensureChan()},ms)}
  function ensureChan(){
    if(chan)return;
    const me=chan=sb.channel('documents-direct-'+Math.random().toString(36).slice(2,8),{config:{private:true}})
      .on('postgres_changes',{event:'*',schema:'public',table:'documents'},p=>{
        const r=p.eventType==='DELETE'?p.old:p.new;const name=r&&r.collection;if(!name||!subs[name])return;
        const m=cache[name]||(cache[name]=new Map());
        if(p.eventType==='DELETE'){m.delete(r.id);delete ver[name+'/'+r.id]}
        else{const k=name+'/'+r.id;if(r.modifie_le&&ver[k]&&Date.parse(r.modifie_le)<Date.parse(ver[k]))return;   // écho en retard d'une version déjà dépassée
          if(r.modifie_le)ver[k]=r.modifie_le;if(inWin(name,r.id,r.data))m.set(r.id,r.data);else m.delete(r.id)}
        emit(name);
      })
      .subscribe(st=>{
        if(chan!==me)return;   // ancien canal en cours de fermeture : on l'ignore (sinon boucle de reconnexion toutes les 2-3 s)
        if(st==='SUBSCRIBED'){live=true;tries=0;if(Date.now()-lastLoad>4000)reloadAll()}
        else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED')retry();
        if(typeof renderSync==='function')renderSync()});
  }
  // filet de sécurité : au retour sur l'onglet, au retour du réseau, et toutes les 20 s si le direct est coupé
  async function wake(force){await freshAuth();const joined=chan&&chan.state==='joined';if(!joined){live=false;retry()}if(force||!joined||Date.now()-lastLoad>60000)reloadAll()}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wake(true)});
  window.addEventListener('online',()=>wake(true));window.addEventListener('focus',()=>wake(false));
  setInterval(()=>{if(document.visibilityState!=='visible')return;const joined=chan&&chan.state==='joined';if(!joined){live=false;wake(true)}else if(Date.now()-lastLoad>90000)reloadAll()},20000);
  return {
    live:()=>live&&!!chan&&chan.state==='joined',
    from:()=>FROM,
    async extend(d){if(d>=FROM)return;FROM=d;await Promise.all(['orders','days'].filter(n=>subs[n]).map(n=>load(n)))},
    ver:path=>ver[path]||null,
    async everything(){const out={};for(const n of ['orders','days','ref','chat','journal'])out[n]=await fetchAll(n,null);return out},
    async journal(d){const rows=await page(()=>sb.from('documents').select('id,data').eq('collection','journal').gte('id',d+'_').lt('id',d+'`'));return rows},
    collection(name){return {
      onSnapshot(cb,err){(subs[name]=subs[name]||[]).push({cb,err});ensureChan();load(name).catch(e=>err&&err(supaErr(e)));return ()=>{subs[name]=(subs[name]||[]).filter(s=>s.cb!==cb)}},
      async get(){try{await load(name)}catch(e){throw supaErr(e)}return snap(name)}
    }},
    doc(path){
      const i=path.indexOf('/');const collection=path.slice(0,i),id=path.slice(i+1);
      return {
        // enregistrement conditionnel : refusé (conflict) si le document a changé depuis la version attendue
        async set(body,expected){const {data,error}=await sb.rpc('doc_set',{p_collection:collection,p_id:id,p_data:body,p_expected:expected||null});
          if(error){if(error.code==='40001')throw {code:'conflict'};throw supaErr(error)}
          ver[path]=data;(cache[collection]||(cache[collection]=new Map())).set(id,body);return data},
        async add(body){const {error}=await sb.rpc('doc_set',{p_collection:collection,p_id:id,p_data:body,p_expected:null});if(error&&error.code!=='40001')throw supaErr(error)},
        async fetch(){const {data,error}=await sb.from('documents').select('data,modifie_le').eq('collection',collection).eq('id',id).maybeSingle();if(error)throw supaErr(error);if(data)ver[path]=data.modifie_le;return data?{data:data.data,ver:data.modifie_le}:null},
        async delete(){const {error}=await sb.from('documents').delete().eq('collection',collection).eq('id',id);if(error)throw supaErr(error);if(cache[collection])cache[collection].delete(id);delete ver[path]},
        async get(){const {data,error}=await sb.from('documents').select('data').eq('collection',collection).eq('id',id).maybeSingle();if(error)throw supaErr(error);return {exists:!!data,data:()=>data&&data.data}}
      };
    }
  };
}

// Présence : qui est connecté et qui modifie quelle ligne
function supaRoom(sb){
  const key=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Math.random()).slice(2);
  let state={},joined=false,ch=null,retryT=null,tries=0;const cbs=[];
  const peersNow=()=>{const out=[];if(!ch)return out;Object.entries(ch.presenceState()).forEach(([k,arr])=>arr.forEach(pr=>{const {presence_ref,...p}=pr;out.push({kind:'viewer',presence:p,isMe:k===key,sameTab:k===key})}));return out};
  const tell=()=>{const ps=peersNow();cbs.forEach(cb=>{try{cb({peers:ps})}catch(e){}})};
  function retry(){joined=false;if(retryT)return;const ms=Math.min(30000,1500*Math.pow(2,tries++));retryT=setTimeout(async()=>{retryT=null;const old=ch;ch=null;try{if(old)await sb.removeChannel(old)}catch(e){}try{const {data}=await sb.auth.getSession();if(data&&data.session&&sb.realtime&&sb.realtime.setAuth)sb.realtime.setAuth(data.session.access_token)}catch(e){}join()},ms)}
  function join(){
    const me=ch=sb.channel('presence-planning',{config:{private:true,presence:{key}}});
    ch.on('presence',{event:'sync'},tell)
      .subscribe(st=>{if(ch!==me)return;if(st==='SUBSCRIBED'){joined=true;tries=0;ch.track(state).catch(()=>{});tell()}
        else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED')retry();
        if(typeof renderSync==='function')renderSync()});
  }
  join();
  // au retour sur l'onglet (téléphone sorti de veille) : présence renvoyée, ou canal relancé
  const wake=()=>{if(!ch||ch.state!=='joined')retry();else ch.track(state).catch(()=>{})};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wake()});
  window.addEventListener('online',wake);
  setInterval(()=>{if(document.visibilityState==='visible'&&(!ch||ch.state!=='joined'))retry()},20000);
  return {
    live:()=>joined&&!!ch&&ch.state==='joined',
    presence(p){state=Object.assign({},state,p);return joined&&ch?ch.track(state):Promise.resolve()},
    onPeers(cb){cbs.push(cb);cb({peers:peersNow()})}
  };
}

async function supaLogin(){
  try{await SB.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}})}
  catch(e){toast('Connexion Google impossible pour le moment')}
}
// accès modifié par l'admin (rôle changé, compte désactivé ou retiré) : déconnexion automatique, avec un message à la reconnexion
let accesT=null;
function accesWatch(){if(accesT)return;const chk=async()=>{if(!SB||!ME||document.visibilityState!=='visible')return;
    let r;try{const x=await SB.rpc('mon_role');if(x.error)return;r=x.data}catch(e){return}   // réseau coupé : on ne déconnecte pas
    if((r||null)!==(ME.actif?ME.role:null)){prefs.accesMsg=r?`Votre rôle a été modifié (${ROLE_NOM[r]||r}) : reconnectez-vous.`:'Votre accès au planning a été désactivé ou retiré.';savePrefs();forcedLogout()}};
  accesT=setInterval(chk,30000);document.addEventListener('visibilitychange',chk)}
async function forcedLogout(){try{await SB.auth.signOut()}catch(e){}prefs.user=null;prefs.gate='';savePrefs();try{localStorage.removeItem(LS_MIRROR);localStorage.removeItem(LS_PEND)}catch(e){}location.reload()}
async function supaLogout(){const n=Object.keys(pending).length;if(n&&!confirm(`${n} modification${n>1?'s':''} pas encore envoyée${n>1?'s':''} au serveur (connexion lente ou coupée).\nEn vous déconnectant maintenant, elle${n>1?'s seront perdues':' sera perdue'}.\n\nSe déconnecter quand même ?`))return;try{await SB.auth.signOut()}catch(e){}prefs.user=null;prefs.gate='';savePrefs();try{localStorage.removeItem(LS_MIRROR);localStorage.removeItem(LS_PEND)}catch(e){}location.reload()}

// Remplace toutes les données partagées (import d'une sauvegarde ou démo)
function remplacerDonnees(d,label){
  if(!d||!Array.isArray(d.orders)){toast('Fichier non reconnu : ce n\'est pas une sauvegarde du planning');return}
  const keep=logLine;logLine=()=>{};IMPORTING=true;
  try{
    S=clone(d);
    S.chat=S.chat||[];S.days=S.days||{};
    ['clients','chantiers','formules','demandes','plaquesX','liens'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
    ['convocs','adjuvants'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]={}});
    if(!S.config)S.config=CONFIG0();
    commit();
  }finally{logLine=keep;IMPORTING=false}
  render(true);toast(label);
}
/* Clôture de fin de mois : PDF du mois (une page par jour) + .json du mois (commandes, journées, listes) */
async function clotureMois(ref){
  const m=String(ref||TODAY).slice(0,7);const first=m+'-01';let last=first;while(addDays(last,1).slice(0,7)===m)last=addDays(last,1);
  const nomM=MOISL[+m.slice(5,7)-1]+' '+m.slice(0,4);
  try{if(DB&&DB.extend)await DB.extend(first)}catch(e){}
  const days=exportDays('plage',first,last).filter(d=>hasOrders(d));
  const orders=S.orders.filter(o=>o.kind!=='aplacer'&&String(o.date||'').slice(0,7)===m).map(clone);
  const dys={};Object.keys(S.days||{}).filter(k=>k.slice(0,7)===m).forEach(k=>dys[k]=clone(S.days[k]));
  const used=new Set(orders.map(o=>o.cl)),usedCh=new Set(orders.map(o=>o.ch));
  const donnees={orders,days:dys,clients:S.clients.filter(c=>used.has(c.id)).map(clone),chantiers:S.chantiers.filter(c=>usedCh.has(c.id)).map(clone),formules:clone(S.formules||[]),config:clone(S.config||{})};
  saveFile(`cloture-${String(CENTRALE).toLowerCase().replace(/\s+/g,'-')}-${m}.json`,JSON.stringify({type:'cloture-mois',centrale:CENTRALE,mois:m,exporte:new Date().toISOString(),par:author(),commandes:orders.length,donnees},null,1));
  if(days.length)await savePDF(`cloture-${String(CENTRALE).toLowerCase().replace(/\s+/g,'-')}-${m}.pdf`,()=>planningPDF(days,'A4'));
  try{jlog(TODAY,`Clôture de fin de mois : ${nomM} (${orders.length} commandes)`);commit()}catch(e){}
  toast(`Clôture de ${nomM} : ${orders.length} commandes, ${days.length} jours`);
}
/* Consulter un mois archivé : lecture seule, rien n'est envoyé au planning partagé */
function consulterArchive(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
  inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();
    r.onload=()=>{let o;try{o=JSON.parse(r.result)}catch(e){toast('Fichier illisible');return}
      const d=o&&o.donnees?o.donnees:o;if(!d||!Array.isArray(d.orders)){toast('Fichier non reconnu : ce n\'est pas une sauvegarde du planning');return}
      const mois=[...new Set(d.orders.filter(x=>x.kind!=='aplacer'&&x.date).map(x=>x.date.slice(0,7)))].sort();
      if(!mois.length){toast('Aucune commande dans ce fichier');return}
      archiveView(d,mois,o.mois&&mois.includes(o.mois)?o.mois:mois[mois.length-1],f.name)};
    r.readAsText(f)};
  inp.click();
}
function archiveHTML(d,m){
  const A=Object.assign({},S,{orders:d.orders,days:d.days||{},clients:d.clients||S.clients,chantiers:d.chantiers||S.chantiers});
  const keep=S;let html='';
  try{S=A;const ds=[...new Set(d.orders.filter(x=>x.kind!=='aplacer'&&String(x.date||'').slice(0,7)===m).map(x=>x.date))].sort();html=printHTML(ds,'A4')}finally{S=keep}
  return html;
}
function archiveView(d,mois,m,nom){
  drawerEl.innerHTML=`<div class="scrim" data-act="dr-close-bg"><div class="drawer wide arch" role="dialog" aria-label="Mois archivé">
    <div class="dr-h"><h2>Archive · ${esc(MOISL[+m.slice(5,7)-1])} ${esc(m.slice(0,4))}</h2><button type="button" class="ib" data-act="dr-close" aria-label="Fermer">×</button></div>
    <div class="arch-bar"><select id="arch-m" aria-label="Mois">${mois.map(x=>`<option value="${x}" ${x===m?'selected':''}>${MOISL[+x.slice(5,7)-1]} ${x.slice(0,4)}</option>`).join('')}</select>
      <span class="muted">${esc(nom||'')} · lecture seule</span><button type="button" class="btn sm" id="arch-print">Imprimer</button></div>
    <iframe class="arch-frame" title="Planning archivé"></iframe></div></div>`;
  drawerEl.hidden=false;
  const fr=drawerEl.querySelector('.arch-frame');fr.srcdoc=archiveHTML(d,m);
  drawerEl.querySelector('#arch-m').onchange=e=>{const v=e.target.value;fr.srcdoc=archiveHTML(d,v);drawerEl.querySelector('.dr-h h2').textContent=`Archive · ${MOISL[+v.slice(5,7)-1]} ${v.slice(0,4)}`};
  drawerEl.querySelector('#arch-print').onclick=()=>{try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){toast('Impression impossible')}};
}
async function sauvegardeComplete(){
  if(!DB||!DB.everything){saveFile(`sauvegarde-planning-la-bocca-${TODAY}.json`,JSON.stringify({exporte:new Date().toISOString(),par:author(),donnees:S},null,1));return}
  toast('Préparation de la sauvegarde…');
  try{const all=await DB.everything();const d={orders:[],days:{},chat:[]};
    all.orders.forEach((v,id)=>{const x=clone(v);x.id=id;d.orders.push(x)});all.days.forEach((v,id)=>{d.days[id]=v});all.chat.forEach(v=>d.chat.push(v));all.ref.forEach((v,id)=>{d[id]=v.v});d.journal=[...all.journal.values()];
    d.orders.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    saveFile(`sauvegarde-planning-la-bocca-${TODAY}.json`,JSON.stringify({exporte:new Date().toISOString(),par:author(),commandes:d.orders.length,du:d.orders[0]?d.orders[0].date:'',au:d.orders.length?d.orders[d.orders.length-1].date:'',donnees:d},null,1));
    toast(`Sauvegarde : ${d.orders.length} commandes`)}
  catch(e){toast('Sauvegarde impossible sans connexion')}
}
function importerSauvegarde(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.multiple=true;
  inp.onchange=async()=>{const fs=[...(inp.files||[])];if(!fs.length)return;
    const lus=[];for(const f of fs){try{lus.push(JSON.parse(await f.text()))}catch(e){toast('Fichier illisible : '+f.name);return}}
    const d=fusionSauvegardes(lus);
    if(!d||!Array.isArray(d.orders)){toast('Fichier non reconnu : ce n\'est pas une sauvegarde du planning');return}
    const mois=[...new Set(d.orders.map(o=>String(o.date||'').slice(0,7)).concat(Object.keys(d.days||{}).map(k=>k.slice(0,7))).filter(Boolean))].sort();
    // fichiers de mois sans listes.json : on ne remet QUE ces mois, le reste du planning ne bouge pas
    const complet=lus.some(o=>o&&(o.type==='sauvegarde-listes'||(!o.type&&!o.mois)));
    if(!complet&&mois.length){
      const noms=mois.map(m=>MOISL[+m.slice(5,7)-1]+' '+m.slice(0,4)).join(', ');
      if(!confirm('Remettre '+noms+' tel que dans la sauvegarde ?\n'+d.orders.length+' commandes.\nLes autres mois, les clients et les réglages ne changent pas.\nLes changements faits dans '+(mois.length>1?'ces mois':'ce mois')+' depuis la sauvegarde seront perdus.'))return;
      try{if(DB&&DB.extend)await DB.extend(mois[0]+'-01')}catch(e){}
      const M=new Set(mois);
      S.orders=S.orders.filter(o=>!M.has(String(o.date||'').slice(0,7))).concat(d.orders.map(clone));
      Object.keys(S.days||{}).forEach(k=>{if(M.has(k.slice(0,7)))delete S.days[k]});Object.assign(S.days,clone(d.days||{}));
      commit();render(true);toast('Restauré : '+noms);return}
    if(!confirm('Remplacer TOUT le planning partagé par cette sauvegarde ?\n'+d.orders.length+' commandes'+(mois.length?' ('+mois[0]+(mois.length>1?' → '+mois[mois.length-1]:'')+')':'')+', '+fs.length+' fichier'+(fs.length>1?'s':'')+'.\nLes autres utilisateurs verront le changement tout de suite.'))return;
    remplacerDonnees(d,'Sauvegarde restaurée')};
  inp.click();
}
// Test de restauration sans risque : on lit les fichiers et on compare avec le planning actuel, rien n'est écrit.
function verifierSauvegarde(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.multiple=true;
  inp.onchange=async()=>{const fs=[...(inp.files||[])];if(!fs.length)return;
    const lus=[];for(const f of fs){try{lus.push(JSON.parse(await f.text()))}catch(e){toast('Fichier illisible : '+f.name);return}}
    const d=fusionSauvegardes(lus);if(!d||!Array.isArray(d.orders)){toast('Fichier non reconnu : ce n\'est pas une sauvegarde du planning');return}
    const mois=[...new Set(d.orders.map(o=>String(o.date||'').slice(0,7)).concat(Object.keys(d.days||{}).map(k=>k.slice(0,7))).filter(Boolean))].sort();
    for(const m of mois){try{if(DB&&DB.extend)await DB.extend(m+'-01')}catch(e){}}
    verifRapport(d,lus,fs.map(f=>f.name),mois)};
  inp.click();
}
function verifRapport(d,lus,noms,mois){
  const live=new Map(S.orders.map(o=>[o.id,o]));const L=lus.find(o=>o&&o.type==='sauvegarde-listes');
  const lignes=mois.map(m=>{const b=d.orders.filter(o=>String(o.date||'').slice(0,7)===m),a=S.orders.filter(o=>String(o.date||'').slice(0,7)===m);
    const ib=new Set(b.map(o=>o.id));let same=0,mod=0;b.forEach(o=>{const x=live.get(o.id);if(!x)return;stable(o)===stable(x)?same++:mod++});
    const abs=b.filter(o=>!live.has(o.id)).length,neu=a.filter(o=>!ib.has(o.id)).length;
    return {m,b:b.length,a:a.length,same,mod,abs,neu,j:Object.keys(d.days||{}).filter(k=>k.startsWith(m)).length}});
  const cnt=v=>Array.isArray(v)?v.length:v&&typeof v==='object'?Object.values(v).reduce((t,x)=>t+(Array.isArray(x)?x.length:1),0):0,nb=k=>cnt(d[k]),na=k=>cnt(S[k]);
  const listes=[['clients','Clients'],['chantiers','Chantiers'],['demandes','Demandes'],['adjuvants','Adjuvants (lignes)'],['liens','Raccourcis']];
  const pb=[];if(!d.orders.length)pb.push('aucune commande dans la sauvegarde');if(!L)pb.push('listes.json absent : seuls les mois choisis pourraient être remis (clients et réglages non restaurables)');
  const libM=m=>MOISL[+m.slice(5,7)-1]+' '+m.slice(0,4);
  drawerEl.innerHTML=`<div class="scrim" data-act="dr-close-bg"><div class="drawer wide verif" role="dialog" aria-label="Vérification de la sauvegarde">
    <div class="dr-h"><h2>Vérification de la sauvegarde</h2><button type="button" class="ib" data-act="dr-close" aria-label="Fermer">×</button></div>
    <div class="verif-b">
      <p class="verif-ok ${pb.length?'warn':''}">${pb.length?'⚠ Sauvegarde lisible, avec une réserve : '+esc(pb.join(' ; ')):'✓ Sauvegarde lisible et complète : elle peut remettre le planning en état.'}</p>
      <p class="muted">${esc(noms.join(' · '))} · <b>rien n'a été modifié</b> dans le planning.</p>
      <table class="verif-t"><thead><tr><th>Mois</th><th>Sauvegarde</th><th>Planning actuel</th><th>Identiques</th><th>Modifiées depuis</th><th>Ajoutées depuis</th><th>Absentes du planning</th><th>Journées</th></tr></thead>
      <tbody>${lignes.map(x=>`<tr><td><b>${libM(x.m)}</b></td><td>${x.b}</td><td>${x.a}</td><td>${x.same}</td><td>${x.mod}</td><td>${x.neu}</td><td>${x.abs}</td><td>${x.j}</td></tr>`).join('')}</tbody></table>
      <p class="hint">« Modifiées depuis » et « Ajoutées depuis » : ce qu'une restauration ferait perdre (changements faits après la sauvegarde de la nuit). « Absentes du planning » : commandes que la restauration remettrait.</p>
      ${L?`<table class="verif-t"><thead><tr><th>Listes</th><th>Sauvegarde</th><th>Planning actuel</th></tr></thead><tbody>${listes.map(([k,t])=>`<tr><td>${t}</td><td>${nb(k)}</td><td>${na(k)}</td></tr>`).join('')}<tr><td>Catalogue des formules</td><td>${d.formcat?'oui':'—'}</td><td>${S.formcat?'oui':'—'}</td></tr></tbody></table>`:''}
      <p class="hint">Pas dans la sauvegarde (volontairement) : journal de bord, chat, liste des accès.</p>
      <div class="verif-a">${mois.length?`<button type="button" class="btn primary" id="verif-voir">Consulter la sauvegarde</button>`:''}<button type="button" class="btn" data-act="dr-close">Fermer</button></div>
    </div></div></div>`;
  drawerEl.hidden=false;
  const v=drawerEl.querySelector('#verif-voir');if(v)v.onclick=()=>{const mm=[...new Set(d.orders.filter(x=>x.kind!=='aplacer'&&x.date).map(x=>x.date.slice(0,7)))].sort();if(!mm.length){toast('Aucune commande à afficher');return}archiveView(d,mm,mm[mm.length-1],noms.join(' + '))};
}
// Sauvegardes mensuelles : plusieurs fichiers (un par mois + listes.json) réunis en un seul planning
function fusionSauvegardes(lus){
  const ds=lus.map(o=>o&&o.donnees?o.donnees:o).filter(d=>d&&Array.isArray(d.orders));
  if(!ds.length)return null;if(ds.length===1)return ds[0];
  const listes=lus.find(o=>o&&o.type==='sauvegarde-listes');const base=listes?clone(listes.donnees):{};
  const byId=new Map(),days={};
  ds.forEach(d=>{d.orders.forEach(o=>{if(o&&o.id)byId.set(o.id,o)});Object.assign(days,d.days||{})});
  const out=Object.assign({},base,{orders:[...byId.values()],days});
  ['clients','chantiers'].forEach(k=>{if(Array.isArray(base[k])&&base[k].length)return;const m=new Map();ds.forEach(d=>(d[k]||[]).forEach(x=>{if(x&&x.id)m.set(x.id,x)}));out[k]=[...m.values()]});
  ['formules','config'].forEach(k=>{if(out[k]==null){const d=ds.find(d=>d[k]!=null);if(d)out[k]=d[k]}});
  return out;
}

/* Le geste « retour » du téléphone (glisser depuis le bord gauche) ou le bouton Retour ne quittent plus le planning :
   ils ferment d'abord ce qui est ouvert (feuille, menu, tiroir, chat), puis reviennent à l'onglet du jour. */
let histOn=false;
function histTrap(){
  if(histOn)return;histOn=true;
  try{history.replaceState({pl:'base'},'',location.pathname);history.pushState({pl:'app'},'',location.pathname)}catch(e){return}
  window.addEventListener('popstate',()=>{
    try{
      if(document.querySelector('.sheet-scrim'))closeSheet();
      else if(!popEl.hidden)closePop();
      else if(!drawerEl.hidden)closeDrawer();
      else if(typeof chatWin!=='undefined'&&chatWin&&!chatWin.hidden){chatWin.hidden=true;chatNav()}
      else if(view.tab!=='planning')act('tab',{dataset:{v:'planning'}},null,{});
    }catch(e){}
    history.pushState({pl:'app'},'',location.pathname);
  });
}
async function supaBoot(){
  const main=document.getElementById('main');
  if(!window.supabase||!window.supabase.createClient){main.innerHTML='<p class="empty">La connexion sécurisée n\'a pas pu se charger. Vérifiez la connexion internet puis rechargez la page.</p>';return}
  SB=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  let session=null;
  try{session=(await SB.auth.getSession()).data.session}catch(e){}
  if(!session){ME=null;main.innerHTML='<p class="empty">Connexion requise.</p>';showGate();return}
  let p=null;
  try{const r=await SB.rpc('mon_profil');p=r.data&&r.data[0]}catch(e){}
  ME={email:session.user.email,nom:p?p.nom:session.user.email,role:p?p.role:null,actif:!!(p&&p.actif)};
  SB.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')location.reload()});
  if(!ME.actif){prefs.user=null;savePrefs();main.innerHTML='<p class="empty">Accès non autorisé.</p>';showGate();return}
  if(prefs.user&&!isAdmin())prefs.user.role=ROLE_UI[ME.role]||'commercial';
  document.body.classList.toggle('ro',ME.role==='lecture');
  // compte non admin : prénom et rôle toujours ceux attribués dans les accès (corrige un ancien choix enregistré sur l'appareil)
  if(prefs.user&&ME&&ME.actif){const n=gAssigned(),r=isAdmin()?prefs.user.role:(ROLE_UI[ME.role]||'commercial');if((n&&prefs.user.nom!==n)||prefs.user.role!==r){prefs.user={nom:n||prefs.user.nom,role:r};savePrefs()}}   // prénom du compte pour tous ; rôle libre pour l'admin seulement
  if(!prefs.user||prefs.gate!==TODAY||prefs.email!==ME.email)showGate();
  startShared(supaDb(SB));setTimeout(histTrap,800);
  room=supaRoom(SB);verrousInit();setTimeout(notifRefresh,3000);accesWatch();setTimeout(baseCheck,4000);setTimeout(errFlush,6000);if(location.search)navFromUrl(location.search);
  if(prefs.user)room.presence({nom:prefs.user.nom,role:prefs.user.role,edit:null}).catch(()=>{});
  room.onPeers(ch=>{peers=ch.peers.slice();lockRace();if(S){if(popEl.hidden&&drawerEl.hidden)render();else renderChrome()}});
  setTimeout(()=>loadPdf().catch(()=>{}),2500);
}


/* =====================================================================
   Infos sur la ligne : affichage limité, liste complète au survol, éditeur
   ===================================================================== */
const pillsLim=o=>{const n=(o.pills||[]).length;return isPhone()||n<=2?n:1};
function pillChip(p,i){return `<button class="chip ${p.on?'on':''} ${p.lab?'lab':''}" data-act="pill" data-i="${i}" data-long="1" title="${p.lab?'Info du labo · ':''}${esc(p.t)} · posé par ${esc(p.by||'?')} · clic : fait / à faire · double-clic : modifier">${p.lab?'<b class="lab-b">LABO</b>':''}<span class="pt">${esc(p.t)}</span><span class="x" data-act="pill-x" data-i="${i}" role="button" aria-label="Retirer">×</span></button>`}
function pillsRow(o){
  const all=o.pills||[],lim=pillsLim(o);
  const more=all.length-lim;
  return all.slice(0,lim).map(pillChip).join('')
    +(more>0?`<button class="chip more" data-act="pills-all" title="Voir les ${all.length} infos">+${more}</button>`:'')
    +`<button class="chip add" data-act="addpill" aria-label="Ajouter une info">+ Info</button>`;
}
let plEl=null,plTimer=null,plHideT=null,plAnchor=null;
function plBuild(o){
  return `<div class="pl-h">${esc(cl(o.cl).n)} · ${o.pills.length} info${o.pills.length>1?'s':''}</div>
    <div class="pl-l">${o.pills.map(pillChip).join('')||'<p class="muted" style="margin:0">Aucune info</p>'}</div>
    <div class="pl-f"><button class="btn sm" data-act="addpill">+ Info</button><button class="btn sm" data-act="pills-edit">Modifier les infos</button></div>`;
}
function plShow(anchor){
  const row=anchor&&anchor.closest('[data-id]');const o=row&&byId(row.dataset.id);if(!o)return;
  plClose();plAnchor=anchor;
  plEl=document.createElement('div');plEl.id='plist';plEl.className='plist';plEl.dataset.id=o.id;plEl.innerHTML=plBuild(o);
  document.body.appendChild(plEl);
  const r=anchor.getBoundingClientRect(),w=plEl.offsetWidth,h=plEl.offsetHeight;
  let x=Math.min(r.left,innerWidth-w-8),y=r.bottom+2;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-2);
  plEl.style.left=Math.max(8,x)+'px';plEl.style.top=y+'px';
  plEl.addEventListener('click',()=>setTimeout(plClose,0));
}
function plClose(){clearTimeout(plTimer);clearTimeout(plHideT);if(plEl){plEl.remove();plEl=null;plAnchor=null}}
function plRefresh(){if(!plEl)return;const o=byId(plEl.dataset.id);if(!o||!o.pills.length){plClose();return}plEl.innerHTML=plBuild(o)}
document.addEventListener('mouseover',e=>{
  const c=e.target.closest&&e.target.closest('.r-pills[data-more]');
  if(c){clearTimeout(plHideT);const id=c.closest('[data-id]').dataset.id;if(plEl&&plEl.dataset.id===id)return;clearTimeout(plTimer);plTimer=setTimeout(()=>plShow(c),450);return}
  if(e.target.closest&&e.target.closest('#plist')){clearTimeout(plHideT);return}
  clearTimeout(plTimer);if(plEl){clearTimeout(plHideT);plHideT=setTimeout(plClose,300)}
});
addEventListener('scroll',()=>plClose(),true);
// éditeur (menu ⋯ et formulaire de commande)
function peRow(t){return `<div class="pe-r"><input name="pt" value="${esc(t)}" placeholder="Info (retard, consigne…)" maxlength="80" autocomplete="off"><button type="button" class="pe-x" data-pe="x" aria-label="Retirer cette info" title="Retirer">×</button></div>`}
function pillsEditor(pills,o){
  return `<div class="pe">${(pills||[]).map(p=>peRow(p.t)).join('')}${peRow('')}</div>
    <div class="pe-pre">${pPre(o).slice(0,10).map(t=>`<button type="button" class="chip" data-pe="pre" data-v="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>
    <button type="button" class="btn sm" data-pe="add" style="align-self:flex-start">+ Ajouter une ligne</button>`;
}
function peValues(form){const out=[];form.querySelectorAll('.pe input[name="pt"]').forEach(x=>{const v=x.value.trim();if(v&&!out.includes(v))out.push(v)});return out}
function mergePills(old,vals){return vals.map((t,i)=>{const same=(old||[]).find(p=>p.t===t);if(same)return same;const prev=(old||[])[i];return {t,on:false,by:prev&&!vals.includes(prev.t)?prev.by:author()}})}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-pe]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  const box=b.closest('form').querySelector('.pe');const k=b.dataset.pe;
  if(k==='x'){const r=b.closest('.pe-r');if(box.children.length>1)r.remove();else r.querySelector('input').value='';return}
  if(k==='add'){box.insertAdjacentHTML('beforeend',peRow(''));box.lastElementChild.querySelector('input').focus();return}
  if(k==='pre'){const v=b.dataset.v;if([...box.querySelectorAll('input')].some(x=>x.value.trim()===v))return;const empty=[...box.querySelectorAll('input')].find(x=>!x.value.trim());if(empty)empty.value=v;else box.insertAdjacentHTML('beforeend',peRow(v));if(![...box.querySelectorAll('input')].some(x=>!x.value.trim()))box.insertAdjacentHTML('beforeend',peRow(''));}
},true);
function pillsPop(anchor,id){setEditing(id);
  openPop(anchor,`<div class="pop-h">Infos sur la ligne</div><form data-pa="psave" class="pe-form">${pillsEditor(byId(id).pills,byId(id))}<button class="btn primary" type="submit">Enregistrer</button></form>`,
    {psave(f){const x=byId(id);x.pills=mergePills(x.pills,peValues(f));toast('Infos enregistrées')}});
}

/* =====================================================================
   Démarrage et événements
   ===================================================================== */
function boot(){
  applyTheme();
  document.getElementById('main').innerHTML='<p class="empty">Chargement du planning…</p>';
  supaBoot();

  document.addEventListener('click',e=>{
    if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();return}
    {const rw=isPhone()&&e.target.closest&&e.target.closest('.row.ph[data-id]');
     if(rw&&popEl.hidden&&!e.target.closest('button,a,input,select,textarea,label,[data-act]:not(.r-time)')){const id=rw.dataset.id;if(phOpen.has(id))phOpen.delete(id);else phOpen.add(id);render(true);return}}
    const pa=e.target.closest('[data-pa]');
    if(pa&&popEl.contains(pa)&&pa.tagName!=='FORM'){e.preventDefault();runPop(pa);return}
    if(!popEl.hidden&&!popEl.contains(e.target)){if(downInPop){downInPop=false;return}closePop()}
    if(popEl.contains(e.target))return;
    const qres=document.getElementById('qres');if(!qres.hidden&&!e.target.closest('.search'))qres.hidden=true;
    const cf=e.target.closest('[data-cfg]');if(cf){cfgAction(cf);return}
    const a=e.target.closest('[data-act]');if(!a)return;
    const ac=a.dataset.act;
    if(ac==='dr-close'||(ac==='dr-close-bg'&&e.target===a)){closeDrawer();return}
    if(ac==='dr-close-bg')return;
    if(a.tagName==='INPUT'&&a.type==='checkbox'&&ac!=='adj-on')return;
    const rowEl=a.closest('[data-id]');const o=rowEl?byId(rowEl.dataset.id):null;
    act(ac,a,o,e);
  });
  document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;
    if(popEl.contains(f)){runPop(f);return}
    if(f.id==='oform')return saveOrderForm(f);
    if(f.id==='gateform')return gateSubmit(f);
    if(f.dataset.cfgform)return cfgSubmit(f);
    if(f.dataset.form==='adj'){const k=f.closest('[data-wk]').dataset.wk;const inp=f.querySelector('input');const v=inp.value.trim();if(!v)return;(S.adjuvants[k]=S.adjuvants[k]||[]).push({t:v,on:false});commit();render(true);setTimeout(()=>{const n=document.getElementById('adjin-'+k);if(n)n.focus()},0)}
  });
  // clic long / clic droit
  let lt=null;
  document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-long]');if(!el||e.button>0)return;lt=setTimeout(()=>{lt=null;suppressClick=true;longAct(el)},480)});
  ['pointerup','pointercancel','pointerleave','scroll'].forEach(ev=>document.addEventListener(ev,()=>{if(lt){clearTimeout(lt);lt=null}},true));
  document.addEventListener('dblclick',e=>{const el=e.target.closest('[data-act="pill"]');if(!el||RO()||LABO())return;e.preventDefault();const row=el.closest('[data-id]');if(row){const o=byId(row.dataset.id),k=+el.dataset.i;if(o&&!lockStop(o.id)){const fresh=document.querySelector(`#row-${o.id} [data-act="pill"][data-i="${k}"]`)||el;pillEdit(o,k,fresh)}}});
  document.addEventListener('contextmenu',e=>{const el=e.target.closest('[data-long]');if(!el)return;e.preventDefault();if(lt){clearTimeout(lt);lt=null}longAct(el)});
  // recherche
  const q=document.getElementById('q'),qres=document.getElementById('qres');
  q.addEventListener('input',()=>{const s=q.value.trim().toLowerCase();if(s.length<2){qres.hidden=true;return}
    const dd=parseDate(s);const dateBtn=dd?`<button data-act="goto" data-d="${dd}"><span class="mono" style="font-size:12.5px">${esc(dayShort(dd))}</span><span><b>Ouvrir le planning du ${esc(dayLong(dd))}</b> · ${fmt(totals(dd).m3)} m³</span></button>`:'';
    const res=S.orders.filter(o=>{const c=cl(o.cl),ch=chan(o.ch);return (c.n+' '+(ch?ch.nom+' '+ch.adr:'')).toLowerCase().includes(s)}).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
    qres.innerHTML=dateBtn+(res.length?res.map(o=>`<button data-act="focus" data-oid="${o.id}"><span class="mono" style="font-size:12.5px">${esc(dayShort(o.date))}</span><span><b>${esc(cl(o.cl).n)}</b> · ${esc(siteName(o))} · ${fmt(total(o))} m³${o.kind==='aplacer'?' · à placer':''}</span></button>`).join(''):(dateBtn?'':'<p class="empty">Aucun résultat</p>'));qres.hidden=false});
  q.addEventListener('keydown',e=>{if(e.key==='Escape'){q.value='';qres.hidden=true;q.blur()}});
  // clavier
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!popEl.hidden&&e.target.tagName==='INPUT'&&popEl.contains(e.target)&&e.target.form){const fs=[...e.target.form.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')];const k=fs.indexOf(e.target);if(k>=0&&k<fs.length-1){e.preventDefault();fs[k+1].focus();return}}
    if(e.key==='Escape'){if(!popEl.hidden)closePop();else if(!drawerEl.hidden)closeDrawer();return}
    const t=e.target;if(t.closest&&t.closest('input,textarea,select,[contenteditable]'))return;
    if(!drawerEl.hidden||!document.getElementById('gate').hidden||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==='ArrowLeft'){act('prev',e.target,null,e);e.preventDefault()}
    else if(e.key==='ArrowRight'){act('next',e.target,null,e);e.preventDefault()}
    else if(e.key==='n'||e.key==='N'){openOrderForm(null);e.preventDefault()}
  });
  // glisser sur tablette pour changer de jour
  let tx=null,ty=null;const mainEl=document.getElementById('main');
  mainEl.addEventListener('touchstart',e=>{if(e.target.closest('.wk-scroll,.tbl-wrap'))return;tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
  mainEl.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=null;if(view.tab==='planning'&&Math.abs(dx)>80&&Math.abs(dy)<40)act(dx<0?'next':'prev',mainEl,null,e)});
  window.addEventListener('resize',placePop);
  let wasPhone=isPhone();window.addEventListener('resize',()=>{const p=isPhone();if(p!==wasPhone){wasPhone=p;render()}});
  setInterval(()=>{if(document.visibilityState!=='visible')return;if(view.date===TODAY&&view.tab==='planning'&&view.mode==='jour')render()},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S&&popEl.hidden&&drawerEl.hidden&&view.date===TODAY&&view.tab==='planning')render()});
}
let suppressClick=false;
if(typeof document!=='undefined'&&document.getElementById('main'))boot();
