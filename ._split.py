#!/usr/bin/env python3
# Re-partitiona o worktree (diff vs HEAD) em 5 commits lógicos, sem tocar no
# worktree: reconstrói o conteúdo de cada commit e grava direto no index.
import subprocess, re, os, sys

REPO = '/home/deysi/workspace/tracking-your-challenge'
os.chdir(REPO)
DO_COMMIT = '--commit' in sys.argv

APP='tracker/app.js'; HTML='tracker/index.html'; CSS='tracker/style.css'
PARSER='tracker/parser.js'; READ='README.md'; FEAT='features.md'
NEW_CATS='tracker/cats.js'

def run(args, inp=None):
    r = subprocess.run(args, capture_output=True, input=inp)
    return r

def out(args):
    r = run(args)
    if r.returncode != 0:
        raise SystemExit('git %s: %s' % (' '.join(args), r.stderr.decode()))
    return r.stdout.decode('utf-8', 'replace')

def head_blob(path):
    r = run(['git', 'show', 'HEAD:' + path])
    if r.returncode != 0:
        raise SystemExit('no HEAD blob: ' + path)
    return r.stdout.decode('utf-8', 'replace')

def parse_hunks(path):
    d = out(['git', 'diff', 'HEAD', '--', path])
    hunks, cur = [], None
    for ln in d.split('\n'):
        m = re.match(r'^@@ -(\d+),(\d+) \+(\d+),(\d+) @@', ln)
        if m:
            if cur: hunks.append(cur)
            cur = {'pre': int(m.group(1)), 'prec': int(m.group(2)),
                   'post': int(m.group(3)), 'postc': int(m.group(4)), 'lines': []}
        elif cur is not None:
            cur['lines'].append(ln)
    if cur: hunks.append(cur)
    return hunks

# ---------- classificadores por hunk ----------
def make_matcher(rules, default):
    def f(line):
        for sub, c in rules:
            if sub in line: return c
        return default
    return f

WHOLE = {}
for k in [
    (APP,32,4),(APP,57,4),(APP,100,4),(APP,229,1),(APP,249,2),(APP,256,4),
    (APP,273,4),(APP,292,4),(APP,551,1),(APP,820,3),(APP,475,5),
    (APP,1001,1),(APP,1015,1),
    (HTML,42,2),(HTML,72,1),(HTML,147,1),(HTML,209,2),(HTML,241,1),(HTML,352,2),
    (CSS,1,3),(CSS,28,3),(CSS,35,3),(CSS,60,3),(CSS,96,3),(CSS,327,3),
    (CSS,410,3),(CSS,440,3),(CSS,564,3),(CSS,728,3),(CSS,817,3),(CSS,862,3),
    (CSS,875,3),(CSS,951,3),(CSS,1027,3),(CSS,1095,3),(CSS,1123,3),(CSS,1222,3),
    (CSS,923,2),
    (PARSER,2,5),(PARSER,42,5),
    (READ,12,5),(READ,132,5),(READ,159,5),(READ,189,5),
    (FEAT,17,5),(FEAT,33,5),(FEAT,62,5),(FEAT,82,5),
]:
    WHOLE[(k[0], k[1])] = k[2]

def cls_app17(line):
    if 'serverOk = false' in line: return 4
    if 'activityDates' in line or 'badges: []' in line or 'challengeBadges' in line: return 1
    if line.startswith('+'): return 3
    raise SystemExit('app17 unmatched: %r' % line)

def cls_app191(line):
    if 'recordActivity' in line or 'syncCatLevel' in line: return 2
    if 'activityDates' in line or 'consecutivos' in line or 'setHours' in line: return 2
    if 'Count consecutive' in line: return 2
    if 'datesSet = new Set();' in line: return 2
    if 'Object.values(state.challenges' in line: return 2
    if line.startswith(('+', '-')): return 1
    raise SystemExit('app191 unmatched: %r' % line)

def cls_app385(line):
    if 'syncCatLevel' in line: return 2
    if 'Importe um .md' in line: return 5
    if 'renderBadges' in line or 'renderChallengeBadges' in line: return 1
    raise SystemExit('app385 unmatched: %r' % line)

def cls_app582(line):
    if 'syncCatLevel' in line: return 2
    if line.startswith(('+', '-')): return 1
    raise SystemExit('app582 unmatched: %r' % line)

def cls_app845(line):
    if 'recordActivity' in line or 'syncCatLevel' in line: return 2
    if 'checkBadges' in line: return 1
    raise SystemExit('app845 unmatched: %r' % line)

