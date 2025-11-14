const express = require('express');
const { SCOPES } = require('../google/OAuthManager');

function createApiRouter({
  widgetRegistry,
  layoutStore,
  bitcoinService,
  calendarService,
  financeService,
  oauthManager,
}) {
  const router = express.Router();

  router.get('/widgets', (req, res) => {
    res.json(widgetRegistry.list());
  });

  router.get('/layout', async (req, res, next) => {
    try {
      const layout = await layoutStore.read();
      res.json(layout);
    } catch (error) {
      next(error);
    }
  });

  router.post('/layout', async (req, res, next) => {
    try {
      const layout = req.body;
      if (!Array.isArray(layout)) {
        res.status(400).json({ message: 'Layout payload must be an array.' });
        return;
      }
      await layoutStore.write(layout);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/bitcoin', async (req, res, next) => {
    try {
      const { id } = req.query;
      if (!id) {
        res.status(400).json({ message: 'Widget id is required.' });
        return;
      }

      const widget = widgetRegistry.getById(id);
      const currency = (req.query.currency || widget.config?.currency || 'USD').toUpperCase();
      const payload = await bitcoinService.getPrice(currency);
      res.json(payload);
    } catch (error) {
      if (error.code === 'WidgetNotFound') {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  });

  router.get('/calendar', async (req, res, next) => {
    try {
      const { id } = req.query;
      if (!id) {
        res.status(400).json({ message: 'Widget id is required.' });
        return;
      }

      const widget = widgetRegistry.getById(id);
      const url = widget.config?.icalUrl;
      if (!url) {
        res.status(400).json({ message: 'Calendar widget is missing an iCal URL.' });
        return;
      }

      const lookaheadDays = Number(widget.config?.lookaheadDays ?? 7);
      const maxItems = Number(widget.config?.maxItems ?? 15);
      const response = await calendarService.getUpcomingEvents({
        url,
        lookaheadDays,
        maxItems,
        referenceDate: new Date(),
      });
      res.json(response);
    } catch (error) {
      if (error.code === 'WidgetNotFound') {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  });

  router.get('/finance', async (req, res, next) => {
    try {
      const { id } = req.query;
      if (!id) {
        res.status(400).json({ message: 'Widget id is required.' });
        return;
      }

      const widget = widgetRegistry.getById(id);
      const spreadsheetId = widget.config?.spreadsheetId;
      const range = widget.config?.range;
      const limit = Number(req.query.limit || widget.config?.limit || 5);

      if (!spreadsheetId || !range) {
        res.status(400).json({ message: 'Finance widget is missing Google Sheet configuration.' });
        return;
      }

      const payload = await financeService.getRecentTransactions({
        spreadsheetId,
        range,
        limit,
      });
      res.json(payload);
    } catch (error) {
      if (error.code === 'WidgetNotFound') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.code === 'MissingOAuthTokens' || error.code === 'MissingOAuthClientConfig') {
        res.status(428).json({
          message: error.message,
          authorizationUrl: safeAuthorizationUrl(oauthManager),
          scopes: SCOPES,
        });
        return;
      }
      next(error);
    }
  });

  router.get('/google/auth', (req, res) => {
    try {
      const url = oauthManager.getAuthorizationUrl();
      res.json({ url, scopes: SCOPES });
    } catch (error) {
      if (error.code === 'MissingOAuthClientConfig') {
        res.status(428).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to build authorization URL.' });
    }
  });

  router.get('/google/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
      res.status(400).send('Missing authorization code.');
      return;
    }

    try {
      await oauthManager.exchangeCodeForTokens(code);
      res.send('Authorization successful. You may close this window.');
    } catch (error) {
      if (error.code === 'MissingOAuthClientConfig') {
        res.status(500).send('OAuth client is not configured correctly.');
        return;
      }
      console.error('Failed to complete OAuth flow', error);
      res.status(500).send('Failed to complete authorization flow.');
    }
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return router;
}

function safeAuthorizationUrl(oauthManager) {
  try {
    return oauthManager.getAuthorizationUrl();
  } catch (error) {
    return null;
  }
}

module.exports = { createApiRouter };
