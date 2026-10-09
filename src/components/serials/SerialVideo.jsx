import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {useEffect, useState} from "react";
import {rootStore, pocketStore} from "@/stores";
import {observer} from "mobx-react-lite";
import {Copy, CreateModuleClassMatcher, JoinClassNames, LinkTargetHash} from "@/utils/Utils.js";
import SVG from "react-inlinesvg";
import {ControlledCircleTimer, HashedLoaderImage, Loader} from "@/components/common/Common.jsx";
import {MobileMenu} from "@/components/pocket/Header.jsx";
import Modal from "@/components/common/Modal.jsx";

import VolumeOffIcon from "@/assets/icons/volume-off.svg";
import VolumeOnIcon from "@/assets/icons/volume-high.svg";
import PlayIcon from "@/assets/icons/play.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import MenuIcon from "@/assets/icons/menu.svg";
import ShareIcon from "@/assets/icons/share.svg";
import CopyIcon from "@/assets/icons/copy.svg";
import SwipeIcon from "@/assets/icons/swipe-icon.svg";

const S = CreateModuleClassMatcher(SerialStyles);

const VideoTimer = observer(({player}) => {
  const [update, setUpdate] = useState(0);

  useEffect(() => {
    if(!player) { return; }

    const interval = setInterval(() => setUpdate(Math.random()), 100);

    return () => clearInterval(interval);
  }, [!!player]);

  if(!player || !player?.controls?.GetDuration?.()) { return; }

  return (
    <ControlledCircleTimer
      update={update}
      remainingTime={(player.controls.GetDuration() || 1) - (player.controls.GetCurrentTime() || 0)}
      duration={player.controls.GetDuration() || 1}
      className={S("serial-video__timer")}
    />
  );
});

let swipeMessageShown = false;
const SwipeMessage = observer(() => {
  const [ref, setRef] = useState(undefined);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if(!ref) { return; }

    const nodes = Array.from(ref?.querySelectorAll(`.${S("swipe-message")}`) || []);

    (async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      nodes?.[0]?.scrollIntoView({behavior: "instant"});

      for(let i = 1; i < nodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        nodes[i].scrollIntoView({behavior: "smooth"});

        if(i >= nodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setHidden(true);
          //setTimeout(() => swipeMessageShown = true, 1000);
        }
      }
    })();
  }, [ref]);

  if(swipeMessageShown) {
    return null;
  }

  return (
    <div ref={setRef} className={S("swipe-message-container", hidden ? "swipe-message-container--hidden" : "")}>
      <div className={S("swipe-message", "swipe-message--horizontal")}>
        <SVG src={SwipeIcon}/>
        Swipe right for next episode
      </div>
      {
        pocketStore.serialList.length <= 1 ? null :
          <div className={S("swipe-message", "swipe-message--vertical")}>
            <SVG src={SwipeIcon}/>
            Swipe up for next series
          </div>
      }
      <div className={S("swipe-message")}/>
    </div>
  );
});

