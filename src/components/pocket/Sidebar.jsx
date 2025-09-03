import SidebarStyles from "@/assets/stylesheets/modules/sidebar.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {HashedLoaderImage, Linkish, MediaItemImageUrl} from "@/components/common/Common.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";

import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";

const S = CreateModuleClassMatcher(SidebarStyles);

const MediaCard = observer(({mediaItem}) => {
  const {pocketSlugOrId, pocketMediaSlugOrId} = useParams();

  const imageInfo = MediaItemImageUrl({mediaItem, display: mediaItem.display});
  const isActive = mediaItem.slug === pocketMediaSlugOrId || mediaItem.id === pocketMediaSlugOrId;

  return (
    <Linkish
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
          {mediaItem.display.title}
        </div>
        <div className={S("media-card__subtitle")}>
          {
            !mediaItem.scheduleInfo.isLiveContent ?
              mediaItem.display.subtitle :
              !mediaItem.scheduleInfo.currentlyLive ?
                "Live Now" :
                `${mediaItem.scheduleInfo.displayStartDateLong} at ${mediaItem.scheduleInfo.displayStartTime}`
          }
        </div>
      </div>
    </Linkish>
  );
});

const SidebarContent = observer(() => {
  const config = rootStore.pocket.metadata.sidebar_config || {};

  let media = rootStore.media;

  if(config.content === "specific") {
    media = config.content_ids
      .map(({id}) =>
        rootStore.PocketMediaItem(id)
      )
      .filter(item => item);
  }

  const liveContent = media.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started && !item.scheduleInfo.ended);
  const upcomingContent = media.filter(item => item.scheduleInfo.isLiveContent && !item.scheduleInfo.started);
  const vodContent = media.filter(item => !item.scheduleInfo.isLiveContent);

  let content = [
    liveContent.length === 0 ? null :
      { title: "TODAY", items: liveContent},
    upcomingContent.length === 0 ? null :
      { title: "UPCOMING", items: upcomingContent},
    vodContent.length === 0 ? null :
      { title: "VOD", items: vodContent}
  ].filter(c => c);

  return (
    <div className={S("media")}>
      {
        content.map(({title, items}) =>
          <div key={title} className={S("media-section")}>
            <div className={S("media-section__title")}>{title}</div>
            <div className={S("media-section__media")}>
              {
                items.map((mediaItem, index) =>
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
  const {pocketSlugOrId, pocketMediaSlugOrId} = useParams();

  const mediaItem = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  const config = rootStore.pocket.metadata.sidebar_config || {};


  const banners = (config.banners || [])
    .filter(banner =>
      banner.image && (banner.link_type !== "media" || mediaItem.id !== banner.media_id)
    )
    .filter(banner =>
      !rootStore.mobile ||
      (position === "above" ? banner.mobile_position === "above" : !banner.mobile_position)
    );

  if(banners.length === 0){
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
                UrlJoin("~/", pocketSlugOrId, rootStore.PocketMediaItem(banner.media_id)?.slug || banner.media_id)
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

const Sidebar = observer(() => {
  const {pocketMediaSlugOrId} = useParams();

  const mediaItem = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  if(!mediaItem) {
    return null;
  }

  return (
    <div className={S("sidebar")}>
      {
        !mediaItem.scheduleInfo.currentlyLive ? null :
          <div className={S("live-badge")}>LIVE</div>
      }
      {
        rootStore.mobile && rootStore.contentEnded ? null :
          <div className={S("current-item")}>
            <div className={S("title-container")}>
              {
                mediaItem.display?.icons?.map(icon =>
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
                {mediaItem.display.title}
              </div>
            </div>
            <div className={(S("subtitle"))}>
              {
                !mediaItem.scheduleInfo.isLiveContent ?
                  mediaItem.display.subtitle :
                  `${mediaItem.scheduleInfo.displayStartDateLong} at ${mediaItem.scheduleInfo.displayStartTime}`
              }
            </div>
          </div>
      }
      <Banners position="below" />
      <SidebarContent/>
      <div className={S("logo")}>
        <SVG src={EIcon} alt="Eluvio"/>
        <span>POCKET TV</span>
      </div>
    </div>
  );
});

export default Sidebar;
