import CommonStyles from "@/assets/stylesheets/modules/common.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames, SetImageUrlDimensions} from "@/utils/Utils.js";
import {useEffect, useState} from "react";

const S = CreateModuleClassMatcher(CommonStyles);

export const LoaderImage = observer(({
  src,
  alternateSrc,
  width,
  loaderHeight,
  loaderWidth,
  loaderAspectRatio,
  lazy=true,
  showWithoutSource=false,
  delay=25,
  loaderDelay=250,
  loaderClassName="",
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [useAlternateSrc, setUseAlternateSrc] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setShowLoader(false);

    setTimeout(() => setShowLoader(true), loaderDelay);
  }, []);

  if(!src && !showWithoutSource) {
    return null;
  }

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  return (
    <>
      {
        !src ? null :
          <img
            {...props}
            key={`img-${src}-${props.key || ""}`}
            className={loaded ? props.className : JoinClassNames(S("lazy-image__loader-image"), props.className)}
            loading={lazy ? "lazy" : "eager"}
            src={(useAlternateSrc && alternateSrc) || src}
            onLoad={() => setTimeout(() => setLoaded(true), delay)}
            onError={() => {
              setUseAlternateSrc(true);
            }}
          />
      }
      {
        loaded ? null :
          <div
            {...props}
            style={{
              ...(props.style || {}),
              ...(loaderWidth ? {width: loaderWidth} : {}),
              ...(loaderHeight ? {height: loaderHeight} : {}),
              ...(loaderAspectRatio ? {aspectRatio: loaderAspectRatio} : {})
            }}
            key={props.key ? `${props.key}--placeholder` : undefined}
            className={[S("lazy-image__background", showLoader ? "lazy-image__background--visible" : ""), loaderClassName, props.className || ""].join(" ")}
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
      <div className={JoinClassNames(S("loader"), className)} />
    </div>
  );
});