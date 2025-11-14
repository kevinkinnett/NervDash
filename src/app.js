const express = require('express');
const path = require('path');
const ical = require('node-ical');
const { google } = require('googleapis');
const { ConfigLoader } = require('./config/ConfigLoader');
const { TokenStore } = require('./storage/TokenStore');
const { LayoutStore } = require('./storage/LayoutStore');
const { WidgetRegistry } = require('./widgets/WidgetRegistry');
const { OAuthManager } = require('./google/OAuthManager');
const { BitcoinPriceService } = require('./services/BitcoinPriceService');
const { CalendarService } = require('./services/CalendarService');
const { FinanceService } = require('./services/FinanceService');
const { createApiRouter } = require('./routes/api');

function createApp({ rootDir }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(rootDir, 'public')));

  const configLoader = new ConfigLoader(path.join(rootDir, 'config', 'config.json'));
  const tokenStore = new TokenStore(path.join(rootDir, 'config', 'tokens.json'));
  const layoutStore = new LayoutStore(path.join(rootDir, 'data', 'layout.json'));
  const widgetRegistry = new WidgetRegistry(configLoader);
  const oauthManager = new OAuthManager({ configLoader, tokenStore });
  const bitcoinService = new BitcoinPriceService();
  const calendarService = new CalendarService({ ical });
  const financeService = new FinanceService({ google, oauthManager });

  app.use(
    '/api',
    createApiRouter({
      widgetRegistry,
      layoutStore,
      bitcoinService,
      calendarService,
      financeService,
      oauthManager,
    })
  );

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error.' });
  });

  return app;
}

module.exports = { createApp };
