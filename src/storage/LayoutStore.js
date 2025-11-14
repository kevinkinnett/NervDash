const fs = require('fs/promises');
const path = require('path');

class LayoutStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      try {
        return JSON.parse(raw);
      } catch (parseError) {
        console.warn('Layout file is corrupted. Reinitializing layout store.');
        await this.#initialize();
        return [];
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.#initialize();
        return [];
      }
      throw error;
    }
  }

  async write(layout) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    const payload = JSON.stringify(layout, null, 2);
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }

  async #initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, '[]', 'utf8');
  }
}

module.exports = { LayoutStore };
