import SidebarStyles from "@/assets/stylesheets/modules/sidebar.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {HashedLoaderImage, Linkish, MediaItemImageUrl} from "@/components/common/Common.jsx";
import UrlJoin from "url-join";

const S = CreateModuleClassMatcher(SidebarStyles);

const MediaCard = observer(({mediaItem}) => {
  const {pocketSlugOrId} = useParams();

  const imageInfo = MediaItemImageUrl({mediaItem, display: mediaItem.display, width: 400});
  console.log(imageInfo)

  return (
    <Linkish
      to={UrlJoin("~/", pocketSlugOrId, mediaItem.slug || mediaItem.id)}
      className={S("media-card")}
    >
      <div className={S("media-card__image-container", `media-card__image-container--${imageInfo.imageAspectRatio}`)}>
        <HashedLoaderImage
          src={imageInfo.imageUrl}
          hash={imageInfo.imageHash}
          alt={imageInfo.alt}
          className={S("media-card__image")}
        />
        {
          !mediaItem.scheduleInfo.currentlyLive ? null :
            <div className={S("live-badge")}>LIVE</div>
        }
      </div>
      <div className={S("media-card__content")}>
        <div className={S("media-card__title", "ellipsis")}>
          {mediaItem.display.title}
        </div>
        <div className={S("media-card__subtitle", "ellipsis")}>
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
  )
});

const Sidebar = observer(() => {
  const {pocketMediaSlugOrId} = useParams();

  const mediaItem = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  if(!mediaItem) {
    return null; }

  return (
    <div className={S("sidebar")}>
      {
        !mediaItem.scheduleInfo.currentlyLive ? null :
          <div className={S("live-badge")}>LIVE</div>
      }
      <div className={S("current-item")}>
        <div className={S("title-container")}>
          <img
            src={rootStore.pocket.metadata.splash_screen_background.url}
            alt={rootStore.pocket.metadata.splash_screen_background_alt || "Title Image"}
            className={S("title-image")}
          />
          <img
            src={rootStore.pocket.metadata.splash_screen_background_mobile.url}
            alt={rootStore.pocket.metadata.splash_screen_background_alt || "Title Image"}
            className={S("title-image")}
          />
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
      <div className={S("banners")}>
        <Linkish href="https://google.com" className={S("banner")}>
          <HashedLoaderImage
            src={rootStore.pocket.metadata.splash_screen_background.url}
            hash={rootStore.pocket.metadata.splash_screen_background_hash}
            className={S("banner__image")}
          />
        </Linkish>
        <Linkish href="https://google.com" className={S("banner")}>
          <HashedLoaderImage
            src={rootStore.pocket.metadata.splash_screen_background_mobile.url}
            hash={rootStore.pocket.metadata.splash_screen_background_mobile_hash}
            className={S("banner__image")}
          />
        </Linkish>
      </div>
      <div className={S("media")}>
        {
          [...rootStore.media, ...rootStore.media, ...rootStore.media].map((mediaItem, index) =>
            <MediaCard key={`${mediaItem.id}-${index}`} mediaItem={mediaItem} />
          )
        }
      </div>
    </div>
  );
});

export default Sidebar;
