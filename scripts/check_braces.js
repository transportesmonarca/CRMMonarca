const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('Usage: node check_braces.js <file>');
  process.exit(1);
}
const s = fs.readFileSync(path, 'utf8');
let stack = [];
let line = 1, col = 0;
let inS = false, inD = false, inB = false, esc = false, inTplExpr = 0;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '\n') { line++; col = 0; } else { col++; }
  if (esc) { esc = false; continue; }
  if (ch === '\\') { esc = true; continue; }
  if (inS) { if (ch === '\'') inS = false; continue; }
  if (inD) { if (ch === '"') inD = false; continue; }
  if (inB) {
    if (ch === '`' && inTplExpr === 0) { inB = false; continue; }
    if (ch === '{' && s[i - 1] === '$') { inTplExpr++; continue; }
    if (ch === '}' && inTplExpr > 0) { inTplExpr--; continue; }
    continue; // ignore other chars inside template literal body
  }
  if (ch === '\'') { inS = true; continue; }
  if (ch === '"') { inD = true; continue; }
  if (ch === '`') { inB = true; continue; }
  if (ch === '{') {
    stack.push({ line, col });
  } else if (ch === '}') {
    if (stack.length === 0) {
      console.log('Extra closing brace at', { line, col });
    } else {
      stack.pop();
    }
  }
}
console.log('Unmatched openings:', stack.length);
if (stack.length) {
  const last = stack[stack.length - 1];
  console.log('Last unmatched opening at line', last.line, 'col', last.col);
  const lines = s.split('\n');
  const from = Math.max(0, last.line - 3);
  const to = Math.min(lines.length, last.line + 2);
  for (let i = from; i < to; i++) {
    console.log((i + 1) + ':', lines[i]);
  }
}