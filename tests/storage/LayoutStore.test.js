const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { LayoutStore } = require('../../src/storage/LayoutStore');

test('LayoutStore initializes missing file and returns empty array', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'layout-store-'));
  try {
    const filePath = path.join(tmpDir, 'layout.json');
    const store = new LayoutStore(filePath);

    const result = await store.read();
    assert.deepEqual(result, []);

    const persisted = await fs.readFile(filePath, 'utf8');
    assert.equal(persisted.trim(), '[]');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('LayoutStore writes and reads layout atomically', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'layout-store-'));
  try {
    const filePath = path.join(tmpDir, 'layout.json');
    const store = new LayoutStore(filePath);
    const layout = [
      { id: 'widget-1', x: 0, y: 0, w: 3, h: 2 },
      { id: 'widget-2', x: 3, y: 0, w: 3, h: 2 },
    ];

    await store.write(layout);
    const restored = await store.read();
    assert.deepEqual(restored, layout);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('LayoutStore resets corrupted files', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'layout-store-'));
  try {
    const filePath = path.join(tmpDir, 'layout.json');
    await fs.writeFile(filePath, '{not-valid-json}', 'utf8');

    const store = new LayoutStore(filePath);
    const result = await store.read();
    assert.deepEqual(result, []);

    const persisted = await fs.readFile(filePath, 'utf8');
    assert.equal(persisted.trim(), '[]');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
