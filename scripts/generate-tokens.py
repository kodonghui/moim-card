#!/usr/bin/env python3
import json
from pathlib import Path

def generate():
    tokens = json.loads(Path('design/base.tokens.json').read_text(encoding='utf-8'))
    lines = []
    def walk(node, names):
        if not isinstance(node, dict):
            return
        if '$value' in node:
            value = node['$value']
            if isinstance(value, dict):
                if 'hex' in value:
                    if 'alpha' in value:
                        rgb = [round(c * 255) for c in value['components']]
                        value = f"rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, {value['alpha']})"
                    else:
                        value = value['hex']
                else:
                    value = str(value['value']) + value['unit']
            elif isinstance(value, list):
                value = ', '.join('"'+v+'"' if isinstance(v, str) and ' ' in v else str(v) for v in value)
            lines.append('  --' + '-'.join(names) + ': ' + str(value) + ';')
        else:
            for key, value in node.items():
                if not key.startswith('$'):
                    walk(value, names + [key])
    walk(tokens, [])
    return ':root {\n' + '\n'.join(lines) + '\n}\n'

if __name__ == '__main__':
    Path('apps/web/src/tokens.css').write_text(generate(), encoding='utf-8')
