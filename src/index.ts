import ccxt, { Exchange } from "ccxt";
import createHttpsProxyAgent from 'https-proxy-agent';
import { BaseAsset, FundingRateInfo, IndexInfo } from './interfaces';

// ccxt unified symbol
const btcDomSymbol = "BTCDOM/USDT";
const btcSymbol = 'BTC/USDT';
// binance symbol
const btcDomIndexSymbol = "BTCDOMUSDT";


// the number of funding rate data points, change this to sample different time ranges, funding rate occurs every 8 hours, so 3 data points for 1 day
const limit = 30;

async function main() {
  // change proxy info here
  const proxy: string = process.env.http_proxy || 'http://localhost:7890' // HTTP/HTTPS proxy to connect to
  const agent = createHttpsProxyAgent(proxy);
  const exchange = new ccxt.binanceusdm({agent});

  // const ticker = await exchange.fapiPublicGetTickerPrice({symbol: btcDomSymbol});
  // console.log({ticker});
  // console.log({apis: exchange.fapiPublicGetFundingRate})
  // get btcDom index base assets and their weights
  const btcDomInfo = await getBTCDomIndexInfo(exchange)

  // the weighted average funding rate of the 20 baseAssets in the btcDom index
  const assetsFR = await getAvgWeightedFR(exchange, btcDomInfo.baseAssetList);
  const btcDomFR = await getAvgFR(exchange, btcDomSymbol);

  const btcFR = await getAvgFR(exchange, btcSymbol);

  // if FR is positive, long position pay short position; negative reversely
  const finalFR = btcDomFR + assetsFR - btcFR; // short btcDom, short base assets, long btc
  const yearly = finalFR * 3 * 365; // funding rate is paid every 8 hours
  console.log({btcDomFR, assetsFR, btcFR, finalFR, yearly, sampleDays: limit / 3});
}

async function getAvgWeightedFR(exchange: Exchange, baseAssetList: BaseAsset[]) {
  let res = 0;
  for (const baseAsset of baseAssetList) {
    const symbol = `${baseAsset.quoteAsset}/USDT`; // the ccxt unified symbol format
    res += (await getAvgFR(exchange, symbol)) * Number(baseAsset.weightInPercentage);
  }
  return res;
}

// request FR history and calculate average
async function getAvgFR(exchange: Exchange, symbol: string) {
  const frInfos = await getFRInfos(exchange, symbol);
  const avg = (100 * frInfos.reduce((prev: number, cur: FundingRateInfo) => cur.fundingRate + prev, 0)) / frInfos.length;
  console.log(`${symbol} average funding rate for ${limit} data points: ${avg}`)
  return avg;
}

async function getFRInfos(exchange: Exchange, symbol: string): Promise<FundingRateInfo[]> {
  const frInfos = (await exchange.fetchFundingRateHistory(
        symbol,
        undefined,
        limit
  )) as FundingRateInfo[];
  if (frInfos.length !== limit) {
    throw new Error(`frInfos of ${symbol} length ${frInfos.length} != ${limit}`)
  }
  return frInfos;
}

async function getBTCDomIndexInfo(exchange: Exchange): Promise<IndexInfo> {
  const infos: IndexInfo[] = await exchange.fapiPublicGetIndexInfo();
  const btcDomInfo = infos.find((info) => info.symbol === btcDomIndexSymbol);
  if (!btcDomInfo) {
    throw new Error(`cannot find ${btcDomIndexSymbol} index`)
  }
  return btcDomInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
