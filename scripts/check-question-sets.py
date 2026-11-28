#!/usr/bin/env python3
"""Validate question-set YAML and protect previously published versions (SPEC-031)."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

AXES = {'plan_speed', 'spending_priority', 'schedule_change'}
FIELDS = {'prompt': 40, 'option_a': 30, 'option_b': 30, 'split_suggestion': 60, 'agreed_text_a': 60, 'agreed_text_b': 60}


def field(node, key):
    if not isinstance(node, yaml.MappingNode):
        return None
    return next((value for k, value in node.value if k.value == key), None)


def validate(path):
    errors = []
    def fail(node, message):
        errors.append(f'{path}:{node.start_mark.line + 1 if node else 1}: {message}')
    try:
        root = yaml.compose(path.read_text(encoding='utf-8'), Loader=yaml.SafeLoader)
        if not isinstance(root, yaml.MappingNode):
            fail(root, 'expected a mapping')
            return errors
        # safe_load also rejects YAML tags which are unsafe to construct.
        value = yaml.safe_load(path.read_text(encoding='utf-8'))
        if not isinstance(value, dict):
            fail(root, 'expected a mapping')
            return errors
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        mark = getattr(exc, 'problem_mark', None)
        errors.append(f'{path}:{mark.line + 1 if mark else 1}: invalid YAML')
        return errors
    def text_field(parent, data, key, limit):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            fail(field(parent, key) or parent, f'{key} must be nonempty text, at most {limit} characters')
    theme = value.get('theme')
    if not isinstance(theme, str) or not re.fullmatch(r'[a-z_]{1,20}', theme):
        fail(field(root, 'theme') or root, 'theme must be 1–20 lowercase letters or underscores')
    version = value.get('version')
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        fail(field(root, 'version') or root, 'version must be a positive integer')
    if isinstance(theme, str) and isinstance(version, int) and path.name != f'{theme}-v{version}.yaml':
        fail(root, 'filename must be <theme>-v<version>.yaml')
    text_field(root, value, 'default_next_action', 60)
    questions = value.get('questions')
    sequence = field(root, 'questions')
    if not isinstance(questions, list) or len(questions) != 8 or not isinstance(sequence, yaml.SequenceNode):
        fail(sequence or root, 'questions must contain exactly 8 items')
        return errors
    for question, node in zip(questions, sequence.value):
        if not isinstance(question, dict) or not isinstance(node, yaml.MappingNode):
            fail(node, 'question must be a mapping')
            continue
        for key, maximum in FIELDS.items():
            text_field(node, question, key, maximum)
        axis, pole = question.get('axis'), question.get('axis_pole_a')
        if axis is not None and (not isinstance(axis, str) or axis not in AXES):
            fail(field(node, 'axis') or node, 'unknown axis')
        if (axis is None) != (pole is None) or (pole is not None and pole not in ('low', 'high')):
            fail(field(node, 'axis_pole_a') or node, 'axis and axis_pole_a must both be present; pole must be low or high')
    return errors


def check(directory, baseline):
    issues = []
    paths = sorted(directory.glob('*.yaml'))
    for path in paths:
        issues.extend(validate(path))
    for name, expected in baseline.items():
        if not isinstance(name, str) or Path(name).name != name or not isinstance(expected, str) or not re.fullmatch('[0-9a-f]{64}', expected):
            issues.append(f'{directory}:1: invalid published manifest entry')
            continue
        path = directory / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            issues.append(f'{path}:1: published version changed or missing; publish a new version such as v2')
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, default=Path('content/question-sets'))
    parser.add_argument('--base', default='origin/main')
    args = parser.parse_args()
    manifest = args.directory / 'published.json'
    try:
        current = json.loads(manifest.read_text())
        if not isinstance(current, dict): raise ValueError('expected object')
        if subprocess.run(['git', 'rev-parse', '--verify', f'{args.base}^{{commit}}'], capture_output=True).returncode:
            raise ValueError('base ref is unavailable')
        base_text = subprocess.run(['git', 'show', f'{args.base}:{manifest.as_posix()}'], capture_output=True, text=True)
        # A missing base manifest is allowed only during the initial introduction of the format.
        baseline = json.loads(base_text.stdout) if base_text.returncode == 0 else {}
        if not isinstance(baseline, dict): raise ValueError('invalid base manifest')
        for name, digest in baseline.items():
            if current.get(name) != digest:
                raise ValueError(f'published manifest entry {name} changed or removed')
        issues = check(args.directory, current | baseline)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        issues = [f'{manifest}:1: {exc}']
    for issue in issues: print('FAIL', issue)
    print(f'Question sets: {len(issues)} failures')
    return bool(issues)


if __name__ == '__main__':
    sys.exit(main())
