#!/usr/bin/env python3
"""
Simple script to compare frontend usages of `/api/v1` endpoints with backend routes
in `backend/app.py`.

Outputs a JSON report to `backend/api_usage_report.json` and prints a summary.
Optionally suggests decorators to annotate as unused.
"""
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / 'backend'
REPORT_PATH = ROOT / 'backend' / 'api_usage_report.json'

FRONTEND_GLOBS = [
    ROOT / 'backend' / 'voorbeeldGebruikBackend' / 'frontend' / 'js',
    ROOT / 'frontend'
]

API_PREFIX = '/api/v1'

re_decorator = re.compile(r"@[\w_]+\.(get|post|put|delete|options)\(\s*(?:f?r?)?[\"']([^\"']+)[\"']")
# Matches decorators on app or routers (e.g., @app.get, @router.post, @sessions_router.put)

# NOTE: previous complex regex was removed; the script uses an explicit finder in `extract_frontend_usages()`


param_pattern_curly = re.compile(r"\{[^}]+\}")
param_pattern_tpl = re.compile(r"\$\{[^}]+\}")


def normalize(path: str) -> str:
    if not path:
        return path
    # Replace f"{ENDPOINT}" style by ensuring prefix
    path = path.replace('{ENDPOINT}', API_PREFIX)
    path = path.replace('" + ENDPOINT + "', API_PREFIX)
    # Ensure starts with API_PREFIX
    if API_PREFIX in path and not path.startswith(API_PREFIX):
        # find first /api/v1 occurrence
        i = path.find(API_PREFIX)
        path = path[i:]
    # Replace template params with {param}
    path = param_pattern_curly.sub('{param}', path)
    path = param_pattern_tpl.sub('{param}', path)
    # Remove repeated slashes
    path = re.sub(r'/+', '/', path)
    # Remove trailing quote/backtick if present
    path = path.strip('`"\'')
    return path


def extract_backend_routes():
    routes = {}
    # Scan all Python files under backend/ for route decorators
    for p in BACKEND_DIR.rglob('*.py'):
        if p.match('**/__pycache__/**'):
            continue
        try:
            text = p.read_text(encoding='utf-8')
        except Exception:
            continue
        for m in re_decorator.finditer(text):
            method = m.group(1).upper()
            route_raw = m.group(2)
            route = normalize(route_raw)
            # store the exact decorator text and filename for possible annotation
            lineno = text[:m.start()].count('\n') + 1
            # capture the decorator line
            line_end = text.find('\n', m.start())
            line = (text[m.start():line_end] if line_end != -1 else text[m.start():])
            routes.setdefault(route, []).append({'method': method, 'decorator': line, 'file': str(p), 'line': lineno})
    return routes


def extract_frontend_usages():
    used = set()
    files = []
    for g in FRONTEND_GLOBS:
        if not g.exists():
            continue
        for p in g.rglob('*'):
            if p.is_file() and p.suffix in ('.js', '.vue', '.ts', '.jsx', '.html'):
                files.append(p)
    for p in files:
        try:
            text = p.read_text(encoding='utf-8')
        except Exception:
            continue
        for m in re.finditer(r'(/api/v1[\w\-@:\/?&=%\$\{\}\.\[\]\(\)\\*+;,+~#]*)', text):
            raw = m.group(1)
            norm = normalize(raw)
            used.add(norm)
    return used


def main():
    backend_routes = extract_backend_routes()
    backend_set = set(backend_routes.keys())

    frontend_set = extract_frontend_usages()

    # Normalize: collapse variants like '/api/v1/sessions' and '/api/v1/sessions/'
    backend_set = set([p.rstrip('/') for p in backend_set if p.startswith(API_PREFIX)])
    frontend_set = set([p.rstrip('/') for p in frontend_set if p.startswith(API_PREFIX)])

    missing_backend = sorted(frontend_set - backend_set)
    unused_backend = sorted(backend_set - frontend_set)
    common = sorted(frontend_set & backend_set)

    report = {
        'backend_routes': sorted(list(backend_set)),
        'frontend_usages': sorted(list(frontend_set)),
        'common': common,
        'missing_in_backend': missing_backend,
        'unused_in_frontend': unused_backend,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print('\nAPI usage check report written to', REPORT_PATH)
    print('\nSummary:')
    print('  Backend routes found: ', len(backend_set))
    print('  Frontend usages found:', len(frontend_set))
    print('  Common endpoints:     ', len(common))
    print('  Missing in backend (frontend calls but no route):', len(missing_backend))
    for m in missing_backend:
        print('    -', m)
    print('  Unused in frontend (backend routes with no frontend usage):', len(unused_backend))
    for u in unused_backend[:200]:
        print('    -', u)

    # Print decorators to annotate for unused endpoints
    if unused_backend:
        print('\nCandidate decorator lines to annotate with "# UNUSED_BY_FRONTEND":')
        for u in unused_backend:
            decs = backend_routes.get(u, [])
            for d in decs:
                print('  ', d['decorator'])

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
