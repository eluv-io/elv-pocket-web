import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, Loader} from "@/components/common/Common.jsx";
import Media from "@/components/pocket/Media.jsx";
import Sidebar, {Banners} from "@/components/pocket/Sidebar.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";
import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";
import Purchase from "@/components/pocket/Purchase.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const Pocket = observer(() => {
  const {pocketSlugOrId, pocketMediaSlugOrId} = useParams();

  useEffect(() => {
    rootStore.LoadPocket({pocketSlugOrId})
      .then(pocket =>
        pocket && SetHTMLMetaTags(pocket.metadata.meta_tags)
      );
  }, [pocketSlugOrId]);

  useEffect(() => {
    rootStore.SetContentEnded(false);
  }, [pocketMediaSlugOrId]);

  if(!rootStore.pocket) {
    return null;
  }

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

  const pocketMediaItem = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  if(!pocketMediaItem) {
    return null;
  }

  let permissions = {};
  if(rootStore.pocket?.mediaLoaded) {
    permissions = rootStore.PocketMediaItemPermissions(pocketMediaSlugOrId);
  }

  return (
    <div className="page-container">
      {
        !rootStore.initialized || !rootStore.pocket?.mediaLoaded ?
          <>
            <div className={S("splash")}>
              <HashedLoaderImage
                src={rootStore.splashImage.url}
                hash={rootStore.splashImage.hash}
                className={S("splash__image")}
              />
              <div className={S("logo")}>
                <SVG src={EIcon} alt="Eluvio"/>
                <span>POCKET TV</span>
                <Loader className={S("logo__loader")} />
              </div>
            </div>

          </> :
          <div
            key={`content-${rootStore.pocket?.mediaLoadIndex}`}
            className={
              S(
                "content",
                rootStore.hasTopBanners ? "content--with-top-banners" : "",
                permissions.authorized ? "content--authorized " : "content--unauthorized"
              )
            }
          >
            {
              !rootStore.mobile ? null :
                <Banners position="above" />
            }
            {
              permissions.authorized ?
                <Media key={`${pocketMediaSlugOrId}`} /> :
                <Purchase key={`${pocketMediaSlugOrId}`} />
            }
            <Sidebar />
          </div>
      }
    </div>
  );
});

export default Pocket;
