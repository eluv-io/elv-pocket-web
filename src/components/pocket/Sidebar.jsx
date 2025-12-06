import SidebarStyles from "@/assets/stylesheets/modules/sidebar.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {HashedLoaderImage, Linkish, MediaItemImageUrl} from "@/components/common/Common.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";
import {useState} from "react";

import Logo from "@/assets/icons/logo.svg";
import XIcon from "@/assets/icons/x.svg";

const S = CreateModuleClassMatcher(SidebarStyles);

const MediaCard = observer(({mediaItem}) => {
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  const imageInfo = MediaItemImageUrl({mediaItem});
  const isActive = mediaItem.slug === mediaItemSlugOrId || mediaItem.id === mediaItemSlugOrId;

  return (
    <Linkish
      disabled={mediaItem.scheduleInfo.isLiveContent && mediaItem.scheduleInfo.ended}
      to={UrlJoin("~/", pocketSlugOrId, mediaItem.slug || mediaItem.id)}
      className={S("media-card", isActive ? "media-card--active" : "")}
    >
      <div className={S("media-card__image-container", `media-card__image-container--${imageInfo.imageAspectRatio}`)}>
        <HashedLoaderImage
          src={imageInfo.imageUrl}
          hash={imageInfo.imageHash}
          alt={imageInfo.alt}
          width={400}
          className={S("media-card__image")}
        />
        {
          !mediaItem.scheduleInfo.currentlyLive ? null :
            <div className={S("live-badge")}>LIVE</div>
        }
      </div>
      <div className={S("media-card__content")}>
        <div className={S("media-card__title")}>
          {mediaItem.title}
        </div>
        <div className={S("media-card__subtitle")}>
          {
            !mediaItem.scheduleInfo.isLiveContent ?
              mediaItem.subtitle :
              mediaItem.scheduleInfo.currentlyLive ?
                "Live Now" :
                mediaItem.scheduleInfo.ended ?
                  "Ended" :
                  `${mediaItem.scheduleInfo.displayStartDateLong} at ${mediaItem.scheduleInfo.displayStartTime}`
          }
        </div>
      </div>
    </Linkish>
  );
});

const SidebarContent = observer(() => {
  const [tabIndex, setTabIndex] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const tab = pocketStore.sidebarContent[tabIndex];

  if(rootStore.menu === "my-items") {
    return (
      <>
        <div className={S("media")}>
          <div className={S("media-section")}>
            <div className={S("media-section__title", "media-section__title--large")}>My Items</div>
            <div className={S("media-section__media")}>
              {
                (pocketStore.FilteredMedia({select: {permissions: "authorized", sort_order: "time_asc"}}))
                  .map((mediaItem, index) =>
                    <MediaCard
                      key={`${mediaItem.id}-${index}`}
                      mediaItem={mediaItem}
                    />
                  )
              }
            </div>
          </div>
        </div>
        <div className={S("history-link")}>
          Missing something? Check your <Linkish onClick={() => rootStore.SetMenu("purchase-history")}>Purchase History</Linkish>.
        </div>
      </>
    );
  }

  return (
    <div ref={setContainerRef} className={S("media")}>
      {
        pocketStore.sidebarContent.length <= 1 ? null :
          <div className={S("tabs")}>
            {
              pocketStore.sidebarContent.map((tab, index) =>
                <button
                  key={`tab-${index}`}
                  onClick={() => {
                    setTabIndex(index);
                    if(containerRef?.parentElement.scrollTop > 95) {
                      containerRef?.parentElement?.scrollTo({top: 95, behavior: "smooth"});
                    }
                  }}
                  className={S("tab", index === tabIndex ? "tab--active" : "")}
                >
                  { tab.title }
                </button>
              )
            }
          </div>
      }
      {
        tab.groups.map(({title, content}) =>
          content.length === 0 ? null :
            <div key={title} className={S("media-section")}>
              <div className={S("media-section__title")}>{title}</div>
              <div className={S("media-section__media")}>
                {
                  content.map((mediaItem, index) =>
                    <MediaCard
                      key={`${mediaItem.id}-${index}`}
                      mediaItem={mediaItem}
                    />
                  )
                }
              </div>
            </div>
        )
      }
    </div>
  );
});

