"""Banc d'essai du Planning La Bocca : la vraie page, sans réseau ni Supabase, avec des données fictives (demo.js)."""
import os, re, pathlib, pytest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
TESTS = ROOT / "tests"
DEMO = (TESTS / "demo.js").read_text(encoding="utf-8")


def page_html():
    h = (ROOT / "index.html").read_text(encoding="utf-8")
    h = re.sub(r'<link[^>]*fonts\.googleapis[^>]*>', '', h)
    h = re.sub(r'<script src="vendor/[^"]*"></script>', '', h)            # pas de Supabase
    h = re.sub(r'((?:motion-m3|formules|app)\.js|(?:formules|styles)\.css)\?v=\d+', r'\1', h)
    return h


SETUP = """(role)=>{ %s
 S=buildDemo();MODE='local';ready.o=ready.d=ready.r=true;ME={email:'t@x',nom:'JO',role:role,actif:true};
 prefs.user={nom:'JO',role:role==='admin'?'centraliste':role};prefs.gate=TODAY;prefs.email='t@x';savePrefs&&savePrefs();
 const g=document.getElementById('gate');if(g)g.hidden=true;render(true);return 'ok'}""" % DEMO


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        exe = os.environ.get("CHROME_PATH")
        b = p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else p.chromium.launch(args=["--no-sandbox"])
        yield b
        b.close()


@pytest.fixture
def ouvrir(browser, tmp_path):
    """ouvrir(role='centraliste', tel=False) -> page prête, avec page.errs (erreurs JavaScript)."""
    ctxs = []
    def _open(role="centraliste", tel=False, w=None, h=None):
        w = w or (390 if tel else 1440); h = h or (844 if tel else 900)
        ctx = browser.new_context(viewport={"width": w, "height": h}, is_mobile=tel, has_touch=tel, device_scale_factor=1)
        ctx.route("**/*", lambda r: r.abort() if not r.request.url.startswith("file:") else r.continue_())
        ctxs.append(ctx)
        f = ROOT / f".test-page-{os.getpid()}-{len(ctxs)}.html"
        f.write_text(page_html(), encoding="utf-8")
        pg = ctx.new_page(); pg.errs = []
        pg.on("pageerror", lambda e: pg.errs.append(str(e)))
        pg.goto(f.as_uri()); pg.wait_for_timeout(400)
        assert pg.evaluate(SETUP, role) == "ok"
        pg.wait_for_timeout(300)
        pg._fichier = f
        return pg
    yield _open
    for c in ctxs:
        c.close()
    for f in ROOT.glob(f".test-page-{os.getpid()}-*.html"):
        f.unlink()