const Details = observer(({title, subtitle, playing, SetPlaying}) => {
  const [menuControls, setMenuControls] = useState(undefined);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCopyIcon, setShowCopyIcon] = useState(false);

  // Resume playing after menu is closed if opening it stopped playback
  useEffect(() => {
    if(menuVisible || !wasPlaying) { return; }

    SetPlaying(true);
  }, [menuVisible]);

  return (
    <>
      <div className={S("serial-video__details")}>
        <div className={S("serial-video__detail-text")}>
          <div className={S("serial-video__detail-title")}>
            {title}
          </div>
          {
            !subtitle ? null :
              <div className={S("serial-video__detail-subtitle")}>
                {subtitle}
              </div>
          }
        </div>
        <div className={S("serial-video__detail-buttons")}>
          <button
            title="Share"
            onClick={async () => {
              if(menuVisible) { return; }

              const url = new URL(window.location.origin);
              url.pathname = window.location.pathname;
              try {
                setMenuVisible(true);
                setWasPlaying(playing);

                if(playing) {
                  SetPlaying?.(false);
                }

                await navigator.share({
                  title: pocketStore.pocket.metadata?.meta_tags?.title || document.title,
                  url: url.toString()
                });
              } catch(error) {
                if(error?.toString()?.toLowerCase()?.includes("aborterror")) {
                  // Aborted
                  return;
                }

                Copy(url.toString());

                if(playing) {
                  SetPlaying?.(true);
                }

                setShowCopyIcon(true);

                setTimeout(() => setShowCopyIcon(false), 2000);
              } finally {
                setMenuVisible(false);
              }
            }}
            className={S("serial-video__detail-button", "serial-video__detail-button--share")}
          >
            {
              showCopyIcon ?
                <>
                  <SVG src={CopyIcon}/>
                  <span>COPIED</span>
                </> :
                <>
                  <SVG src={ShareIcon}/>
                  <span>SHARE</span>
                </>
            }
          </button>
          <button
            title="Show Menu"
            onClick={() => {
              menuControls.Show();
              setMenuVisible(!menuVisible);
              setWasPlaying(playing);

              if(playing) {
                SetPlaying?.(false);
              }
            }}
            className={S("serial-video__detail-button", "serial-video__detail-button--menu")}
          >
            <SVG src={MenuIcon}/>
          </button>
        </div>
        <SwipeMessage />
      </div>
      <Modal align="top" onHide={() => setMenuVisible(false)} SetMenuControls={setMenuControls}>
        <MobileMenu menuControls={menuControls}/>
      </Modal>
    </>
  );
});

const Controls = observer(({
  player,
  title,
  titleIcon,
  contentTitle,
  contentSubtitle,
  showPlayPause = true,
  showTimer,
  showDetails
}) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if(!player) {
      return;
    }

    setMuted(player.controls.IsMuted());
    setPlaying(player.controls.IsPlaying());

    const Disposers = [
      player.controls.RegisterVideoEventListener("volumechange", () => setMuted(player.controls.IsMuted())),
      player.controls.RegisterVideoEventListener("playing", () => setPlaying(player.controls.IsPlaying())),
      player.controls.RegisterVideoEventListener("pause", () => setPlaying(player.controls.IsPlaying()))
    ];

    return () => Disposers.forEach(Disposer => Disposer?.());
  }, [!!player]);

  return (
    <>
      <div onClick={event => event.stopPropagation()} className={S("serial-video__controls-container")}>
        <div className={S("serial-video__title-container")}>
          {
            !showTimer ? null :
              <VideoTimer player={player} />
          }
          {
            !titleIcon?.url ? null :
              <HashedLoaderImage
                src={titleIcon.url}
                hash={titleIcon.hash}
                alt="Title Icon"
                className={S("serial-video__title-icon")}
              />
          }
          <div className={S("serial-video__title")}>
            {title}
          </div>
        </div>
        <div className={S("serial-video__controls")}>
          {
            !showPlayPause ? null :
              <button
                onClick={() => player?.controls?.TogglePlay()}
                className={S("serial-video__controls-button", "serial-video__controls-button--play")}
              >
                <SVG src={PauseIcon} className={S("serial-video__controls-button-icon", playing ? "serial-video__controls-button-icon--active" : "")}/>
                <SVG src={PlayIcon} className={S("serial-video__controls-button-icon", !playing ? "serial-video__controls-button-icon--active" : "")}/>
              </button>
          }
          <button
            onClick={() => player?.controls?.ToggleMuted()}
            className={S("serial-video__controls-button", "serial-video__controls-button--volume")}
          >
            <SVG src={VolumeOffIcon} className={S("serial-video__controls-button-icon", muted ? "serial-video__controls-button-icon--active" : "")}/>
            <SVG src={VolumeOnIcon} className={S("serial-video__controls-button-icon", !muted ? "serial-video__controls-button-icon--active" : "")}/>
          </button>
        </div>
      </div>
      {
        !showDetails ? null :
          <Details
            title={contentTitle}
            subtitle={contentSubtitle}
            playing={playing}
            SetPlaying={
              play => play ?
                player.controls?.Play() :
                player.controls?.Pause()
            }
          />
      }
    </>
  );
});

