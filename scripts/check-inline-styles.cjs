const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] || 'apps/web/src';
const colorNames = require('./css-color-names.json').join('|');
const color = new RegExp(`#[0-9a-f]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\\s*\\(|\\b(?:${colorNames})\\b`, 'i');
const layout = /^(?:margin|padding|gap|rowGap|columnGap|inset|top|right|bottom|left)(?:Top|Right|Bottom|Left|Block|Inline|Start|End)?$/;
const colored = /(?:color|background|border|outline|shadow|fill|stroke)/i;
let issues = 0;
function fail(file, node, source) { process.stderr.write(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: non-token inline style\n`); issues++; }
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[jt]sx$/.test(file)) check(file);
  }
}
function check(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'style') {
      const object = node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression;
      if (!object || !ts.isObjectLiteralExpression(object)) fail(file, node, source);
      else for (const prop of object.properties) {
        if (!ts.isPropertyAssignment(prop)) { fail(file, prop, source); continue; }
        const name = prop.name.getText(source).replace(/^['"]|['"]$/g, '');
        const val = prop.initializer, raw = val.getText(source);
        const approvedCard = path.basename(file) === 'AgreementCard.tsx' && /^(?:colors(?:\[(?:['"][\w-]+['"]|category)\]|\.[\w]+)+\.\$value\.hex|`1px solid \${colors(?:\[(?:['"][\w-]+['"]|category)\]|\.[\w]+)+\.\$value\.hex}`)$/.test(raw);
        if (approvedCard) continue;
        if (ts.isStringLiteral(val) || ts.isNoSubstitutionTemplateLiteral(val)) {
          const clean = val.text.replace(/var\(--[\w-]+\)/g, '');
          if (color.test(clean) || ((layout.test(name) || colored.test(name)) && !/^(?:[\s,]*|[\s,]*0[\s,]*)$/.test(clean))) fail(file, prop, source);
        } else if (ts.isNumericLiteral(val) && Number(val.text) === 0) continue;
        else if (layout.test(name) || colored.test(name)) fail(file, prop, source);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
walk(root); process.exitCode = issues ? 1 : 0;
