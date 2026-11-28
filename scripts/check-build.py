#!/usr/bin/env python3
"""Check the web build for the project's prohibited constructs (TASK-002)."""
import argparse
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
    for path in files:
        text = path.read_text(encoding='utf-8')
        for name, pattern in RULES.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                issues.append(f'{path}:{text.count(chr(10), 0, match.start()) + 1}: {name}')
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--package', type=Path, default=Path('apps/web/package.json'))
    parser.add_argument('--build', type=Path, default=Path('apps/web/dist'))
    args = parser.parse_args()
    issues = check(args.package, args.build)
    for issue in issues:
        print('FAIL', issue)
    print(f'Build check: {len(issues)} violations')
    return bool(issues)


if __name__ == '__main__':
    sys.exit(main())
