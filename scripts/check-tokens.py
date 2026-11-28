#!/usr/bin/env python3
"""Reject non-token colors and spacing in app styles."""
import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path('apps/web/src')
DECLARATION = re.compile(r'(?<![\w-])([\w-]+)\s*:\s*([^;{}]+)', re.I)
COLOR_NAMES = '|'.join(json.loads(Path('scripts/css-color-names.json').read_text()))
COLORS = re.compile(r'#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(|\b(?:' + COLOR_NAMES + r')\b', re.I)
SPACING = re.compile(r'^(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(?:-[\w-]+)?$', re.I)
BORDER = re.compile(r'^(?:border|outline)(?:-[\w-]+)?$', re.I)

def check(root=ROOT, generated=True):
    issues = []
    if generated:
        spec = importlib.util.spec_from_file_location('generate_tokens', Path('scripts/generate-tokens.py'))
        generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        if (root / 'tokens.css').read_text(encoding='utf-8') != generator.generate():
            issues.append(f'{root}/tokens.css does not match design/base.tokens.json')
    for path in root.rglob('*'):
        if path.name == 'tokens.css' or path.suffix not in {'.css', '.ts', '.tsx'}:
            continue
        text = path.read_text(encoding='utf-8')
        if path.suffix in {'.ts', '.tsx'} and re.search(r'#[0-9a-fA-F]{3,8}\b', text):
            issues.append(f'{path}: literal color')
        if path.suffix == '.css':
            for match in DECLARATION.finditer(re.sub(r'/\*.*?\*/', '', text, flags=re.S)):
                name, value = match.groups()
                clean = re.sub(r'var\(--[\w-]+\)|!important', '', value).strip()
                if COLORS.search(clean):
                    issues.append(f'{path}: non-token color in {name}: {value}')
                if SPACING.fullmatch(name) and clean not in ('', '0', 'auto') and not re.fullmatch(r'(?:(?:0|auto)\s+)*(?:0|auto)', clean):
                    issues.append(f'{path}: non-token spacing in {name}: {value}')
                if BORDER.fullmatch(name) and re.search(r'\d+(?:\.\d+)?(?:px|rem|em)', clean) and not re.fullmatch(r'1px\s+solid', clean):
                    issues.append(f'{path}: non-token border in {name}: {value}')
        if path.name != 'AgreementCard.tsx' and re.search(r'--color-card-|color\.card\b', text):
            issues.append(f'{path}: card token outside agreement card')
    result = subprocess.run(['node', 'scripts/check-inline-styles.cjs', str(root)], capture_output=True, text=True)
    if result.returncode:
        issues.extend(result.stderr.splitlines() or ['inline style check failed'])
    return issues

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=ROOT)
    args = parser.parse_args()
    issues = check(args.source, generated=args.source == ROOT)
    for issue in issues: print('FAIL', issue)
    print(f'Token check: {len(issues)} violations')
    return bool(issues)

if __name__ == '__main__':
    sys.exit(main())
