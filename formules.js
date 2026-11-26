(()=>{

/* ---------- norme NF EN 206/CN ---------- */
const RES=['C8/10','C12/15','C16/20','C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60'];
const CONS=['S1','S2','S3','S4','S5'];
const EXPG=[['X0',['X0']],['XC',['XC1','XC2','XC3','XC4']],['XD',['XD1','XD2','XD3']],['XS',['XS1','XS2','XS3']],['XF',['XF1','XF2','XF3','XF4']],['XA',['XA1','XA2','XA3']]];
const EXP_ALL=EXPG.flatMap(g=>g[1]);
// classe de résistance mini indicative par exposition (annexe nationale)
// NF EN 206/CN (déc. 2014), tableau NA.F.1 : résistance mini, Eeff/liant éq maxi, liant éq mini (kg/m³, pour Dmax 20), air mini (%), nature du ciment
const NF={X0:['',null,150],XC1:['C20/25',.65,260],XC2:['C20/25',.65,260],XC3:['C25/30',.60,280],XC4:['C25/30',.60,280],
  XS1:['C30/37',.55,330],XS2:['C30/37',.55,330,0,'PM'],XS3:['C35/45',.50,350,0,'PM'],XD1:['C25/30',.60,280],XD2:['C30/37',.55,330],XD3:['C35/45',.50,350,0,'sels'],
  XF1:['C25/30',.60,280],XF2:['C25/30',.55,300,4],XF3:['C30/37',.55,315,4],XF4:['C30/37',.45,340,4,'sels'],XA1:['C30/37',.55,330,0,'XA'],XA2:['C35/45',.50,350,0,'XA'],XA3:['C40/50',.45,360,0,'XA']};
const MINRES=Object.fromEntries(Object.entries(NF).filter(([k,v])=>v[0]).map(([k,v])=>[k,v[0]]));
// correction du liant mini selon Dmax (note d du tableau NA.F.1)
const dCorr=d=>{const n=parseFloat(String(d||'D20').slice(1).replace(',','.'));return n<=12.5?1.10:n<=14?1.075:n<=16?1.05:n<=20?1:n<=22.4?.975:n>=31.5?.90:1};
const fr=n=>String(n).replace('.',',');
// gravillons de la centrale : le Dmax proposé vient des fractions d/D configurées (6/20 → D20)
const dOf=frac=>{const m=String(frac).replace(',','.').match(/^\s*[\d.]+\s*\/\s*([\d.]+)\s*$/);return m?'D'+fr(+m[1]):''};
const dNum=d=>parseFloat(String(d).slice(1).replace(',','.'));
const dList=()=>[...new Set((CFG.gran||[]).map(g=>dOf(g.f)).filter(Boolean))].sort((a,b)=>dNum(a)-dNum(b));
const fracsOf=d=>(CFG.gran||[]).filter(g=>dOf(g.f)===d);
const fracLbl=g=>g.f+(g.o?' '+g.o:'');
// exigences réunies de toutes les classes choisies (la plus sévère gagne)
function req(exp,dmax){if(!exp.length)return null;let r={res:'',ec:null,li:0,air:0,ci:[]};
  exp.forEach(x=>{const v=NF[x];if(!v)return;if(v[0]&&(!r.res||RES.indexOf(v[0])>RES.indexOf(r.res)))r.res=v[0];if(v[1]!=null&&(r.ec==null||v[1]<r.ec))r.ec=v[1];r.li=Math.max(r.li,v[2]);r.air=Math.max(r.air,v[3]||0);if(v[4]&&!r.ci.includes(v[4]))r.ci.push(v[4])});
  r.li=Math.round(r.li*dCorr(dmax));return r}
// bétons routiers (NF P 98-170) : couche, équivalence en compression, fendage
const BCI={BC1:['couche d\'assises','C8/10 à C16/20','< 1,3'],BC2:['couche d\'assises','C20/25','1,7'],BC3:['couche d\'assises','C25/30','2,0'],BC4:['couche de roulement','C30/37','2,4'],BC5:['couche de roulement','C35/45','2,7'],BC6:['couche de roulement routière et aéroportuaire','C40/50','3,3']};
function infoHtml(f){const b=f.spec&&BCI[f.variant];return (b?`<div><span class="lbl">NF P 98-170</span> ${esc(f.variant+' : '+b[0]+' · équivalent '+b[1]+' · fendage '+b[2]+' MPa')}</div>`:'')+reqHtml(f)}
// désignation normalisée NF EN 206+A2/CN (art. 11 et NA.11) : classe, exposition(s) (F), Dmax, consistance, chlorures, liant
function desig(f){if(!(f.res||f.exp.length))return '';const cv=coveredIn(f.exp);const ex=sortExp(f.exp.filter(x=>!cv[x])).map(x=>x+' (F)').join(' ');
  const b=f.spec&&BCI[f.variant];return ['BPS NF EN 206+A2/CN',f.res||(b?b[1].split(' ').pop()+' ('+f.variant+')':'C?'),ex,f.dmin?'Dinf '+f.dmin+' · Dsup '+f.dmax.slice(1):f.dmax?'Dmax '+f.dmax.slice(1):'',f.cons||(f.popt||[]).filter(o=>/^S[FR]\d/.test(o)).join(' '),CFG.clOn?f.cl||'':'',f.cim?'liant '+f.cim:''].filter(Boolean).join(' · ')}
function reqHtml(f){const r=req(f.exp,f.dmax);if(!r)return '';const cv=coveredIn(f.exp),allC=[...new Set(f.exp.concat(Object.keys(cv)))];
  const parts=[r.res?'≥ '+r.res:'',r.ec!=null?'E/C ≤ '+fr(r.ec.toFixed(2)):'','liant ≥ '+r.li+' kg/m³'+(f.dmax&&f.dmax!=='D20'?' ('+f.dmax+')':''),''].filter(Boolean);
  const ci=r.ci.map(c=>c==='PM'?'ciment PM':c==='sels'?'ciment SR/PM/ES si sels de déverglaçage':'ciment selon FD P 18-011 (PM/ES si sulfates)');
  const ax=f.exp.filter(x=>NF[x]&&NF[x][3]);
  const incl=Object.entries(cv).filter(([c,k])=>c!=='X0').map(([c])=>c).sort((a,b)=>EXP_ALL.indexOf(a)-EXP_ALL.indexOf(b));
  return (ax.length?`<div class="rappel"><b>Entraîneur d'air</b> obligatoire pour ${esc(ax.join(', '))} : air ≥ ${r.air} %${ax.some(x=>x==='XF3'||x==='XF4')?' · granulats non gélifs (NF P 18-545)':''}. Les essais de performance (NF P 18-424/425) peuvent remplacer la teneur en air.</div>`:'')}
const OPT_BASE=[['Retardé',['ret','retard','retarde','retardé']],['Accéléré',['acc','accel','accelere','accéléré']],['HM',['hm','hydrofuge','hydro-fuge']]];
// options générales : retardé, accéléré, hydrofuge, puis les fibres de la centrale, puis colorant (avec sa référence)
const optsAll=()=>OPT_BASE.concat((CFG.fibres||[]).filter(f=>f.n).map(f=>[f.n,[...new Set([norm(f.n)].concat(norm(f.k||'').split(/\s+/)).filter(Boolean))]])).concat([['Colorant',['col','colorant','colore']]]);

/* ---------- réglages par défaut de La Bocca (modifiables) ---------- */
const CFG0={
  res:['C16/20','C20/25','C25/30','C30/37','C35/45','C40/50'],
  fibres:[{n:'FPP',d:'Fibres polypropylène (synthétiques)',k:'fpp fib fibre'}],
  gran:[{f:'2/6',o:''},{f:'4/6',o:''},{f:'6/14',o:''},{f:'6/16',o:''},{f:'6/20',o:''}],dDef:'D20',
  cons:['S1','S2','S3','S4','S5'],cDef:'S4',
  clDef:'Cl 0,40',clOn:false,
  exp:['X0','XC1','XD1','XD2','XD3','XS1','XS2','XS3','XF1','XF2','XF3','XF4','XA1','XA2','XA3'],
  eq:'XC2=XC1 XC3=XF1 XC4=XF1',
  cov:'',single:true,
  cimReq:{XS1:'PM',XS2:'PM',XS3:'PM',XA1:'PM',XA2:'PM',XA3:'PM'},
  cims:[{n:'42,5 Q-LL',k:'ll qll',t:'base'},{n:'42,5 SR PM',k:'pm sr srpm',s:'PM',t:'pm'}],
  prods:[
    {g:'Fluides',n:'Agilia',k:'agi agilia',v:'MI Dallage, MI Fondations, MI Blocs, MI Plancher, Horizontal, Vertical, Formes, Prémurs, Fondations superficielles, Fondations profondes, Blanc, Architectural',o:'SF1, SF2, SF3, SR1, SR2, Métal',norm:'res',bap:true,url:'https://www.lafarge.fr/agilia'},
    {g:'Fluides',n:'Chronolia',k:'chr chrono chronolia',v:'4 h, 6 h, 15 h, 24 h, 48 h, Préfa',o:'',norm:'full',temp:true,url:'https://www.lafarge.fr/chronolia'},
    {g:'Chapes',n:'Agilia Chape',k:'agc chape',chg:'fluide',v:'Nivel, Thermic A, Thermic C, Ravoirage, Force',o:'',go:'FPP',norm:'',url:'https://www.lafarge.fr/agilia-chape'},
    {g:'Chapes',n:'Cemexa',k:'cem cemexa',chg:'fluide',v:'C16, C20',o:'ASP',go:'FPP',norm:''},
    {g:'Remblais',n:'LB',k:'lb',v:'Tranchées essorable, Tranchées non essorable, Coulis de remplissage, Remplissage, Remblais techniques',o:'',norm:'',url:'https://www.lafarge.fr/betons-pour-remblais'},
    {g:'CityBAG',n:'BAG',k:'bag citybag',v:'Béton, Mortier, Sec, Granulats',o:'',go:'Accéléré, HM, FPP, Colorant',norm:'',temp:true,rt:'2 h, 4 h, 6 h, 8 h, Journée',url:'https://www.lafarge.fr/citybag'},
    {g:'Routier',n:'BC',k:'bc routier',v:'BC3, BC6',o:'',norm:'exp',hide:true},
    {g:'Projeté',n:'Projeté',k:'pro proj projete',v:'',o:'',norm:'full',dm:'2/6, 4/6'},
    {g:'Dallage',n:'USR',k:'usr',v:'',o:'Durcisseur',norm:'full',url:'https://www.lafarge.fr/ultra-surfacage-rapide-tmt'},
    {g:'Décoratifs',n:'Désactivé',k:'des desac desactive',v:'',o:'',norm:'full',mix:true,expMin:'XF1',url:'https://beton-deco.lafarge.fr/sites/lafarge.fr/files/2024-11/FP_Artevia%20relief_Sept2024-BAT.pdf'},
    {g:'Décoratifs',n:'Artevia',k:'art artevia',v:'',o:'',norm:'full',url:'https://www.lafarge.fr/beton'},
    {g:'Spéciaux',n:'Hydromedia',k:'hyd hydro hydromedia',v:'',o:'',norm:'',gm:'dD',url:'https://www.lafarge.fr/beton'},
    {g:'Spéciaux',n:'Thermedia',k:'the therm thermedia',v:'',o:'',norm:'',url:'https://www.lafarge.fr/beton'}
  ]};
let CFG=JSON.parse(JSON.stringify(CFG0));let onSave=null;
const save=()=>{if(onSave)onSave(JSON.parse(JSON.stringify(CFG)))};

let LAST=[];let onChange=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// chaque liant a un seul type : base, PM ou SR PM ; le premier liant de base est celui des formules courantes
const cT=c=>c.t||'base';
const baseCim=()=>(CFG.cims.find(c=>cT(c)==='base')||CFG.cims[0]||{n:''}).n;

/* ---------- affichage d'une formule (objet) sur une ligne ---------- */
// f = {spec, prod, variant, popt[], res, dmax, cons, exp[], opts[], cim, sap, unk[], dflt{d,c}}
// ATT = produit en attente : seul, ou devant une formule incomplète
// ciment PM ajouté tout seul quand l'exposition l'impose (XS2, XS3) et que la classe est valide
function autoPM(f){const need=pmNeed(f.exp);const lv=needLevel(f.exp);if(!lv||cimOK(f.cim,lv))return f;
  const c=cimFor(lv);if(!c)return f;f.cim=c.n;f.autoPM=need;f.autoLv=lv;return f}
function fmt(f,html){if(!f.att)return fmt0(f,html);const t=fmt0(f,false);if(!html)return 'ATT'+(t?' · '+t:'');return `<span class="att" title="Produit en attente : formule à confirmer">ATT</span>`+(t?fmt0(f,true):'')}
function fmt0(f,html){
  const parts=[];
  const cv=coveredIn(f.exp);const dTok=()=>f.dmin?f.dmin+'/'+f.dmax.slice(1):f.dmax;const normTxt=()=>[f.res||(!f.spec&&(f.dmax||f.cons)?'C?':''),dTok(),f.cons].filter(Boolean).concat(sortExp(f.exp.filter(x=>!cv[x]))).join(' ');
  if(f.spec){if(!f.prod)return html?'<span class="ph">Choisissez le produit</span>':'';{const Pp=CFG.prods.find(p=>p.n===f.prod);parts.push(['sp',Pp&&Pp.hide&&f.variant?f.variant:[f.prod,f.variant].filter(Boolean).join(' ')])}(f.popt||[]).forEach(o=>parts.push(['opt',o]));if(f.rt)parts.push(['opt','retard '+f.rt]);if(f.temp!==''&&f.temp!=null)parts.push(['opt',f.temp+' °C']);
    if(f.res||f.exp.length)parts.push(['norm',normTxt()]);else if(f.dmax)parts.push(['opt',f.dmin?(f.dlab&&f.dlab.includes(' ')?f.dlab:dTok()):f.dmax])}
  else{
    if(!f.res&&!f.exp.length&&!f.cons&&!f.dmax&&!(f.opts||[]).length)return html?'<span class="ph">—</span>':'';
    parts.push(['norm',normTxt()]);
  }
  if(CFG.clOn&&f.cl&&f.cl!==CFG.clDef)parts.push(['opt',f.cl]);
  (f.opts||[]).forEach(o=>parts.push(['opt',o==='Colorant'?'Colorant '+(f.color||'?'):o]));
  if(f.cim&&f.cim!==baseCim()){const C=CFG.cims.find(c=>c.n===f.cim);parts.push(['cim',(C&&C.s)||f.cim])}
  if(!html){let pt=f.frac&&!parts.some(p=>p[1]===f.frac)?parts.concat([['opt',f.frac]]):parts;if(f.mix&&f.mix.length)pt=pt.concat([['opt','mélange '+f.mix.join(' + ')]]);return pt.map(p=>p[1]).join(' · ')+(f.sap?` · SAP ${f.sap}`:'');}
  if(f.frac)parts.splice(parts.findIndex(p=>p[0]==='norm')+1,0,['opt',f.frac]);
  if(f.mix&&f.mix.length)parts.splice(parts.findIndex(p=>p[0]==='norm')+1,0,['opt','mélange '+f.mix.join(' + ')]);
  let h=parts.map(p=>`<span class="${p[0]}">${esc(p[1])}</span>`).join('');
  if((f.exp||[]).some(x=>NF[x]&&NF[x][3]))h+=`<span class="air" title="Entraîneur d'air obligatoire (air ≥ 4 %)">AIR</span>`;
  if(f.dmin&&f.dmax){const fx=f.dmin+'/'+f.dmax.slice(1);if(!(CFG.gran||[]).some(g=>g.f.replace(/\s/g,'').replace(',','.')===fx.replace(',','.')))h+=`<span class="unk" title="Cette fraction ne correspond à aucun gravillon configuré à la centrale">${esc(fx)} hors centrale</span>`}
  else if(f.dmax&&!dList().includes(f.dmax))h+=`<span class="unk" title="Ce Dmax ne correspond à aucun gravillon configuré à la centrale">${esc(f.dmax)} saisi à la main</span>`;
  if(f.expDef)h+=`<span class="def">(${esc(f.exp[0])} mini du produit)</span>`;
  if(f.autoPM)h+=`<span class="def">(liant ${f.autoLv==='SRPM'?'SR PM':'PM'} ajouté : ${esc(f.autoPM.join(', '))})</span>`;
  if(f.dflt&&((f.dflt.d&&f.dmax)||(f.dflt.c&&f.cons)))h+=`<span class="def">(${[f.dflt.d?f.dmax:'',f.dflt.c?f.cons:''].filter(Boolean).join(', ')} par défaut)</span>`;
  (f.unk||[]).forEach(u=>h+=`<span class="unk" title="Mot non reconnu : ajoutez-le dans les réglages ou corrigez">${esc(u)} ?</span>`);
  {const cv=coveredIn(f.exp),k=Object.keys(cv).filter(x=>f.exp.includes(x));if(k.length)h+=`<span class="def">(${esc(k.join(', '))} inclus dans ${esc([...new Set(k.map(x=>cv[x]))].join(', '))})</span>`}
  if(f.sap)h+=`<span class="sap">SAP ${esc(f.sap)}</span>`;
  return h;
}
const eqMap=()=>{const m={};String(CFG.eq||'').toUpperCase().split(/[\s,;]+/).forEach(p=>{const[a,b]=p.split('=');if(a&&b)m[a]=b});return m};
const sortExp=e=>e.slice().sort((a,b)=>EXP_ALL.indexOf(a)-EXP_ALL.indexOf(b));
// couvertures de la centrale : XF1 vaut aussi pour XC1…XC4 et XD1
// couverture selon NA.F.1 : A couvre C si A est au moins aussi exigeant sur tout (résistance, E/C, liant, air) et porte la même exigence de ciment
function nfCovers(a,c){const A=NF[a],C=NF[c];if(!A||!C||a===c)return false;const ri=x=>x?RES.indexOf(x):-1;
  if(ri(A[0])<ri(C[0]))return false;if(C[1]!=null&&(A[1]==null||A[1]>C[1]))return false;if(A[2]<C[2])return false;if((A[3]||0)<(C[3]||0))return false;if(C[4]&&C[4]!==A[4])return false;if(RANKL[needLevel([c])]>RANKL[needLevel([a])])return false;return true}
const manCov=()=>{const m={};String(CFG.cov||'').toUpperCase().split(/[;\n]+|\s+(?=X[A-Z]?\d?=)/).forEach(p=>{const[a,b]=p.split('=');if(a&&b)m[a.trim()]=b.split(/[\s,]+/).filter(Boolean)});return m};
const covMap=()=>{const m={},man=manCov();EXP_ALL.forEach(a=>{const l=EXP_ALL.filter(c=>nfCovers(a,c));(man[a]||[]).forEach(c=>{if(!l.includes(c))l.push(c)});if(l.length)m[a]=l});return m};
const demand=x=>{const v=NF[x]||['',1,0,0];return [(v[0]?RES.indexOf(v[0]):-1),-(v[1]==null?1:v[1]),v[2],v[3]||0]};
const byDemand=(a,b)=>{const A=demand(a),B=demand(b);for(let i=0;i<4;i++)if(A[i]!==B[i])return B[i]-A[i];return EXP_ALL.indexOf(a)-EXP_ALL.indexOf(b)};
function coveredIn(exp){const m=covMap(),r={},kept=[];exp.slice().sort(byDemand).forEach(x=>{const by=kept.find(k=>(m[k]||[]).includes(x));if(by)r[x]=by;else kept.push(x)});kept.forEach(k=>(m[k]||[]).forEach(c=>{if(!exp.includes(c)&&!r[c])r[c]=k}));return r}
function minOf(x){const l=[x].concat(covMap()[x]||[]);let best=null;l.forEach(c=>{if(MINRES[c]&&(!best||RES.indexOf(MINRES[c])>RES.indexOf(MINRES[best])))best=c});return best}
// vérifie chaque couverture contre le tableau NA.F.1
function covCheck(){const m=manCov(),msg=[];Object.entries(m).forEach(([a,l])=>{const A=NF[a];if(!A)return;l.forEach(c=>{const C=NF[c];if(!C)return;const bad=[];if(C[0]&&RES.indexOf(C[0])>RES.indexOf(A[0]||''))bad.push('résistance');if(C[1]!=null&&A[1]!=null&&C[1]<A[1])bad.push('E/C');if(C[2]>A[2])bad.push('liant');if((C[3]||0)>(A[3]||0))bad.push('air');if(C[4]&&C[4]!==A[4])bad.push('ciment');if(bad.length)msg.push(`${a} ne couvre pas ${c} (${bad.join(', ')})`)})});
  return msg.length?'<span style="color:var(--bad-i)">Contrôle NA.F.1 : '+esc(msg.join(' ; '))+'.</span>':(Object.keys(m).length?'<span style="color:var(--green-i)">Contrôle NA.F.1 : les couvertures ajoutées respectent le tableau.</span>':'')}
// classes de chlorures en France (NA.5.2.8)
const CLS=[['Cl 0,20','Précontraint'],['Cl 0,40','Béton armé ou pièces métalliques noyées'],['Cl 0,65','Armé, ciments CEM III uniquement'],['Cl 1,0','Sans armature ni pièce métallique']];
const clOf=v=>{const n=parseFloat(String(v).replace(',','.').replace(/^0(\d)/,'0.$1'));const m={0.2:'Cl 0,20',0.4:'Cl 0,40',0.65:'Cl 0,65',1:'Cl 1,0'};return m[n]||(n===20||n===0.20?'Cl 0,20':n===40?'Cl 0,40':n===65?'Cl 0,65':n===10?'Cl 1,0':'')};
// classe effective et mini exigé par les expositions retenues
function resInfo(f){const cv=coveredIn(f.exp);const b=f.spec&&BCI[f.variant];const er=f.res||(b?b[1].split(' ').pop():'');const kept=f.exp.filter(x=>!cv[x]);
  const mins=kept.map(x=>[x,minOf(x)]).filter(([x,c])=>c);const top=mins.map(([x,c])=>MINRES[c]).sort((a,b)=>RES.indexOf(b)-RES.indexOf(a))[0]||'';return {er,kept,mins,top}}
// sur-dimensionnement : 2 classes ou plus au-dessus du mini de l'exposition
function overOf(f){const {er,kept,top}=resInfo(f);if(!f.res||!kept.length||kept.includes('X0'))return null;if(!top)return null;const d=RES.indexOf(f.res)-RES.indexOf(top);if(d<2)return null;
  const sugg=CFG.exp.filter(x=>MINRES[x]===f.res&&!kept.includes(x));return {top,sugg}}
function flagsOf(f){const s=new Set();const {er,mins}=resInfo(f);const under=er&&mins.some(([x,c])=>RES.indexOf(MINRES[c])>RES.indexOf(er));const over=overOf(f);
  if((under||over)&&f.resW)s.add(f.resW);if(under||over)Object.entries(f.expW||{}).forEach(([e,w])=>{if(f.exp.includes(e))s.add(w)});return s}
function warnOf(f){const out=[];const cv=coveredIn(f.exp);
  {const o=overOf(f);if(o)out.push(f.res+' pour '+resInfo(f).kept.join(' ')+' (mini '+o.top+') : classe bien au-dessus du minimum de l\'exposition, vérifiez l\'exposition demandée'+(o.sugg.length?' ('+f.res+' correspond plutôt à '+o.sugg.slice(0,4).join(', ')+')':''))}
  {const P=f.spec&&prodOf(f.prod);if(P&&P.bap&&(f.res||f.exp.length)){if(!(f.popt||[]).some(o=>/^SF\d/.test(o)))out.push('BAP : classe d\'étalement SF1 à SF3 à préciser');if(!(f.popt||[]).some(o=>/^SR\d/.test(o)))out.push('BAP : classe de résistance à la ségrégation SR1 ou SR2 à préciser (NA.6.2.2)')}}
  if(CFG.clOn&&f.cl==='Cl 0,65'&&!/CEM\s*III/i.test(f.cim||''))out.push('Cl 0,65 réservé aux ciments CEM III (NA.5.2.8)');
  {const P=f.spec&&prodOf(f.prod);if(P&&P.gm==='dD'&&!f.dmin)out.push(f.prod+' : granulométrie Dmin/Dmax à préciser (ex. '+(((CFG.gran||[])[1]||{}).f||'4/6')+')')}
  if(f.dmin&&f.dmax&&parseFloat(f.dmin.replace(',','.'))>=dNum(f.dmax))out.push('Dmin doit être plus petit que Dmax');
  {const P=f.spec&&prodOf(f.prod);if(P&&P.n==='BAG'&&f.variant!=='Sec'&&f.variant!=='Granulats'){if(f.temp===''||f.temp==null)out.push('BAG : température à indiquer');if(P.rt&&!f.rt)out.push('BAG : temps de retard à indiquer ('+splitL(P.rt).join(', ')+')')}}

  {const b=f.spec&&BCI[f.variant];const er=f.res||(b?b[1].split(' ').pop():'');if(er){const r=RES.indexOf(er);const bad=f.exp.filter(x=>!cv[x]).map(x=>[x,minOf(x)]).filter(([x,c])=>c&&RES.indexOf(MINRES[c])>r);bad.forEach(([x,c])=>out.push(x+(c!==x?' (qui couvre '+c+')':'')+' demande '+MINRES[c]+' mini'+(f.res?'':' ('+f.variant+' ≈ '+er+')')))}}
  {const b=f.spec&&BCI[f.variant];if(b&&f.res&&!b[1].includes(f.res))out.push(f.variant+' correspond en général à '+b[1])}
  if(CFG.single){const cv2=coveredIn(f.exp);const kept=f.exp.filter(x=>!cv2[x]);if(kept.length>1)out.push('une seule classe par formule : '+kept.join(' et ')+' ne se couvrent pas, choisissez la plus adaptée');}
  {const P=f.spec&&prodOf(f.prod);if(P&&(P.norm==='full'||P.norm==='res')&&!f.res&&(f.exp.length||f.dmax)){const m=f.exp.map(minOf).filter(Boolean).map(c=>MINRES[c]).sort((a,b)=>RES.indexOf(b)-RES.indexOf(a))[0];out.push('classe de résistance à préciser'+(m?' ('+m+' mini)':''))}}
  {const P=f.spec&&prodOf(f.prod);if(P&&P.expMin&&f.exp.length&&!f.exp.some(x=>x===P.expMin||(covMap()[x]||[]).includes(P.expMin)))out.push(f.prod+' : exposition mini '+P.expMin+' (extérieur)')}
  if((f.opts||[]).includes('Colorant')&&!f.color)out.push('référence du colorant à saisir');
  if(f.dmP)out.push(f.prod+' : Dmax prévu '+f.dmP.join(' ou ')+' ('+(prodOf(f.prod).dm)+')');
  if(f.refused&&f.refused.length)out.push(f.prod+' ne se fait pas '+f.refused.join(', ').toLowerCase()+' (réglage du produit)');
  {const lv=needLevel(f.exp);if(lv&&!cimOK(f.cim,lv)){const c=cimFor(lv);out.push(pmNeed(f.exp).join(', ')+' demande le liant '+LVL[lv]+(c?' ('+c.n+')':' : cochez-en un dans l\'administration'))}}
  return out.length?'À vérifier : '+out.join(' ; ')+'.':''}

/* ================= panneau de cases commun à A et B ================= */
function panelHTML(p){return `
  <div class="togs"><label class="tog"><input type="checkbox" id="${p}-spec"> Produit spécial</label><label class="tog"><input type="checkbox" id="${p}-att"> Produit en att.</label></div>
  <div id="${p}-specw" class="sub" hidden>
    <div class="field"><span class="lbl">Produit</span><div id="${p}-prod" style="display:flex;flex-direction:column;gap:4px"></div></div>
    <div class="field" id="${p}-varw"><span class="lbl">Variante</span><div class="chips" id="${p}-var"></div></div>
    <div class="field" id="${p}-pow"><span class="lbl">Option du produit</span><div class="chips" id="${p}-popt"></div></div>
    <div class="field" id="${p}-mixw" hidden><span class="lbl">Mélange granulats / sables</span><div class="chips" id="${p}-mix"></div><input class="inp" id="${p}-mixt" autocomplete="off" placeholder="sable ou autre granulat (ex. sable 0/4)" style="height:30px;font:500 13px var(--mono)"></div>
    <div class="field" id="${p}-rtw" hidden><span class="lbl">Temps de retard</span><div class="chips" id="${p}-rt"></div></div>
    <div class="field" id="${p}-tw"><span class="lbl">Température</span><div class="sapf"><input class="inp" id="${p}-temp" inputmode="numeric" maxlength="3" placeholder="°C" style="width:80px;height:30px" aria-label="Température chantier (°C)"></div></div>
  </div>
  <div id="${p}-norm" class="sub">
    <span class="lbl" id="${p}-norm-t" style="color:var(--orange)" hidden>+ classe de la norme pour ce produit</span>
    <div class="field" id="${p}-resw"><span class="lbl">Résistance</span><div class="chips" id="${p}-res"></div></div>
    <div class="field" id="${p}-dmaxw"><span class="lbl">Dmax</span><div class="chips" id="${p}-dmax"></div>
      <div class="sapf" id="${p}-dmanw" hidden><label for="${p}-dman" id="${p}-dmanl">Dmax hors centrale (mm)</label><input class="inp" id="${p}-dman" inputmode="decimal" maxlength="7" placeholder="ex. 10" style="width:90px;height:30px"></div>
      <div id="${p}-fracw" hidden style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="lbl">Gravillon précis</span><div class="chips" id="${p}-frac"></div></div></div>
    <div class="field" id="${p}-consw"><span class="lbl">Consistance</span><div class="chips" id="${p}-cons"></div></div>
    <div class="field" id="${p}-clw" hidden><span class="lbl">Chlorures</span><div class="chips" id="${p}-cl"></div></div>
    <div class="field" id="${p}-expw"><span class="lbl">Exposition</span><div id="${p}-exp" style="display:flex;flex-direction:column;gap:4px"></div></div>
  </div>
  <div class="field"><span class="lbl">Liant</span><div class="chips" id="${p}-cim"></div></div>
  <div class="field" id="${p}-optw"><span class="lbl">Options</span><div class="chips" id="${p}-opt"></div>
    <div id="${p}-colw" hidden style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><label class="lbl" for="${p}-col">Référence colorant</label><input class="inp" id="${p}-col" autocomplete="off" placeholder="à saisir" style="width:130px;height:30px;font:500 13px var(--mono)"></div></div>`}
const blank=()=>({att:false,rt:'',cl:'',color:'',mix:[],mixT:'',spec:false,prod:'',variant:'',popt:[],temp:'',res:'',dmax:'',dman:false,frac:'',cons:'',exp:[],eqn:[],opts:[],cim:'',sap:''});
const ST={fx:blank()};let CUR='fx';const UI={fx:false};// case « Produit spécial » cochée sans produit choisi
const touch=()=>{};const aTouch=()=>{};
function chipBtns(el,list,isOn,click,cls,dflt){const pp=CUR;el.innerHTML=list.map(v=>`<button type="button" class="ch ${cls||''} ${dflt===v?'dflt':''}" aria-pressed="${isOn(v)}" data-v="${esc(v)}" ${dflt===v?'title="Valeur par défaut de la centrale"':''}>${esc(v)}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{touch(pp);click(b.dataset.v);after(pp)})}
// après un clic dans le panneau : la saisie rapide se réécrit, puis tout se redessine
// B : dès qu'on compose avec les cases, l'aide et le détail des mots tapés disparaissent (ils reviennent si on tape)
let bChip=false;
function after(p){$('fx-q').value=toShort(ST.fx);bChip=true;renderB()}
// état du panneau -> texte court de saisie rapide (relu par parse)
function toShort(A){const t=[];const P=A.spec?prodOf(A.prod):null;const nk=s=>norm(String(s)).replace(/\s+/g,'');
  if(A.att)t.push('att');
  if(P){t.push((norm(P.k||'').split(/\s+/)[0])||nk(P.n));if(A.variant)t.push(nk(A.variant));(A.popt||[]).forEach(o=>t.push(nk(o)));if(A.rt)t.push('ret '+nk(A.rt));if(A.temp!==''&&A.temp!=null)t.push('t'+A.temp);(A.mix||[]).forEach(m=>t.push(String(m).split(' ')[0]));if(A.mixT&&/^sable\s+\S+/i.test(A.mixT.trim()))t.push('sable '+A.mixT.trim().split(/\s+/)[1])}
  if(A.res)t.push('c'+A.res.slice(1).split('/')[0]);
  if(P&&P.gm==='dD'){if(A.frac)t.push(String(A.frac).split(' ')[0])}
  else if(A.frac)t.push(String(A.frac).split(' ')[0]);
  else if(A.dmax)t.push('d'+A.dmax.slice(1));
  if(A.cons)t.push(A.cons.toLowerCase());
  (A.eqn||[]).forEach(x=>t.push(x.toLowerCase()));(A.exp||[]).filter(x=>!(A.eqn||[]).some(e=>eqMap()[e]===x)).forEach(x=>t.push(x.toLowerCase()));
  if(CFG.clOn&&A.cl)t.push('cl'+A.cl.replace(/\D/g,''));
  (A.opts||[]).forEach(o=>{if(o==='Colorant'){t.push('col');if(A.color)t.push(A.color.toLowerCase())}else{const e=optsAll().find(x=>x[0]===o);t.push(e?e[1][0]:nk(o))}});
  if(A.cim&&A.cim!==baseCim()&&!(needLevel(A.exp)&&cimFor(needLevel(A.exp))&&cimFor(needLevel(A.exp)).n===A.cim)){const c=CFG.cims.find(c=>c.n===A.cim);const k=c&&norm(c.k||'').split(/\s+/)[0];if(k)t.push(k)}
  return t.join(' ')}
// formule relue -> état du panneau
function fromParse(g){const labs=(CFG.gran||[]).map(fracLbl);const P=g.spec?prodOf(g.prod):null;const dD=P&&P.gm==='dD';
  const eqs=(g.eqn||[]).map(x=>x.split(' → ')[0]);
  return {att:g.att,rt:g.rt||'',cl:g.cl&&g.cl!==CFG.clDef?g.cl:'',color:g.color||'',mix:(g.mix||[]).filter(x=>labs.includes(x)),mixT:(g.mix||[]).filter(x=>!labs.includes(x)).join(' + '),spec:g.spec,prod:g.prod,variant:g.variant,popt:g.popt||[],temp:g.temp||'',res:g.res,
    dmax:dD?'':(g.dflt.d?'':g.dmax),dman:dD?!!(g.dmin&&!(CFG.gran||[]).some(x=>x.f.replace(/\s/g,'')===g.dmin+'/'+String(g.dmax).slice(1))):!!(g.dmax&&!g.dflt.d&&!dListP(P).includes(g.dmax)),frac:dD?(g.dmin?(g.dlab||g.dmin+'/'+String(g.dmax).slice(1)):''):(g.frac||''),
    cons:g.dflt.c?'':g.cons,exp:g.expDef?[]:g.exp.slice(),eqn:eqs,opts:g.opts||[],cim:g.autoPM||g.cim===baseCim()?'':g.cim,sap:''}}
const prodOf=n=>CFG.prods.find(p=>p.n===n);
// options générales (Retardé, Accéléré, FPP) permises pour un produit ; non renseigné = toutes
const okOpts=P=>{const all=optsAll().map(o=>o[0]);return P&&P.go!=null?splitL(P.go).filter(o=>all.includes(o)):all};
// gravillons permis pour un produit (ex. Projeté : 2/6, 4/6) ; sinon ceux de la centrale
const dListP=P=>P&&P.dm?[...new Set(splitL(P.dm).map(x=>/\//.test(x)?dOf(x):'D'+fr(+String(x).replace(/^d/i,'').replace(',','.'))).filter(Boolean))].sort((a,b)=>dNum(a)-dNum(b)):dList();
const dDefP=P=>P&&P.dm?dListP(P)[0]:CFG.dDef;
const fracsP=(P,d)=>{const g=fracsOf(d);if(!(P&&P.dm))return g;const al=splitL(P.dm).filter(x=>/\//.test(x)).map(x=>x.replace(/\s/g,''));return al.length?g.filter(x=>al.includes(x.f.replace(/\s/g,''))):g};
// béton désactivé : toujours avec fibres (le premier type de fibres permis)
const fibNames=()=>(CFG.fibres||[]).map(f=>f.n).filter(Boolean);
const fibreAuto=P=>fibNames().find(n=>okOpts(P).includes(n));
// liant PM : celui coché « PM » dans l'administration ; expositions qui l'imposent : réglage de la centrale (XS2/XS3 imposés par NA.F.1)
const pmCim=()=>CFG.cims.find(c=>cT(c)==='pm')||CFG.cims.find(c=>cT(c)==='srpm');
const srpmCim=()=>CFG.cims.find(c=>cT(c)==='srpm');
const LVL={PM:'PM',SRPM:'SR PM'},RANKL={'':0,PM:1,SRPM:2};
// exigence de liant d'une exposition : réglage de la centrale, jamais moins que NA.F.1 (PM pour XS2 et XS3)
const reqOf=x=>{const cfg=(CFG.cimReq||{})[x]||'';const imp=NF[x]&&NF[x][4]==='PM'?'PM':'';return RANKL[cfg]>=RANKL[imp]?cfg:imp};
const needLevel=exp=>(exp||[]).map(reqOf).reduce((a,b)=>RANKL[b]>RANKL[a]?b:a,'');
const pmNeed=exp=>(exp||[]).filter(x=>reqOf(x));
const cimFor=lv=>lv==='SRPM'?(srpmCim()||null):(pmCim()||srpmCim()||null);
const cimOK=(n,lv)=>{if(!lv)return true;const c=CFG.cims.find(c=>c.n===n);const t=c?cT(c):'base';return lv==='SRPM'?t==='srpm':(t==='pm'||t==='srpm')};
const isPM=n=>cimOK(n,'PM');
function renderPanel(p){CUR=p;const A=ST[p],$p=id=>$(p+'-'+id);
  const P=A.spec?prodOf(A.prod):null;
  $p('specw').hidden=!A.spec;$p('spec').checked=A.spec;$p('norm').hidden=A.spec&&!(P&&P.norm);$p('consw').hidden=!!(A.spec&&P&&P.norm!=='full');{const eo=!!(A.spec&&P&&P.norm==='exp');$p('resw').hidden=eo;$p('dmaxw').hidden=eo&&!(P&&(P.dm||P.gm==='dD'));if(A.spec&&P&&!P.norm&&(P.dm||P.gm==='dD')){$p('norm').hidden=false;$p('resw').hidden=true;$p('consw').hidden=true;$p('exp').closest('.field').hidden=true}else $p('exp').closest('.field').hidden=false}
  $p('norm-t').hidden=!(A.spec&&P&&P.norm);
  chipBtns($p('res'),CFG.res,v=>A.res===v,v=>A.res=A.res===v?'':v);
  const DDm=!!(A.spec&&P&&P.gm==='dD');$p('dmaxw').querySelector('.lbl').textContent=DDm?'Dmin / Dmax':'Dmax';$p('dmanl').textContent=DDm?'Dmin/Dmax hors centrale (ex. 6/10)':'Dmax hors centrale (mm)';$p('dman').placeholder=DDm?'ex. 6/10':'ex. 10';
  if(DDm){const FL=(P.dm?splitL(P.dm).filter(x=>/\//.test(x)):(CFG.gran||[]).filter(g=>g.f).map(fracLbl));chipBtns($p('dmax'),FL.concat('Autre…'),v=>v==='Autre…'?A.dman:!A.dman&&A.frac===v,v=>{if(v==='Autre…'){A.dman=true;A.frac=''}else{A.dman=false;A.frac=A.frac===v?'':v}});$p('dmanw').hidden=!A.dman;if(A.dman&&document.activeElement!==$p('dman'))$p('dman').value=A.frac||'';$p('fracw').hidden=true}
  else{
  const DL=dListP(P),DD=dDefP(P);if(A.dmax&&!A.dman&&!DL.includes(A.dmax))A.dmax='';chipBtns($p('dmax'),P&&P.dm?DL:DL.concat('Autre…'),v=>v==='Autre…'?A.dman:!A.dman&&(A.dmax||DD)===v,v=>{if(v==='Autre…'){A.dman=true;A.dmax='';A.frac=''}else{A.dman=false;A.dmax=v;A.frac=''}},'',DD);
  $p('dmanw').hidden=!A.dman;if(A.dman&&document.activeElement!==$p('dman'))$p('dman').value=A.dmax?A.dmax.slice(1):'';
  {const fl=A.dman?[]:fracsP(P,A.dmax||DD);$p('fracw').hidden=fl.length<2;chipBtns($p('frac'),fl.map(fracLbl),v=>A.frac===v,v=>A.frac=A.frac===v?'':v)}
  }
  chipBtns($p('cons'),CFG.cons,v=>(A.cons||CFG.cDef)===v,v=>A.cons=v,'',CFG.cDef);
  if(CFG.clOn){chipBtns($p('cl'),CLS.map(c=>c[0]),v=>(A.cl||CFG.clDef)===v,v=>A.cl=v,'',CFG.clDef);$p('cl').querySelectorAll('button').forEach(b=>b.title=(CLS.find(c=>c[0]===b.dataset.v)||[])[1]||'')}$p('clw').hidden=!CFG.clOn||$p('resw').hidden;
  const EQ=eqMap(),vis=x=>CFG.exp.includes(x)||(EQ[x]&&CFG.exp.includes(EQ[x]));A.eqn=A.eqn||[];
  $p('exp').innerHTML=EXPG.map(([g,l])=>{const L=l.filter(vis);return L.length?`<div class="grp"><span>${g}</span><div class="chips" data-g="${g}"></div></div>`:''}).join('');
  EXPG.forEach(([g,l])=>{const el=$p('exp').querySelector(`[data-g="${g}"]`);if(!el)return;chipBtns(el,l.filter(vis),v=>EQ[v]&&!CFG.exp.includes(v)?A.eqn.includes(v):A.exp.includes(v),v=>{if(CFG.single){if(EQ[v]&&!CFG.exp.includes(v)){const on=A.eqn.includes(v);A.eqn=on?[]:[v];A.exp=on?[]:[EQ[v]]}else{const on=A.exp.length===1&&A.exp[0]===v&&!A.eqn.length;A.eqn=[];A.exp=on?[]:[v]}return}if(EQ[v]&&!CFG.exp.includes(v)){const t=EQ[v];if(A.eqn.includes(v)){A.eqn=A.eqn.filter(x=>x!==v);if(!A.eqn.some(x=>EQ[x]===t))A.exp=A.exp.filter(x=>x!==t)}else{A.eqn=A.eqn.concat(v);A.exp=A.exp.filter(x=>x!=='X0');if(!A.exp.includes(t))A.exp=A.exp.concat(t)}return}if(v==='X0'){A.eqn=[];A.exp=A.exp.includes('X0')?[]:['X0'];return}A.exp=A.exp.filter(x=>x!=='X0');A.exp=A.exp.includes(v)?A.exp.filter(x=>x!==v):A.exp.concat(v)})});
  $p('exp').querySelectorAll('button').forEach(b=>{const v=b.dataset.v;if(EQ[v]&&!CFG.exp.includes(v)){b.classList.add('eqc');b.title=v+' est fabriqué en '+EQ[v]+' à la centrale';}});
  {const cv=coveredIn(A.exp);$p('exp').querySelectorAll('button').forEach(b=>{if(b.classList.contains('eqc')&&A.eqn.includes(b.dataset.v))return;const by=cv[b.dataset.v];if(by){b.classList.add('cov');b.disabled=!CFG.single;b.title='Inclus dans '+by+(CFG.single?' (toucher pour choisir '+b.dataset.v+' à la place)':'');b.setAttribute('aria-pressed','false')}})}
  const gs=[...new Set(CFG.prods.map(p=>p.g||'Autres'))];
  $p('prod').innerHTML=gs.map((g,i)=>`<div class="grp gw"><span>${esc(g)}</span><div class="chips" data-pg="${i}"></div></div>`).join('');
  gs.forEach((g,i)=>chipBtns($p('prod').querySelector(`[data-pg="${i}"]`),CFG.prods.filter(p=>(p.g||'Autres')===g).map(p=>p.n),v=>A.prod===v,v=>{A.prod=v;A.variant='';A.popt=[];A.temp='';A.rt='';A.mix=[];A.mixT='';const P2=prodOf(v);const ok=okOpts(P2);A.opts=A.opts.filter(o=>ok.includes(o));if(!P2.norm||P2.norm==='exp'){A.res='';A.dmax='';A.dman=false;A.frac='';A.cons=''}if(!P2.norm){A.exp=[];A.eqn=[];A.cim=''}else if(P2.norm!=='full')A.cons=''},'o'));
  const vars=P?splitL(P.v):[];$p('varw').hidden=!vars.length;chipBtns($p('var'),vars,v=>A.variant===v,v=>A.variant=A.variant===v?'':v);
  const po=P?splitL(P.o):[];$p('pow').hidden=!po.length;chipBtns($p('popt'),po,v=>A.popt.includes(v),v=>A.popt=A.popt.includes(v)?A.popt.filter(x=>x!==v):A.popt.concat(v),'o');
  $p('mixw').hidden=!(P&&P.mix);if(P&&P.mix){A.mix=A.mix||[];chipBtns($p('mix'),(CFG.gran||[]).filter(g=>g.f).map(fracLbl),v=>A.mix.includes(v),v=>A.mix=A.mix.includes(v)?A.mix.filter(x=>x!==v):A.mix.concat(v));if(document.activeElement!==$p('mixt'))$p('mixt').value=A.mixT||''}
  $p('rtw').hidden=!(P&&P.rt);if(P&&P.rt)chipBtns($p('rt'),splitL(P.rt),v=>A.rt===v,v=>A.rt=A.rt===v?'':v,'o');
  $p('tw').hidden=!(P&&P.temp);if(document.activeElement!==$p('temp'))$p('temp').value=A.temp;
  {const ok=okOpts(P);$p('opt').closest('.field').hidden=!ok.length;A.opts=A.opts.filter(o=>ok.includes(o))}
  {const on=A.opts.includes('Colorant');$p('colw').hidden=!on;if(!on)A.color='';if(document.activeElement!==$p('col'))$p('col').value=A.color||''}
  chipBtns($p('opt'),okOpts(P),v=>A.opts.includes(v),v=>A.opts=A.opts.includes(v)?A.opts.filter(x=>x!==v):A.opts.concat(v),'o');
  {const lv=needLevel(A.exp);const c=cimFor(lv);if(lv&&c&&!cimOK(A.cim||baseCim(),lv))A.cim=c.n}
  chipBtns($p('cim'),CFG.cims.map(c=>c.n),v=>(A.cim||baseCim())===v,v=>A.cim=v===baseCim()?'':v,'',baseCim());$p('cim').querySelectorAll('button').forEach(b=>{const c=CFG.cims.find(c=>c.n===b.dataset.v);if(c&&cT(c)!=='base'){b.classList.add('o');b.title=cT(c)==='srpm'?'SR PM':'PM'}});
  const last=LAST;if($p('last')){$p('last').innerHTML=last.map((s,i)=>`<button type="button" class="ch" data-i="${i}" style="font-weight:500">${esc(s)}</button>`).join('');
  $p('last').querySelectorAll('button').forEach(b=>b.onclick=()=>{aTouch();const g=parse(last[+b.dataset.i]);{const labs=(CFG.gran||[]).map(fracLbl);A.mix=(g.mix||[]).filter(x=>labs.includes(x));A.mixT=(g.mix||[]).filter(x=>!labs.includes(x)).join(' + ')}Object.assign(A,{att:g.att,spec:g.spec,prod:g.prod,variant:g.variant,popt:g.popt,temp:g.temp,res:g.res,dmax:g.dflt.d?'':g.dmax,dman:!!(g.dmax&&!dList().includes(g.dmax)),frac:g.frac||'',cons:g.dflt.c?'':g.cons,exp:g.exp,opts:g.opts,cim:g.cim===baseCim()?'':g.cim});after(p)})}
  $p('att').checked=!!A.att;
}
function aObj(A){A=A||ST.a;const o=autoPM(Object.assign(aObj0(A),{att:!!A.att}));if(A.att&&!A.spec&&!A.res&&!A.exp.length&&!A.dmax&&!A.cons&&!A.dman){o.dmax='';o.cons='';o.frac=''}return o}
function aObj0(A){const o=aObj00(A);const P=A.spec?prodOf(A.prod):null;if(P&&P.gm==='dD'){const fr0=String(A.frac||'').split(' ')[0];const m=fr0.replace(',','.').match(/^([\d.]+)\/([\d.]+)$/);o.frac='';o.dflt.d=false;if(m){o.dmin=fr(+m[1]);o.dmax='D'+fr(+m[2]);o.dlab=A.frac}else{o.dmax='';o.dmin=''}}if(P&&P.mix){o.mix=(A.mix||[]).concat(A.mixT&&A.mixT.trim()?[A.mixT.trim()]:[]);const ds=(A.mix||[]).map(x=>dOf(x.split(' ')[0])).filter(Boolean).sort((a,b)=>dNum(b)-dNum(a));if(ds.length&&!A.dmax&&!A.dman){o.dmax=ds[0];o.dflt.d=false;o.frac=''}}
  if(P&&P.expMin&&!o.exp.length){o.exp=[P.expMin];o.expDef=true}return o}
function aObj00(A){const P=A.spec?prodOf(A.prod):null;const NE=!A.spec||!!(P&&P.norm),N=NE&&!(P&&P.norm==='exp'),NC=!A.spec||!!(P&&P.norm==='full');const any=!A.spec||A.res||A.exp.length||!!(P&&(P.expMin||P.mix));const DM=!!(P&&P.dm);
  return {cl:CFG.clOn&&N&&any?(A.cl||CFG.clDef):'',color:A.opts.includes('Colorant')?(A.color||''):'',spec:A.spec,prod:A.prod,variant:A.variant,popt:A.popt,temp:P&&P.temp?A.temp:'',rt:P&&P.rt?(A.rt||''):'',res:N?A.res:'',dmax:(N&&any)||DM?(A.dman?A.dmax:(A.dmax||dDefP(P))):'',frac:(N&&any)||DM?A.frac:'',cons:NC&&any?(A.cons||CFG.cDef):'',exp:NE?A.exp:[],opts:A.opts,cim:A.cim||baseCim(),sap:A.sap.trim(),dflt:{d:!A.dmax&&!A.dman&&!DM,c:!A.cons},eqn:NE?(A.eqn||[]).map(x=>x+' → '+eqMap()[x]):[]}}
function bindPanel(){['fx'].forEach(p=>{const $p=id=>$(p+'-'+id),A=()=>ST[p];
  $p('att').onchange=e=>{touch(p);A().att=e.target.checked;after(p)};
  $p('spec').onchange=e=>{touch(p);UI[p]=e.target.checked;A().spec=e.target.checked;if(!A().spec){A().prod='';A().variant='';A().popt=[]}after(p)};
  $p('dman').oninput=e=>{touch(p);const P=A().spec?prodOf(A().prod):null;if(P&&P.gm==='dD'){const v=e.target.value.replace(/[^\d.,\/]/g,'');e.target.value=v;A().frac=v;after(p);return}const v=e.target.value.replace(/[^\d.,]/g,'');e.target.value=v;A().dmax=v?'D'+fr(+v.replace(',','.')):'';after(p)};
  $p('temp').oninput=e=>{touch(p);A().temp=e.target.value.replace(/[^\d-]/g,'').slice(0,3);after(p)};
  $p('mixt').oninput=e=>{touch(p);A().mixT=e.target.value;after(p)};
  $p('col').oninput=e=>{touch(p);A().color=e.target.value.toUpperCase().replace(/\s+/g,'');after(p)};
});}

/* ================= B : saisie rapide ================= */
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const splitL=s=>String(s||'').includes(',')?String(s).split(/\s*,\s*/).filter(Boolean):String(s||'').split(/\s+/).filter(Boolean);
const pWords=P=>[...new Set(norm(P.n).split(/\s+/).concat(norm(P.k||'').split(/\s+/)).filter(Boolean))];
const autoK=n=>{const w=norm(n).split(/\s+/);return [...new Set([w.map(x=>x.slice(0,3)).join(''),w[w.length-1].slice(0,3),norm(n).replace(/\s+/g,'')])].join(' ')};
function vScore(v,w){const vw=norm(v).split(/\s+/);if(norm(v).replace(/\s+/g,'')===w)return 2;return vw.some(x=>x===w||(/\d/.test(x)&&/^\d+$/.test(w)&&x.replace(/\D/g,'')===w)||(w.length>=3&&!/^\d/.test(w)&&x.startsWith(w)))?1:0}
function parse(txt){
  const f={att:false,color:'',mix:[],expW:{},cl:'',rt:'',dmin:'',spec:false,prod:'',variant:'',popt:[],temp:'',res:'',dmax:'',frac:'',cons:'',exp:[],opts:[],cim:'',sap:'',unk:[],toks:[],dflt:{}};
  const words=norm(String(txt).replace(/(^|\s)à(?=\s)/g,' ')).replace(/(-?\d{1,2})\s*°\s*c?/g,' t$1 ').replace(/[·,;]/g,' ').split(/\s+/).filter(w=>w&&w!=='à')
    .flatMap(w=>{const m=/^([a-z]{3,})(\d{1,2})$/.exec(w);return m&&CFG.prods.some(p=>pWords(p).includes(m[1]))?[m[1],m[2]]:[w]});
  // 1. produit spécial : celui dont le plus de mots sont tapés (« agilia chape » > « agilia »), sinon une variante tapée seule (« nivel »)
  let P=null,best=0;for(const p of CFG.prods){const s=new Set(words.filter(w=>pWords(p).includes(w))).size;if(s>best){best=s;P=p}}
  const isRes=w=>/^c\d{1,2}(\/\d{1,2})?$/.test(w);
  if(!P){const hits=CFG.prods.filter(p=>splitL(p.v).some(v=>words.some(w=>!isRes(w)&&((w.length>=2&&!/^\d/.test(w)&&norm(v).replace(/\s+/g,'')===w)||(w.length>=4&&!/^\d/.test(w)&&norm(v).split(/\s+/).some(x=>x.startsWith(w)))))));if(hits.length===1)P=hits[0]}
  const used=new Set();
  if(P){f.spec=true;f.prod=P.n;words.forEach((w,i)=>{if(pWords(P).includes(w))used.add(i)});
    // 2. variante : celle qui reprend le plus de mots tapés ; égalité = on ne choisit pas
    const rest=words.map((w,i)=>[w,i]).filter(([w,i])=>!used.has(i));const sc=splitL(P.v).map(v=>{const m=rest.filter(([w])=>vScore(v,w));return [v,m.reduce((a,[w])=>a+vScore(v,w),0),m]}).filter(x=>x[1]>0).map(x=>x.concat(norm(x[0]).split(/\s+/).length)).sort((a,b)=>b[1]-a[1]||a[3]-b[3]);
    if(sc.length&&(sc.length===1||sc[0][1]>sc[1][1]||sc[0][3]<sc[1][3])){f.variant=sc[0][0];sc[0][2].forEach(([w,i])=>used.add(i))}}
  const NE=!P||!!P.norm,N=NE&&!(P&&P.norm==='exp'),NC=!P||P.norm==='full',po=P?splitL(P.o):[];
  let colNext=false,sableNext=false,retNext=false;const rts=P&&P.rt?splitL(P.rt):[];const rtMatch=w=>rts.find(v=>{const c=norm(v).replace(/\s+/g,'');return c===w||c.startsWith(w)&&w.length>=4||(/^\d+$/.test(w)&&c===w+'h')})||'';
  words.forEach((w,i)=>{let k=used.has(i);const wasCol=colNext;colNext=false;const wasSable=sableNext;sableNext=false;const wasRet=retNext;retNext=false;
    if(k){}
    else if(P&&po.some(o=>norm(o)===w)){const o=po.find(o=>norm(o)===w);if(!f.popt.includes(o))f.popt.push(o);k=true}
    else if(P&&P.temp&&/^t-?\d{1,2}$/.test(w)){f.temp=w.slice(1);k=true}
    else if(rts.length&&/^(ret|retard|retarde)$/.test(w)){retNext=true;k=true}
    else if(rts.length&&(wasRet||!/^\d+$/.test(w))&&rtMatch(w)){f.rt=rtMatch(w);k=true}
    else if(wasCol&&!optsAll().some(o=>o[1].includes(w))){f.color=w.toUpperCase();k=true}
    else if(/^pp\d{2,4}$/.test(w)){f.color=w.toUpperCase();if(okOpts(P).includes('Colorant')){if(!f.opts.includes('Colorant'))f.opts.push('Colorant');k=true}else f.refused=(f.refused||[]).concat('Colorant')}
    else if(optsAll().some(o=>o[1].includes(w))){const o=optsAll().find(o=>o[1].includes(w))[0];if(okOpts(P).includes(o)){if(!f.opts.includes(o))f.opts.push(o);k=true;if(o==='Colorant')colNext=true}else f.refused=(f.refused||[]).concat(o)}
    else if(CFG.cims.some(c=>norm(c.k||'').split(/\s+/).includes(w))){f.cim=CFG.cims.find(c=>norm(c.k||'').split(/\s+/).includes(w)).n;k=true}
    else if(NC&&/^s[1-5]$/.test(w)){f.cons=w.toUpperCase();k=true}
    else if(NE&&(/^x(0|c[1-4]|d[1-3]|s[1-3]|f[1-4]|a[1-3])$/.test(w)||/^(c[1-4]|d[1-3]|f[1-4]|a[1-3])$/.test(w))){let e=(w[0]==='x'?w:'x'+w).toUpperCase();const q=eqMap()[e];if(q&&!CFG.exp.includes(e)){f.eqn=(f.eqn||[]).concat(e+' → '+q);e=q}f.expW[e]=w;if(e==='X0')f.exp=['X0'];else{f.exp=f.exp.filter(x=>x!=='X0');if(!f.exp.includes(e))f.exp.push(e)}k=true}
    else if(N&&/^c\d{1,2}(\/\d{1,2})?$/.test(w)){const r=RES.find(r=>r.startsWith('C'+w.slice(1).split('/')[0]+'/'));if(r){f.res=r;f.resW=w;k=true}}
    else if(N&&/^d\d{1,2}([.,]\d)?$/.test(w)){f.dmax='D'+fr(+w.slice(1).replace(',','.'));k=true}
    else if(N&&RES.includes('C'+w)){f.res='C'+w;f.resW=w;k=true}
    else if(P&&P.mix&&wasSable){f.mix.push('sable '+w);k=true}
    else if(P&&P.mix&&/^\d{1,2}\/\d{1,2}$/.test(w)){const g=(CFG.gran||[]).find(g=>g.f.replace(/\s/g,'')===w);const l=g?fracLbl(g):w;if(!f.mix.includes(l))f.mix.push(l);k=true}
    else if(P&&P.mix&&/^sables?$/.test(w)){sableNext=true;k=true}
    else if(P&&P.gm==='dD'&&/^[\d.,]{1,4}\/[\d.,]{1,4}$/.test(w)){const m=w.replace(/,/g,'.').split('/');f.dmin=fr(+m[0]);f.dmax='D'+fr(+m[1]);const g=(CFG.gran||[]).find(g=>g.f.replace(/\s/g,'')===w);if(g&&g.o)f.dlab=fracLbl(g);k=true}
    else if(/^dmin[\d.,]+$/.test(w)){f.dmin=fr(+w.slice(4).replace(',','.'));k=true}
    else if(N&&/^\d{1,2}\/\d{1,2}$/.test(w)){const g=(CFG.gran||[]).find(g=>g.f.replace(/\s/g,'')===w);f.dmax=dOf(w);if(g&&fracsOf(f.dmax).length>1)f.frac=fracLbl(g);k=true}
    else if(N&&/^\d{1,2}$/.test(w)){const n=+w;const r=RES.find(r=>r.startsWith('C'+n+'/'));
      if(!f.res&&r){f.res=r;f.resW=w;k=true}else if(!f.dmax&&dList().includes('D'+n)){f.dmax='D'+n;k=true}else if(!f.dmax&&f.res&&n>=4&&n<=32){f.dmax='D'+n;k=true}}
    else if(CFG.clOn&&N&&/^cl[\d.,]+$/.test(w)){const c=clOf(w.slice(2));if(c){f.cl=c;k=true}}
    else if(/^(att|attente)$/.test(w)){f.att=true;k=true}
    else if(/^\d{8}$/.test(w)){f.sap=w;k=true}
    f.toks.push([w,k]);if(!k)f.unk.push(w);
  });
  if(P&&P.mix&&f.mix.length&&!f.dmax){const ds=f.mix.map(x=>dOf(x.split(' ')[0])).filter(Boolean).sort((a,b)=>dNum(b)-dNum(a));if(ds.length)f.dmax=ds[0]}
  if(P&&P.expMin&&!f.exp.length){f.exp=[P.expMin];f.expDef=true}
  if(P&&P.dm&&!f.dmax){f.dmax=dDefP(P)}
  if(P&&P.dm&&f.dmax&&!dListP(P).includes(f.dmax))f.dmP=dListP(P);
  if(CFG.clOn&&N&&(f.res||f.exp.length)&&!f.cl)f.cl=CFG.clDef;
  if(N&&(f.res||f.cons||f.exp.length)){if(!f.dmax){f.dmax=CFG.dDef;f.dflt.d=true}if(NC&&!f.cons){f.cons=CFG.cDef;f.dflt.c=true}}
  if(!f.cim)f.cim=baseCim();
  return autoPM(f);
}
let sel=0,suggL=[];
function renderB(){
  const v=$('fx-q').value;const f=parse(v);const sap=$('fx-sap').value.trim();if(sap)f.sap=sap;
  ST.fx=fromParse(f);if(UI.fx&&!ST.fx.spec)ST.fx.spec=true;renderPanel('fx');$('fx-help').hidden=!v.trim()||bChip;$('fx-toks').hidden=bChip;
  $('fx-out').innerHTML=v.trim()?fmt(f,true):'<span class="ph">—</span>';
  {const fl=flagsOf(f);$('fx-toks').innerHTML=f.toks.map(([w,k])=>`<span class="${!k?'u':fl.has(w)?'u':'k'}" ${fl.has(w)?'title="À vérifier (voir l\'alerte)"':''}>${esc(w)}</span>`).join('')}
  const w=warnOf(f);$('fx-warn').hidden=!w;$('fx-warn').textContent=w;$('fx-nf').innerHTML=$('fx-q').value.trim()?infoHtml(f):'';
  // propositions : dernières formules du client qui contiennent ce qui est tapé
  const cl=LAST;const nv=norm(v).trim();
  const typedFmt=norm(fmt(f));
  suggL=cl.filter(s=>!nv||norm(s).includes(nv)||nv.split(/\s+/).every(t=>norm(s).replace(/[\/·]/g,' ').split(/\s+/).some(x=>x.startsWith(t)||x.replace(/^[cd]/,'').startsWith(t)))).slice(0,4);
  if(sel>=suggL.length)sel=0;
  $('fx-sugg').innerHTML=suggL.map((s,i)=>`<button type="button" role="option" class="${i===sel?'on':''}" aria-selected="${i===sel}" data-i="${i}"><span class="fx"><span class="norm">${esc(s)}</span></span><small>déjà commandée</small></button>`).join('');
  $('fx-sugg').querySelectorAll('button').forEach(b=>b.onclick=()=>{take(+b.dataset.i);$('fx-q').focus()});
  if(onChange)onChange();
  return f;
}
function take(i){const s=suggL[i];if(!s)return;$('fx-q').value=s.replace(/ · /g,' ').replace(/C(\d+)\/\d+/,'c$1').replace(/D(\d+)/,'d$1');renderB()}
function flash(el){el.animate&&el.animate([{boxShadow:'0 0 0 3px var(--orange)'},{boxShadow:'0 0 0 0 transparent'}],{duration:600})}

/* ---------- réglages de la centrale ---------- */
function cbList(title,all,on,key,extra){return `<div class="cfg-s"><span class="lbl">${title}</span><div class="chips">${all.map(v=>`<label class="cb ${on.includes(v)?'':'off'}"><input type="checkbox" data-k="${key}" data-v="${esc(v)}" ${on.includes(v)?'checked':''}>${esc(v)}</label>`).join('')}</div>${extra||''}</div>`}
function cbList2(title,all,on,key,extra){return `<div class="cfg-s in"><span class="lbl">${title}</span><div class="chips">${all.map(v=>`<label class="cb ${on.includes(v)?'':'off'}"><input type="checkbox" data-k="${key}" data-v="${esc(v)}" ${on.includes(v)?'checked':''}>${esc(v)}</label>`).join('')}</div>${extra||''}</div>`}
const linkEd=new Set();
function prodCfg(p,i){const urls=splitL(p.url);
  return `<div class="pcfg"><div class="pl1"><span class="pnum">${i+1}</span><input class="inp" data-pi="${i}" data-f="g" value="${esc(p.g||'')}" aria-label="Gamme" style="width:110px" title="Gamme"><input class="inp" data-pi="${i}" data-f="n" value="${esc(p.n)}" aria-label="Produit" style="flex:1;min-width:120px;font-weight:700"><select class="inp" data-pi="${i}" data-f="gm" aria-label="Granulométrie" style="height:30px;font-size:13px" title="Granulométrie demandée"><option value="" ${p.gm!=='dD'?'selected':''}>Dmax</option><option value="dD" ${p.gm==='dD'?'selected':''}>Dmin / Dmax</option></select><select class="inp" data-pi="${i}" data-f="norm" aria-label="Classe de la norme" style="height:30px;font-size:13px"><option value="" ${!p.norm?'selected':''}>Sans classe norme</option><option value="exp" ${p.norm==='exp'?'selected':''}>+ expositions seules</option><option value="res" ${p.norm==='res'?'selected':''}>+ classe, gravillon, expo</option><option value="full" ${p.norm==='full'?'selected':''}>+ classe, gravillon, consistance, expo</option></select><select class="inp" data-pi="${i}" data-f="chg" aria-label="Chargement des camions" style="height:30px;font-size:13px" title="Plein : camion chargé à sa capacité (8x4 7,5 m³). Fluide : jamais au maximum (8x4 7 m³, 4x2 3,5 m³, réglable dans Camions et pompes)">${(c=>`<option value="plein" ${c!=='fluide'?'selected':''}>Chargement plein</option><option value="fluide" ${c==='fluide'?'selected':''}>Chargement réduit (fluide)</option>`)(p.chg||(/chape/i.test(p.g||'')?'fluide':'plein'))}</select>
    <span class="pacts">${urls.map((u,k)=>`<a class="lbl" data-pl="${i}" href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--orange)" title="Ouvrir · clic droit : modifier les liens">fiche${urls.length>1?' '+(k+1):''} ↗</a>`).join('')}<button type="button" class="x" data-pl="${i}" title="Modifier les liens des fiches" aria-label="Modifier les liens de ${esc(p.n)}">✎</button><button type="button" class="x" data-pd="${i}" title="Dupliquer ce produit" aria-label="Dupliquer ${esc(p.n)}">⧉</button><button type="button" class="x" data-px="${i}" title="Retirer" aria-label="Retirer ${esc(p.n)}">×</button></span></div>
    ${linkEd.has(i)?`<div class="pl2"><input class="inp" data-pi="${i}" data-f="url" value="${esc(p.url||'')}" placeholder="Liens des fiches, séparés par des virgules (https://…)" aria-label="Liens des fiches"></div>`:''}
    <div class="pl2"><input class="inp" data-pi="${i}" data-f="v" value="${esc(p.v||'')}" aria-label="Variantes" placeholder="Variantes"><input class="inp" data-pi="${i}" data-f="o" value="${esc(p.o||'')}" aria-label="Options du produit" placeholder="Options du produit (ex. ASP, SF2, Métal)"><input class="inp" data-pi="${i}" data-f="rt" value="${esc(p.rt||'')}" aria-label="Temps de retard" placeholder="Temps de retard (ex. 6 h, Journée)" style="flex:.7"><input class="inp" data-pi="${i}" data-f="dm" value="${esc(p.dm||'')}" aria-label="Gravillons permis" placeholder="Gravillons / Dmax permis (ex. 2/6, 4/6)" style="flex:.7"></div>
    <div class="pl1 pl3"><span class="lbl">Options permises</span>${optsAll().map(o=>`<label class="cb"><input type="checkbox" data-go="${i}" data-v="${esc(o[0])}" ${okOpts(p).includes(o[0])?'checked':''}>${esc(o[0])}</label>`).join('')}<label class="cb"><input type="checkbox" data-pi="${i}" data-f="temp" ${p.temp?'checked':''}>T° chantier</label><label class="cb" title="Sur la ligne, n'écrire que la variante (ex. BC3 au lieu de BC BC3)"><input type="checkbox" data-pi="${i}" data-f="hide" ${p.hide?'checked':''}>variante seule</label><label class="cb" title="Choix de plusieurs gravillons / sables (bétons décoratifs)"><input type="checkbox" data-pi="${i}" data-f="mix" ${p.mix?'checked':''}>mélange granulats</label><label class="cb" title="Exposition minimale du produit, mise par défaut">expo mini <input class="inp" data-pi="${i}" data-f="expMin" value="${esc(p.expMin||'')}" placeholder="—" style="width:54px;height:24px"></label></div></div>`}
function renderCfg(){
  const b=$('fxc-cfg-b');
  b.innerHTML=`<div class="cfg-s full"><span class="lbl">Gravillons de la centrale</span><div class="prods gran">${(CFG.gran||[]).map((g,i)=>`<div class="prod" style="grid-template-columns:80px minmax(0,1fr) 54px 28px"><input class="inp" data-gi="${i}" data-f="f" value="${esc(g.f)}" aria-label="Fraction d/D" placeholder="6/20"><input class="inp" data-gi="${i}" data-f="o" value="${esc(g.o||'')}" aria-label="Origine" placeholder="Origine (carrière, roulé…)"><span class="mono" style="font-size:12px;color:var(--muted)">→ ${esc(dOf(g.f)||'?')}</span><button type="button" class="x" data-gx="${i}" aria-label="Retirer ${esc(g.f)}">×</button></div>`).join('')}</div><div class="addf"><button class="btn" type="button" id="fxc-add-g">+ Gravillon</button></div><span class="lbl" style="margin-top:4px">Dmax par défaut</span><div class="chips">${dList().map(v=>`<label class="cb"><input type="radio" name="ddef" data-dd="${esc(v)}" ${CFG.dDef===v?'checked':''}>${esc(v)}</label>`).join('')}</div><p>Le Dmax proposé à la saisie vient de ces fractions (6/20 → D20). Deux gravillons de même D (2/6 et 4/6) donnent un seul D6, avec un choix précis facultatif. Un Dmax absent reste possible en saisie manuelle (« Autre… » ou « d10 »).</p></div>`
   +cbList('Résistances proposées',RES,CFG.res,'res')
   +`<div class="cfg-s"><span class="lbl">Consistances</span><div class="chips">${CONS.map(v=>`<label class="cb ${CFG.cons.includes(v)?'':'off'}"><input type="checkbox" data-k="cons" data-v="${v}" ${CFG.cons.includes(v)?'checked':''}>${v}<input type="radio" name="cdef" data-cd="${v}" ${CFG.cDef===v?'checked':''} title="Par défaut" style="margin-left:4px"></label>`).join('')}</div><p>Case : proposée · rond : valeur par défaut. SF1 à SF3 : voir Agilia dans les produits spéciaux.</p><span class="lbl sub2">Chlorures (NA.5.2.8)</span><label class="cb" style="align-self:flex-start"><input type="checkbox" id="fxc-cfg-clon" ${CFG.clOn?'checked':''}> Afficher et choisir la classe de chlorures</label>${CFG.clOn?`<div class="chips">${CLS.map(([c,d])=>`<label class="cb" title="${esc(d)}"><input type="radio" name="cldef" data-cl="${c}" ${CFG.clDef===c?'checked':''}>${c}</label>`).join('')}</div><p>Valeur par défaut cochée. Cl 0,40 : armé · Cl 1,0 : sans armature · Cl 0,20 : précontraint · Cl 0,65 : armé en CEM III. Saisie rapide : « cl1 », « cl020 ».</p>`:'<p>Désactivé : la classe de chlorures n\'apparaît ni à la saisie, ni sur la ligne, ni dans la désignation.</p>'}</div>`
   +`<div class="cfg-s full"><div class="two-c"><div>`+cbList2('Expositions proposées',EXP_ALL,CFG.exp,'exp',`<span class="lbl" style="margin-top:6px">Équivalences (saisie rapide)</span><input class="inp" id="fxc-cfg-eq" value="${esc(CFG.eq||'')}" style="height:30px;font:500 13px var(--mono)" aria-label="Équivalences"><p>Une classe non proposée tapée au clavier est remplacée par celle qui la couvre (ex. XC3=XF1).</p><label class="cb" style="margin-top:8px;align-self:flex-start"><input type="checkbox" id="fxc-cfg-single" ${CFG.single?'checked':''}> Une seule classe d'exposition par formule</label><span class="lbl" style="margin-top:6px">Couvertures supplémentaires (facultatif)</span><input class="inp" id="fxc-cfg-cov" value="${esc(CFG.cov||'')}" placeholder="ex. XS1=XA1" style="height:30px;font:500 13px var(--mono)" aria-label="Couvertures supplémentaires"><p>Une classe couvre les autres quand elle est au moins aussi exigeante sur la résistance, l'E/C, le liant, l'air et le ciment. Une règle ajoutée ici qui ne respecte pas le tableau est signalée en rouge.</p><p id="fxc-cov-chk">${covCheck()}</p>`)+`</div><div class="covbox"><span class="lbl">Couvertures calculées depuis NA.F.1</span><p class="mono covl">${Object.entries(covMap()).filter(([a])=>CFG.exp.includes(a)).map(([a,l])=>`<b>${a}</b> → ${l.filter(c=>c!=='X0').join(' ')||'X0'}`).join('<br>')}</p></div></div></div>`
   +`<div class="cfg-s full"><span class="lbl">Liants (ciments)</span><div class="prods cims"><div class="prod-h"><span class="lbl">Liant</span><span class="lbl">Mots-clés (saisie rapide)</span><span class="lbl">Court (sur la ligne) · type</span><span></span></div>${CFG.cims.map((c,i)=>`<div class="prod"><input class="inp" data-ci="${i}" data-f="n" value="${esc(c.n)}" aria-label="Nom du ciment"><input class="inp" data-ci="${i}" data-f="k" value="${esc(c.k||'')}" aria-label="Mots-clés"><span style="display:flex;gap:6px;align-items:center;min-width:0"><input class="inp" data-ci="${i}" data-f="s" value="${esc(c.s||'')}" aria-label="Libellé court" placeholder="ex. PM" style="width:70px">${[['base','Base'],['pm','PM'],['srpm','SR PM']].map(([v,l])=>`<label class="cb"><input type="radio" name="ct${i}" data-ct="${i}" value="${v}" ${cT(c)===v?'checked':''}> ${l}</label>`).join('')}</span><button type="button" class="x" data-cx="${i}" aria-label="Retirer">×</button></div>`).join('')}</div><div class="addf"><button class="btn" type="button" id="fxc-add-c">+ Ciment</button></div><p>Le liant de base n'apparaît jamais sur la ligne : toute formule sans autre liant est faite avec lui. Un autre liant s'affiche en orange. Chaque liant a un seul type : Base, PM ou SR PM. Quand l'exposition demande du PM, un liant PM ou SR PM convient (le PM est pris en premier) ; quand elle demande du SR PM, seul un liant SR PM convient. Si plusieurs liants de base, le premier de la liste sert pour les formules courantes.</p><span class="lbl" style="margin-top:6px">Liant imposé par exposition</span><div class="chips">${EXP_ALL.filter(x=>x!=='X0'&&CFG.exp.includes(x)).map(x=>{const imp=NF[x]&&NF[x][4]==='PM';const v=reqOf(x);return `<label class="cb ${v?'':'off'}" ${imp?'title="PM imposé par le tableau NA.F.1"':''}>${x}<select data-pmx="${x}" style="margin-left:4px;font:500 12px var(--mono);background:transparent;border:1px solid var(--line2);height:22px">${imp?'':`<option value="" ${!v?'selected':''}>—</option>`}<option value="PM" ${v==='PM'?'selected':''}>PM ou SR PM</option><option value="SRPM" ${v==='SRPM'?'selected':''}>SR PM</option></select></label>`}).join('')}</div><p>Pour chaque exposition : liant de base (—), PM ou SR PM. XS2 et XS3 : PM au minimum (tableau NA.F.1). Le SR PM se garde pour les sels de déverglaçage (XD3, XF4) ou les sulfates forts (XA), selon les règles de la centrale.</p></div>`
   +`<div class="cfg-s"><span class="lbl">Fibres</span><div class="prods">${(CFG.fibres||[]).map((f,i)=>`<div class="prod" style="grid-template-columns:110px minmax(0,1fr) 28px"><input class="inp" data-fi="${i}" data-f="n" value="${esc(f.n)}" aria-label="Nom court (sur la ligne)" placeholder="ex. FPP"><input class="inp" data-fi="${i}" data-f="d" value="${esc(f.d||'')}" aria-label="Description" placeholder="ex. Fibres synthétiques"><button type="button" class="x" data-fx="${i}" aria-label="Retirer ${esc(f.n)}">×</button></div>`).join('')}</div><div class="addf"><button class="btn" type="button" id="fxc-add-f">+ Type de fibres</button></div><p>Chaque type devient une option cochable (« FPP », « Synthétiques »…). Saisie rapide : le nom court.</p></div>`
   +`<div class="cfg-s full"><span class="lbl">Produits spéciaux, rangés par gamme</span><div class="prods">${CFG.prods.map(prodCfg).join('')}</div><div class="addf"><button class="btn" type="button" id="fxc-add-p">+ Produit spécial</button><button class="btn" type="button" id="fxc-cfg-reset">Remettre les réglages d'origine</button></div><p>Variantes, options, liens et gravillons : séparés par des virgules. « Classe norme » : le produit garde les menus de la norme en plus de sa variante. Liens des fiches : clic droit sur « fiche », ou le crayon ✎. Saisie rapide : le nom du produit ou ses 3 premières lettres, ou directement une variante (« nivel », « coulis »).</p></div>`;
  b.querySelectorAll('[data-k]').forEach(i=>i.onchange=()=>{const k=i.dataset.k,v=i.dataset.v;CFG[k]=i.checked?(k==='exp'?EXP_ALL:k==='res'?RES:CONS).filter(x=>CFG[k].includes(x)||x===v):CFG[k].filter(x=>x!==v);done()});
  $('fxc-cfg-clon').onchange=e=>{CFG.clOn=e.target.checked;done()};
  b.querySelectorAll('[data-cl]').forEach(i=>i.onchange=()=>{CFG.clDef=i.dataset.cl;done()});
  b.querySelectorAll('[data-dd]').forEach(i=>i.onchange=()=>{CFG.dDef=i.dataset.dd;done()});
  b.querySelectorAll('[data-cd]').forEach(i=>i.onchange=()=>{CFG.cDef=i.dataset.cd;if(!CFG.cons.includes(CFG.cDef))CFG.cons.push(CFG.cDef);done()});
  b.querySelectorAll('[data-gi]').forEach(i=>i.onchange=()=>{CFG.gran[+i.dataset.gi][i.dataset.f]=i.value.trim();if(!dList().includes(CFG.dDef))CFG.dDef=dList().slice(-1)[0]||'';done()});
  b.querySelectorAll('[data-gx]').forEach(x=>x.onclick=()=>{CFG.gran.splice(+x.dataset.gx,1);if(!dList().includes(CFG.dDef))CFG.dDef=dList().slice(-1)[0]||'';done()});
  $('fxc-add-g').onclick=()=>{CFG.gran.push({f:'',o:''});done()};
  if(0)b.querySelectorAll('[data-rmd]').forEach(x=>x.onclick=e=>{e.preventDefault();if(CFG.dmax.length<=1)return;CFG.dmax=CFG.dmax.filter(v=>v!==x.dataset.rmd);if(CFG.dDef===x.dataset.rmd)CFG.dDef=CFG.dmax[0];done()});
  if(0)$('fxc-add-d-b').onclick=()=>{let v=$('fxc-add-d').value.trim().toUpperCase().replace('.',',');if(!v)return;if(!v.startsWith('D'))v='D'+v;if(!CFG.dmax.includes(v))CFG.dmax.push(v);CFG.dmax.sort((a,b)=>parseFloat(a.slice(1).replace(',','.'))-parseFloat(b.slice(1).replace(',','.')));done()};
  b.querySelectorAll('[data-ci]').forEach(i=>i.onchange=()=>{CFG.cims[+i.dataset.ci][i.dataset.f]=i.value.trim();done(true)});
  b.querySelectorAll('[data-pmx]').forEach(i=>i.onchange=()=>{CFG.cimReq=CFG.cimReq||{};if(i.value)CFG.cimReq[i.dataset.pmx]=i.value;else delete CFG.cimReq[i.dataset.pmx];done()});
  b.querySelectorAll('[data-ct]').forEach(i=>i.onchange=()=>{CFG.cims[+i.dataset.ct].t=i.value;done()});
  b.querySelectorAll('[data-cx]').forEach(x=>x.onclick=()=>{if(CFG.cims.length<=1)return;CFG.cims.splice(+x.dataset.cx,1);done()});
  $('fxc-add-c').onclick=()=>{CFG.cims.push({n:'Nouveau liant',k:'',t:'base'});done()};
  b.querySelectorAll('[data-pi]').forEach(i=>i.onchange=()=>{const p=CFG.prods[+i.dataset.pi];const f=i.dataset.f;p[f]=i.type==='checkbox'?i.checked:(f==='expMin'?i.value.trim().toUpperCase():i.value.trim());if(f==='n')p.k=autoK(p.n);done(f!=='norm'&&f!=='chg'&&f!=='temp'&&f!=='g'&&f!=='hide'&&f!=='url'&&f!=='dm'&&f!=='mix'&&f!=='expMin'&&f!=='gm')});
  b.querySelectorAll('[data-go]').forEach(c=>c.onchange=()=>{const P=CFG.prods[+c.dataset.go];let l=okOpts(P);l=c.checked?optsAll().map(o=>o[0]).filter(o=>l.includes(o)||o===c.dataset.v):l.filter(o=>o!==c.dataset.v);P.go=l.join(', ');done()});
  b.querySelectorAll('[data-px]').forEach(x=>x.onclick=()=>{CFG.prods.splice(+x.dataset.px,1);done()});
  b.querySelectorAll('[data-pd]').forEach(x=>x.onclick=()=>{const i=+x.dataset.pd;const c=JSON.parse(JSON.stringify(CFG.prods[i]));c.n=c.n+' (copie)';c.k=autoK(c.n);CFG.prods.splice(i+1,0,c);done()});
  b.querySelectorAll('[data-pl]').forEach(x=>{const t=()=>{const i=+x.dataset.pl;linkEd.has(i)?linkEd.delete(i):linkEd.add(i);renderCfg();const el=b.querySelector(`[data-pi="${i}"][data-f="url"]`);el&&el.focus()};x.oncontextmenu=e=>{e.preventDefault();t()};if(x.tagName==='BUTTON')x.onclick=t});
  b.querySelectorAll('[data-fi]').forEach(i=>i.onchange=()=>{CFG.fibres[+i.dataset.fi][i.dataset.f]=i.value.trim();done()});
  b.querySelectorAll('[data-fx]').forEach(x=>x.onclick=()=>{CFG.fibres.splice(+x.dataset.fx,1);done()});
  $('fxc-add-f').onclick=()=>{CFG.fibres.push({n:'',d:'',k:''});done()};

  $('fxc-add-p').onclick=()=>{CFG.prods.push({g:'Autres',n:'Nouveau',k:'nou nouveau',v:'',o:'',norm:''});done()};
  $('fxc-cfg-single').onchange=e=>{CFG.single=e.target.checked;done()};
  $('fxc-cfg-cov').onchange=e=>{CFG.cov=e.target.value.trim();done(true);$('fxc-cov-chk').innerHTML=covCheck()};
  $('fxc-cfg-eq').onchange=e=>{CFG.eq=e.target.value.trim();done(true)};
  $('fxc-cfg-reset').onclick=()=>{CFG=JSON.parse(JSON.stringify(CFG0));done()};
}
function done(keepFocus){save();if(!keepFocus)renderCfg();if($('fx-q'))renderB()}
/* ================= API pour le planning ================= */
const clone=o=>JSON.parse(JSON.stringify(o));
const merge=c=>Object.assign(clone(CFG0),clone(c||{}));
function mountHTML(){return `<div class="qwrap"><div class="qrow"><input class="qin" id="fx-q" autocomplete="off" spellcheck="false" placeholder="Formule : ce que dit le client (25 20 s4 c1 ret)" aria-label="Formule"><input class="qin qsap" id="fx-sap" inputmode="numeric" maxlength="8" placeholder="Code SAP" aria-label="Code SAP (8 chiffres maximum)"></div><div class="sugg" id="fx-sugg" role="listbox" aria-label="Dernières formules du client"></div></div>
  <div class="out"><div class="fx" id="fx-out"><span class="ph">—</span></div><div class="toks" id="fx-toks"></div><div class="warn" id="fx-warn" hidden></div><div class="nf" id="fx-nf"></div></div>
  <div class="help" id="fx-help" hidden>
    <code>25 20 s4 c1</code><span>résistance · Dmax · consistance · exposition (c1 = XC1 · <code>xs1</code> pour XS)</span>
    <code>ret acc hm fpp</code><span>options · <code>col pp152</code> colorant · <code>pm</code> liant PM</span>
    <code>agi · chr 15 · nivel</code><span>produit spécial : nom ou 3 lettres, puis variante (bag mortier…)</span>
    <code>att</code><span>produit en attente</span>
    <code>Tab</code><span>reprend une formule déjà commandée par le client</span>
  </div>
  <div id="fx-panel" class="panel rows"></div>`}
// texte de la formule pour la ligne du planning (sans le SAP)
// un mot non reconnu : on garde le texte tel qu'il est tapé, pour ne rien perdre (ex. « attente formule labo », anciennes formules)
function lineOf(txt){const raw=String(txt||'').trim();if(!raw)return '';const f=parse(raw);if(f.unk.length)return raw;f.sap='';return fmt(f)}
window.FX={
  setCfg(c){CFG=merge(c)},getCfg(){return clone(CFG)},defaults(){return clone(CFG0)},
  setLast(l){LAST=(l||[]).filter(Boolean).slice(0,6);if($('fx-q'))renderB()},
  line:lineOf,parse:t=>parse(t),
  mount(el,o){o=o||{};el.innerHTML=mountHTML();$('fx-panel').innerHTML=panelHTML('fx');ST.fx=blank();UI.fx=false;bChip=false;sel=0;LAST=(o.last||[]).slice(0,6);onChange=o.onChange||null;
    const q=$('fx-q');q.value=o.value||'';$('fx-sap').value=o.sap||'';bindPanel();
    q.addEventListener('input',()=>{bChip=false;sel=0;renderB()});
    q.addEventListener('keydown',e=>{
      if(e.key==='Tab'&&suggL.length&&!e.shiftKey&&!q.value.trim().includes(' ')){e.preventDefault();take(sel)}
      else if(e.key==='ArrowDown'&&suggL.length){e.preventDefault();sel=(sel+1)%suggL.length;renderB()}
      else if(e.key==='ArrowUp'&&suggL.length){e.preventDefault();sel=(sel-1+suggL.length)%suggL.length;renderB()}
      else if(e.key==='Enter'){e.preventDefault()}
      else if(e.key==='Escape'&&q.value){e.preventDefault();e.stopPropagation();q.value='';renderB()}});
    $('fx-sap').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,8);renderB()};
    renderB();
    return {text:()=>lineOf(q.value),raw:()=>q.value,sap:()=>$('fx-sap').value.trim(),set(v){q.value=v||'';bChip=false;renderB()},input:q,
      warn:()=>{const t=$('fx-warn');return t&&!t.hidden?t.textContent:''}}},
  admin(el,o){o=o||{};el.innerHTML='<div id="fxc-cfg-b" class="cfg-b"></div>';onSave=o.onSave||null;renderCfg()}
};
})();
