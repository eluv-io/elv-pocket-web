import CommonStyles from "@/assets/stylesheets/modules/common.module.scss";

import {observer} from "mobx-react-lite";
import {Copy, CreateModuleClassMatcher, JoinClassNames, SetImageUrlDimensions} from "@/utils/Utils.js";
import {forwardRef, useEffect, useState} from "react";
import {decodeThumbHash, thumbHashToApproximateAspectRatio, thumbHashToDataURL} from "@/utils/Thumbhash.js";
import {Link} from "wouter";
import {rootStore} from "@/stores/index.js";
import Money from "js-money";
import Currencies from "js-money/lib/currency";
import SVG from "react-inlinesvg";

const S = CreateModuleClassMatcher(CommonStyles);

import CopyIcon from "@/assets/icons/copy.svg";
import CheckIcon from "@/assets/icons/check-circle.svg";

export const HashedLoaderImage = observer(({
  src,
  hash,
  width,
  lazy=true,
  loaderClassName="",
  noAnimation,
  ...props
}) => {
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  hash = hash && decodeThumbHash(hash);
  const loaderAspectRatio = hash && thumbHashToApproximateAspectRatio(hash);

  if(width && !error) {
    src = SetImageUrlDimensions({url: src, width});
  }

  return (
    <>
      {
        !src ? null :
          <img
            {...props}
            key={`image-${loaded}`}
            style={
              loaded ? {} :
                {width: 2, height: 2, position: "absolute", opacity: 0, userSelect: "none"}
            }
            className={JoinClassNames(S("loader-image", !noAnimation ? "loader-image--fade-in" : ""), loaded ? props.className : "")}
            loading={lazy ? "lazy" : "eager"}
            onError={setError}
            src={src}
            onLoad={() => setLoaded(true)}
          />
      }
      {
        loaded || !hash ? null :
          <div
            {...props}
            className={JoinClassNames(loaderClassName, props.className)}
            style={{
              aspectRatio: loaderAspectRatio,
              background: `center / cover url(${thumbHashToDataURL(hash)})`
            }}
          />
      }
    </>
  );
});

export const Loader = observer(({className=""}) => {
  return (
    <div className={JoinClassNames(S("loader"), className)} />
  );
});

export const PageLoader = observer(({containerClassName="", className=""}) => {
  return (
    <div className={JoinClassNames(S("page-loader"), containerClassName)}>
      <Loader className={className} />
    </div>
  );
});

export const Linkish = forwardRef(function Linkish({
  to,
  href,
  target="_blank",
  rel="noopener",
  onClick,
  disabled,
  styled=false,
  divButton=false,
  ...props
}, ref) {
  if(styled) {
    props.className = JoinClassNames("button", props.className || "");
  }

  if(!disabled && (href || to)) {
    // a tags don't have :disabled
    if(href) {
      return <a href={href} target={target} rel={rel} onClick={onClick} ref={ref} {...props} />;
    } else if(to) {
      return <Link href={to} onClick={onClick} ref={ref} {...props} />;
    }
  } else if(onClick || props.type === "submit") {
    if(divButton) {
      return <div role="button" tabIndex={0} aria-disabled={disabled} onClick={!disabled ? onClick : undefined} ref={ref} {...props} />;
    } else {
      return <button disabled={disabled} onClick={onClick} ref={ref} {...props} />;
    }
  } else if(disabled) {
    return <button disabled ref={ref} {...props} />;
  } else {
    return <div ref={ref} {...props} />;
  }
});

export const MediaItemImageUrl = ({mediaItem, aspectRatio, width}) => {
  if(!mediaItem) { return {}; }

  aspectRatio = aspectRatio?.toLowerCase();
  const aspectRatioPreference =
    (mediaItem?.type === "media" && mediaItem?.media_type === "Video") ?
      ["landscape", "square", "portrait"] :
      ["square", "landscape", "portrait"];

  const imageAspectRatio =
    [aspectRatio, ...aspectRatioPreference].find(ratio => mediaItem?.[`thumbnail_image_${ratio}`]) || aspectRatioPreference[0];

  let imageUrl = mediaItem?.[`thumbnail_image_${imageAspectRatio}`]?.url;
  const imageHash = mediaItem?.[`thumbnail_image_${imageAspectRatio}_hash`];

  if(!imageUrl && mediaItem) {
    return MediaItemImageUrl({mediaItem, aspectRatio, width});
  }

  if(width) {
    imageUrl = SetImageUrlDimensions({url: imageUrl, width});
  }

  return {
    imageUrl,
    imageHash,
    imageAspectRatio,
    altText: mediaItem.thumbnail_alt_text
  };
};

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

let copyTimeout;
export const CopyButton = observer(({value, onCopyChange, ...props}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onCopyChange?.(copied);
  }, [copied]);

  return (
    <button
      {...props}
      onClick={event => {
        event.stopPropagation();
        event.preventDefault();

        clearTimeout(copyTimeout);
        Copy(value);
        setCopied(true);

        copyTimeout = setTimeout(() => setCopied(false), 2000);
      }}
      className={
        JoinClassNames(
          S("copy-button", copied ? "copy-button--copied" : ""),
          props.className
        )
      }
    >
      <SVG src={CopyIcon} className={S("copy-button__icon", !copied ? "copy-button__icon--active" : "")} />
      <SVG src={CheckIcon} className={S("copy-button__icon", copied ? "copy-button__icon--active" : "")} />
    </button>
  );
});

export const CopyableField = observer(({value, children, buttonProps={}, showOnHover=false, className="", ...props}) => {
  const [copied, setCopied] = useState(false);

  return (
    <div
      {...props}
      className={
        JoinClassNames(
          S(
            "copyable-field",
            showOnHover ? "copyable-field--show-hover" : "",
            copied ? "copyable-field--copied" : ""
          ),
          className
        )
      }
    >
      <div className={S("copyable-field__value", "ellipsis")}>
        { children || value }
      </div>
      <CopyButton
        {...buttonProps}
        onCopyChange={setCopied}
        value={value}
        className={JoinClassNames(S("copyable-field__button", "ellipsis"), buttonProps.className)}
      />
    </div>
  );
});
