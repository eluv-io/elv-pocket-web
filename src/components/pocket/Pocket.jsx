import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {useEffect, useState} from "react";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, Loader} from "@/components/common/Common.jsx";
import Media from "@/components/pocket/Media.jsx";
import UrlJoin from "url-join";
import Purchase from "@/components/pocket/Purchase.jsx";

import PurchaseHistory from "@/components/pocket/PurchaseHistory.jsx";
import Page from "@/components/pocket/Page.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const Menu = observer(() => {
  switch(rootStore.menu) {
    case "purchase-history":
      return <PurchaseHistory />;
  }

  return null;
});

const Pocket = observer(() => {
  const [showPreview, setShowPreview] = useState(false);
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  useEffect(() => {
    rootStore.Initialize({pocketSlugOrId})
      .then(pocket =>
        pocket && SetHTMLMetaTags(pocket.metadata.meta_tags)
      );
  }, [pocketSlugOrId]);

  useEffect(() => {
    setShowPreview(false);
    pocketStore.SetContentEnded(false);
    rootStore.SetShowAdditionalPurchaseOptions(false);
  }, [mediaItemSlugOrId]);

  if(!pocketStore.pocket) {
    return null;
  }

  if(!rootStore.initialized || !pocketStore?.pocket?.mediaLoaded) {
    return (
      <div className="page-container">
        <div className={S("splash")}>
          <HashedLoaderImage
            src={pocketStore.splashImage.url}
            hash={pocketStore.splashImage.hash}
            className={S("splash__image")}
          />
          <div className={S("splash__loader")}>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  const mediaItem = mediaItemSlugOrId && pocketStore.MediaItem(mediaItemSlugOrId);
  if(!mediaItem) {
    // Item not found - find first item from sidebar content and redirect
    for(const tab of pocketStore.sidebarContent) {
      for(const group of tab.groups) {
        const item = group.content[0];

        if(item && !(item.id === mediaItemSlugOrId || (item.slug && item.slug === mediaItemSlugOrId))) {
          return <Redirect to={UrlJoin("~/", pocketSlugOrId, item.slug || item.id)}/>;
        }
      }
    }
  }

  let permissions = {};
  if(pocketStore.pocket?.mediaLoaded) {
    permissions = pocketStore.MediaItemPermissions({mediaItemSlugOrId});
  }

  const showPurchase =
    !permissions.authorized && !(showPreview && rootStore.mobile) ||
    (rootStore.showAdditionalPurchaseOptions && permissions.anyItemsAvailable);
  const hideSidebar = showPurchase && rootStore.mobile && permissions.permissionItems.length > 2;

  return (
    <>
      <Page
        mediaItem={mediaItem}
        permissions={permissions}
        hideSidebar={hideSidebar}
        hideSidebarTitle={showPurchase && rootStore.mobile}
      >
        {
           showPurchase ?
             <Purchase key={`${mediaItemSlugOrId}`} setShowPreview={setShowPreview} />:
             <Media key={`${mediaItemSlugOrId}`} setShowPreview={setShowPreview} />
        }
      </Page>
      <Menu />
    </>
  );
});

export default Pocket;
