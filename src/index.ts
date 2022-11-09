import ccxt, { Exchange } from "ccxt";
import { BaseAsset, FundingRateInfo, IndexInfo } from './interfaces';

// ccxt unified symbol
const btcDomSymbol = "BTCDOM/USDT";
const btcSymbol = 'BTC/USDT';
// binance symbol
const btcDomIndexSymbol = "BTCDOMUSDT";

async function main() {
  const exchange = new ccxt.binanceusdm();
  const limit = 30; // the number of funding rate data points

  // get btcDom index base assets and their weights
  const btcDomInfo = await getBTCDomIndexInfo(exchange)

  // the weighted average funding rate of the 20 baseAssets in the btcDom index
  const assetsFR = await getAvgWeightedFR(exchange, btcDomInfo.baseAssetList, limit);

  const btcDomFundingRates = await getFRInfos(exchange, btcDomSymbol, limit);
  const btcDomFR = averageFRPercent(btcDomFundingRates);

  const btcFRs = await getFRInfos(exchange, btcSymbol, limit);
  const btcFR = averageFRPercent(btcFRs);

  // if FR is positive, long position pay short position; negative reversely
  const finalFR = btcDomFR + assetsFR - btcFR; // short btcDom, short base assets, long btc
  const yearly = finalFR * 3 * 365; // funding rate is paid every 8 hours
  console.log({btcDomFR, assetsFR, btcFR, finalFR, yearly, sampleDays: limit / 3});
}

async function getAvgWeightedFR(exchange: Exchange, baseAssetList: BaseAsset[], limit: number) {
  let res = 0;
  for (const baseAsset of baseAssetList) {
    const symbol = `${baseAsset.quoteAsset}/USDT`; // the ccxt unified symbol format
    const frInfos = await getFRInfos(exchange, symbol, limit)
    res += averageFRPercent(frInfos) * Number(baseAsset.weightInPercentage);
  }
  return res;
}

async function getFRInfos(exchange: Exchange, symbol: string, limit: number): Promise<FundingRateInfo[]> {
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

// calculate the average of multiple funding rate data points
function averageFRPercent(frInfos: FundingRateInfo[]) {
  return (100 * frInfos.reduce((prev: number, cur: FundingRateInfo) => cur.fundingRate + prev, 0)) / frInfos.length;
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