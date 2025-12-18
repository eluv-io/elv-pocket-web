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
  const [countdown, setCountdown] = useState(10);
  const [redirect, setRedirect] = useState(false);
  const disabled = !info.nextItemId;

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
  }, []);

  if(redirect) {
    return <Redirect to={UrlJoin("/", pocketSlugOrId, info.nextItemId)} />;
  }

  if(disabled) {
    return null;
  }

  if(info.nextItemId) {
    const nextItem = pocketStore.MediaItem(info.nextItemId);

    return (
      <div className={S("bumper", "bumper--next")}>
        <HashedLoaderImage
          src={mediaItem.poster_image?.url || mediaItem.thumbnail_image_landscape?.url}
          hash={mediaItem.poster_image_hash || mediaItem.thumbnail_image_landscape_hash}
          alt={mediaItem.title}
          className={S("bumper__background", "bumper__background--cover")}
        />
        <div className={S("bumper__cover")} />
        <div className={S("next")}>
          <div className={S("next__timer")}>
            Up Next in {countdown}
          </div>
          <div className={S("next__card")}>
            <HashedLoaderImage
              src={nextItem.thumbnail_image_landscape?.url}
              hash={nextItem.thumbnail_image_landscape_hash}
              alt={nextItem.title}
              width={600}
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
});

const Bumper = observer(({bumper, setFinished}) => {
  const backgroundKey = rootStore.mobile && bumper.background_mobile ?
    "background_mobile" :
    "background";

  useEffect(() => {
    if(bumper.video) {
      return;
    }

    let timeout = setTimeout(() => setFinished(), (bumper.duration || 8) * 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Linkish
      href={bumper.link}
      className={S("bumper")}
    >
      {
        !bumper.video ?
          <HashedLoaderImage
            src={bumper[backgroundKey]?.url || pocketStore.splashImage.url}
            hash={bumper[`${backgroundKey}_hash`] || pocketStore.splashImage.hash}
            alt={bumper.background_alt}
            className={S("bumper__background")}
          /> :
          <Video
            videoLink={bumper.video}
            videoLinkInfo={bumper.video_info}
            posterImage={bumper[backgroundKey]?.url || pocketStore.splashImage.url}
            endCallback={setFinished}
            className={S("bumper__video")}
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

const Bumpers = observer(({mediaItem, position="before", setFinished}) => {
  const info = pocketStore.MediaItemInfo(mediaItem.id);
  const bumpers = (info.bumpers || [])
    .filter(bumper => bumper.position === position);
  const [bumperIndex, setBumperIndex] = useState(0);

  useEffect(() => {
    if(bumpers?.length === 0) {
      setFinished();
    }
  }, []);

  if(!bumpers?.[bumperIndex]) {
    return null;
  }

  return (
    <Bumper
      key={bumpers[bumperIndex]?.id || bumperIndex}
      bumper={bumpers[bumperIndex]}
      setFinished={() => {
        if(bumpers[bumperIndex + 1]) {
          setBumperIndex(bumperIndex + 1);
        } else {
          setFinished();
        }
      }}
    />
  );
});

const Media = observer(({setShowPreview}) => {
  const {mediaItemSlugOrId} = useParams();

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);
  const scheduleInfo = mediaItem && pocketStore.MediaItemScheduleInfo(mediaItem);
  const [started, setStarted] = useState(!scheduleInfo.isLiveContent || scheduleInfo.started);
  const [preRollFinished, setPreRollFinished] = useState(false);
  const [postRollFinished, setPostRollFinished] = useState(false);
  const [player, setPlayer] = useState(undefined);

  useEffect(() => {
    setStarted(!scheduleInfo.isLiveContent || scheduleInfo.started);
  }, [mediaItemSlugOrId, scheduleInfo]);

  useEffect(() => {
    if(!player) { return; }

    if(preRollFinished) {
      player.controls.Play();
    }
  }, [player, preRollFinished]);

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
            videoLinkInfo={mediaItem.media_link_info}
            callback={setPlayer}
            posterImage={
              mediaItem.poster_image?.url ||
              pocketStore.splashImage.url
            }
            endCallback={() => pocketStore.SetContentEnded(true)}
            className={S("video")}
            playerOptions={{
              autoplay: false
            }}
            contentInfo={{
              title: mediaItem.title,
              subtitle: mediaItem.subtitle,
              description: mediaItem.description,
              liveDVR: EluvioPlayerParameters.liveDVR[permissions?.dvr && mediaItem?.enable_dvr ? "ON" : "OFF"]
            }}
          />
      }
      {
        !preRollFinished ?
          <Bumpers
            mediaItem={mediaItem}
            position="before"
            setFinished={() => {
              player?.controls.Play();
              // Small delay for the player to get started
              setTimeout(() => setPreRollFinished(true), 100);
            }}
          /> :
          !pocketStore.contentEnded ? null :
            !postRollFinished ?
              <Bumpers
                mediaItem={mediaItem}
                position="after"
                setFinished={() => setPostRollFinished(true)}
              /> :
              <EndScreen
                mediaItem={mediaItem}
              />
      }
    </div>
  );
});

export default Media;
