import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('firestore.rules includes rules_version 2 and default deny catch-all', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);
});

test('firestore.rules enforces Eight Pillars helpers and PII isolation', () => {
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /function isAdmin\(\)/);
  assert.match(rulesContent, /email_verified\s*==\s*true/);
  assert.match(rulesContent, /match \/private\/\{docId\}/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly/);
  assert.match(rulesContent, /request\.time/);
});

test('firestore.rules covers all blueprint collections and blocks self-admin escalation', () => {
  for (const col of ['admins', 'users', 'posts', 'questions', 'appointments', 'babies', 'orders', 'reports']) {
    assert.ok(rulesContent.includes(`match /${col}/`), `Missing rule block for ${col}`);
  }
  assert.match(rulesContent, /match \/admins\/\{adminId\}[\s\S]*allow write:\s*if false;/);
});
