"""Tests du planning dans un vrai navigateur (Chrome), avec des données fictives.
Chaque test vérifie un comportement demandé ; un échec bloque la coche verte sur GitHub."""
JOUR = "2026-11-04"


def jour(pg, d=JOUR, tab="planning"):
    pg.evaluate(f"()=>{{view.date='{d}';view.tab='{tab}';view.mode='jour';render(true)}}")
    pg.wait_for_timeout(200)


# ---------- chargement ----------
def test_page_sans_erreur(ouvrir):
    for tel in (False, True):
        pg = ouvrir(tel=tel)
        jour(pg)
        assert pg.evaluate("()=>document.querySelectorAll('.row[data-id]').length") > 3
        assert pg.errs == []


def test_page_tient_dans_l_ecran_telephone(ouvrir):
    pg = ouvrir(tel=True)
    jour(pg)
    assert pg.evaluate("()=>document.documentElement.scrollWidth") <= 391


# ---------- mise à jour fine de l'écran ----------
def test_mise_a_jour_identique_a_une_page_neuve(ouvrir):
    pg = ouvrir()
    jour(pg)
    etapes = [
        "byId('o19').tours[0].s=1", "byId('o19').h='15:30'", "byId('o19').h='07:00'",
        "S.orders.push(Object.assign(clone(byId('o19')),{id:'onew',h:'09:15'}))", "byId('onew').h='22:00'",
        "S.orders=S.orders.filter(o=>o.id!=='onew')", "byId('o19').plus=true", "byId('o20').st='annulee'",
        "delete byId('o20').st", "peers=[{kind:'viewer',presence:{nom:'M',role:'commercial',edit:'o19',editAt:Date.now()}}]", "peers=[]",
    ]
    for js in etapes:
        pg.evaluate(f"()=>{{{js};render(true)}}")
        ok = pg.evaluate("""()=>{const m=document.getElementById('main');const t=document.createElement('template');t.innerHTML=dayHTML(view.date);
          const A=[...t.content.childNodes],B=[...m.childNodes];return A.length===B.length&&A.every((x,i)=>x.isEqualNode(B[i]))}""")
        assert ok, f"écran différent d'une page neuve après : {js}"
    assert pg.errs == []


def test_saisie_en_cours_pas_effacee(ouvrir):
    pg = ouvrir()
    pg.evaluate("()=>{view.tab='adjuvants';render(true)}")
    champ = pg.query_selector("#main input:not([type=checkbox]):not([type=radio])")
    if champ:
        champ.click(); champ.type("ABC")
        pg.evaluate("()=>render()")
        assert champ.input_value().endswith("ABC")


