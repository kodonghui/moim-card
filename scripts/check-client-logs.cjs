// Restrict client logging to a constant diagnostic and one parameter-free event.
// Inspect references as well as calls so aliases cannot bypass the rule.
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
  function isDirectCall(id, method) {
    const access = id.parent;
    if (!ts.isPropertyAccessExpression(access) || access.expression !== id || access.name.text !== method || access.questionDotToken) return null;
    const call = access.parent;
    return ts.isCallExpression(call) && call.expression === access && !call.questionDotToken ? call : null;
  }
  function safeDiagnostic(id) {
    const call = isDirectCall(id, 'error');
    return call && call.arguments.length === 1 && ts.isStringLiteral(call.arguments[0]) && call.arguments[0].text === 'client request error';
  }
  function safeAnalytics(id) {
    if (ts.isImportSpecifier(id.parent) && id.parent.name === id && !id.parent.propertyName) return true;
    const call = isDirectCall(id, 'log');
    if (!call || call.arguments.length !== 1) return false;
    const arg = call.arguments[0];
    if (ts.isStringLiteral(arg)) return arg.text === 'interim_card_created';
    if (!ts.isObjectLiteralExpression(arg) || arg.properties.length !== 3 || !arg.properties.every(ts.isPropertyAssignment)) return false;
    const props = arg.properties;
    return props.some(p => p.name.getText(source) === 'log_name' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'interim_card_created') &&
      props.some(p => p.name.getText(source) === 'log_type' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'event') &&
      props.some(p => p.name.getText(source) === 'params' && ts.isObjectLiteralExpression(p.initializer) && p.initializer.properties.length === 0);
  }
  function fail(node) {
    process.stderr.write(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: prohibited logging reference\n`); errors++;
  }
  function visit(node) {
    if (ts.isIdentifier(node)) {
      if (node.text === 'console' && !safeDiagnostic(node)) fail(node);
      else if (node.text === 'Analytics' && !safeAnalytics(node)) fail(node);
      else if (['reportError', 'captureException', 'eventLog'].includes(node.text)) fail(node);
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && ['console', 'Analytics', 'reportError', 'captureException', 'eventLog'].includes(node.argumentExpression.text)) fail(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
walk(root);
process.stdout.write(`Client log check: ${errors} violations\n`);
process.exitCode = errors ? 1 : 0;
