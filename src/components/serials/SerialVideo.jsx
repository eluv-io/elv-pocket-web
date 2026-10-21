import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {useEffect, useState} from "react";
import {rootStore, pocketStore} from "@/stores";
import {observer} from "mobx-react-lite";
import {Copy, CreateModuleClassMatcher, JoinClassNames, LinkTargetHash} from "@/utils/Utils.js";
import SVG from "react-inlinesvg";
import {
  Loader,
  SerialTitle
} from "@/components/common/Common.jsx";
import {MobileMenu} from "@/components/pocket/Header.jsx";
import Modal from "@/components/common/Modal.jsx";
import {useParams} from "wouter";
import UrlJoin from "url-join";

import VolumeOffIcon from "@/assets/icons/volume-off.svg";
import VolumeOnIcon from "@/assets/icons/volume-high.svg";
import PlayIcon from "@/assets/icons/play.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import MenuIcon from "@/assets/icons/menu.svg";
import ShareIcon from "@/assets/icons/share.svg";
import CopyIcon from "@/assets/icons/copy.svg";
import SwipeIcon from "@/assets/icons/swipe-icon.svg";


const S = CreateModuleClassMatcher(SerialStyles);

let swipeMessageShown = false;
const SwipeMessage = observer(() => {
  const [ref, setRef] = useState(undefined);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if(!ref) { return; }

    const nodes = Array.from(ref?.querySelectorAll(`.${S("swipe-message")}`) || []);

    const delay = nodes.length === 3 ? 3000 : 6000;
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
        await new Promise(resolve => setTimeout(resolve, delay));
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

const Details = observer(({title, subtitle, ready}) => {
  const {pocketSlugOrId, serialSlugOrId} = useParams();
  const [menuControls, setMenuControls] = useState(undefined);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [showCopyIcon, setShowCopyIcon] = useState(false);

  useEffect(() => {
    if(shareMenuVisible) {
      rootStore.SetModalOpened();
    } else {
      rootStore.SetModalClosed();
    }
  }, [shareMenuVisible]);

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
              if(shareMenuVisible) { return; }

              const url = new URL(window.location.origin);
              url.pathname = UrlJoin("/", pocketSlugOrId, "s", serialSlugOrId);
              try {
                setShareMenuVisible(true);

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
                setShareMenuVisible(false);
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
            onClick={() => menuControls.Show()}
            className={S("serial-video__detail-button", "serial-video__detail-button--menu")}
          >
            <SVG src={MenuIcon}/>
          </button>
        </div>
        {
          !ready ? null :
            <SwipeMessage />
        }
      </div>
      <Modal align="top" SetMenuControls={setMenuControls}>
        <MobileMenu showItems={false} menuControls={menuControls}/>
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
  showPlayPause = true,
  showTimer,
  showAudio,
  showDetails,
  playing,
  muted,
  ready
}) => {
  return (
    <div className={S("serial-video__controls-overlay")}>
      <SerialTitle
        title={title}
        titleIcon={titleIcon}
        subtitle={subtitle}
        showTimer={showTimer}
        player={showTimer && player}
        onClick={event => event.stopPropagation()}
      >
        <div className={S("serial-video__controls", !ready ? "serial-video__controls--hidden" : "")}>
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
      </SerialTitle>
      {
        !showPlayPause ? null :
          <button
            onClick={() => player?.controls?.Play()}
            className={S("serial-video__big-play-button", !ready || playing || rootStore.activeModals > 0 ? "serial-video__big-play-button--hidden" : "")}
          >
            <SVG src={PlayIcon} />
          </button>
      }
      {
        !showDetails ? null :
          <Details
            title={contentTitle}
            subtitle={contentSubtitle}
            ready={ready}
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

    setWasPlaying(wasPlaying || player.controls.IsPlaying());
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

  // Pause / Resume automatically when menus are opened
  useEffect(() => {
    rootStore.activeModals ? Pause() : Resume();
  }, [rootStore.activeModals, state]);

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
      () => {
        onEnd?.();
        setState("ended");
      }
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
    const key = `Video Load ${videoHash || LinkTargetHash(videoLink)}`;
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

              setMuted(player.controls.IsMuted());
              setPlaying(player.controls.IsPlaying());

              const Disposers = [
                player.controls.RegisterVideoEventListener("volumechange", () => setMuted(player.controls.IsMuted())),
                player.controls.RegisterVideoEventListener("playing", () => setPlaying(player.controls.IsPlaying())),
                player.controls.RegisterVideoEventListener("pause", () => setPlaying(player.controls.IsPlaying())),
                player.controls.RegisterVideoEventListener(
                "loadeddata",
                  event => {
                    const video = event.target;
                    const hasAudio =
                      (video.audioTracks && video.audioTracks.length > 0) || // Standard API
                      video.mozHasAudio ||                                  // Firefox fallback
                      Boolean(video.webkitAudioDecodedByteCount);           // Chrome/Webkit fallback

                    setHasAudio(hasAudio);
                  }),
                player.controls.RegisterVideoEventListener(
                  "canplay",
                  () => {
                    console.timeEnd(key);
                    clearTimeout(showLoaderTimeout);
                    setState("ready");
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
            null
      }
      <Controls
        title={title}
        titleIcon={titleIcon}
        subtitle={subtitle}
        contentTitle={contentTitle}
        contentSubtitle={contentSubtitle}
        showPlayPause={showPlayPause || !playing && state === "ready"}
        showTimer={showTimer}
        showDetails={showDetails}
        showAudio={hasAudio}
        player={player}
        playing={playing}
        muted={muted}
        ready={state === "ready"}
      />
    </div>
  );
});

export default SerialVideo;
