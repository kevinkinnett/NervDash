class BitcoinPriceService {
  constructor(fetchImpl = fetch) {
    this.fetch = fetchImpl;
  }

  async getPrice(currencyCode) {
    const normalizedCurrency = currencyCode.toLowerCase();
    const response = await this.fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${encodeURIComponent(normalizedCurrency)}`
    );

    if (!response.ok) {
      const error = new Error(`CoinGecko request failed with status ${response.status}`);
      error.code = 'CoinGeckoRequestFailed';
      throw error;
    }

    const payload = await response.json();
    const price = payload?.bitcoin?.[normalizedCurrency];

    if (typeof price !== 'number') {
      const error = new Error('Unexpected response from CoinGecko.');
      error.code = 'CoinGeckoMalformedResponse';
      throw error;
    }

    return {
      currency: normalizedCurrency.toUpperCase(),
      price,
      source: 'coingecko',
      fetchedAt: new Date().toISOString(),
    };
  }
}

module.exports = { BitcoinPriceService };