# ---------- compléments ----------
def test_complements(ouvrir):
    pg = ouvrir()
    pg.evaluate(f"()=>{{view.date='{JOUR}';TODAY='{JOUR}';const o=byId('o19');o.tours.forEach(t=>{{t.s=1;t.p='AA'}});o.plus=false;render(true)}}")
    assert pg.evaluate("()=>statut(byId('o19'))") == "terminee"
    pg.click("#row-o19 .t-add"); pg.click("[data-pa=prevu]"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>[byId('o19').plus,statut(byId('o19'))]") == [True, "encours"]
    ordre = pg.evaluate("()=>[...document.querySelectorAll('#row-o19 .r-tours > *')].map(e=>e.classList.contains('t-plus')?'O':e.classList.contains('t-add')?'+':'t').join('')")
    assert ordre.endswith("O+"), ordre
    pg.click("#row-o19 .t-plus"); pg.click("[data-pa=add]"); pg.wait_for_timeout(200)
    pg.fill("#pk-v", "4"); pg.fill("#pk-t", "EF507VT"); pg.press("#pk-t", "Enter"); pg.wait_for_timeout(400)
    assert "Encore un complément" in pg.evaluate("()=>popEl.querySelector('.pop-h').textContent")
    pg.click("[data-pa=non]"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>[statut(byId('o19')),byId('o19').plus]") == ["terminee", False]


def test_terminee_a_la_main_retire_le_complement(ouvrir):
    pg = ouvrir()
    pg.evaluate(f"()=>{{view.date='{JOUR}';const o=byId('o19');o.plus=true;render(true);act('statut',document.body,o,{{}})}}")
    pg.evaluate("()=>{const b=[...popEl.querySelectorAll('[data-pa]')].find(b=>/Terminée/.test(b.textContent));b.click()}")
    pg.wait_for_timeout(200)
    assert pg.evaluate("()=>[byId('o19').st,byId('o19').plus,!!document.querySelector('#row-o19 .t-add')]") == ["terminee", False, False]


# ---------- verrou et droits ----------
def test_verrou_bloque_la_commande(ouvrir):
    pg = ouvrir()
    jour(pg)
    pg.evaluate("()=>{peers=[{kind:'viewer',presence:{nom:'Morgan',role:'commercial',edit:'o19',editAt:Date.now()}}];render(true);openOrderForm(byId('o19'))}")
    pg.wait_for_timeout(200)
    assert pg.evaluate("()=>drawerEl.hidden") is True
    pg.evaluate("()=>{peers=[];render(true);openOrderForm(byId('o19'))}"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>drawerEl.hidden") is False


def test_tours_reserves_au_centraliste(ouvrir):
    for role, attendu in (("labo", False), ("commercial", False), ("centraliste", True)):
        pg = ouvrir(role)
        jour(pg)
        pg.evaluate("()=>act('addtour',document.body,byId('o19'),{})"); pg.wait_for_timeout(150)
        assert pg.evaluate("()=>!popEl.hidden") is attendu, role


def test_journee_cloturee_bloque_le_commercial(ouvrir):
    for role, attendu in (("commercial", True), ("centraliste", False)):
        pg = ouvrir(role)
        pg.evaluate(f"()=>{{day('{JOUR}').cloture={{by:'J',at:'18:00'}};view.date='{JOUR}';render(true);openOrderForm(byId('o19'))}}")
        pg.wait_for_timeout(200)
        assert pg.evaluate("()=>drawerEl.hidden") is attendu, role


def test_lecture_seule_ne_fait_que_consulter(ouvrir):
    pg = ouvrir("commercial")
    pg.evaluate(f"()=>{{ME={{email:'v@x',nom:'Paul',role:'lecture',actif:true}};document.body.classList.add('ro');view.date='{JOUR}';render(true)}}")
    visibles = pg.evaluate("()=>[...document.querySelectorAll('[data-act=menu],[data-act=chat]')].filter(e=>e.offsetParent).length")
    assert visibles == 0
    for sel in ("#row-o19 [data-act=formule]", "#row-o19 .r-client"):
        el = pg.query_selector(sel)
        if el:
            el.evaluate("e=>e.click()")
    pg.evaluate("()=>openOrderForm(null)"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>[popEl.hidden,drawerEl.hidden]") == [True, True]


# ---------- formulaire, modifications, paiements, labo ----------
def test_modification_du_commercial_detaillee(ouvrir):
    pg = ouvrir("commercial")
    jour(pg)
    n0 = pg.evaluate("()=>S.chantiers.length")
    pg.evaluate("()=>openOrderForm(byId('o19'))"); pg.wait_for_timeout(300)
    pg.fill("#f-h", "09:30"); pg.fill("#f-m3", "36")
    pg.evaluate("()=>document.getElementById('oform').requestSubmit()"); pg.wait_for_timeout(300)
    txt = pg.evaluate("()=>modTxt(byId('o19'))")
    assert "Heure" in txt and "36 m³" in txt
    assert pg.evaluate("()=>S.chantiers.length") == n0


def test_paiements_comptant(ouvrir):
    pg = ouvrir()
    oid = pg.evaluate("()=>{const o=S.orders.find(o=>o.pay&&!o.pay.paye);view.date=o.date;render(true);return o.id}")
    pg.click(f"#row-{oid} [data-act=pay]", button="right"); pg.wait_for_timeout(200)
    pg.fill('.pay-l[data-k="0"] .pay-m', "200"); pg.fill('.pay-l[data-k="0"] .pay-code', "4821")
    pg.click("[data-pa=add]"); pg.fill('.pay-l[data-k="1"] .pay-m', "150,50"); pg.select_option('.pay-l[data-k="1"] .pay-mode', "virement")
    pg.click(".pay-f [type=submit]"); pg.wait_for_timeout(200)
    p = pg.evaluate(f"()=>byId('{oid}').pay")
    assert p["paye"] is True and abs(sum(l["m"] for l in p["lignes"]) - 350.5) < 0.01


def test_formule_proposee_par_le_labo(ouvrir):
    pg = ouvrir("labo")
    oid = pg.evaluate("()=>{const o=S.orders.find(o=>attente(o.f));view.date=o.date;render(true);return o.id}")
    f0 = pg.evaluate(f"()=>byId('{oid}').f")
    pg.evaluate(f"()=>act('formule',document.querySelector('#row-{oid}')||document.body,byId('{oid}'),{{}})"); pg.wait_for_timeout(300)
    pg.fill("#fx-q", "25 20 s3 xc1"); pg.evaluate("()=>document.querySelector('#pop form.pf-fx').requestSubmit()"); pg.wait_for_timeout(200)
    assert pg.evaluate(f"()=>[byId('{oid}').f,!!byId('{oid}').fLabo]") == [f0, True]


# ---------- nuit ----------
def test_nuit_reprise_le_lendemain(ouvrir):
    pg = ouvrir()
    pg.evaluate(f"()=>{{S.orders.push(Object.assign(clone(byId('o19')),{{id:'onuit',date:'{JOUR}',h:'22:00'}}));view.date='2026-11-05';render(true)}}")
    pg.wait_for_timeout(200)
    assert pg.evaluate("()=>!!document.querySelector('#row-onuit.veille')")


# ---------- prise de poste ----------
def test_prise_de_poste_prenom_et_role_imposes(ouvrir):
    pg = ouvrir()
    pg.evaluate("()=>{ME={email:'m@x',nom:'Morgan',role:'commercial',actif:true};peers=[];showGate()}"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>document.querySelectorAll('#gate button.g2-person').length") == 0
    assert pg.evaluate("()=>[...document.querySelectorAll('#gate input[name=g-role]')].every(i=>i.disabled)")
    pg.evaluate("()=>gateSubmit(document.getElementById('gateform'))")
    assert pg.evaluate("()=>prefs.user") == {"nom": "Morgan", "role": "commercial"}


# ---------- mode d'emploi ----------
def test_mode_d_emploi(ouvrir):
    pg = ouvrir()
    pg.evaluate("()=>{prefs.aideOn=true;view.tab='aide';render(true)}"); pg.wait_for_timeout(200)
    txt = pg.evaluate("()=>document.getElementById('main').textContent")
    for t in ("Ce que chaque rôle peut faire", "Compte en lecture seule", "proposition du labo", "Paiements comptant", "Journée clôturée"):
        assert t in txt, t
    assert pg.errs == []


def test_mode_d_emploi_relie_a_l_ecran(ouvrir):
    pg = ouvrir()
    # chaque rubrique visée (animations, éléments de l'écran) existe vraiment
    manquants = pg.evaluate("""()=>{const T=new Set();AIDE.forEach(([,L])=>L.forEach(([,t])=>T.add(t)));
      return [...Object.keys(AIDE_ANIM),...AIDE_CIBLES.flatMap(([,...ts])=>ts)].filter(t=>!T.has(t))}""")
    assert manquants == []
    # « Qu'est-ce que c'est ? » : toucher l'étiquette paiement ouvre sa rubrique, sans rien modifier
    oid = pg.evaluate("()=>{const o=S.orders.find(o=>o.pay&&!o.pay.paye);view.date=o.date;render(true);return o.id}")
    pg.evaluate("()=>aidePickSet(true)")
    pg.click(f"#row-{oid} [data-act=pay]"); pg.wait_for_timeout(400)
    assert pg.evaluate("()=>view.tab") == "aide"
    assert pg.evaluate("()=>document.querySelector('.aide-d[open] summary').textContent") == "Paiements comptant"
    assert pg.evaluate(f"()=>byId('{oid}').pay.paye") is False
    assert pg.evaluate("()=>[aidePick,document.body.classList.contains('aide-pick')]") == [False, False]
    # rubrique avec exemple animé : on essaie dans l'exemple (pas de « Montrer sur l'écran »)
    assert pg.evaluate("()=>!!document.querySelector('.aide-d[open] .an[data-an]') && !document.querySelector('.aide-d[open] .aide-show')")
    ex = ".aide-d[data-t='Paiements comptant'] .an[data-an]"
    pg.click(ex); pg.click(ex + " .an-s.cur .an-go"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>anStep['Paiements comptant']") == 1
    # les rubriques ouvertes et l'étape de l'exemple restent après une mise à jour de l'écran
    pg.evaluate("()=>{render(true);render(true)}")
    assert pg.evaluate("()=>[document.querySelector('.aide-d[data-t=\"Paiements comptant\"]').open,[...document.querySelectorAll(\"[data-an='Paiements comptant'] .an-s\")].findIndex(x=>x.classList.contains('cur'))]") == [True, 1]
    # « Montrer sur l'écran » (rubrique sans exemple) : retour au planning, élément entouré
    pg.evaluate("()=>aideOuvrir('Carte du chantier')"); pg.wait_for_timeout(300)
    pg.click(".aide-d[data-t='Carte du chantier'] .aide-show"); pg.wait_for_timeout(400)
    assert pg.evaluate("()=>[view.tab,!!document.querySelector('[data-act=map].aide-spot'),!!document.querySelector('.aide-tip')]") == ["planning", True, True]
    # touche ? : active / Échap : annule
    pg.keyboard.press("?"); assert pg.evaluate("()=>aidePick") is True
    pg.keyboard.press("Escape"); assert pg.evaluate("()=>[aidePick,!!document.getElementById('aidepickbar')]") == [False, False]
    assert pg.errs == []


# ---------- formule rapide et chapes ----------
def test_formule_rapide_resistance_et_chape(ouvrir):
    pg = ouvrir()
    attendu = {"c16 d20 s3": "C16/20 D20 S3", "c20 d20 s4": "C20/25 D20 S4", "25 d20 s4 c1": "C25/30 D20 S4 XC1",
               "cem16": "Cemexa C16", "cem20": "Cemexa C20", "cemexa c20": "Cemexa C20"}
    for q, f in attendu.items():
        assert pg.evaluate(f"()=>FX.line({q!r})") == f, q


def test_chape_jamais_chargee_au_maximum(ouvrir):
    pg = ouvrir()
    assert pg.evaluate("()=>[capOf('','Cemexa C16'),capOf('2SP4','Cemexa C20'),capOf('','C25/30 D20 S4 XC1'),capOf('SP4','C25/30 D20 S4')]") == [7, 3.5, 7.5, 4]
    assert pg.evaluate("()=>genTours(20,capOf('','Cemexa C16')).map(t=>t.v)") == [7, 7, 6]
    # Agilia : plein par défaut, réduit si on le règle dans Administration → Formules
    assert pg.evaluate("()=>[capOf('','Agilia MI Dallage SF2'),capOf('','Agilia Chape Nivel')]") == [7.5, 7]
    assert pg.evaluate("()=>{const c=FX.defaults();c.prods.find(p=>p.n==='Agilia').chg='fluide';S.formcat=c;return capOf('','Agilia MI Dallage SF2')}") == 7
    # formule changée en chape : les tours pas encore chargés sont recalculés, le tour chargé reste
    r = pg.evaluate("()=>{const o=byId('o19');o.tours.forEach(t=>t.s=0);o.tours[0].s=1;const m=total(o),v0=o.tours[0].v;const f0=o.f;o.f='Cemexa C16';reCap(o,f0);return [total(o)===m,o.tours[0].v===v0&&o.tours[0].s===1,o.tours.slice(1).every(t=>t.v<=7)]}")
    assert r == [True, True, True]


# ---------- état de la base Supabase ----------
def test_etat_de_la_base(ouvrir):
    import pathlib, re
    sql = sorted(p.name for p in (pathlib.Path(__file__).parent.parent / "supabase").glob("[0-9]*.sql"))
    pg = ouvrir()
    # le planning connaît tous les scripts, et attend le dernier
    assert pg.evaluate("()=>Object.values(BASE_F).sort()") == sql
    assert pg.evaluate("()=>BASE_V") == int(sql[-1][:2])
    cas = {"ok": "{data:{version:BASE_V,manque:[]}}", "13": "{data:{version:BASE_V,manque:['13']}}", "absent": "{error:{code:'PGRST202'}}"}
    res = {}
    for k, r in cas.items():
        res[k] = pg.evaluate(f"""async()=>{{ME={{email:'a@x',nom:'A',role:'admin',actif:true}};SB={{rpc:async()=>({r})}};BASE_ETAT=null;await baseCheck();
            return [BASE_ETAT.manque,baseHTML().replace(/<[^>]*>/g,'')]}}""")
    assert res["ok"][0] == [] and "à jour" in res["ok"][1]
    assert res["13"][0] == ["13"] and "13_reglages_commercial.sql" in res["13"][1]
    assert res["absent"][0] == ["16"] and "16_labo.sql" in res["absent"][1]
    # pas d'appel pour un compte non admin
    assert pg.evaluate("async()=>{ME={email:'c@x',nom:'C',role:'centraliste',actif:true};let n=0;SB={rpc:async()=>{n++;return {data:null}}};await baseCheck();return n}") == 0


# ---------- erreurs du planning ----------
def test_erreurs_envoyees_aux_admins(ouvrir):
    pg = ouvrir()
    pg.evaluate("""()=>{window._env=[];ME={email:'m@x',nom:'Morgan',role:'commercial',actif:true};
      SB={rpc:async(f,a)=>{_env.push([f,a.p]);return {data:null}}};localStorage.removeItem('plb-erreurs')}""")
    for _ in range(3):
        pg.evaluate("()=>setTimeout(()=>{throw new Error('boum dans le planning')})")
    pg.evaluate("()=>setTimeout(()=>{throw new Error('ResizeObserver loop limit exceeded')})")
    pg.evaluate("()=>{Promise.reject(new Error('promesse ratée'))}")
    pg.wait_for_timeout(400)
    env = pg.evaluate("()=>_env")
    msgs = [p["msg"] for f, p in env]
    assert all(f == "erreur_log" for f, _ in env)
    assert msgs.count("Error: boum dans le planning") == 1 and "Error: promesse ratée" in msgs   # une seule fois, rejets de promesse aussi
    assert not any("ResizeObserver" in m for m in msgs)                              # bruit ignoré
    p = env[0][1]
    assert p["nom"] == "JO" and p["version"].startswith("app") and p["vue"].startswith("planning") and "boum" in p["pile"]
    assert set(p) <= {"msg", "src", "pile", "vue", "version", "appareil", "nom", "at"}  # rien d'autre (pas de commande)
    # hors connexion : gardée sur l'appareil, envoyée au retour
    pg.evaluate("()=>{SB=null;setTimeout(()=>{throw new Error('erreur hors ligne')})}"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>errQueue().map(e=>e.msg)") == ["Error: erreur hors ligne"]
    pg.evaluate("()=>{SB={rpc:async(f,a)=>{_env.push([f,a.p]);return {data:null}}}}")
    pg.evaluate("async()=>{await errFlush()}")
    assert pg.evaluate("()=>[errQueue().length,_env.some(([,p])=>p.msg==='Error: erreur hors ligne')]") == [0, True]


def test_erreurs_dans_l_administration(ouvrir):
    pg = ouvrir()
    html = pg.evaluate("""async()=>{const d=document.createElement('div');d.id='err-box';document.body.appendChild(d);
      const rows=[{at:new Date().toISOString(),nom:'Morgan',role:'commercial',msg:'TypeError: x is undefined',src:'/app.js:1:2',pile:'at f (app.js:1:2)',vue:'planning/jour',version:'app 31',appareil:'Mozilla',n:3},
                  {at:new Date().toISOString(),nom:'Léa',role:'labo',msg:'TypeError: x is undefined',n:1},{at:new Date().toISOString(),nom:'Paul',role:'lecture',msg:'Autre',n:1}];
      SB={from:()=>({select:()=>({order:()=>({limit:async()=>({data:rows})})})})};await errLoadImpl();return d.textContent}""")
    assert "5 erreurs ces 7 derniers jours" in html and "2 différentes" in html and "4×" in html and "Morgan, Léa" in html
    vide = pg.evaluate("async()=>{SB={from:()=>({select:()=>({order:()=>({limit:async()=>({data:[]})})})})};await errLoadImpl();return document.getElementById('err-box').textContent}")
    assert "Aucune erreur" in vide
    assert pg.errs == []


# ---------- téléphone : la fenêtre de formule défile au doigt ----------
def test_formule_defile_au_doigt_apres_le_menu_plus(ouvrir):
    pg = ouvrir(tel=True)
    # ouvrir le compte depuis « Plus » (fenêtre en feuille), puis la refermer
    pg.evaluate("()=>{view.date='2026-11-04';render(true);navMore(document.querySelector('.side .nav-b')||document.body)}"); pg.wait_for_timeout(500)
    pg.evaluate("()=>document.querySelector('.sheet-scrim [data-me]').click()"); pg.wait_for_timeout(700)
    assert pg.evaluate("()=>popEl.classList.contains('as-sheet')")
    pg.evaluate("()=>closePop()"); pg.wait_for_timeout(500)
    pg.evaluate("()=>act('formule',document.querySelector('#row-o19')||document.body,byId('o19'),{})"); pg.wait_for_timeout(600)
    bloque = pg.evaluate("""()=>{const p=popEl,t=p.querySelector('.pf-fx')||p;const r=t.getBoundingClientRect();
      const tc=y=>new Touch({identifier:1,target:t,clientX:r.left+20,clientY:y});
      t.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[tc(r.top+200)],changedTouches:[tc(r.top+200)]}));
      const m=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[tc(r.top+120)],changedTouches:[tc(r.top+120)]});t.dispatchEvent(m);
      const m2=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[tc(r.top+260)],changedTouches:[tc(r.top+260)]});t.dispatchEvent(m2);
      t.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[tc(r.top+260)]}));
      return [m.defaultPrevented,m2.defaultPrevented,p.hidden,getComputedStyle(p).overflowY]}""")
    assert bloque == [False, False, False, "auto"]


# ---------- clic droit sur le cubage ----------
def test_clic_droit_cubage(ouvrir):
    pg = ouvrir()
    pg.evaluate("()=>{view.date='2026-11-04';const o=byId('o19');o.tours.forEach(t=>{t.s=0;delete t.p});o.tours[0].s=1;o.tours[0].p='AA';o.plus=false;render(true)}")
    pg.click("#row-o19 .r-vol", button="right"); pg.wait_for_timeout(300)
    pg.fill("#pf0", "22,5"); pg.check("#pf1"); pg.evaluate("()=>popEl.querySelector('form').requestSubmit()"); pg.wait_for_timeout(300)
    r = pg.evaluate("()=>{const o=byId('o19');return [total(o),o.plus,o.tours[0].s,o.tours[0].p,document.querySelector('#row-o19 .r-vol').textContent.replace(/\\s/g,'')]}")
    assert r[0] == 22.5 and r[1] is True and r[2] == 1 and r[3] == "AA" and r[4].endswith("/22,5+")
    # plus petit que le déjà chargé : refusé
    v0 = pg.evaluate("()=>byId('o19').tours[0].v")
    pg.click("#row-o19 .r-vol", button="right"); pg.wait_for_timeout(300)
    pg.fill("#pf0", "1"); pg.uncheck("#pf1"); pg.evaluate("()=>popEl.querySelector('form').requestSubmit()"); pg.wait_for_timeout(300)
    assert pg.evaluate("()=>total(byId('o19'))") == 22.5
    pg.fill("#pf0", str(v0).replace('.', ',')); pg.evaluate("()=>popEl.querySelector('form').requestSubmit()"); pg.wait_for_timeout(300)
    assert pg.evaluate("()=>[total(byId('o19')),byId('o19').plus,document.querySelector('#row-o19 .r-vol').textContent.includes('+')]") == [v0, False, False]
    # réservé au centraliste
    pg2 = ouvrir("commercial"); pg2.evaluate("()=>{view.date='2026-11-04';render(true)}")
    pg2.click("#row-o19 .r-vol", button="right"); pg2.wait_for_timeout(300)
    assert pg2.evaluate("()=>popEl.hidden")
    assert pg.errs == [] and pg2.errs == []


# ---------- encadrés du haut : même largeur, deux lignes sur écran moyen ----------
def test_encadres_du_haut(ouvrir):
    for w, deux_lignes in ((1920, False), (1366, False), (1100, True)):
        pg = ouvrir(w=w, h=900)
        jour(pg)   # un jour de semaine (le week-end fermé, les encadrés sont masqués)
        L = pg.evaluate("()=>[...document.querySelectorAll('#head .hb-w')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.top)]})")
        if deux_lignes:
            assert L[0][1] == L[1][1] and L[2][1] > L[0][1], (w, L)
        else:
            assert max(x[0] for x in L) - min(x[0] for x in L) <= 2, (w, L)


# ---------- tech labo : consulte, ajoute une info, demande ; ne modifie rien ----------
def test_labo_ne_modifie_aucune_commande(ouvrir):
    pg = ouvrir("labo")
    oid = pg.evaluate("()=>{const o=S.orders.find(o=>o.pay&&!o.pay.paye);view.date=o.date;render(true);return o.id}")
    avant = pg.evaluate(f"()=>stable(byId('{oid}'))")
    pg.evaluate(f"()=>openOrderForm(byId('{oid}'))"); pg.wait_for_timeout(200)
    assert pg.evaluate("()=>drawerEl.hidden")
    for a in ("pay", "statut", "pompe", "resa", "tour", "plus", "pill"):
        pg.evaluate(f"()=>{{try{{act('{a}',document.querySelector('#row-{oid}'),byId('{oid}'),{{}})}}catch(e){{}}}}"); pg.wait_for_timeout(80)
    pg.click(f"#row-{oid} [data-act=pay]", button="right"); pg.wait_for_timeout(200)
    assert pg.evaluate(f"()=>stable(byId('{oid}'))") == avant
    # menu ⋯ : demander au commercial / au centraliste, ajouter une info
    pg.evaluate(f"()=>{{closePop();act('menu',document.querySelector('#row-{oid} [data-act=menu]')||document.body,byId('{oid}'),{{}})}}"); pg.wait_for_timeout(300)
    menu = pg.evaluate("()=>[...popEl.querySelectorAll('.pop-b')].map(b=>b.textContent)")
    assert menu == ["Demander au commercial…", "Demander au centraliste…", "Ajouter une info…"]
    pg.evaluate("()=>closePop()"); pg.wait_for_timeout(200)
    # info du labo
    pg.evaluate(f"()=>act('addpill',document.querySelector('#row-{oid}'),byId('{oid}'),{{}})"); pg.wait_for_timeout(300)
    pg.evaluate("()=>{const i=popEl.querySelector('input');i.value='Éprouvettes à prélever';i.form?i.form.requestSubmit():i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}"); pg.wait_for_timeout(300)
    p = pg.evaluate(f"()=>byId('{oid}').pills.slice(-1)[0]")
    assert p["t"] == "Éprouvettes à prélever" and p["lab"] == 1
    assert pg.evaluate(f"()=>!!document.querySelector('#row-{oid} .chip.lab .lab-b')")


def test_info_labo_au_premier_chargement(ouvrir):
    pg = ouvrir()
    pg.evaluate("()=>{const o=byId('o19');view.date=o.date;o.tours.forEach(t=>{t.s=0;delete t.p});o.pills.push({t:'Éprouvettes à prélever',by:'Léa (labo)',lab:1});render(true)}")
    pg.wait_for_timeout(700)
    assert pg.evaluate("()=>popEl.hidden")                       # rien tant qu'aucun camion n'est chargé
    pg.evaluate("()=>{const o=byId('o19');o.tours[0].s=1;o.tours[0].p='AA';render(true)}"); pg.wait_for_timeout(800)
    assert "Éprouvettes à prélever" in pg.evaluate("()=>popEl.hidden?'':popEl.textContent")
    pg.click("[data-pa=vu]"); pg.wait_for_timeout(300)
    assert pg.evaluate("()=>byId('o19').pills.slice(-1)[0].vu") == 1
    pg.evaluate("()=>{byId('o19').tours[1].s=1;render(true)}"); pg.wait_for_timeout(800)
    assert pg.evaluate("()=>popEl.hidden")                       # une seule fois


# ---------- accès du chantier et dérogation ----------
def test_acces_et_derogation(ouvrir):
    pg = ouvrir()
    jour(pg)
    pg.evaluate("()=>openOrderForm(byId('o19'))"); pg.wait_for_timeout(300)
    t0 = pg.evaluate("()=>CFG().camions[0].t")
    # chantier accessible seulement en SP4 ; le camion prévu (8x4) n'est pas autorisé → avertissement
    pg.evaluate("()=>{document.querySelectorAll('input[name=f-acc]').forEach(x=>{x.checked=x.value==='SP4';x.dispatchEvent(new Event('input',{bubbles:true}))});const n=document.getElementById('f-accn');n.value='Chemin étroit, interdit +19 t';n.dispatchEvent(new Event('input',{bubbles:true}))}")
    w = pg.evaluate("()=>{const w=document.getElementById('f-acc-w');return [w.hidden,w.textContent]}")
    assert w[0] is False and "non autorisé" in w[1]
    pg.check("input[name=f-der][value=attente]")
    pg.evaluate("()=>document.getElementById('oform').requestSubmit()"); pg.wait_for_timeout(400)
    r = pg.evaluate("()=>{const o=byId('o19'),c=chan(o.ch);return [o.der,c.acc,c.accNote]}")
    assert r == ["attente", ["SP4"], "Chemin étroit, interdit +19 t"]
    # ligne : DÉROG. ? et ACCÈS SP4 ; « À surveiller » : dérogation en attente
    assert pg.evaluate("()=>[!!document.querySelector('#row-o19 .mo.der.warn'),!!document.querySelector('#row-o19 .mo.acc')]") == [True, True]
    assert "Dérogation en attente" in pg.evaluate("()=>watchItems(view.date).join(' ')")
    # clic sur l'étiquette → Validée
    pg.click("#row-o19 .mo.der"); pg.wait_for_timeout(250)
    pg.click("[data-pa=d][data-v=ok]"); pg.wait_for_timeout(250)
    assert pg.evaluate("()=>[byId('o19').der,watchItems(view.date).join(' ').includes('o19')]") == ["ok", False]
    # sans dérogation, camion non autorisé : alerte « Accès »
    pg.evaluate("()=>{byId('o19').der='';render(true)}")
    assert "Accès SP4" in pg.evaluate("()=>watchItems(view.date).join(' ')")
    # nouvelle commande sur le même chantier : l'accès revient tout seul
    nom = pg.evaluate("()=>chan(byId('o19').ch).nom")
    if nom:
        pg.evaluate("()=>openOrderForm(null)"); pg.wait_for_timeout(300)
        pg.fill("#f-chn", nom); pg.wait_for_timeout(100)
        assert pg.evaluate("()=>[...document.querySelectorAll('input[name=f-acc]:checked')].map(x=>x.value)") == ["SP4"]
    assert pg.errs == []
