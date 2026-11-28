#!/usr/bin/env python3
"""Check app CSS color/spacing declarations against the design-token variables."""
import re
import importlib.util
import sys
from pathlib import Path

ROOT = Path('apps/web/src')
DECLARATION = re.compile(r'(?<![\w-])(color|background(?:-color)?|border(?:-color)?|margin(?:-\w+)?|padding(?:-\w+)?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)', re.I)
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
issues = []
spec = importlib.util.spec_from_file_location('generate_tokens', Path('scripts/generate-tokens.py'))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
if (ROOT / 'tokens.css').read_text(encoding='utf-8') != generator.generate():
    issues.append('apps/web/src/tokens.css does not match design/base.tokens.json')
for path in ROOT.rglob('*'):
    if path.name == 'tokens.css' or path.suffix not in {'.css', '.ts', '.tsx'}:
        continue
    text = path.read_text(encoding='utf-8')
    if HEX.search(text):
        issues.append(f'{path}: literal color')
    if path.suffix == '.css':
        for match in DECLARATION.finditer(text):
            value = re.sub(r'var\(--[\w-]+\)|!important', '', match.group(2)).strip()
            if value and value != '0':
                issues.append(f'{path}: non-token {match.group(1)}: {match.group(2)}')
    if path.name != 'AgreementCard.tsx' and re.search(r'--color-card-|color\.card\b', text):
        issues.append(f'{path}: card token outside agreement card')
for issue in issues:
    print('FAIL', issue)
print(f'Token check: {len(issues)} violations')
sys.exit(bool(issues))
