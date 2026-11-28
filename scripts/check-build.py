#!/usr/bin/env python3
"""Check the web build for the project's prohibited constructs (TASK-002)."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

# These checks deliberately reject use of the APIs, not merely their results.
RULES = {
    'iframe': r'<\s*iframe\b',
    'ads or payments': r'\b(?:loadFullScreenAd|showFullScreenAd|loadAppsInTossAdMob|showAppsInTossAdMob|GoogleAdMob|AdMob|IAP|createOneTimePurchaseOrder|openPayment|TossPayments)\s*(?:\.|\()',
    'eval': r'\beval\s*\(',
    'new Function': r'\bnew\s+Function\s*\(',
    'dark mode': r'prefers-color-scheme\s*:\s*dark|color-scheme\s*:\s*(?:dark|light\s+dark)|\b(?:darkMode|setDarkMode|themeMode)\b',
}


def check(package, build):
    issues = []
    try:
        data = json.loads(package.read_text(encoding='utf-8'))
        version = (data.get('dependencies', {}) | data.get('devDependencies', {})).get('@apps-in-toss/web-framework', '')
        match = re.fullmatch(r'3\.(\d+)\.(\d+)', version)
        if not match or int(match.group(1)) < 6:
            issues.append('SDK must be pinned to 3.6.0 or later within 3.x')
    except (OSError, ValueError) as exc:
        issues.append(f'cannot read SDK version: {exc}')
    files = [p for p in build.rglob('*') if p.is_file() and p.suffix.lower() in {'.html', '.css', '.js', '.mjs'}] if build.is_dir() else []
    if not files:
        issues.append(f'no web build artifacts in {build}')
    # Only the separately emitted TDS-only chunk may contain a dark-mode detector.
    # The Vite plugin rejects non-TDS modules in that chunk and binds its bytes here.
    vendor = None
    manifest = build / 'tds-provenance.json'
    if manifest.exists():
        try:
            provenance = json.loads(manifest.read_text(encoding='utf-8'))
            name = provenance['file']
            candidate = build / name
            modules = provenance['modules']
            if (not re.fullmatch(r'assets/tds-vendor-[A-Za-z0-9_-]+\.js', name)
                    or not modules or any(not re.match(r'^/node_modules/@toss/tds-(?:mobile|mobile-ait)/', m) for m in modules)
                    or hashlib.sha256(candidate.read_bytes()).hexdigest() != provenance['sha256']):
                raise ValueError('invalid TDS chunk provenance')
            vendor = candidate
        except (OSError, ValueError, KeyError, TypeError) as exc:
            issues.append(f'invalid TDS provenance: {exc}')
    for path in files:
        text = path.read_text(encoding='utf-8')
        for name, pattern in RULES.items():
            if name == 'dark mode' and path == vendor:
                continue
            for match in re.finditer(pattern, text, re.IGNORECASE):
                issues.append(f'{path}:{text.count(chr(10), 0, match.start()) + 1}: {name}')
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--package', type=Path, default=Path('apps/web/package.json'))
    parser.add_argument('--source', type=Path, default=Path('apps/web'))
    parser.add_argument('--build', type=Path, default=Path('apps/web/dist'))
    args = parser.parse_args()
    issues = check(args.package, args.build)
    for path in args.source.rglob('*'):
        if not set(path.parts) & {'node_modules', 'dist', 'test-results'} and path.is_file() and path.suffix in {'.ts', '.tsx', '.js', '.jsx', '.css', '.html'}:
            if re.search(RULES['dark mode'], path.read_text(encoding='utf-8'), re.IGNORECASE):
                issues.append(f'{path}: dark mode')
    for issue in issues:
        print('FAIL', issue)
    print(f'Build check: {len(issues)} violations')
    return bool(issues)


if __name__ == '__main__':
    sys.exit(main())
