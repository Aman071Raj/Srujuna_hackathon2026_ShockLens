/** Fields consumed from Yahoo's chart and search responses. */
export interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol: string;
        longName?: string;
        shortName?: string;
        currency?: string;
        fullExchangeName?: string;
        exchangeName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[]; volume?: (number | null)[] }> };
    }>;
  };
}

export interface YahooSearchResponse {
  quotes?: Array<{ symbol: string; shortname?: string; longname?: string; exchange?: string }>;
}
