import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, PageLoader} from "@/components/common/Common.jsx";
import Media from "@/components/pocket/Media.jsx";
import Sidebar from "@/components/pocket/Sidebar.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";
import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";

const S = CreateModuleClassMatcher(PocketStyles);

const Pocket = observer(() => {
  const {pocketSlugOrId, pocketMediaSlugOrId} = useParams();

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

  if(rootStore.initialized && rootStore.pocket?.mediaLoaded && !pocketMediaSlugOrId) {
    const firstItemSlugOrId = rootStore.media[0]?.slug || rootStore.media[0]?.id;

    return (
      <Redirect
        to={
          !firstItemSlugOrId ? "~/" :
            UrlJoin("~/", pocketSlugOrId, firstItemSlugOrId)
        }
      />
    );
  }

  return (
    <div className="page-container">
      {
        !rootStore.initialized || !rootStore.pocket?.mediaLoaded ?
          <>
            <div className={S("splash")}>
              <HashedLoaderImage
                src={rootStore.pocket.metadata[backgroundKey].url}
                hash={rootStore.pocket.metadata[`${backgroundKey}_hash`]}
              />
              <div className={S("logo")}>
                <SVG src={EIcon} alt="Eluvio"/>
                <span>POCKET TV</span>
              </div>
            </div>
            <PageLoader/>
          </> :
          <div className={S("content")}>
            <Media/>
            <Sidebar />
          </div>
      }
    </div>
  )
});

export default Pocket;
