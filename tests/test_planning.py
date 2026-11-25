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
