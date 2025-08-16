import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {thumbHashToDataURL} from "@/utils/Thumbhash.js";
import {LoaderImage, PageLoader} from "@/components/common/Common.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const InitializeLoader = observer(() => {
  useEffect(() => {
    setTimeout(() => rootStore.GenerateKey(), 1000);
  }, []);

  if(rootStore.initialized) { return null; }

  return <PageLoader />;
});

const Pocket = observer(() => {
  const {pocketIdOrSlug} = useParams();

  useEffect(() => {
    rootStore.LoadPocket({pocketIdOrSlug})
      .then(pocket =>
        SetHTMLMetaTags(pocket.metadata.meta_tags)
      )
  }, [pocketIdOrSlug]);

  if(!rootStore.pocket) {
    return null;
  }

  const backgroundKey = rootStore.mobile && rootStore.pocket.metadata.splash_screen_background_mobile ?
    "splash_screen_background_mobile" :
    "splash_screen_background";

  return (
    <div className="page-container">
      <LoaderImage
        src={rootStore.pocket.metadata[backgroundKey].url}
        style={{
          background: `center / cover url(${thumbHashToDataURL(rootStore.pocket.metadata[`${backgroundKey}_hash`])})`
        }}
        loaderClassName={S("splash__loader")}
        className={S("splash")}
      />
      <div>
        <InitializeLoader/>
        { rootStore.pageDimensions.width } x {rootStore.pageDimensions.height}
      </div>
    </div>
  )
});

export default Pocket;