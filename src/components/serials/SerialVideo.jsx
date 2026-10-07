import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {useEffect, useState} from "react";
import {rootStore} from "@/stores";
import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames, LinkTargetHash} from "@/utils/Utils.js";

import VolumeOffIcon from "@/assets/icons/volume-off.svg";
import VolumeOnIcon from "@/assets/icons/volume-high.svg";

import PlayIcon from "@/assets/icons/play.svg";
import PauseIcon from "@/assets/icons/pause.svg";
import SVG from "react-inlinesvg";
import {ControlledCircleTimer, HashedLoaderImage, Loader} from "@/components/common/Common.jsx";

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

const Controls = observer(({player, title, titleIcon, showPlayPause=true, showTimer}) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if(!player) { return; }

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
  );
});

const SerialVideo = observer(({
  title,
  titleIcon,
  videoLink,
  videoLinkInfo,
  videoHash,
  playerOptions={},
  saveSettings=true,
  showPlayPause=true,
  showTimer=false,
  muteIfNecessary,
  onProgress,
  onEnd,
  className = ""
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
            showPlayPause={showPlayPause}
            showTimer={showTimer}
            player={player}
          />
      }
    </div>
  );
});

export default SerialVideo;
