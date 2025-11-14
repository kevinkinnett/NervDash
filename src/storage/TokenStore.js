const fs = require('fs');
const path = require('path');

class TokenStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.tokens = this.#readTokens();
  }

  getTokens() {
    return this.tokens;
  }

  save(tokens) {
    this.tokens = tokens;
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(tokens, null, 2));
  }

  mergeAndSave(tokens) {
    const merged = { ...(this.tokens || {}), ...tokens };
    this.save(merged);
  }

  #readTokens() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load OAuth token store.', error);
      }
      return null;
    }
  }
}

module.exports = { TokenStore };