def cls_app861(line):
    if 'mascotCelebrate' in line or 'recordActivity' in line or 'syncCatLevel' in line: return 2
    if 'awardChallengeBadge' in line or 'checkBadges' in line: return 1
    raise SystemExit('app861 unmatched: %r' % line)

def cls_app873(line):
    if 'recordActivity' in line or 'syncCatLevel' in line or 'mascotCheer' in line: return 2
    if 'Registra o dia de hoje' in line: return 2
    if 'function recordActivity()' in line: return 2
    if 'const today = new Date()' in line: return 2
    if 'state.activityDates = state.activityDates' in line: return 2
    if 'state.activityDates.includes(today)' in line: return 2
    if line == '+}': return 2
    if line.startswith(('+', '-')): return 1
    raise SystemExit('app873 unmatched: %r' % line)

def cls_app1185(line):
    if 'mascotLevel' in line or 'renderMascot' in line or 'lastKnownLevel' in line: return 2
    if line.startswith(('+', '-')): return 3
    raise SystemExit('app1185 unmatched: %r' % line)

def cls_html297(line):
    if 'Regra:' in line: return 4
    if 'CONSOLIDADO' in line or 'meu-plano' in line: return 5
    if line.startswith('+') and ('theme-option' in line or 'Tema' in line or 'theme-swatch' in line
                                or 'O tema fica salvo' in line or 'modal-divider' in line):
        return 3
    if line.startswith(('+', '-')): return 3
    raise SystemExit('html297 unmatched: %r' % line)

def cls_css900(line):
    if 'background: linear-gradient' in line: return 3
    if 'width: 7' in line or 'flex-direction' in line or 'gap: 1px' in line: return 2
    if 'display: flex' in line: return 2
    raise SystemExit('css900 unmatched: %r' % line)

def cls_css1283():
    state = {'cur': 1}
    def f(line):
        if 'MASCOTE (gatos pixel-art)' in line: state['cur'] = 2
        elif 'BADGES DE DESAFIOS' in line: state['cur'] = 1
        elif 'SELETOR DE TEMA' in line: state['cur'] = 3
        return state['cur']
    return f

CLS = {
    (APP,17): cls_app17, (APP,191): cls_app191, (APP,385): cls_app385,
    (APP,582): cls_app582, (APP,845): cls_app845, (APP,861): cls_app861,
    (APP,873): cls_app873, (APP,1185): cls_app1185,
    (HTML,297): cls_html297, (CSS,900): cls_css900, (CSS,1283): cls_css1283(),
}

def classify(path, pre, line):
    key = (path, pre)
    if key in CLS: return CLS[key](line)
    if key in WHOLE: return WHOLE[key]
    raise SystemExit('no rule for %s pre=%s line=%r' % (path, pre, line))

# ---------- aplicar mudanças <= commit ----------
def content_for(path, hunks, commit):
    base = head_blob(path).split('\n')
    for h in sorted(hunks, key=lambda h: -h['pre']):
        sel = [l for l in h['lines'] if not l.startswith(('+', '-'))]  # context placeholder
        start = h['pre'] - 1
        region = base[start:start + h['prec']]
        out, idx = [], 0
        for dl in h['lines']:
            if dl == '' : continue
            if dl[0] == ' ':
                out.append(region[idx]); idx += 1
            elif dl[0] == '-':
                if classify(path, h['pre'], dl) <= commit:
                    idx += 1
                else:
                    out.append(region[idx]); idx += 1
            elif dl[0] == '+':
                if classify(path, h['pre'], dl) <= commit:
                    out.append(dl[1:])
        base = base[:start] + out + base[start + h['prec']:]
    return '\n'.join(base)

COMMITS = {
    1: [APP, HTML, CSS],
    2: [APP, HTML, CSS, NEW_CATS],
    3: [APP, HTML, CSS],
    4: [APP, HTML],
    5: [APP, PARSER, READ, FEAT, HTML],
}

