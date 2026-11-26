"""Restauration des sauvegardes de la nuit (même format que planning-la-bocca-sauvegardes), avec les données fictives."""
import json

def fichiers(pg, tmp_path):
    """Fabrique planning-AAAA-MM.json (un par mois) + listes.json à partir du planning de démonstration."""
    d = pg.evaluate("""()=>{const mois=[...new Set(S.orders.map(o=>o.date.slice(0,7)))].sort();
      const R=Object.fromEntries(Object.entries(S).filter(([k])=>!['orders','days','chat','journal'].includes(k)));
      return {mois:mois.map(m=>({type:'sauvegarde-mois',centrale:'Test',mois:m,commandes:S.orders.filter(o=>o.date.startsWith(m)).length,
          donnees:{orders:S.orders.filter(o=>o.date.startsWith(m)),days:Object.fromEntries(Object.entries(S.days).filter(([k])=>k.startsWith(m))),
                   clients:S.clients,chantiers:S.chantiers,formules:S.formules,config:S.config}})),
        listes:{type:'sauvegarde-listes',centrale:'Test',donnees:Object.assign(R,{orders:[],days:{}})}}}""")
    chemins = []
    for m in d["mois"]:
        p = tmp_path / f"planning-{m['mois']}.json"; p.write_text(json.dumps(m)); chemins.append(str(p))
    p = tmp_path / "listes.json"; p.write_text(json.dumps(d["listes"]))
    return chemins, str(p), d

def choisir(pg, fn, chemins):
    with pg.expect_file_chooser() as fc:
        pg.evaluate(f"()=>{fn}()")
    fc.value.set_files(chemins); pg.wait_for_timeout(600)

def test_restauration_complete(ouvrir, tmp_path):
    pg = ouvrir(); pg.on("dialog", lambda d: d.accept())
    mois, listes, d = fichiers(pg, tmp_path)
    attendu = pg.evaluate("()=>[S.orders.map(o=>o.id).sort().join(),S.clients.length,S.chantiers.length]")
    pg.evaluate("()=>{S.orders=S.orders.slice(0,2);S.clients=[];S.chantiers=[];render(true)}")   # planning abîmé
    choisir(pg, "importerSauvegarde", mois + [listes])
    assert pg.evaluate("()=>[S.orders.map(o=>o.id).sort().join(),S.clients.length,S.chantiers.length]") == attendu
    for dd in pg.evaluate("()=>[...new Set(S.orders.map(o=>o.date))]"):
        pg.evaluate(f"()=>{{view.date='{dd}';view.mode='jour';render(true)}}")
    assert pg.errs == []

def test_restauration_d_un_mois_seul(ouvrir, tmp_path):
    pg = ouvrir(); pg.on("dialog", lambda d: d.accept())
    mois, listes, d = fichiers(pg, tmp_path)
    m0 = d["mois"][0]["mois"]
    autres = pg.evaluate(f"()=>S.orders.filter(o=>!o.date.startsWith('{m0}')).map(o=>o.id+o.h).sort().join()")
    pg.evaluate(f"()=>{{S.orders.filter(o=>o.date.startsWith('{m0}')).forEach(o=>o.h='23:59');S.orders.filter(o=>!o.date.startsWith('{m0}')).forEach(o=>o.note='récent')}}")
    choisir(pg, "importerSauvegarde", [mois[0]])
    assert pg.evaluate(f"()=>S.orders.filter(o=>o.date.startsWith('{m0}')).every(o=>o.h!=='23:59')")      # le mois est remis
    assert pg.evaluate(f"()=>S.orders.filter(o=>!o.date.startsWith('{m0}')).every(o=>o.note==='récent')")  # les autres mois ne bougent pas
    assert pg.errs == []

def test_verification_ne_change_rien(ouvrir, tmp_path):
    pg = ouvrir()
    mois, listes, d = fichiers(pg, tmp_path)
    m0 = d["mois"][0]["mois"]
    pg.evaluate(f"()=>{{const o=S.orders.find(o=>o.date.startsWith('{m0}'));o.h='23:59';S.orders.push(Object.assign(clone(o),{{id:'zz'}}))}}")
    avant = pg.evaluate("()=>JSON.stringify(S)")
    choisir(pg, "verifierSauvegarde", mois + [listes])
    assert pg.evaluate("()=>JSON.stringify(S)") == avant
    assert "complète" in pg.evaluate("()=>document.querySelector('.verif-ok').textContent")
    cells = pg.evaluate(f"()=>[...[...document.querySelectorAll('.verif-t')[0].querySelectorAll('tbody tr')][0].querySelectorAll('td')].map(t=>t.textContent)")
    assert cells[4:6] == ["1", "1"]          # 1 modifiée depuis, 1 ajoutée depuis
    pg.click("#verif-voir"); pg.wait_for_timeout(500)
    assert pg.evaluate("()=>!!document.querySelector('.arch-frame')")
    assert pg.errs == []
