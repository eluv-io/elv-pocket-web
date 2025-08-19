import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, PageLoader} from "@/components/common/Common.jsx";
import Media from "@/components/pocket/Media.jsx";
import Sidebar from "@/components/pocket/Sidebar.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const Pocket = observer(() => {
  const {pocketSlugOrId} = useParams();

  useEffect(() => {
    rootStore.LoadPocket({pocketSlugOrId})
      .then(pocket =>
        SetHTMLMetaTags(pocket.metadata.meta_tags)
      )
  }, [pocketSlugOrId]);

  if(!rootStore.pocket) {
    return null;
  }

  const backgroundKey = rootStore.mobile && rootStore.pocket.metadata.splash_screen_background_mobile ?
    "splash_screen_background_mobile" :
    "splash_screen_background";

  return (
    <div className="page-container">


      {
        !rootStore.initialized || !rootStore.pocket?.mediaLoaded ?
          <>
            <HashedLoaderImage
              src={rootStore.pocket.metadata[backgroundKey].url}
              hash={rootStore.pocket.metadata[`${backgroundKey}_hash`]}
              className={S("splash")}
            />
            <PageLoader />
          </>:
          <div className={S("content")}>
            <Media />
            <Sidebar />
          </div>
      }
      <div className={S("size")}>
        {rootStore.pageDimensions.width} x {rootStore.pageDimensions.height}
      </div>
    </div>
  )
});

export default Pocket;