const SerialVideo = observer(({
  title,
  titleIcon,
  contentTitle,
  contentSubtitle,
  videoLink,
  videoLinkInfo,
  videoHash,
  playerOptions={},
  saveSettings=true,
  showPlayPause=true,
  showTimer=false,
  showDetails=false,
  muteIfNecessary,
  onProgress,
  onEnd,
  className=""
}) => {
  const [ref, setRef] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!player || !saveSettings) { return; }

    const Disposer = player.controls.RegisterVideoEventListener(
      "volumechange",
      () =>  {
        localStorage.setItem("serial-video-settings", JSON.stringify({muted: player.controls.IsMuted()}));
      }
    );

    return () => {
      Disposer?.();
    };
  }, [!!player, saveSettings]);

  useEffect(() => {
    if(!player || !onEnd) { return; }

    const Disposer = player.controls.RegisterVideoEventListener(
      "ended",
      () => setTimeout(onEnd, 1000)
    );

    return () => Disposer?.();
  }, [!!player, onEnd]);

  useEffect(() => {
    if(!player || !onProgress) {
      onProgress?.(0);
      return;
    }

    const interval = setInterval(() => onProgress(player.controls.GetCurrentTime() / (player.controls.GetDuration() || 1)), 500);

    return () => clearInterval(interval);
  }, [!!player, onProgress]);

  useEffect(() => {
    if(!ref) { return; }

    setLoading(true);

    let savedSettings = {};

    if(savedSettings) {
      try {
        savedSettings = JSON.parse(localStorage.getItem("serial-video-settings") || "{}");
      } catch(error) {
        console.error("Failed to load video settings", error);
        localStorage.removeItem("serial-video-settings");
      }
    }

    let playerPromise;
    const timeout = setTimeout(() => {
      playerPromise = InitializeEluvioPlayer(
        ref,
        {
          clientOptions: {
            client: rootStore.client
          },
          sourceOptions: {
            playoutParameters: {
              versionHash: videoHash || LinkTargetHash(videoLink),
              channel: videoLinkInfo?.composition_key,
              clipStart: videoLinkInfo?.clip_start_time,
              clipEnd: videoLinkInfo?.clip_end_time,
              offerings: playerOptions.offerings
            }
          },
          playerOptions: {
            maxBitrate: rootStore.isLocal ? 50000 : undefined,
            autoplay: EluvioPlayerParameters.autoplay.ON,
            capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize.ON,
            watermark: EluvioPlayerParameters.watermark.OFF,
            controls: EluvioPlayerParameters.controls.OFF,
            //keyboardControls: EluvioPlayerParameters.keyboardControls.OFF,
            showLoader: false,
            backgroundColor: "transparent",
            ...savedSettings,
            ...playerOptions,
            muted: (savedSettings?.muted ||playerOptions?.muted) ?
              // Mute if specified in component or muted by user
              EluvioPlayerParameters.muted.ON :
              // For things like ads, video must autoplay, may need to mute
              muteIfNecessary ? EluvioPlayerParameters.muted.OFF_IF_POSSIBLE :
                // Otherwise unmute
                EluvioPlayerParameters.muted.OFF,
            playerCallback: params => {
              playerOptions?.playerCallback?.(params);
              setPlayer(params.player);

              window.activeSerialPlayer = params.player;

              const Disposer = params.player.controls.RegisterVideoEventListener(
                "canplay",
                () => {
                  setLoading(false);
                  Disposer?.();
                }
              );
            }
          }
        }
      );
    }, 250);

    return async () => {
      clearTimeout(timeout);

      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [ref, videoLink, videoHash]);

  return (
    <div className={JoinClassNames(S("serial-video-container"), className)}>
      <div className={S("serial-video", loading ? "serial-video--loading" : "")} ref={setRef} />
      {
        loading ?
          <Loader className={S("serial-video__loader")} /> :
          <Controls
            title={title}
            titleIcon={titleIcon}
            contentTitle={contentTitle}
            contentSubtitle={contentSubtitle}
            showPlayPause={showPlayPause}
            showTimer={showTimer}
            showDetails={showDetails}
            player={player}
          />
      }
    </div>
  );
});

export default SerialVideo;
