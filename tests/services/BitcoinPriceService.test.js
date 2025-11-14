const test = require('node:test');
const assert = require('node:assert/strict');

const { BitcoinPriceService } = require('../../src/services/BitcoinPriceService');

test('BitcoinPriceService returns formatted price payload', async () => {
  let requestedUrl;
  const fakeFetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      async json() {
        return { bitcoin: { usd: 42000.5 } };
      },
    };
  };

  const service = new BitcoinPriceService(fakeFetch);
  const result = await service.getPrice('USD');

  assert.equal(
    requestedUrl,
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
  );
  assert.deepEqual(Object.keys(result).sort(), ['currency', 'fetchedAt', 'price', 'source'].sort());
  assert.equal(result.currency, 'USD');
  assert.equal(result.price, 42000.5);
  assert.equal(result.source, 'coingecko');
  assert.ok(new Date(result.fetchedAt).toString() !== 'Invalid Date');
});

test('BitcoinPriceService throws when CoinGecko rejects request', async () => {
  const fakeFetch = async () => ({ ok: false, status: 503 });
  const service = new BitcoinPriceService(fakeFetch);

  await assert.rejects(service.getPrice('USD'), {
    code: 'CoinGeckoRequestFailed',
    message: /CoinGecko request failed/i,
  });
});

test('BitcoinPriceService throws on malformed payload', async () => {
  const fakeFetch = async () => ({
    ok: true,
    async json() {
      return { bitcoin: {} };
    },
  });
  const service = new BitcoinPriceService(fakeFetch);

  await assert.rejects(service.getPrice('USD'), {
    code: 'CoinGeckoMalformedResponse',
  });
});
