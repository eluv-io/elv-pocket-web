import MediaStyles from "@/assets/stylesheets/modules/media.module.scss";

import {observer} from "mobx-react-lite";
import {Redirect, useParams} from "wouter";
import {rootStore, pocketStore, mediaDisplayStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import Video from "@/components/common/Video.jsx";
import {useEffect, useState} from "react";
import Countdown from "@/components/pocket/Countdown.jsx";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";
import SVG from "react-inlinesvg";
import UrlJoin from "url-join";
import {MultiviewSelectionModal} from "@/components/pocket/Sidebar.jsx";

import PlayIcon from "@/assets/icons/play.svg";
import RightArrowIcon from "@/assets/icons/right-arrow.svg";
import XIcon from "@/assets/icons/x.svg";

const S = CreateModuleClassMatcher(MediaStyles);

const MediaCountdown = observer(({
  mediaItem,
  setStarted,
  multiview,
  containerProps={},
  onClick,
  onClose,
  className=""
}) => {
  const scheduleInfo = pocketStore.MediaItemScheduleInfo(mediaItem);
  if(!scheduleInfo.isLiveContent) {
    return null;
  }

  const backgroundKey = rootStore.mobile && mediaItem.countdown_background_mobile ?
    "countdown_background_mobile" :
    "countdown_background_desktop";

  return (
    <div
      {...containerProps}
      onClick={onClick}
      className={
        JoinClassNames(
          S("countdown-page", multiview ? "countdown-page--multiview" : ""),
          className
        )
      }
    >
      {
        !onClose ? null :
          <button onClick={() => onClose()} className={S("countdown-page__close", "opacity-hover")}>
            <SVG src={XIcon}/>
          </button>
      }
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
          !mediaItem.icons || mediaItem.icons?.length === 0 ? null :
            <div className={S("countdown-page__icons")}>
              {mediaItem.icons?.map(({icon, icon_hash, alt_text}, index) =>
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
          displayTime={scheduleInfo.startTime}
          time={scheduleInfo.streamStartTime}
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
  const [countdown, setCountdown] = useState(5);
  const [redirect, setRedirect] = useState(false);
  const disabled = !info.nextItemId;

  useEffect(() => {
    if(disabled || !info.nextItemId) { return; }

    const transitionAt = Date.now() + 5.5 * 1000;

    const interval = setInterval(() => {
      const countdown = Math.floor((transitionAt - Date.now()) / 1000);

      if(countdown < 0) {
        setRedirect(true);
      }

      setCountdown(Math.max(0, countdown));
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
            Up Next in {countdown + 1}
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

const Bumper = observer(({mediaItem, bumper, setFinished}) => {
  const [player, setPlayer] = useState(undefined);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const backgroundKey = rootStore.mobile && bumper.background_mobile ?
    "background_mobile" :
    "background";

  useEffect(() => {
    if(bumper.video) {
      return;
    }

    let timeout = setTimeout(() => setFinished(), (bumper.duration || 5) * 1000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if(!player) { return; }
    window.pl = player;

    player.video.play()
      .catch(() => setAutoplayBlocked(true));

    player.controls.RegisterVideoEventListener(
      "play",
      () => setAutoplayBlocked(false)
    );
  }, [player]);

  if(!bumper.video) {
    return (
      <Linkish
        href={bumper.link}
        className={S("bumper")}
      >
        <HashedLoaderImage
          src={bumper[backgroundKey]?.url || pocketStore.splashImage.url}
          hash={bumper[`${backgroundKey}_hash`] || pocketStore.splashImage.hash}
          alt={bumper.background_alt}
          className={S("bumper__background")}
        />
      </Linkish>
    );
  }

  return (
    <div className={S("bumper")}>
      <Video
        videoLink={bumper.video}
        videoLinkInfo={bumper.video_info}
        callback={setPlayer}
        endCallback={setFinished}
        className={S("bumper__video")}
        autoAspectRatio={false}
        showTitle={bumper.show_video_controls && bumper.video_title}
        contentInfo={{
          title: bumper.show_video_controls && bumper.video_title
        }}
        playerOptions={{
          keyboardControls: EluvioPlayerParameters.keyboardControls.OFF,
          showLoader: EluvioPlayerParameters.showLoader.OFF,
          controls: EluvioPlayerParameters.controls[bumper.show_video_controls ? "AUTO_HIDE" : "OFF_WITH_VOLUME_TOGGLE"],
          autoplay: EluvioPlayerParameters.autoplay.OFF,
          muted: EluvioPlayerParameters.muted.OFF
        }}
      />
      {
        autoplayBlocked || !bumper.link ? null :
          <Linkish href={bumper.link} className={S("bumper__link", "opacity-hover")}>
            Learn More
            <SVG src={RightArrowIcon} />
          </Linkish>

      }
      {
        !autoplayBlocked || bumper.show_video_controls ? null :
          <div
            onClick={() => player.controls.TogglePlay()}
            className={S("bumper__controls")}
          >
            {
              !autoplayBlocked ? null :
                <>
                  <HashedLoaderImage
                    src={mediaItem.poster_image?.url || mediaItem.thumbnail_image_landscape?.url}
                    hash={mediaItem.poster_image_hash || mediaItem.thumbnail_image_landscape_hash}
                    alt={mediaItem.title}
                    onClick={() => player.controls.Play()}
                    className={S("bumper__controls-background")}
                  />
                  <div
                    onClick={event => {
                      event.stopPropagation();
                      event.preventDefault();
                    }}
                    className={S("bumper__button-container")}
                  >
                    <button onClick={() => player.controls.Play()} className={S("bumper__play-button")}>
                      <SVG src={PlayIcon} />
                    </button>
                  </div>
                </>
            }
          </div>
      }
    </div>
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
      mediaItem={mediaItem}
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

export const BumperContainer = observer(({
  mediaItemId,
  player,
  onPrerollFinish
}) => {
  const primaryMediaItem = pocketStore.MediaItem(mediaItemId || mediaDisplayStore.primaryDisplayedMediaId);
  const [preRollFinished, setPreRollFinished] = useState(false);
  const [postRollFinished, setPostRollFinished] = useState(false);

  useEffect(() => {
    if(preRollFinished) {
      onPrerollFinish?.();

      if(player) {
        // Small delay for the player to get started
        setTimeout(() => player?.controls?.Play(), 100);
      }
    }
  }, [!!player, preRollFinished]);

  if(!primaryMediaItem) {
    return null;
  }

  return (
    !preRollFinished ?
      <Bumpers
        mediaItem={primaryMediaItem}
        position="before"
        setFinished={() => setPreRollFinished(true)}
      /> :
      !pocketStore.contentEnded ? null :
        !postRollFinished ?
          <Bumpers
            mediaItem={primaryMediaItem}
            position="after"
            setFinished={() => setPostRollFinished(true)}
          /> :
          <EndScreen
            mediaItem={primaryMediaItem}
          />
  );
});

// Single media item - may have bumpers, autoplay etc.
const MediaContent = observer(({className="", ...videoProps}) => {
  const mediaInfo = mediaDisplayStore.displayedMediaInfo[0];
  const primaryMediaItem = pocketStore.MediaItem(mediaInfo.mediaItemId || mediaInfo.id);
  const scheduleInfo = primaryMediaItem && pocketStore.MediaItemScheduleInfo(primaryMediaItem);
  const permissions = pocketStore.MediaItemPermissions({mediaItem: primaryMediaItem});
  const [player, setPlayer] = useState(undefined);
  const [started, setStarted] = useState(!scheduleInfo.isLiveContent || scheduleInfo.started);

  useEffect(() => {
    setStarted(!scheduleInfo.isLiveContent || scheduleInfo.started);
  }, [mediaInfo.id, scheduleInfo]);

  return (
    <div className={JoinClassNames(S("media"), className)}>
      {
        !started ?
          <MediaCountdown
            mediaItem={primaryMediaItem}
            setStarted={setStarted}
          /> :
          <Video
            {...videoProps}
            saveSettings
            isLive={scheduleInfo.currentlyLive}
            videoLink={mediaInfo.mediaItem.media_link}
            videoLinkInfo={mediaInfo.mediaItem.media_link_info}
            callback={setPlayer}
            endCallback={() => pocketStore.SetContentEnded(true)}
            mediaItemId={mediaInfo.id}
            saveProgress
            defaultStartTime={mediaInfo.type === "media-item" && primaryMediaItem.default_start_time}
            className={S("video")}
            playerOptions={{
              autoplay: false
            }}
            contentInfo={{
              title: mediaInfo.display.title,
              subtitle: mediaInfo.display.subtitle,
              liveDVR: EluvioPlayerParameters.liveDVR[permissions?.dvr && mediaInfo.mediaItem?.enable_dvr ? "ON" : "OFF"]
            }}
          />
      }
      <BumperContainer
        mediaInfo={mediaInfo}
        player={player}
      />
    </div>
  );
});

const MultiviewVideo = observer(({mediaInfo, primary, ...videoProps}) => {
  const mediaItem = pocketStore.MediaItem(mediaInfo.mediaItemId || mediaInfo.id);
  const scheduleInfo = pocketStore.MediaItemScheduleInfo(mediaItem);
  const [started, setStarted] = useState(!scheduleInfo?.isLiveContent || scheduleInfo?.started);

  if(started) {
    return <Video {...videoProps } />;
  }

  return (
    <MediaCountdown
      mediaItem={mediaItem}
      setStarted={setStarted}
      multiview={!primary}
      onClick={videoProps.onClick}
      containerProps={videoProps.containerProps}
      onClose={() => mediaDisplayStore.SetDisplayedContent(
        mediaDisplayStore.displayedContent.filter(otherItem => otherItem.id !== mediaInfo.id)
      )}
      className={videoProps.className}
    />
  );
});

const MultiviewContent = observer(() => {
  if(mediaDisplayStore.displayedMediaInfo.length === 0) {
    return (
      <div className={S("media-container", "media-container--empty")}>
        Select Media
      </div>
    );
  }

  return (
    <div id="media-container" className={S("media-container", "media-container--multiview")}>
      <div
        className={
          S(
            "multiview-media-grid",
            `multiview-media-grid--${mediaDisplayStore.displayedMediaInfo.length}`,
            mediaDisplayStore.isFullscreen ? "multiview-media-grid--fullscreen" : ""
          )
        }
      >
        {
          mediaDisplayStore.displayedMediaInfo.map((item, index) =>
            <MultiviewVideo
              saveSettings={index === 0}
              mediaInfo={item}
              key={`media-${item.id}`}
              videoLink={item.mediaItem.media_link}
              videoLinkInfo={item.mediaItem.media_link_info}
              contentInfo={{
                title: item.display.title,
                liveDVR: EluvioPlayerParameters.liveDVR[item.mediaItem.enable_dvr ? "ON" : "OFF"]
              }}
              showTitle
              mute={index > 0}
              onClose={() => mediaDisplayStore.SetDisplayedContent(
                mediaDisplayStore.displayedContent.filter(otherItem => otherItem.id !== item.id)
              )}
              className={S("media", "media--multiview")}
              containerProps={{
                style: { gridArea: `video-${index + 1}` }
              }}
            />
          )
        }
      </div>
    </div>
  );
});

const PIPContent = observer(() => {
  const [menuActive, setMenuActive] = useState(false);

  if(mediaDisplayStore.displayedMediaInfo.length === 0) {
    return (
      <div className={S("media-container", "media-container--empty")}>
        Select Media
      </div>
    );
  }

  const primaryMedia = mediaDisplayStore.displayedMediaInfo[0];
  const secondaryMedia = mediaDisplayStore.displayedMediaInfo[1];

  const primaryVideo = (
    <MultiviewVideo
      saveSettings
      primary
      mediaInfo={primaryMedia}
      key={`media-${primaryMedia.id}`}
      videoLink={primaryMedia.mediaItem.media_link}
      videoLinkInfo={primaryMedia.mediaItem.media_link_info}
      contentInfo={{
        title: primaryMedia.display.title,
        liveDVR: EluvioPlayerParameters.liveDVR[primaryMedia.mediaItem.enable_dvr ? "ON" : "OFF"]
      }}
      showTitle={!!secondaryMedia}
      settingsUpdateCallback={player => setMenuActive(player.controls.IsMenuVisible())}
      className={S("media")}
    />
  );

  const secondaryVideo = (
    <MultiviewVideo
      mediaInfo={secondaryMedia}
      key={`media-${secondaryMedia.id}`}
      videoLink={secondaryMedia.mediaItem.media_link}
      videoLinkInfo={secondaryMedia.mediaItem.media_link_info}
      contentInfo={{
        title: secondaryMedia.display.title,
        liveDVR: EluvioPlayerParameters.liveDVR[secondaryMedia.mediaItem.enable_dvr ? "ON" : "OFF"]
      }}
      showTitle
      hideControls
      mute
      settingsUpdateCallback={player => setMenuActive(player.controls.IsMenuVisible())}
      onClick={() => mediaDisplayStore.SetDisplayedContent([
        mediaDisplayStore.displayedContent[1],
        mediaDisplayStore.displayedContent[0]
      ])}
      className={
        S(
          "media",
          "media--pip",
          menuActive ? "media--pip--under-menu" : ""
        )
      }
    />
  );

  return (
    <div id="media-container" className={S("media-container", "media-container--pip")}>
      { primaryVideo }
      { secondaryVideo }
    </div>
  );
});

const Media = observer(({setShowPreview}) => {
  const {mediaItemSlugOrId} = useParams();
  const primaryMediaItem = pocketStore.MediaItem(mediaItemSlugOrId);
  let mediaItem = primaryMediaItem;

  useEffect(() => {
    mediaDisplayStore.Reset();

    const viewIndex = new URLSearchParams(window.location.search).get("v");
    const view = primaryMediaItem?.additional_views?.[parseInt(viewIndex)];

    if(view) {
      mediaDisplayStore.SetDisplayedContent([{
        ...view,
        type: "additional-view",
        id: `${primaryMediaItem.id}-${viewIndex}`,
        mediaItemId: primaryMediaItem.id,
        index: parseInt(viewIndex),
        label: `${primaryMediaItem.title} - ${view.label}`
      }]);
    } else {
      mediaDisplayStore.SetDisplayedContent([{type: "media-item", id: primaryMediaItem.id}]);
    }

    return () => mediaDisplayStore.Reset();
  }, [primaryMediaItem]);

  if(!mediaItem) {
    return null;
  }

  const permissions = pocketStore.MediaItemPermissions({mediaItem: primaryMediaItem});

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
    <>
      {
        mediaDisplayStore.displayedContent.length === 1 ?
          <MediaContent key={mediaDisplayStore.displayedMediaInfo[0]?.id} /> :
          mediaDisplayStore.multiviewMode === "pip" ?
            <PIPContent /> :
            <MultiviewContent />
      }
      <MultiviewSelectionModal mediaItem={mediaItem} />
    </>
  );
});

export default Media;
