import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedImage, PageLoader} from "@/components/common/Common.jsx";

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
      <HashedImage
        src={rootStore.pocket.metadata[backgroundKey].url}
        hash={rootStore.pocket.metadata[`${backgroundKey}_hash`]}
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