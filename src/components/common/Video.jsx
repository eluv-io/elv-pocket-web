import {mediaDisplayStore, rootStore} from "@/stores/index.js";
import {forwardRef, useEffect, useState} from "react";
import {EluvioPlayerParameters, InitializeEluvioPlayer} from "@eluvio/elv-player-js/lib/index";

import XIcon from "@/assets/icons/x.svg";
import SVG from "react-inlinesvg";
import {CreateModuleClassMatcher, LinkTargetHash} from "@/utils/Utils.js";

const S = CreateModuleClassMatcher();

const Video = forwardRef(function VideoComponent({
  videoHash,
  videoLink,
  videoLinkInfo,
  contentInfo={},
  playerOptions={},
  playoutParameters={},
  posterImage,
  isLive,
  callback,
  readyCallback,
  errorCallback,
  settingsUpdateCallback,
  endCallback,
  hideControls,
  showTitle,
  mute,
  mediaItemId,
  defaultStartTime,
  saveProgress=false,
  saveSettings=false,
  noReactiveMute=false,
  autoAspectRatio=true,
  onClick,
  onClose,
  className="",
  containerProps
}, ref) {
  const [contentHash, setContentHash] = useState(undefined);
  const [videoDimensions, setVideoDimensions] = useState(undefined);
  const [player, setPlayer] = useState(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const [targetRef, setTargetRef] = useState(undefined);
  const [settingsUpdateKey, setSettingsUpdateKey] = useState(0);
  const contentId = contentHash && rootStore.client.utils.DecodeVersionHash(contentHash).objectId;

  useEffect(() => {
    if(!saveSettings || !player) { return; }

    setTimeout(() => {
      localStorage.setItem("video-settings", JSON.stringify({muted: player.controls.IsMuted()}));
    }, 100);
  }, [saveSettings, settingsUpdateKey, !!player]);


  useEffect(() => {
    let versionHash = videoHash;
    if(videoLink) {
      versionHash = LinkTargetHash(videoLink) || videoHash;
    }

    rootStore.client.LatestVersionHash({versionHash})
      .then(setContentHash);
  }, [videoLink, videoHash, reloadKey]);

  useEffect(() => {
    if(!targetRef || !contentHash) { return; }

    if(player) {
      try {
        player.Destroy();
        setPlayer(undefined);
      } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }

    if(videoLinkInfo) {
      if(videoLinkInfo.type === "composition") {
        playoutParameters.channel = videoLinkInfo.composition_key;
      } else if(!isLive){
        playoutParameters.clipStart = videoLinkInfo.clip_start_time;
        playoutParameters.clipEnd = videoLinkInfo.clip_end_time;
      }
    }

    if(!player && saveSettings) {
      try {
        const savedSettings = JSON.parse(localStorage.getItem("video-settings") || "{}");

        mute = mute || savedSettings.muted;
      } catch(error) {
        console.error(error);
      }
    }


    let startTime;
    let startProgress = saveProgress && mediaDisplayStore.GetMediaProgress({mediaItemId});
    if(startProgress > 0.95) {
      startProgress = 0;
    }

    if(typeof startProgress !== "number" && defaultStartTime !== undefined) {
      startTime = defaultStartTime;
      startProgress = undefined;
    }

    InitializeEluvioPlayer(
      targetRef,
      {
        clientOptions: {
          client: rootStore.client
        },
        sourceOptions: {
          contentInfo: {
            ...contentInfo,
            type: EluvioPlayerParameters.type[isLive ? "LIVE" : "VOD"],
            posterImage
          },
          playoutParameters: {
            ...playoutParameters,
            versionHash: contentHash
          }
        },
        playerOptions: {
          muted: EluvioPlayerParameters.muted[mute ? "ON" : "OFF"],
          controls: EluvioPlayerParameters.controls[hideControls?.toLower === "off_with_volume_toggle" ? "OFF_WITH_VOLUME_TOGGLE" : (hideControls ? "OFF" : "AUTO_HIDE")],
          title: EluvioPlayerParameters.title[showTitle ? "ON" : "FULLSCREEN_ONLY"],
          maxBitrate: rootStore.isLocal ? 50000 : undefined,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: rootStore.appId,
          backgroundColor: "black",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          verifyContent: EluvioPlayerParameters.verifyContent.ON,
          capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize[rootStore.pageDimensions.width <= 720 ? "ON" : "OFF"],
          startProgress,
          startTime,
          errorCallback,
          // For live content, latest hash instead of allowing player to reload
          restartCallback: async () => {
            if(!isLive) { return false; }

            setContentHash(undefined);
            await new Promise(resolve => setTimeout(resolve, 15000));

            setReloadKey(reloadKey + 1);

            return true;
          },
          ...playerOptions
        }
      }
    ).then(player => {
      player.id = `${contentHash}-${Math.random()}`;

      window.players = {
        ...(window.players || {}),
        [contentId]: player
      };

      setPlayer(player);

      player.controls.RegisterVideoEventListener("canplay", event => {
        setVideoDimensions({width: event.target.videoWidth, height: event.target.videoHeight});
        readyCallback && readyCallback(player);
      });

      if(endCallback) {
        player.controls.RegisterVideoEventListener("ended", () => endCallback());
      }

      if(settingsUpdateCallback) {
        player.controls.RegisterSettingsListener(() => settingsUpdateCallback(player));
      }

      player.controls.RegisterVideoEventListener("volumechange", () => setSettingsUpdateKey(Math.random()));

      if(callback) {
        callback(player);
      }
    });
  }, [targetRef, contentId]);

  useEffect(() => {
    if(!player) { return; }

    player.playerOptions.controls = EluvioPlayerParameters.controls[hideControls ? "OFF" : "AUTO_HIDE"];
    player.playerOptions.title = EluvioPlayerParameters.title[showTitle ? "ON" : "FULLSCREEN_ONLY"];
  }, [hideControls, showTitle]);

  useEffect(() => {
    if(!player || noReactiveMute) { return; }

    try {
      const savedSettings = JSON.parse(localStorage.getItem("video-settings") || "{}");

      mute = mute || savedSettings.muted;
    } catch(error) {
      console.error(error);
    }

    if(mute) {
      player.__wasMuted = player.controls.IsMuted();
      player.controls.Mute();
    } else if(!player.__wasMuted) {
      player.controls.Unmute();
    }
  }, [mute]);

  useEffect(() => {
    if(!saveProgress || isLive || !player || !mediaItemId) {
      return;
    }

    const SaveProgress = () => {
      const progress = player.controls.GetCurrentTime() / player.controls.GetDuration();

      if(progress && !isNaN(progress) && progress !== mediaDisplayStore.GetMediaProgress({mediaItemId})) {
        mediaDisplayStore.SetMediaProgress({
          mediaItemId,
          progress
        });
      }
    };

    const progressInterval = setInterval(SaveProgress, 30 * 1000);

    return () => {
      clearInterval(progressInterval);

      SaveProgress();
    };
  }, [player]);

  useEffect(() => {
    return () => {
      if(!player) { return; }

      try {
        player.Destroy();
      } catch(error) {
        console.error(error);
      }

      delete window.players[contentId];
    };
  }, [player]);

  return (
    <div
      {...(containerProps || {})}
      ref={ref}
      className={[S("video"), className].join(" ")}
      onClick={onClick}
      style={
        !autoAspectRatio ? containerProps?.style || {} :
          {
            ...(containerProps?.style || {}),
            aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`
          }
      }
    >
      <div ref={setTargetRef} />
      {
        !onClose ? null :
          <button onClick={() => onClose()} className={S("video__close")}>
            <SVG src={XIcon} />
          </button>
      }
    </div>
  );
});

export default Video;
