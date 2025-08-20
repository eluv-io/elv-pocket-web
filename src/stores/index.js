import {makeAutoObservable, flow} from "mobx";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/index.js";

class RootStore {
  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;

  client;
  walletClient;
  pocket;
  initialized = false;
  mnemonic = localStorage.getItem("mn");

  pageDimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  get mobile() {
    return this.pageDimensions.width < 600;
  }

  get media() {
    if(!this.pocket || !this.pocket.mediaLoaded) { return []; }

    return Object.keys(this.pocket.metadata.media).map(pocketMediaId => ({
      ...this.pocket.metadata.media[pocketMediaId],
      pocketMediaId
    }))
      .sort((a, b) => {
        let titleComparison = (a.display.catalog_title || a.display.title) < (b.display.catalog_title || b.display.title) ? -1 : 1;
        let scheduleComparison = 0;
        let timeComparison = 0;

        // For live comparison, regardless of direction we want live content to show first, followed by vod content
        if(a.display.live_video) {
          if(b.display.live_video) {
            timeComparison =
              a.display.start_time === b.display.start_time ? titleComparison :
                a.display.start_time < b.display.start_time ? -1 : 1;
          } else {
            timeComparison = -1;
            scheduleComparison = -1;
          }
        } else if(b.display.live_video) {
          scheduleComparison = 1;
          timeComparison = 1;
        }

        switch(this.pocket.metadata.sidebar_config.sort_order) {
          case "title_asc":
            return titleComparison;
          case "title_desc":
            return -1 * titleComparison;
          case "time_desc":
            return scheduleComparison || (-1 * timeComparison) || titleComparison;
          // "time_asc" is the default case
          default:
            return scheduleComparison || timeComparison || titleComparison;
        }
      });
  }

  get splashImage() {
    const backgroundKey = this.mobile && this.pocket.metadata.splash_screen_background_mobile ?
      "splash_screen_background_mobile" :
      "splash_screen_background";

    return {
      url: this.pocket?.metadata?.[backgroundKey]?.url,
      hash: this.pocket?.metadata?.[`${backgroundKey}_hash`],
    }
  }

  PocketMediaItem(pocketMediaSlugOrId) {
    pocketMediaSlugOrId = this.pocket.metadata.media_slug_map[pocketMediaSlugOrId] || pocketMediaSlugOrId;

    return this.pocket.metadata.media[pocketMediaSlugOrId];
  }

  constructor() {
    makeAutoObservable(this);
  }

  InitializeClient = flow(function * () {
    console.time("init");
    const walletClient = yield ElvWalletClient.Initialize({
      appId: "pocket",
      network: EluvioConfiguration.network,
      mode: EluvioConfiguration.mode
    })

    this.walletClient = walletClient;
    this.client = walletClient.client;
    console.timeEnd("init")
  });

  LoadPocket = flow(function * ({pocketSlugOrId}) {
    yield this.InitializeClient();
    console.time("Load")
    const versionHash = yield this.client.LatestVersionHash({objectId: pocketSlugOrId});

    const metadata = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "/public/asset_metadata/info",
      produceLinkUrls: true
    })

    this.pocket = {
      objectId: pocketSlugOrId,
      versionHash,
      metadata
    };

    console.timeEnd("Load")

    console.time("Load Media")
    this.LoadMedia()
      .then(() => console.timeEnd("Load Media"))

    setTimeout(() => this.GenerateKey(), 2000);

    return this.pocket;
  });

  LoadMedia = flow(function * () {
    const metadata = {...this.pocket.metadata};
    // TODO: Versioned media, maybe build media into pocket
    const mediaIds = Object.keys(metadata.media || {})
      .map(pocketMediaId =>
        metadata.media[pocketMediaId].media_id
      )
      .filter(t => t)
      .filter((v, i, a) => a.indexOf(v) === i);

    let allMedia = {};
    yield Promise.all(
      metadata.media_catalogs.map(async mediaCatalogId => {
        const media = await this.client.ContentObjectMetadata({
          versionHash: await this.client.LatestVersionHash({objectId: mediaCatalogId}),
          metadataSubtree: "/public/asset_metadata/info/media",
          select: mediaIds,
          produceLinkUrls: true
        })

        Object.keys(media || {}).forEach(mediaId =>
          allMedia[mediaId] = media[mediaId]
        )
      })
    );

    Object.keys(metadata.media).forEach(pocketMediaId => {
      const mediaItem = allMedia[metadata.media[pocketMediaId].media_id];
      metadata.media[pocketMediaId].mediaItem = mediaItem;
      metadata.media[pocketMediaId].scheduleInfo = this.MediaItemScheduleInfo(mediaItem);

      if(metadata.media[pocketMediaId].use_media_settings) {
        metadata.media[pocketMediaId].display = mediaItem;
      }
    });

    this.pocket = {
      ...this.pocket,
      metadata,
      mediaLoaded : true
    };
  });

  MediaItemScheduleInfo(mediaItem) {
    const isLiveVideoType =
      mediaItem &&
      mediaItem?.type === "media" &&
      mediaItem.media_type === "Video" &&
      mediaItem.live_video;

    if(!isLiveVideoType) {
      return {
        isLiveContent: false
      };
    }

    try {
      const now = new Date();
      const startTime = !!mediaItem.start_time && new Date(mediaItem.start_time);
      console.log(startTime);
      const streamStartTime = (!!mediaItem.stream_start_time && new Date(mediaItem.stream_start_time)) || startTime;
      const endTime = !!mediaItem.end_time && new Date(mediaItem.end_time);
      const started = !streamStartTime || now > streamStartTime;
      const ended = !!endTime && now > endTime;
      const displayStartDate = startTime?.toLocaleDateString?.(this.preferredLocale, {day: "numeric", month: "numeric"}).replace(/0(\d)/g, "$1");
      const displayStartDateLong = startTime?.toLocaleDateString?.(this.preferredLocale, {day: "numeric", month: "short"}).replace(/0(\d)/g, "$1");
      const displayStartTime = startTime?.toLocaleTimeString?.(this.preferredLocale, {hour: "numeric"}).replace(/^0(\d)/, "$1");

      return {
        startTime,
        streamStartTime,
        endTime,
        isLiveContent: true,
        currentlyLive: started && !ended,
        started,
        ended,
        displayStartDate,
        displayStartDateLong,
        displayStartTime
      };
    } catch(error) {

      console.error(`Error parsing start/end time in media item ${mediaItem.name}`);

      console.error(error);

      console.error(mediaItem);

      return {
        isLiveContent: false
      };
    }
  };

  GenerateKey() {
    const wallet = this.client.GenerateWallet();
    const mnemonic = this.mnemonic || wallet.GenerateMnemonic();
    const signer = wallet.AddAccountFromMnemonic({mnemonic});

    this.mnemonic = mnemonic;
    this.signer = signer;

    localStorage.setItem("mn", mnemonic);


    this.initialized = true;
    console.timeEnd("Generate")
  }

  UpdatePageDimensions() {
    this.pageDimensions = { width: window.innerWidth, height: window.innerHeight };

    document.documentElement.style.setProperty("--vw", `${window.innerWidth * 0.01}px`);
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }
}

export const rootStore = new RootStore();
window.rootStore = rootStore;
