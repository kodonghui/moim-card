// The client has no general-purpose log or error reporter. The only permitted
// analytics event has no parameters, so room codes cannot be attached to it.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] || 'apps/web/src';
let errors = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file) && !/\.test\.[jt]sx?$/.test(file)) check(file);
  }
}
function check(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      const allowed = callee === 'Analytics.log' && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'interim_card_created';
      if (/^(console(?:\.|\[)|Analytics\.log$|reportError$|captureException$)/.test(callee) && !allowed) {
        process.stderr.write(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: prohibited logging call\n`);
        errors++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
walk(root);
process.stdout.write(`Client log check: ${errors} violations\n`);
process.exitCode = errors ? 1 : 0;
