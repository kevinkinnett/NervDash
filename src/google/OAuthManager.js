const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

class OAuthManager {
  constructor({ configLoader, tokenStore }) {
    this.configLoader = configLoader;
    this.tokenStore = tokenStore;
    this.oauthClient = null;
  }

  getAuthorizationUrl() {
    const client = this.#ensureClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  getAuthorizedClient() {
    const client = this.#ensureClient();
    const tokens = this.tokenStore.getTokens();

    if (!tokens) {
      const error = new Error('Google OAuth tokens are missing. Complete the authorization flow.');
      error.code = 'MissingOAuthTokens';
      throw error;
    }

    client.setCredentials(tokens);
    return client;
  }

  async exchangeCodeForTokens(code) {
    const client = this.#ensureClient();
    const { tokens } = await client.getToken(code);
    this.tokenStore.mergeAndSave(tokens);
    return tokens;
  }

  #ensureClient() {
    if (!this.oauthClient) {
      const oauthConfig = this.configLoader.getGoogleOAuthConfig();
      const { clientId, clientSecret, redirectUri } = oauthConfig;

      if (!clientId || !clientSecret || !redirectUri) {
        const error = new Error('Google OAuth client configuration is missing.');
        error.code = 'MissingOAuthClientConfig';
        throw error;
      }

      this.oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      this.oauthClient.on('tokens', (tokens) => {
        if (!tokens) {
          return;
        }
        try {
          this.tokenStore.mergeAndSave(tokens);
        } catch (error) {
          console.error('Failed to persist refreshed OAuth tokens.', error);
        }
      });
    }

    return this.oauthClient;
  }
}

module.exports = { OAuthManager, SCOPES };
