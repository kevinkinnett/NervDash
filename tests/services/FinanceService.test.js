const test = require('node:test');
const assert = require('node:assert/strict');

const { FinanceService } = require('../../src/services/FinanceService');

test('FinanceService returns most recent transactions mapped to headers', async () => {
  const fakeAuthClient = Symbol('auth');
  let requestedSpreadsheet;
  let requestedRange;

  const google = {
    sheets({ version, auth }) {
      assert.equal(version, 'v4');
      assert.equal(auth, fakeAuthClient);
      return {
        spreadsheets: {
          values: {
            async get({ spreadsheetId, range }) {
              requestedSpreadsheet = spreadsheetId;
              requestedRange = range;
              return {
                data: {
                  values: [
                    ['Date', 'Description', 'Amount'],
                    ['2024-05-01', 'Coffee', '-3.50'],
                    ['2024-05-02', 'Salary', '1500'],
                    ['2024-05-03', 'Groceries', '-45.12'],
                  ],
                },
              };
            },
          },
        },
      };
    },
  };

  const oauthManager = {
    getAuthorizedClient() {
      return fakeAuthClient;
    },
  };

  const service = new FinanceService({ google, oauthManager });
  const result = await service.getRecentTransactions({
    spreadsheetId: 'sheet-123',
    range: 'Transactions!A:C',
    limit: 2,
  });

  assert.equal(requestedSpreadsheet, 'sheet-123');
  assert.equal(requestedRange, 'Transactions!A:C');
  assert.deepEqual(result.headers, ['Date', 'Description', 'Amount']);
  assert.equal(result.transactions.length, 2);
  assert.deepEqual(result.transactions[0], {
    Date: '2024-05-03',
    Description: 'Groceries',
    Amount: '-45.12',
  });
  assert.deepEqual(result.transactions[1], {
    Date: '2024-05-02',
    Description: 'Salary',
    Amount: '1500',
  });
});

test('FinanceService handles empty sheets', async () => {
  const service = new FinanceService({
    google: {
      sheets() {
        return {
          spreadsheets: {
            values: {
              async get() {
                return { data: { values: [] } };
              },
            },
          },
        };
      },
    },
    oauthManager: {
      getAuthorizedClient() {
        return Symbol('auth');
      },
    },
  });

  const result = await service.getRecentTransactions({
    spreadsheetId: 'sheet',
    range: 'Sheet1!A:C',
    limit: 5,
  });

  assert.deepEqual(result, { headers: [], transactions: [] });
});
