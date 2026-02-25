import Money from "js-money";
import Currencies from "js-money/lib/currency.js";
import {rootStore} from "@/stores/index.js";

export const ParseMoney = (amount, currency) => {
  currency = currency.toUpperCase();

  if(typeof amount !== "object") {
    if(isNaN(parseFloat(amount))) {
      amount = new Money(0, currency);
    } else {
      amount = new Money(parseInt(Math.round(parseFloat(amount) * (10 ** Currencies[currency]?.decimal_digits || 2))), currency);
    }
  }

  return amount;
};

export const PriceCurrency = prices => {
  let price;
  let currency = "USD";
  if(typeof prices === "object") {
    if(prices[rootStore.preferredCurrency]) {
      price = prices[rootStore.preferredCurrency];
      currency = rootStore.preferredCurrency;
    } else if(prices[rootStore.currency]) {
      price = prices[rootStore.currency];
      currency = rootStore.currency;
    } else {
      currency = Object.keys(prices).find(currencyCode => prices[currencyCode]);
      price = prices[currency];
    }
  } else {
    price = parseFloat(prices);
  }

  return {
    price,
    currency
  };
};

export const DiscountedPrice = ({item, marketplaceItem, discount={}}) => {
  marketplaceItem = item?.marketplaceItem || marketplaceItem;

  const { currency } = PriceCurrency(marketplaceItem.price);

  if(!currency) {
    return {};
  }

  const originalPrice = ParseMoney(marketplaceItem.price[currency], currency);
  let discountAmount = 0;
  if(discount?.percent) {
    discountAmount = ParseMoney(marketplaceItem.price[currency] * (discount.percent / 100), currency);
  } else if(discount?.price?.[currency]) {
    discountAmount = (
      ParseMoney(marketplaceItem.price[currency], currency) -
      ParseMoney(discount.price[currency], currency)
    );
  } else {
    return {};
  }

  return {
    currency,
    originalPrice,
    originalPriceStr: FormatPriceString({[currency]: originalPrice}),
    discountPercent: discount.percent ? `${discount.percent}%` : "",
    discountAmount,
    discountAmountStr: FormatPriceString({[currency]: discountAmount}),
    discountedPrice: originalPrice - discountAmount,
    discountedPriceStr: FormatPriceString({[currency]: originalPrice - discountAmount}),
    price: {
      [currency]: originalPrice - discountAmount
    }
  };
};

export const FormatPriceString = (
  prices,
  options= {
    additionalFee: 0,
    quantity: 1,
    trimZeros: false,
    numberOnly: false
  }
) => {
  let { price, currency } = PriceCurrency(prices);

  if(typeof price === "undefined" || isNaN(price)) {
    return "";
  }

  price = ParseMoney(price, currency);
  price = price.multiply(options.quantity || 1);

  if(options.additionalFee) {
    price.add(ParseMoney(options.additionalFee, currency));
  }

  if(options.numberOnly) {
    return price.toDecimal();
  }

  let formattedPrice = new Intl.NumberFormat(rootStore.preferredLocale, { style: "currency", currency}).format(price.toString());

  if(options.trimZeros && formattedPrice.endsWith(".00")) {
    formattedPrice = formattedPrice.slice(0, -3);
  }

  return formattedPrice;
};
