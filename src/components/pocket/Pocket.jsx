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
import Page from "@/components/pocket/Page.jsx";
import PreviewPasswordForm from "@/components/common/PreviewPasswordForm.jsx";
import {ConcurrencyLockForm} from "@/components/pocket/PurchaseHistory.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const params = new URLSearchParams(window.location.search);
const Pocket = observer(() => {
  const [showPreview, setShowPreview] = useState(false);
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  useEffect(() => {
    if(params.has("uid")) {
      // Scrub UID from url immediately
      const url = new URL(window.location.href);
      url.searchParams.delete("uid");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  useEffect(() => {
    rootStore.Initialize({pocketSlugOrId, customUserIdCode: params.get("uid")})
      .then(pocket =>
        pocket && SetHTMLMetaTags(pocket.metadata.meta_tags)
      );
  }, [pocketSlugOrId]);

  useEffect(() => {
    setShowPreview(false);
    pocketStore.SetContentEnded(false);
    rootStore.SetAttribute("showAdditionalPurchaseOptions", false);
  }, [mediaItemSlugOrId]);

  if(pocketStore.requirePassword) {
    return <PreviewPasswordForm />;
  }

  if(rootStore.tooManyLogins) {
    return <ConcurrencyLockForm />;
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
          {
            !pocketStore.preview ? null :
              <div className={S("splash__preview")}>
                PREVIEW
              </div>
          }
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
  const hideSidebar = showPurchase && rootStore.mobile && permissions.displayedPermissionItems.length > 2;

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
    </>
  );
});

export default Pocket;
