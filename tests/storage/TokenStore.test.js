const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { TokenStore } = require('../../src/storage/TokenStore');

test('TokenStore reads existing tokens and saves updates', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-store-'));
  try {
    const filePath = path.join(tmpDir, 'tokens.json');
    fs.writeFileSync(filePath, JSON.stringify({ access_token: 'abc' }));

    const store = new TokenStore(filePath);
    assert.deepEqual(store.getTokens(), { access_token: 'abc' });

    store.save({ refresh_token: 'def' });
    const persisted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(persisted, { refresh_token: 'def' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('TokenStore merges tokens and creates directories as needed', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-store-'));
  try {
    const filePath = path.join(tmpDir, 'nested', 'tokens.json');
    const store = new TokenStore(filePath);
    assert.equal(store.getTokens(), null);

    store.mergeAndSave({ refresh_token: 'abc' });
    store.mergeAndSave({ access_token: 'xyz' });

    const persisted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(persisted, { refresh_token: 'abc', access_token: 'xyz' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
