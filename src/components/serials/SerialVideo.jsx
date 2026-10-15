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

  if(
    !player ||
    !player?.controls?.GetDuration?.() ||
    player?.controls?.GetDuration?.() < 7
  ) { return; }

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
    const Scroll = (item, behavior) => {
      if(!item) { return; }

      item.parentElement.scrollTo({
        left: item.getBoundingClientRect().left - item.parentElement.getBoundingClientRect().left + item.parentElement.scrollLeft,
        behavior
      });
    };

    (async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      Scroll(nodes?.[0], "instant");

      for(let i = 1; i < nodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        Scroll(nodes[i], "smooth");

        if(i >= nodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setHidden(true);
          setTimeout(() => swipeMessageShown = true, 1000);
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

const Details = observer(({title, subtitle, Pause, Resume}) => {
  const [menuControls, setMenuControls] = useState(undefined);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCopyIcon, setShowCopyIcon] = useState(false);

  useEffect(() => {
    menuVisible ? Pause() : Resume();
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
  subtitle,
  contentTitle,
  contentSubtitle,
  showPlayPause=true,
  showTimer,
  showAudio,
  showDetails,
  playing,
  muted,
  Pause,
  Resume
}) => {
  return (
    <div className={S("serial-video__controls-overlay")}>
      <div onClick={event => event.stopPropagation()} className={S("serial-video__controls-container")}>
        <div className={S("serial-video__text")}>
          <div className={S("serial-video__title-container")}>
            {
              !showTimer ? null :
                <VideoTimer player={player}/>
            }
            {
              !titleIcon?.url ? null :
                <HashedLoaderImage
                  src={titleIcon.url}
                  alt="Title Icon"
                  className={S("serial-video__title-icon")}
                />
            }
            <div className={S("serial-video__title")}>
              {title}
            </div>
          </div>
          {
            !subtitle ? null :
              <div className={S("serial-video__subtitle")}>
                {subtitle}
              </div>
          }
        </div>
        <div className={S("serial-video__controls")}>
          {
            !showPlayPause ? null :
              <button
                onClick={() => player?.controls?.TogglePlay()}
                className={S("serial-video__controls-button", "serial-video__controls-button--play")}
              >
                <SVG src={PauseIcon}
                     className={S("serial-video__controls-button-icon", playing ? "serial-video__controls-button-icon--active" : "")}/>
                <SVG src={PlayIcon}
                     className={S("serial-video__controls-button-icon", !playing ? "serial-video__controls-button-icon--active" : "")}/>
              </button>
          }
          {
            !showAudio ? null :
              <button
                onClick={() => player?.controls?.ToggleMuted()}
                className={S("serial-video__controls-button", "serial-video__controls-button--volume")}
              >
                <SVG src={VolumeOffIcon}
                     className={S("serial-video__controls-button-icon", muted ? "serial-video__controls-button-icon--active" : "")}/>
                <SVG src={VolumeOnIcon}
                     className={S("serial-video__controls-button-icon", !muted ? "serial-video__controls-button-icon--active" : "")}/>
              </button>
          }
        </div>
      </div>
      {
        !showDetails ? null :
          <Details
            title={contentTitle}
            subtitle={contentSubtitle}
            Pause={Pause}
            Resume={Resume}
          />
      }
    </div>
  );
});

let autohideTimeout;
const SerialVideo = observer(({
  title,
  titleIcon,
  subtitle,
  contentTitle,
  contentSubtitle,
  videoLink,
  videoLinkInfo,
  videoHash,
  playerOptions={},
  saveSettings=true,
  autohideControls,
  showPlayPause=true,
  showTimer=false,
  showDetails=false,
  muteIfNecessary,
  onProgress,
  onEnd,
  pause,
  className=""
}) => {
  const [ref, setRef] = useState(null);
  const [player, setPlayer] = useState(null);
  const [state, setState] = useState("initial");
  const [hasAudio, setHasAudio] = useState(false);
  const [autohide, setAutohide] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);

  const Pause = () => {
    if(!player) { return; }

    setWasPlaying(player.controls.IsPlaying());
    player.controls.Pause();
  };

  const Resume = () => {
    if(!player || !wasPlaying) { return; }

    setWasPlaying(false);
    player.controls.Play();
  };

  const PokeAutohide = () => {
    if(!autohideControls) { return; }

    clearTimeout(autohideTimeout);
    setAutohide(false);

    autohideTimeout = setTimeout(() => setAutohide(true), 8000);
  };

  // Pause / Resume based on pause param
  useEffect(() => {
    pause ? Pause() : Resume();
  }, [pause, state]);

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

    const Disposer = player.controls.RegisterVideoEventListener("ended", onEnd);

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

    const showLoaderTimeout = setTimeout(() => setState("loading"), 2000);

    let savedSettings = {};

    if(savedSettings) {
      try {
        savedSettings = JSON.parse(localStorage.getItem("serial-video-settings") || "{}");
      } catch(error) {
        console.error("Failed to load video settings", error);
        localStorage.removeItem("serial-video-settings");
      }
    }

    let playerPromise, unmounted;
    const key = `Video Load ${(Math.random() * 1000).toFixed(0)}`;
    const timeout = setTimeout(() => {
      if(unmounted) { return; }

      console.time(key);
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
              muteIfNecessary ?
                EluvioPlayerParameters.muted.OFF_IF_POSSIBLE :
                // Otherwise unmute
                EluvioPlayerParameters.muted.OFF,
            playerCallback: params => {
              if(unmounted) {
                return;
              }

              const player = params.player;
              playerOptions?.playerCallback?.(params);
              setPlayer(player);

              window.activeSerialPlayer = player;

              PokeAutohide();

              const Disposer =

              player.controls.RegisterVideoEventListener(
                "loadeddata",
                event => {
                  const video = event.target;
                  const hasAudio =
                    (video.audioTracks && video.audioTracks.length > 0) || // Standard API
                    video.mozHasAudio ||                                  // Firefox fallback
                    Boolean(video.webkitAudioDecodedByteCount);           // Chrome/Webkit fallback

                  setHasAudio(hasAudio);
                });

              setMuted(player.controls.IsMuted());
              setPlaying(player.controls.IsPlaying());

              const Disposers = [
                player.controls.RegisterVideoEventListener("volumechange", () => setMuted(player.controls.IsMuted())),
                player.controls.RegisterVideoEventListener("playing", () => setPlaying(player.controls.IsPlaying())),
                player.controls.RegisterVideoEventListener("pause", () => setPlaying(player.controls.IsPlaying())),
                player.controls.RegisterVideoEventListener(
                  "canplay",
                  () => {
                    console.timeEnd(key);
                    clearTimeout(showLoaderTimeout);
                    setState("ready");
                    Disposer?.();
                  }
                )
              ];

              return () => Disposers.forEach(Disposer => Disposer?.());
            }
          }
        }
      );
    }, 350);

    return async () => {
      clearTimeout(timeout);

      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [ref, videoLink, videoHash]);

  return (
    <div
      onClick={PokeAutohide}
      onMouseMove={PokeAutohide}
      onDrag={PokeAutohide}
      onDragStart={PokeAutohide}
      className={JoinClassNames(S("serial-video-container", playing && autohide ? "serial-video-container--autohide" : ""), className)}
    >
      <div className={S("serial-video", state !== "ready" ? "serial-video--loading" : "")} ref={setRef} />
      {
        state === "initial" ? null :
          state === "loading" ?
            <Loader className={S("serial-video__loader")} /> :
            <Controls
              title={title}
              titleIcon={titleIcon}
              subtitle={subtitle}
              contentTitle={contentTitle}
              contentSubtitle={contentSubtitle}
              showPlayPause={showPlayPause || !playing}
              showTimer={showTimer}
              showDetails={showDetails}
              showAudio={hasAudio}
              player={player}
              playing={playing}
              muted={muted}
              Pause={Pause}
              Resume={Resume}
            />
      }
    </div>
  );
});

export default SerialVideo;
