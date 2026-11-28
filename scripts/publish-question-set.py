#!/usr/bin/env python3
"""Validate review evidence, then publish one question set into local D1."""
import argparse
import ast
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('question_check', ROOT / 'scripts/check-question-sets.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
CHECKS = {'prohibited_categories', 'politics', 'polite_style', 'slang', 'six_conclusions', 'og_image'}


def prepare(path, review_path, rights_path, theme_name, sort_order):
    issues = checker.validate(path)
    if issues:
        raise ValueError('\n'.join(issues))
    data = checker.yaml.safe_load(path.read_text(encoding='utf-8'))
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        review = json.loads(review_path.read_text(encoding='utf-8'))
        rights = json.loads(rights_path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise ValueError('review and rights evidence must be readable JSON') from exc
    if not isinstance(review, dict) or review.get('sha256') != digest or not isinstance(review.get('reviewer'), str) or not review['reviewer'].strip() or not isinstance(review.get('date'), str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', review['date']) or not isinstance(review.get('checks'), dict) or set(review['checks']) != CHECKS or not all(v is True for v in review['checks'].values()):
        raise ValueError('review must identify this hash, reviewer, date and all passed checks')
    if not isinstance(rights, dict) or rights.get('sha256') != digest or not all(isinstance(rights.get(k), str) and rights[k].strip() for k in ('author', 'date', 'creation_record')):
        raise ValueError('rights evidence must identify this hash, author, date and creation record')
    source = (ROOT / 'packages/shared/src/prohibited-words.ts').read_text(encoding='utf-8')
    match = re.search(r'prohibitedWords\s*=\s*(\[[^\]]*\])', source)
    if not match:
        raise ValueError('prohibited word list unavailable')
    banned = ast.literal_eval(match.group(1))
    def strings(value):
        if isinstance(value, str): yield value
        elif isinstance(value, list):
            for item in value: yield from strings(item)
        elif isinstance(value, dict):
            for item in value.values(): yield from strings(item)
    for text in strings(data):
        normalized = unicodedata.normalize('NFC', text).casefold()
        if any(unicodedata.normalize('NFC', word).casefold() in normalized for word in banned):
            raise ValueError('prohibited word in question set')
    if not theme_name.strip() or len(theme_name) > 20 or sort_order < 0:
        raise ValueError('invalid theme metadata')
    return {'content': data, 'digest': digest, 'themeName': theme_name, 'sortOrder': sort_order}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--review', required=True, type=Path)
    parser.add_argument('--rights', required=True, type=Path)
    parser.add_argument('--theme-name', required=True)
    parser.add_argument('--sort-order', required=True, type=int)
    parser.add_argument('--persist', required=True, type=Path, help='local Miniflare D1 state directory')
    parser.add_argument('--database-id', required=True, help='local D1 database identifier')
    args = parser.parse_args()
    try:
        payload = prepare(args.file, args.review, args.rights, args.theme_name, args.sort_order)
        result = subprocess.run(['node', str(ROOT / 'scripts/publish-question-set.mjs'), str(args.persist), args.database_id], input=json.dumps(payload, ensure_ascii=False), text=True, check=False)
        return result.returncode
    except (ValueError, OSError) as exc:
        print(f'Publish refused: {exc}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