def main():
    if DO_COMMIT:
        r = run(['git', 'config', 'user.email'])
        if r.returncode != 0:
            raise SystemExit('git identity not set')
        hooks = os.path.join(REPO, '.git', 'hooks')
        active = [h for h in os.listdir(hooks) if not h.endswith('.sample')]
        if active:
            print('!! active hooks:', active)
    out_dir = '._out'
    if os.path.exists(out_dir):
        subprocess.run(['rm', '-rf', out_dir])
    os.makedirs(out_dir)
    hunks = {}
    for p in sorted({APP, HTML, CSS, PARSER, READ, FEAT}):
        hunks[p] = parse_hunks(p)
        print('%s: %d hunks' % (p, len(hunks[p])))

    if DO_COMMIT:
        r = run(['git', 'stash', 'list'])
        print('stashes:', r.stdout.decode())

    contents = {}
    for c in range(1, 6):
        contents[c] = {}
        for p in COMMITS[c]:
            if p == NEW_CATS:
                contents[c][p] = open(p).read()
            else:
                contents[c][p] = content_for(p, hunks[p], c)

    # grava arquivos + verificações
    import hashlib
    for c in range(1, 6):
        for p, txt in contents[c].items():
            d = os.path.dirname(os.path.join(out_dir, str(c), p))
            os.makedirs(d, exist_ok=True)
            open(os.path.join(out_dir, str(c), p), 'w').write(txt)

    # verificações por commit
    def check(cond, msg):
        if not cond:
            print('FAIL:', msg); sys.exit(1)
    checks = {
        1: {APP: ['mascot', 'serverOk', 'THEME_KEY', 'applyTheme', 'initTheme', 'recordActivity', 'syncCatLevel', 'mascotCheer'],
             HTML: ['mascot', 'theme-option', 'cats.js', 'meu-plano'],
             CSS:  ['cat-svg', 'theme-options', 'Catppuccin']},
        2: {APP: ['serverOk', 'THEME_KEY', 'applyTheme', 'initTheme', 'ensureStartDate'],
             HTML: ['theme-option', 'meu-plano'],
             CSS:  ['theme-options', 'Catppuccin']},
        3: {APP: ['serverOk', 'ensureStartDate'],
             HTML: ['meu-plano'],
             CSS:  []},
        4: {APP: [], HTML: ['meu-plano'], CSS: []},
        5: {APP: [], HTML: [], CSS: []},
    }
    for c in range(1, 6):
        for p, bad in checks[c].items():
            if p not in contents[c]:
                continue
            txt = contents[c][p]
            for b in bad:
                check(b not in txt, 'C%d %s contains %s' % (c, p, b))
        if APP in contents[c]:
            open('._check.js', 'w').write(contents[c][APP])
            r = run(['node', '--check', '._check.js'])
            check(r.returncode == 0, 'C%d app.js syntax: %s' % (c, r.stderr.decode()))
            os.remove('._check.js')
    for c, expected in [(1, 'badges-grid'), (2, 'mascot-box'), (3, 'theme-option'), (4, 'não há atalho'), (5, 'meu-plano-90-dias')]:
        if HTML in contents[c]:
            check(expected in contents[c][HTML], 'C%d html lacks %s' % (c, expected))
    for c, expected in [(1, 'badge-card'), (2, 'cat-svg'), (3, 'Catppuccin')]:
        if CSS in contents[c]:
            check(expected in contents[c][CSS], 'C%d css lacks %s' % (c, expected))
    check('Upload bloqueado' in contents[4][APP], 'C4 app.js lacks new gate')
    check('confirm(' not in contents[4][APP], 'C4 app.js still has confirm(')
    check('serverOk' in contents[4][APP], 'C4 app.js lacks serverOk')
    check('ensureStartDate' in contents[4][APP], 'C4 app.js lacks ensureStartDate')
    print('verificações OK (conteúdo em ._out/)')

    if not DO_COMMIT:
        print('DRY-RUN: sem --commit, nada foi gravado no index/HEAD.')
        return

    for c in range(1, 6):
        for p, txt in contents[c].items():
            r = run(['git', 'hash-object', '-w', '--stdin'], inp=txt.encode())
            if r.returncode != 0:
                raise SystemExit('hash-object fail')
            sha = r.stdout.decode().strip()
            if p == NEW_CATS:
                run(['git', 'update-index', '--add', '--cacheinfo', '100644,' + sha + ',' + p])
            else:
                run(['git', 'update-index', '--cacheinfo', '100644,' + sha + ',' + p])
        msgs = {
            1: 'tracker: badges/XP (conquistas + XP do plano e tasks atômicas)',
            2: 'tracker: mascote gatinho pixel-art + streak por dias ativos (cats.js)',
            3: 'tracker: tema Catppuccin Mocha (padrão) + Dark Premium com seletor',
            4: 'tracker: gate estrito de import de desafios + Dia 1 automático (servidor)',
            5: 'docs: remove referências a arquivos pessoais (renames)',
        }
        r = run(['git', 'commit', '-q', '-m', msgs[c]])
        if r.returncode != 0:
            print('commit C%d fail: %s' % (c, r.stderr.decode())); sys.exit(1)
        print('commit C%d ok: %s' % (c, msgs[c]))

main()
