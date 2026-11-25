function buildDemo(){
  let seq=0;
  const clients=[
    {id:'c1',n:'BATISUD',t:'compte'},{id:'c2',n:'AZUR CONSTRUCTION',t:'compte'},{id:'c3',n:'MONTI BTP',t:'compte'},
    {id:'c4',n:'ESTÉREL TP',t:'compte'},{id:'c5',n:'RIVIERA GROS ŒUVRE',t:'compte'},{id:'c6',n:'COSTA MAÇONNERIE',t:'compte'},
    {id:'c7',n:'LITTORAL BÂTIMENT',t:'compte'},
    {id:'c8',n:'MARTIN Paul',t:'comptant',part:true,note:'Particulier, devis sur le bureau'},
    {id:'c9',n:'LEROY Sandrine',t:'comptant',part:true,note:'Particulier, devis sur le bureau'},
    {id:'c10',n:'DUPONT Marc',t:'comptant',part:true,note:'Particulier, devis sur le bureau'}];
  const chantiers=[
    ['h1','Résidence Les Oliviers','','c5'],['h2','Groupe scolaire Les Pins','2 av. des Pins, Cannes La Bocca','c1'],
    ['h3','','8 chemin des Genêts, Cannes','c8',1],['h4','Villa Sainte-Anne','','c6'],
    ['h5','Les Terrasses du Golfe','45 bd du Golfe, Mandelieu','c2'],['h6','ZA de la Siagne lot 4','Rue des Artisans, Mandelieu','c4'],
    ['h7','Lotissement Le Clos','Route du Clos, Mouans-Sartoux','c3'],['h8','Hôtel Bellevue piscine','12 rue Bellevue, Cannes','c7'],
    ['h9','','27 impasse des Lauriers, Le Cannet','c9',1],['h10','Parking Croisette niv. -2','','c5'],
    ['h11','EHPAD Les Mimosas','3 allée des Mimosas, Théoule','c1'],['h12','Pôle sportif des Bréguières','','c4'],
    ['h13','','5 chemin de la Source, Pégomas','c10',1],['h14','Immeuble Le Méridien','18 av. du Méridien, Cannes','c2'],
    ['h15',"Station d'épuration Siagne",'','c4'],['h16','Villa Les Pins Parasols','Chemin des Crêtes, Super-Cannes','c6'],
    ['h17','Résidence Le Vallon','','c7'],['h18','Voirie ZAC des Tourrades','ZAC des Tourrades, Mandelieu','c3'],
    ['h19','Clinique du Parc','Av. du Parc, Le Cannet','c1'],['h20','Mur de soutènement RD 6098','','c4']
  ].map(([id,nom,adr,cl,ot])=>({id,nom,adr,cl,ot:!!ot}));
  const formules=[
    {f:'C25/30 D20 S3 XC1',sap:'60012481'},{f:'C25/30 D14 S3',sap:'60012477'},{f:'C25/30 D14 S4',sap:'60012478'},
    {f:'C25/30 D20 S4 XC2',sap:'60012490'},{f:'C30/37 D14 S4 XC4',sap:'60013102'},{f:'C30/37 D20 S3 XC4',sap:'60013110'},
    {f:'C16/20 D20 S3 X0',sap:'60010256'},{f:'C35/45 D20 S3 XA1 HM',sap:'60014019'},{f:'BQA C25/30 D10 S4',sap:'60015330'},
    {f:'Béton balayé C25 D16 S3 XF1',sap:'60013877'},{f:'CEMEXA C16',sap:'60016004'},{f:'Sable stabilisé 80 kg',sap:'60017112'}];
  const orders=[];
  const clById=Object.fromEntries(clients.map(c=>[c.id,c]));
  function mk(x){
    const cap=capOf(x.cam||'');const tours=genTours(x.m3,cap);
    const n=x.charged==='all'?tours.length:(x.charged||0);
    tours.forEach((t,i)=>{if(i<n)t.s=1;if(x.pl&&x.pl[i])t.p=x.pl[i];if(x.ext&&x.ext[i])t.c=x.ext[i]});
    const by=x.by||'Karim';
    const o={id:'o'+pad(++seq),seq,date:x.d,h:x.h,cl:x.cl,ch:x.ch,ouv:x.ouv||'',f:x.f,sap:'',cam:x.cam||'',camNote:x.cn||'',
      pompe:x.pompe||null,am:!!x.am,spec:!!x.spec,kind:x.kind||'cmd',pour:x.pour||'',souhait:x.souhait||'',cre:x.cre||'',tel:x.tel||'',resa:x.resa||(/sp/i.test(x.cam||'')?'ok':null),st:x.st||null,
      pills:(x.pills||[]).map(p=>typeof p==='string'?{t:p,on:false,by}:p),tours,by,
      pay:clById[x.cl].t==='comptant'?(x.pay||{paye:false,note:''}):null};
    orders.push(o);return o;
  }
  const P=PLAQUES.map(p=>p.c);
  // Vendredi 30 octobre (passé)
  mk({d:'2026-10-30',h:'07:00',cl:'c10',ch:'h13',ouv:'Dalle',f:'C25/30 D14 S3',m3:7,charged:'all',pl:['7656'],pay:{paye:true,note:'Payé CB'}});
  mk({d:'2026-10-30',h:'08:00',cl:'c1',ch:'h19',ouv:'Voile',f:'C25/30 D20 S4 XC2',m3:22.5,charged:'all',pl:['V955','EF','EE']});
  mk({d:'2026-10-30',h:'13:30',cl:'c4',ch:'h15',ouv:'Radier',f:'C35/45 D20 S3 XA1 HM',m3:15,charged:'all',pl:['GW','V874']});
  // Lundi 2 novembre (passé) — deux chantiers du matin en SP4
  mk({d:'2026-11-02',h:'07:00',cl:'c1',ch:'h2',ouv:'Dalle',f:'C25/30 D20 S3 XC1',m3:30,charged:'all',pl:['7656','V955','EF','EE'],pills:[{t:'Appeler avant départ',on:true,by:'Karim'}]});
  mk({d:'2026-11-02',h:'07:30',tel:'06 45 90 12 33',cl:'c8',ch:'h3',ouv:'Dalle',f:'C25/30 D14 S3',m3:6,cam:'2SP4',charged:'all',pl:['FK218','FK218'],pay:{paye:true,note:'Payé CB'},pills:[{t:'Attendre le client',on:true,by:'Karim'}]});
  mk({d:'2026-11-02',h:'08:30',cl:'c6',ch:'h4',ouv:'Fondations',f:'C25/30 D20 S3 XC1',m3:16,cam:'4SP4',charged:'all',pl:['HD470','FK218','HD470','FK218'],pills:[{t:'Accès étroit',on:false,by:'Julie (commercial)'}]});
  mk({d:'2026-11-02',h:'10:00',cl:'c2',ch:'h5',ouv:'Voile',f:'C30/37 D14 S4 XC4',m3:22.5,pompe:{t:'32',f:'Lafarge',ml:0,bon:true},charged:'all',pl:['7656','','V955'],ext:{1:'Nice'},pills:[{t:'Bétobag 1er camion',on:true,by:'Julie (commercial)'}]});
  mk({d:'2026-11-02',h:'13:00',cl:'c4',ch:'h6',ouv:'Gros béton',f:'C16/20 D20 S3 X0',m3:15,charged:'all',pl:['EF','EE']});
  mk({d:'2026-11-02',h:'14:30',kind:'pour',pour:'Grasse',cl:'c3',ch:'h7',ouv:'Dalle',f:'C25/30 D20 S4 XC2',m3:7.5,charged:'all',pl:['GW']});
  mk({d:'2026-11-02',h:'15:00',cl:'c7',ch:'h17',ouv:'Balayé',f:'Béton balayé C25 D16 S3 XF1',m3:10,charged:'all',pl:['7656','V955']});
  // Mardi 3 novembre — pompe à tuyaux BQA l'après-midi en 3xSP4
  mk({d:'2026-11-03',h:'06:30',tel:'06 12 45 78 90',cl:'c5',ch:'h10',ouv:'Dalle',f:'C30/37 D14 S4 XC4',m3:45,charged:'all',pl:['7656','V955','EF','EE','GW','V874'],pills:[{t:'Appeler avant départ',on:true,by:'Karim'},{t:'Chef de chantier : Yannick',on:false,by:'Julie (commercial)'}]});
  mk({d:'2026-11-03',h:'07:00',resa:'ok',cl:'c2',ch:'h14',ouv:'Poteaux-poutres',f:'C35/45 D20 S3 XA1 HM',m3:12,cam:'3SP4',am:true,charged:'all',pl:['FK218','HD470','FK218'],pills:['Prendre 1 journée','Vidange longue 45 min+']});
  mk({d:'2026-11-03',h:'08:00',cl:'c1',ch:'h11',ouv:'Voile',f:'BQA C25/30 D10 S4',m3:15,pompe:{t:'BQA',f:'Fica',ml:70,bon:true},charged:'all',pl:['7656','V955'],pills:[{t:'Citybag 1er camion',on:true,by:'Karim'}]});
  mk({d:'2026-11-03',h:'09:30',kind:'pour',pour:'Nice',cl:'c3',ch:'h18',ouv:'Voirie',f:'C25/30 D20 S4 XC2',m3:7.5,charged:'all',pl:['EF']});
  mk({d:'2026-11-03',h:'10:00',tel:'06 70 11 29 54',cl:'c9',ch:'h9',ouv:'Désactivé',f:'Désactivé 6/16, colorant PP120 4 kg/m³',m3:5,charged:'all',pl:['EE'],pills:['Attendre le client']});
  mk({d:'2026-11-03',h:'13:00',tel:'07 81 22 63 40',cl:'c7',ch:'h8',ouv:'Piscine',f:'BQA C25/30 D10 S4',m3:12,cam:'3SP4',pompe:{t:'BQA',f:'GCA',ml:30,bon:true},charged:2,pl:['FK218','HD470','FK218'],pills:['Appeler chaque camion']});
  const b7=mk({d:'2026-11-03',h:'14:00',cl:'c4',ch:'h12',ouv:'Fondations',f:'C25/30 D20 S3 XC1',m3:22.5,charged:'all',pl:['GW','V874','7656'],pills:[{t:'Rallonge de 7,5 m³ demandée à 15 h 20',on:true,by:'Thomas'}]});
  b7.tours.push({v:7.5,s:1,p:'V955',x:1});
  mk({d:'2026-11-03',h:'15:30',cl:'c6',ch:'h16',ouv:'Dalle',f:'C25/30 D14 S3',m3:8,st:'annulee',pills:[{t:'Pluie : reporté par le client',on:false,by:'Julie (commercial)'}]});
  // Mercredi 4 novembre
  mk({d:'2026-11-04',h:'07:00',cl:'c5',ch:'h1',ouv:'Voile',f:'C25/30 D20 S4 XC2',m3:30,pills:['Appeler avant départ']});
  mk({d:'2026-11-04',h:'09:00',resa:'todo',cl:'c1',ch:'h2',ouv:'Escalier',f:'C25/30 D14 S4',m3:3,cam:'1SP4',pills:['1er camion ferme pour escalier']});
  mk({d:'2026-11-04',h:'13:30',cl:'c2',ch:'h5',ouv:'Dalle',f:'C30/37 D14 S4 XC4',m3:18});
  // Jeudi 5 novembre (à venir) — 200 m³ à la Fica 42, 6 camions en rotation
  const rot=[];for(let i=0;i<27;i++)rot.push(P[i%6]);
  mk({d:'2026-11-05',h:'06:00',tel:'06 21 33 47 85',cl:'c5',ch:'h1',ouv:'Radier',f:'C30/37 D20 S3 XC4',m3:200,pompe:{t:'42',f:'Fica',ml:0,bon:false,resa:'ok'},am:true,spec:true,pl:rot,by:'Julie (commercial)',
     pills:['Appeler chaque camion',{t:'Chef de chantier : Yannick',on:false,by:'Julie (commercial)'},{t:'Éprouvettes : 3 séries',on:false,by:'Nadia (labo)'}]});
  mk({d:'2026-11-05',h:'07:30',cl:'c4',ch:'h20',ouv:'Voile',f:'C25/30 D14 S4 XF1 FIBRÉE, attente formule labo',m3:15});
  mk({d:'2026-11-05',h:'14:00',cl:'c1',ch:'h19',ouv:'Dalle',f:'C25/30 D20 S4 XC2',m3:22.5,pompe:{t:'26',f:'BST',ml:0,bon:false,resa:'todo'}});
  // Vendredi 6 novembre
  mk({d:'2026-11-06',h:'07:00',cl:'c5',ch:'h1',ouv:'Voile',f:'C25/30 D20 S4 XC2',m3:22.5});
  mk({d:'2026-11-06',h:'08:00',cl:'c1',ch:'h11',ouv:'Désactivé',f:'Désactivé 6/16, colorant PP120',m3:12,pills:[{t:'Fiche désactivé du commercial attendue',on:false,by:'Karim'}]});
  // Commandes du commercial à placer
  mk({d:'2026-11-09',h:'07:30',kind:'aplacer',cre:'2026-11-02',souhait:'2 camions ensemble au démarrage',cl:'c3',ch:'h18',ouv:'Voirie',f:'C25/30 D20 S4 XC2',m3:37.5,by:'Julie (commercial)'});
  mk({d:'2026-11-10',h:'08:00',kind:'aplacer',cre:'2026-11-03',souhait:'Le matin, heure à caler',cl:'c4',ch:'h12',ouv:'Dalle',f:'attente formule commercial',m3:18,by:'Julie (commercial)'});

  // journées plus réalistes (La Bocca : environ 150 m³ par jour en moyenne, 60 m³/h au plus)
  mk({d:'2026-11-02',h:'11:00',cl:'c3',ch:'h18',ouv:'Voirie',f:'C25/30 D20 S4 XC2',m3:30,charged:'all',pl:['GW','V874','7656','V955']});
  mk({d:'2026-11-04',h:'07:30',cl:'c1',ch:'h11',ouv:'Dalle',f:'C25/30 D20 S3 XC1',m3:45,tel:'06 33 18 72 09',pills:['Appeler avant départ']});
  mk({d:'2026-11-04',h:'10:30',cl:'c7',ch:'h17',ouv:'Fondations',f:'C25/30 D20 S3 XC1',m3:22.5});
  mk({d:'2026-11-06',h:'13:30',cl:'c2',ch:'h14',ouv:'Dalle',f:'C30/37 D14 S4 XC4',m3:37.5,pompe:{t:'32',f:'Lafarge',ml:0,bon:false,resa:'todo'}});
  mk({d:'2026-11-04',h:'14:00',kind:'aplacer',cre:'2026-11-03',souhait:'Report de la dalle annulée mardi (pluie)',cl:'c6',ch:'h16',ouv:'Dalle',f:'C25/30 D14 S3',m3:8,cam:'2SP4',resa:'todo',by:'Julie (commercial)'});
  const day=(o)=>Object.assign({presents:[],passation:[],events:[],labo:[],ech:[],semis:[],ciments:[],etat:{k:'ouverte',t:''}},o);
  const T=(prod,carr,s)=>({prod,carr,s:s?1:0});
  const R=(h,s)=>({h,s:s?1:0});
  const days={
    '2026-10-30':day({presents:[{n:'Karim',pl:'6 h – 14 h'},{n:'Sébastien',pl:'10 h – 18 h'}],
      semis:[{nom:'Semi 1',ch:'Marco',h:'07:30',tours:[T('6/16','CALLAS',1),T('0/4L','GOURDON',1),T('0/4L','GOURDON',1)]}],ciments:[{prod:'42,5R',rec:[R('07:00',1),R('13:00',1)]}]}),
    '2026-11-02':day({presents:[{n:'Karim',pl:'6 h – 14 h'},{n:'Sébastien',pl:'10 h – 18 h'}],
      passation:[{t:'Graissage malaxeur',on:true,by:'Karim'},{t:'Nettoyage déchargeur',on:true,by:'Karim'},{t:'Piquage pales malaxeur',on:true,by:'Sébastien'},{t:'Enlèvement bennes : 2x Bennes (demain)',on:true,by:'Sébastien'}],
      labo:[{h:'09:00',t:'Prélèvement éprouvettes Les Terrasses du Golfe'}],ech:[{sens:'recu',c:'Nice',n:1,per:'Matin'}],
      semis:[{nom:'Semi 1',ch:'Marco',h:'07:30',tours:[T('6/16','CALLAS',1),T('6/16','CALLAS',1),T('0/4L','GOURDON',1),T('0/4L','GOURDON',1)]},
             {nom:'Semi 2',ch:'Didier',h:'08:00',tours:[T('0/4L','GOURDON',1),T('10/20','CALLAS',1),T('0/4L','GOURDON',1)]}],
      ciments:[{prod:'42,5R',rec:[R('07:00',1),R('09:00',1),R('14:00',1)]},{prod:'FILLER',rec:[R('10:00',1)]}]}),
    '2026-11-03':day({presents:[{n:'Karim',pl:'6 h – 14 h'},{n:'Thomas',pl:'10 h – 18 h',rempl:true}],
      passation:[{t:'Graissage tapis peseur',on:true,by:'Karim, pour le poste de 10 h'},{t:'Enlèvement bennes : 2x Bennes',on:true,by:'Sébastien, la veille'},{t:'Piquage trappe malaxeur',on:false,by:'Thomas, fermeture'},{t:'État stocks colorants',on:false,by:'Thomas, fermeture'}],
      events:[{t:'Jeudi : changement 6/16 → 4/10'}],labo:[{h:'14:00',t:'Nadia : réglage formule BQA'}],
      ech:[{sens:'donne',c:'Vallauris',n:1,per:'Après-midi'}],
      semis:[{nom:'Marco',ch:'',h:'07:30',tours:[T('6/16','CALLAS',1),T('6/16','CALLAS',1),T('0/4L','GOURDON',1),T('0/4L','GOURDON',0)]},
             {nom:'Semi 2',ch:'Didier',h:'07:45',tours:[T('0/4L','GOURDON',1),T('0/4L','GOURDON',1),T('6/16','CALLAS',0)]},
             {nom:'Semi 3',ch:'',h:'09:00',tours:[T('10/20','CALLAS',1),T('4/10','CALLAS',0)]}],
      ciments:[{prod:'42,5R',rec:[R('07:00',1),R('09:00',1),R('14:00',0)]},{prod:'FILLER',rec:[R('10:00',1)]},{prod:'SRPM',rec:[R('16:00',0)]}]}),
    '2026-11-04':day({presents:[{n:'Karim',pl:'6 h – 14 h'},{n:'Sébastien',pl:'10 h – 18 h'}]}),
    '2026-11-05':day({presents:[{n:'Karim',pl:'5 h 30 – 14 h'},{n:'Sébastien',pl:'10 h – 18 h'}],
      passation:[{t:'Graissage malaxeur',on:false,by:'Karim'}],
      events:[{t:'Changement 6/16 → 4/10'},{t:'Vider les fosses en fin de journée'}],labo:[{h:'06:00',t:'Nadia : éprouvettes radier Les Oliviers'}],
      ech:[{sens:'recu',c:'Grasse',n:2,per:'Journée'},{sens:'recu',c:'Nice',n:1,per:'Matin'}]})
  };
  const byId=Object.fromEntries(orders.map(o=>[o.id,o]));
  const find=(d,ch)=>orders.find(o=>o.date===d&&o.ch===ch).id;
  const demandes=[
    {id:'r1',deRole:'centraliste',rep:[],type:'formule',pour:'labo',t:'Formule C25/30 D14 S4 XF1 fibrée pour le mur de soutènement',oid:find('2026-11-05','h20'),de:'Karim',le:'2026-11-02',done:false},
    {id:'r2',type:'eprouvettes',pour:'labo',t:'Confection éprouvettes radier Les Oliviers, 3 séries',oid:find('2026-11-05','h1'),de:'Karim',le:'2026-11-02',done:false},
    {id:'r3',type:'info',pour:'commercial',t:'LEROY Sandrine : paiement du 3 nov. à confirmer',oid:find('2026-11-03','h9'),de:'Thomas',le:'2026-11-03',done:false},
    {id:'r4',type:'contrat',pour:'commercial',t:'Ajouter BQA C25/30 D10 S4 au contrat LITTORAL BÂTIMENT',oid:find('2026-11-03','h8'),de:'Karim',le:'2026-10-30',done:true},
    {id:'r5',type:'visite',pour:'commercial',t:'Visite : accès toupie à vérifier (pente forte)',oid:find('2026-11-03','h16'),de:'Karim',le:'2026-11-03',done:false},
    {id:'r6',type:'chantier',pour:'commercial',t:'Créer le chantier Pôle sportif des Bréguières dans le logiciel',oid:find('2026-11-03','h12'),de:'Sébastien',le:'2026-11-02',done:false},
    {id:'r7',deRole:'labo',rep:[],type:'resultats',pour:'commercial',t:'Résultats à 28 jours du voile EHPAD Les Mimosas : conformes (C25/30)',oid:find('2026-11-03','h11'),de:'Nadia (labo)',le:'2026-11-03',done:false},
    {id:'r8',deRole:'commercial',rep:[{by:'Nadia (labo)',t:'Composition en cours, retour demain',at:'2026-11-03'}],type:'compo',pour:'labo',t:'Désactivé 6/16 colorant PP120 : composition à prévoir pour le parvis du vendredi',oid:find('2026-11-06','h11'),de:'Julie (commercial)',le:'2026-11-02',done:false}];
  const conv={};
  const cd=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'];
  const base=['06:00','06:15','06:30','06:45','07:00','07:30'];
  cd.forEach((d,k)=>{conv[d]={};P.forEach((p,i)=>{conv[d][p]={h:base[(i+k)%6],dep:CENTRALE,aff:''}})});
  conv['2026-11-02'].EF.dep='Tourrettes';conv['2026-11-04'].GW={st:'abs',h:'',dep:CENTRALE,aff:''};conv['2026-11-04'].V955={st:'conv',h:'07:45',dep:'Grasse',aff:''};conv['2026-11-04'].V874={st:'pret',h:'06:30',dep:CENTRALE,aff:'',pc:'Nice',per:'Après-midi'};conv['2026-11-03'].GW.dep='Grasse';conv['2026-11-03'].V874.aff='Prêté à Vallauris l\'après-midi';
  Object.assign(conv['2026-11-05'],{'7656':{h:'05:45',dep:CENTRALE,aff:'Les Oliviers'},V955:{h:'06:00',dep:'Grasse',aff:'Les Oliviers'},EF:{h:'05:45',dep:CENTRALE,aff:'Les Oliviers'},
    EE:{h:'06:00',dep:'Nice',aff:'Les Oliviers (badge)'},GW:{h:'06:00',dep:CENTRALE,aff:'Les Oliviers'},V874:{h:'06:15',dep:CENTRALE,aff:'Les Oliviers'}});
  const adjuvants={
    '2026-S44':[{t:'1000 L Adjuvant 1',on:true},{t:'1000 L Adjuvant 2',on:true},{t:'500 L Adjuvant 3',on:true}],
    '2026-S45':[{t:'1000 L Adjuvant 1',on:true},{t:'500 L Adjuvant 3',on:false},{t:'200 L Retardateur',on:false}]};
  void byId;
  const liens=[
    {cat:'Commandes',n:'Commande agrégats (sables, cailloux)',u:''},{cat:'Commandes',n:'Commande ciments',u:''},
    {cat:'Formulaires',n:'Commande de pompe',u:''},{cat:'Formulaires',n:'Bon de pompe',u:''},{cat:'Formulaires',n:'Commande de SP4',u:''},
    {cat:'Sécurité',n:'Accident transporteur',u:''}];
  return {orders,days,clients,chantiers,formules,demandes,convocs:conv,plaquesX:[],adjuvants,liens,config:CONFIG0()};
}
