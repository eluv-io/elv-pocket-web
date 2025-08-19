import React, {forwardRef, useEffect, useState} from "react";
import {rootStore} from "@/stores";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";
import {CreateModuleClassMatcher, LinkTargetHash} from "@/utils/Utils.js";

const S = CreateModuleClassMatcher();

const Video = forwardRef(function VideoComponent({
  videoHash,
  videoLink,
  contentInfo={},
  playerOptions={},
  playoutParameters={},
  posterImage,
  isLive,
  callback,
  readyCallback,
  errorCallback,
  settingsUpdateCallback,
  autoAspectRatio=true,
  className="",
  containerProps
}, ref) {
  console.log(isLive)
  const [videoDimensions, setVideoDimensions] = useState(undefined);
  const [player, setPlayer] = useState(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const [contentHash, setContentHash] = useState(undefined);
  const [targetRef, setTargetRef] = useState(undefined);

  useEffect(() => {
    if(videoLink) {
      videoHash = LinkTargetHash(videoLink) || videoHash;
    }

    rootStore.client.LatestVersionHash({versionHash: videoHash})
      .then(setContentHash);
  }, [videoLink, videoHash, reloadKey]);

  useEffect(() => {
    return () => {
      if(!player) { return; }

      try {
        player.Destroy();
        delete window.players?.[contentHash];
      } catch(error) {

        console.log(error);
      }
    };
  }, [player]);

  useEffect(() => {
    if(!targetRef || !contentHash) { return; }

    if(player) {
      try {
        player.Destroy();
        setPlayer(undefined);
      } catch(error) {

        console.log(error);
      }
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
          },
        },
        playerOptions: {
          showLoader: EluvioPlayerParameters.showLoader.OFF,
          muted: EluvioPlayerParameters.muted.OFF,
          controls: EluvioPlayerParameters.controls.AUTO_HIDE,
          //maxBitrate: 50000,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: "Eluvio Pocket TV",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          verifyContent: EluvioPlayerParameters.verifyContent.ON,
          backgroundColor: "black",
          capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize[rootStore.mobile ? "ON" : "OFF"],
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
      window.players = {
        ...(window.players || {}),
        [contentHash]: player,
      };

      setPlayer(player);

      player.controls.RegisterVideoEventListener("canplay", event => {
        setVideoDimensions({width: event.target.videoWidth, height: event.target.videoHeight});
        readyCallback && readyCallback(player);
      });

      if(settingsUpdateCallback) {
        player.controls.RegisterSettingsListener(() => settingsUpdateCallback(player));
      }

      if(callback) {
        callback(player);
      }
    });
  }, [targetRef, contentHash]);

  return (
    <div
      {...(containerProps || {})}
      ref={ref}
      className={[S("video"), className].join(" ")}
      style={
        !autoAspectRatio ? containerProps?.style || {} :
          {
            ...(containerProps?.style || {}),
            aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`
          }
      }
    >
      <div ref={setTargetRef} />
    </div>
  );
});

export default Video;
