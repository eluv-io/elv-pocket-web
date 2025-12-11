import MediaStyles from "@/assets/stylesheets/modules/media.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import Video from "@/components/common/Video.jsx";
import {useEffect, useState} from "react";
import Countdown from "@/components/pocket/Countdown.jsx";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";
import SVG from "react-inlinesvg";

import PlayIcon from "@/assets/icons/play.svg";
import UrlJoin from "url-join";

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

const EndScreen = observer(({mediaItem}) => {
  const {pocketSlugOrId} = useParams();
  const info = pocketStore.MediaItemInfo(mediaItem.id);
  const [ended, setEnded] = useState(!info.endScreenSettings?.enabled);
  const [countdown, setCountdown] = useState(10);
  const [redirect, setRedirect] = useState(false);
  const backgroundKey = rootStore.mobile && info.endScreenSettings?.background_mobile ?
    "background_mobile" :
    "background";

  const disabled = !info.endScreenSettings?.enabled && !info.nextItemId;

  useEffect(() => {
    if(disabled || ended || info.endScreenSettings.video) {
      return;
    }

    setTimeout(() => setEnded(true), 8000);
  }, []);

  useEffect(() => {
    if(disabled || !info.nextItemId) { return; }

    const transitionAt = Date.now() + 10.5 * 1000;

    const interval = setInterval(() => {
      const countdown = Math.floor((transitionAt - Date.now()) / 1000);

      if(countdown < 0) {
        setRedirect(true);
      }

      setCountdown(Math.max(1, countdown));
    }, 100);

    return () => clearInterval(interval);
  }, [ended]);

  if(redirect) {
    return <Redirect to={UrlJoin("/", pocketSlugOrId, info.nextItemId)} />;
  }

  if(disabled) {
    return null;
  }

  if(ended && info.nextItemId) {
    const nextItem = pocketStore.MediaItem(info.nextItemId);

    return (
      <div className={S("end-screen", "end-screen--next")}>
        <HashedLoaderImage
          src={mediaItem.poster_image?.url || mediaItem.thumbnail_image_landscape?.url}
          hash={mediaItem.poster_image_hash || mediaItem.thumbnail_image_landscape_hash}
          alt={mediaItem.title}
          className={S("end-screen__background", "end-screen__background--cover")}
        />
        <div className={S("end-screen__cover")} />
        <div className={S("next")}>
          <div className={S("next__timer")}>
            Up Next in {countdown}
          </div>
          <div className={S("next__card")}>
            <HashedLoaderImage
              src={nextItem.thumbnail_image_landscape?.url}
              hash={nextItem.thumbnail_image_landscape_hash}
              alt={nextItem.title}
              width={300}
              className={S("next__card-thumbnail")}
            />
            <div className={S("next__card-content")}>
              <div className={S("next__card-title")}>
                { nextItem.title }
              </div>
              {
                nextItem.subtitle ? null :
                  <div className={S("next__card-subtitle")}>
                    Season 27, episode 4
                  </div>
              }
            </div>
          </div>
          <div className={S("next__actions")}>
            <button
              onClick={() => pocketStore.SetContentEnded(false)}
              className={S("next__action", "next__action--cancel", "opacity-hover")}
            >
              Cancel
            </button>
            <button
              onClick={() => setRedirect(true)}
              className={S("next__action", "next__action--next", "opacity-hover")}
            >
              Play Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Linkish
      href={info.endScreenSettings.link}
      className={S("end-screen")}
    >
      {
        !info.endScreenSettings.video || ended ?
          <HashedLoaderImage
            src={info.endScreenSettings[backgroundKey]?.url || pocketStore.splashImage.url}
            hash={info.endScreenSettings[`${backgroundKey}_hash`] || pocketStore.splashImage.hash}
            alt={info.endScreenSettings.background_alt}
            className={S("end-screen__background")}
          /> :
          <Video
            videoLink={info.endScreenSettings.video}
            posterImage={info.endScreenSettings[backgroundKey]?.url || pocketStore.splashImage.url}
            endCallback={() => setEnded(true)}
            className={S("end-screen__video")}
            autoAspectRatio={false}
            playerOptions={{
              controls: EluvioPlayerParameters.controls.OFF,
              autoplay: EluvioPlayerParameters.autoplay.ON,
              muted: EluvioPlayerParameters.muted.OFF_IF_POSSIBLE
            }}
          />
      }
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

  const permissions = pocketStore.MediaItemPermissions({mediaItemSlugOrId});

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
      {
        !pocketStore.contentEnded ? null :
          <EndScreen mediaItem={mediaItem} />
      }
    </div>
  );
});

export default Media;
