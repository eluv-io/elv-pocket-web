import CommonStyles from "@/assets/stylesheets/modules/common.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames, SetImageUrlDimensions} from "@/utils/Utils.js";
import {useState} from "react";
import {decodeThumbHash, thumbHashToApproximateAspectRatio, thumbHashToDataURL} from "@/utils/Thumbhash.js";

const S = CreateModuleClassMatcher(CommonStyles);

export const HashedImage = observer(({
  src,
  hash,
  width,
  lazy=true,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  hash = hash && decodeThumbHash(hash);
  const loaderAspectRatio = hash && thumbHashToApproximateAspectRatio(hash);

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  return (
    <>
      {
        !src ? null :
          <img
            {...props}
            style={
              loaded ? {} :
                {width: 2, height: 2, position: "absolute", opacity: 0, userSelect: "none"}
            }
            className={loaded ? props.className : ""}
            loading={lazy ? "lazy" : "eager"}
            src={src}
            onLoad={() => setLoaded(true)}
          />
      }
      {
        loaded ? null :
          <div
            {...props}
            style={{
              aspectRatio: loaderAspectRatio,
              background: `center / cover url(${thumbHashToDataURL(hash)})`
            }}
          />
      }
    </>
  );
})

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