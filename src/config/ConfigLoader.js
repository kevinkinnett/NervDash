const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = this.#readConfig();
  }

  getWidgets() {
    return Array.isArray(this.config.widgets) ? this.config.widgets : [];
  }

  getGoogleOAuthConfig() {
    return this.config.google?.oauth ?? {};
  }

  getConfig() {
    return this.config;
  }

  #readConfig() {
    try {
      const resolvedPath = path.resolve(this.configPath);
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load configuration file.', error);
      return { widgets: [], google: {} };
    }
  }
}

module.exports = { ConfigLoader };
