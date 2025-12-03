import MediaStyles from "@/assets/stylesheets/modules/media.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import Video from "@/components/common/Video.jsx";
import {useEffect, useState} from "react";
import Countdown from "@/components/pocket/Countdown.jsx";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";
import SVG from "react-inlinesvg";

import PlayIcon from "@/assets/icons/play.svg";

const S = CreateModuleClassMatcher(MediaStyles);

const MediaCountdown = observer(({mediaItem, setStarted}) => {
  if(!mediaItem.scheduleInfo.isLiveContent) {
    return null;
  }

  const backgroundKey = rootStore.mobile && mediaItem.countdown_background_mobile ?
    "countdown_background_mobile" :
    "countdown_background_desktop";

  return (
    <div className={S("countdown-page")}>
      <HashedLoaderImage
        src={
          mediaItem[backgroundKey]?.url ||
          pocketStore.splashImage.url
        }
        hash={
          mediaItem[`${backgroundKey}_hash`]?.url ||
          pocketStore.splashImage.hash
        }
        alt={mediaItem.title}
        className={S("countdown-page__image")}
      />
      <div className={S("countdown-page__cover")}/>
      <div className={S("countdown-page__content")}>
        {
          mediaItem.icons?.length === 0 ? null :
            <div className={S("countdown-page__icons")}>
              {mediaItem.icons.map(({icon, icon_hash, alt_text}, index) =>
                <HashedLoaderImage
                  key={`icon-${index}`}
                  src={icon.url}
                  hash={icon_hash}
                  alt={alt_text}
                  className={S("countdown-page__icon")}
                />
              )}
            </div>
        }
        {
          (mediaItem.headers || []).length === 0 ? null :
            <div className={S("countdown-page__headers")}>
              {mediaItem.headers.map((header, index) =>
                <div key={`header-${index}`} className={S("countdown-page__header")}>{header}</div>
              )}
            </div>
        }
        <div className={S("countdown-page__title")}>
          {mediaItem.title}
        </div>
        <Countdown
          displayTime={mediaItem.scheduleInfo.startTime}
          time={mediaItem.scheduleInfo.streamStartTime}
          OnEnded={() => setStarted(true)}
          className={S("countdown-page__countdown")}
        />
      </div>
    </div>
  );
});

const EndScreen = observer(() => {
  const backgroundKey = rootStore.mobile && pocketStore.pocket.metadata.post_content_screen?.background_mobile ?
    "background_mobile" :
    "background";

  return (
    <Linkish
      href={pocketStore.pocket.metadata.post_content_screen.link}
      className={S("end-screen")}
    >
      <HashedLoaderImage
        src={pocketStore.pocket.metadata.post_content_screen[backgroundKey]?.url || pocketStore.splashImage.url}
        hash={pocketStore.pocket.metadata.post_content_screen[`${backgroundKey}_hash`] || pocketStore.splashImage.hash}
        alt={pocketStore.pocket.metadata.post_content_screen.background_alt}
        className={S("end-screen__background")}
      />
    </Linkish>
  );
});

const Media = observer(({setShowPreview}) => {
  const {mediaItemSlugOrId} = useParams();

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);
  const scheduleInfo = mediaItem && pocketStore.MediaItemScheduleInfo(mediaItem);
  const [started, setStarted] = useState(!scheduleInfo.isLiveContent || scheduleInfo.started);

  useEffect(() => {
    setStarted(!scheduleInfo.isLiveContent || scheduleInfo.started);
  }, [mediaItemSlugOrId, scheduleInfo]);

  if(!mediaItemSlugOrId) {
    return null;
  }

  const permissions = pocketStore.MediaItemPermissions(mediaItemSlugOrId);

  if(!permissions.authorized) {
    return (
      <div key={mediaItem} onClick={() => setShowPreview(false)} className={S("media")}>
        <div role="button" tabIndex={0} className={S("video-preview")}>
          <HashedLoaderImage
            noAnimation
            src={mediaItem.poster_image?.url || pocketStore.splashImage.url}
            hash={mediaItem.poster_image_hash || pocketStore.splashImage.hash}
            className={S("video-preview__poster")}
          />
          <div className={S("video-preview__play-button")}>
            <SVG src={PlayIcon} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={mediaItem} className={S("media")}>
      {
        !started ?
          <MediaCountdown mediaItem={mediaItem} setStarted={setStarted} /> :
          pocketStore.contentEnded && pocketStore.pocket.metadata.post_content_screen?.enabled ?
            <EndScreen /> :
            <Video
              isLive={mediaItem.scheduleInfo.currentlyLive}
              videoLink={mediaItem.media_link}
              posterImage={
                mediaItem.poster_image?.url ||
                pocketStore.splashImage.url
              }
              endCallback={() => pocketStore.SetContentEnded(true)}
              className={S("video")}
              contentInfo={{
                title: mediaItem.title,
                subtitle: mediaItem.subtitle,
                description: mediaItem.description,
                liveDVR: EluvioPlayerParameters.liveDVR[permissions?.dvr && mediaItem?.enable_dvr ? "ON" : "OFF"]
              }}
            />
      }
    </div>
  );
});

export default Media;