export const Banners = observer(({position="below"}) => {
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);

  const config = pocketStore.pocket.metadata.sidebar_config || {};

  const banners = (config.banners || [])
    .filter(banner =>
      banner.image && (banner.link_type !== "media" || mediaItem.id !== banner.media_id)
    )
    .filter(banner =>
      !rootStore.mobile ||
      (position === "above" ? banner.mobile_position === "above" : !banner.mobile_position)
    );

  if(banners.length === 0 || rootStore.menu === "my-items"){
    return null;
  }

  return (
    <div className={S("banners")}>
      {
        banners.map((banner, index) => {
          const imageKey = rootStore.mobile && banner.image_mobile?.url ?
            "image_mobile" :
            "image";

          return (
            <Linkish
              key={index}
              href={banner.link_type === "external" && banner.url}
              to={
                banner.link_type === "media" &&
                UrlJoin("~/", pocketSlugOrId, pocketStore.PocketMediaItem(banner.media_id)?.slug || banner.media_id)
              }
              onClick={
                banner.link_type !== "reset" ? undefined :
                  () => confirm("Are you sure you want to reset your account?") ?
                    rootStore.ResetAccount() : undefined
              }
              className={S("banner")}
            >
              <HashedLoaderImage
                src={banner[imageKey]?.url}
                hash={banner[`${imageKey}_hash`]}
                width={1000}
                alt={banner.image_alt}
                className={S("banner__image")}
              />
            </Linkish>
          );
        })
      }
    </div>
  );
});

const ContentInfo = observer(({mediaItem}) => {
  return (
    <div className={S("content-info")}>
      {
        !mediaItem.scheduleInfo.currentlyLive ? null :
          <div className={S("live-badge")}>LIVE</div>
      }
      {
        rootStore.mobile && pocketStore.contentEnded ? null :
          <div className={S("current-item")}>
            <div className={S("title-container")}>
              {
                mediaItem.icons?.map(icon =>
                    !icon.icon?.url ? null :
                      <img
                        key={icon.icon.url}
                        src={icon.icon.url}
                        alt={icon.alt_text || "Title Icon"}
                        className={S("title-icon")}
                      />
                )
              }
              <div className={S("title")}>
                {mediaItem.title}
              </div>
            </div>
            <div className={(S("subtitle"))}>
              {
                !mediaItem.scheduleInfo.isLiveContent ?
                  mediaItem.subtitle :
                  `${mediaItem.scheduleInfo.displayStartDateLong} at ${mediaItem.scheduleInfo.displayStartTime}`
              }
            </div>
          </div>
      }
    </div>
  );
});

const Sidebar = observer(({mediaItem}) => {
  if(!mediaItem || rootStore.mobileLandscape) {
    return null;
  }

  return (
    <>
      <div className={S("sidebar")}>
        {
          rootStore.menu !== "my-items" ? null :
            <Linkish onClick={() => rootStore.SetMenu()} className={S("sidebar__close")}>
              <SVG src={XIcon} />
            </Linkish>
        }
        <ContentInfo key={mediaItem.id} mediaItem={mediaItem}/>
        {
          rootStore.mobile ? null :
            <Banners position="below"/>
        }
        <SidebarContent/>
        <div className={S("logo")}>
          <Linkish href="https://eluv.io" target="_blank">
            <SVG src={Logo} title="Eluvio Pocket TV" alt="Eluvio Pocket TV"/>
          </Linkish>
          <button
            onClick={
              () => confirm("Are you sure you want to reset your account?") ?
                rootStore.ResetAccount() : undefined
            }
            className={S("reset-button")}
          >
            RESET ACCOUNT
          </button>
        </div>
      </div>
      {
        !rootStore.mobile || rootStore.mobileLandscape ? null :
          <Banners position="below" />
      }
    </>
  );
});

export default Sidebar;
