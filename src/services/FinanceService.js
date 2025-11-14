class FinanceService {
  constructor({ google, oauthManager }) {
    this.google = google;
    this.oauthManager = oauthManager;
  }

  async getRecentTransactions({ spreadsheetId, range, limit }) {
    const authClient = this.oauthManager.getAuthorizedClient();
    const sheets = this.google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { headers: [], transactions: [] };
    }

    const [headerRow, ...dataRows] = rows;
    const selectedRows = dataRows.slice(-limit).reverse();
    const transactions = selectedRows.map((row) => {
      const transaction = {};
      headerRow.forEach((header, index) => {
        transaction[header || `Column ${index + 1}`] = row[index] ?? '';
      });
      return transaction;
    });

    return { headers: headerRow, transactions };
  }
}

module.exports = { FinanceService };
