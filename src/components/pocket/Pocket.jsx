import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {useEffect, useState} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, Loader} from "@/components/common/Common.jsx";
import Media from "@/components/pocket/Media.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";
import Purchase from "@/components/pocket/Purchase.jsx";

import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";

const S = CreateModuleClassMatcher(PocketStyles);

const Pocket = observer(() => {
  const [showPreview, setShowPreview] = useState(false);
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  useEffect(() => {
    rootStore.LoadPocket({pocketSlugOrId})
      .then(pocket =>
        pocket && SetHTMLMetaTags(pocket.metadata.meta_tags)
      );
  }, [pocketSlugOrId]);

  useEffect(() => {
    setShowPreview(false);
  }, [mediaItemSlugOrId]);

  useEffect(() => {
    rootStore.SetContentEnded(false);
  }, [mediaItemSlugOrId]);

  if(!rootStore.pocket) {
    return null;
  }

  if(!rootStore.initialized || !rootStore?.pocket?.mediaLoaded) {
    return (
      <div className="page-container">
        <div className={S("splash")}>
          <HashedLoaderImage
            src={rootStore.splashImage.url}
            hash={rootStore.splashImage.hash}
            className={S("splash__image")}
          />
          <div className={S("logo")}>
            <SVG src={EIcon} alt="Eluvio"/>
            <span>POCKET TV</span>
            <Loader className={S("logo__loader")}/>
          </div>
        </div>
      </div>
    );
  }

  const mediaItem = mediaItemSlugOrId && rootStore.MediaItem(mediaItemSlugOrId);
  if(!mediaItem) {
    // Item not found - find first item from sidebar content and redirect
    for(const tab of rootStore.sidebarContent) {
      for(const group of tab.groups) {
        const item = group.content[0];

        if(item && !(item.id === mediaItemSlugOrId || (item.slug && item.slug === mediaItemSlugOrId))) {
          return <Redirect to={UrlJoin("~/", pocketSlugOrId, item.slug || item.id)}/>;
        }
      }
    }
  }

  let permissions = {};
  if(rootStore.pocket?.mediaLoaded) {
    permissions = rootStore.MediaItemPermissions(mediaItemSlugOrId);
  }

  return (
    permissions.authorized || (showPreview && rootStore.mobile) ?
      <Media key={`${mediaItemSlugOrId}`} setShowPreview={setShowPreview} /> :
      <Purchase key={`${mediaItemSlugOrId}`} setShowPreview={setShowPreview} />
  );
});

export default Pocket;
