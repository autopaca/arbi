export type BaseAsset = {
  baseAsset: string;
  quoteAsset: string;
  weightInQuantity: string;
  weightInPercentage: string;
};

export type IndexInfo = {
  symbol: string;
  time: string;
  component: "quoteAsset";
  baseAssetList: BaseAsset[];
};

export type FundingRateInfo = {
  info: {
    symbol: string;
    fundingTime: string;
    fundingRate: string;
  };
  symbol: string;
  fundingRate: number;
  timestamp: number;
  datetime: string;
};
