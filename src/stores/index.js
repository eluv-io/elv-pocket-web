import {makeAutoObservable, flow} from "mobx";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/index.js";
import PaymentStore from "@/stores/PaymentStore.js";

console.time("Initial Load");

class RootStore {
  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;
  preferredCurrency = "USD";
  currency = "USD";

  client;
  walletClient;
  pocket;
  initialized = false;
  contentEnded = false;
  permissionItems = {};

  pageDimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  backAction = undefined;

  get mobile() {
    return this.pageDimensions.width < 1000;
  }

  get mobileLandscape() {
    return this.mobile && (this.pageDimensions.width / this.pageDimensions.height > 1.2);
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
    };
  }

  get banners() {
    return (this.pocket?.metadata?.sidebar_config?.banners || [])
      .filter(banner => banner.image);
  }

  get hasTopBanners() {
    return this.banners
      .filter(banner => banner.mobile_position === "above")
      .length > 0;
  }
  constructor() {
    makeAutoObservable(this);

    this.paymentStore = new PaymentStore(this);
  }

  SetContentEnded(ended) {
    this.contentEnded = ended;
  }

  InitializeClient = flow(function * () {
    console.time("Initialize Client");
    const walletClient = yield ElvWalletClient.Initialize({
      appId: "pocket",
      network: EluvioConfiguration.network,
      mode: EluvioConfiguration.mode
    });

    this.walletClient = walletClient;
    this.client = walletClient.client;
    console.timeEnd("Initialize Client");
  });

  LoadPocket = flow(function * ({pocketSlugOrId, force=false}) {
    if(this.loading && !force) { return; }

    this.loading = true;
    this.initialized = false;

    yield this.InitializeClient();
    const versionHash = yield this.client.LatestVersionHash({objectId: pocketSlugOrId});

    const metadata = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "/public/asset_metadata/info",
      produceLinkUrls: true
    });

    this.pocket = {
      objectId: pocketSlugOrId,
      versionHash,
      metadata
    };

    console.timeEnd("Initial Load");

    yield Promise.all([
      new Promise(resolve => setTimeout(resolve, 3000)),
      this.LoadMedia()
    ]);

    this.initialized = true;
    this.loading = false;

    return this.pocket;
  });

  LoadMedia = flow(function * () {
    console.time("Generate Key");
    yield this.GenerateKey();
    console.timeEnd("Generate Key");

    console.time("Load Media");

    const metadata = {...this.pocket.metadata};
    // TODO: Versioned media, maybe build media into pocket
    const mediaIds = Object.keys(metadata.media || {})
      .map(pocketMediaId => metadata.media[pocketMediaId].media_id)
      .filter(t => t)
      .filter((v, i, a) => a.indexOf(v) === i);

    // Load media
    let allMedia = {};
    yield Promise.all(
      metadata.media_catalogs.map(async mediaCatalogId => {
        const media = await this.client.ContentObjectMetadata({
          versionHash: await this.client.LatestVersionHash({objectId: mediaCatalogId}),
          metadataSubtree: "/public/asset_metadata/info/media",
          select: mediaIds,
          produceLinkUrls: true
        });

        Object.keys(media || {}).forEach(mediaId =>
          allMedia[mediaId] = media[mediaId]
        );
      })
    );

    // Determine permission ids
    let permissionItemIds = [];
    Object.keys(metadata.media).forEach(pocketMediaId => {
      const mediaItem = allMedia[metadata.media[pocketMediaId].media_id];
      metadata.media[pocketMediaId].mediaItem = mediaItem;
      metadata.media[pocketMediaId].scheduleInfo = this.MediaItemScheduleInfo(mediaItem);

      if(metadata.media[pocketMediaId].use_media_settings) {
        metadata.media[pocketMediaId].display = mediaItem;
      }

      (mediaItem.permissions || []).forEach(({permission_item_id}) =>
        !permissionItemIds.includes(permission_item_id) && permissionItemIds.push(permission_item_id)
      );
    });

    // Load permission items and determine marketplaces
    let allPermissionItems = {};
    let allMarketplaceIds = [];
    yield Promise.all(
      metadata.permission_sets.map(async permissionSetId => {
        const permissionItems = await this.client.ContentObjectMetadata({
          versionHash: await this.client.LatestVersionHash({objectId: permissionSetId}),
          metadataSubtree: "/public/asset_metadata/info/permission_items",
          select: permissionItemIds,
          produceLinkUrls: true
        });

        Object.keys(permissionItems || {}).forEach(permissionItemId => {
          allPermissionItems[permissionItemId] = permissionItems[permissionItemId];
          const marketplaceId = permissionItems[permissionItemId].marketplace?.marketplace_id;
          !allMarketplaceIds.includes(marketplaceId) && allMarketplaceIds.push(marketplaceId);
        });
      })
    );

    let allMarketplaces = {};
    yield Promise.all(
      allMarketplaceIds.map(async marketplaceId => {
        allMarketplaces[marketplaceId] = await this.walletClient.LoadMarketplace({marketplaceId});

        allMarketplaces[marketplaceId].ownedItems = (await this.walletClient.UserItems({
          userAddress: this.client.CurrentAccountAddress(),
          marketplaceId,
          limit: 1000
        })).results || [];
      })
    );

    Object.keys(allPermissionItems).forEach(permissionItemId => {
      const permissionItem = allPermissionItems[permissionItemId];
      const marketplace = allMarketplaces[permissionItem.marketplace.marketplace_id];
      const marketplaceItem = marketplace.items.find(item => item.sku === permissionItem.marketplace_sku);
      allPermissionItems[permissionItemId].marketplaceItem = marketplaceItem;
      allPermissionItems[permissionItemId].owned = !!marketplace.ownedItems
        .find(({contractAddress}) =>
          this.client.utils.EqualAddress(
            contractAddress,
            marketplaceItem.nftTemplateMetadata.address
          )
        );
    });

    this.permissionItems = allPermissionItems;

    this.pocket = {
      ...this.pocket,
      metadata,
      mediaLoaded: true,
      mediaLoadIndex: (this.pocket.mediaLoadIndex || 0) + 1
    };

    console.timeEnd("Load Media");
  });

  PocketMediaItem(pocketMediaSlugOrId) {
    pocketMediaSlugOrId = this.pocket.metadata.media_slug_map[pocketMediaSlugOrId] || pocketMediaSlugOrId;

    return this.pocket.metadata.media[pocketMediaSlugOrId];
  }

  PocketMediaItemPermissions(pocketMediaSlugOrId) {
    const item = this.PocketMediaItem(pocketMediaSlugOrId);

    if(!item.mediaItem) { return; }

    let permissions = {
      authorized: (item.mediaItem?.permissions || []).length === 0,
      dvr: false,
      permissionItems: []
    };

    permissions.permissionItems = item.mediaItem.permissions
      .map(({permission_item_id}) => {
        if(!permission_item_id || !this.permissionItems[permission_item_id]) {
          return;
        }

        if(this.permissionItems[permission_item_id].owned) {
          permissions.authorized = true;

          if(this.permissionItems[permission_item_id].dvr) {
            permissions.dvr = true;
          }
        }

        return this.permissionItems[permission_item_id];
      })
      .filter(permission => permission)
      .sort((i1, i2) => {
        if(typeof i1.priority === "undefined" && typeof i2.priority === "undefined") {
          return 0;
        } else if(typeof i2.priority === "undefined") {
          return -1;
        } else if(typeof i1.priority === "undefined") {
          return 1;
        }

        return i1.priority < i2.priority ? -1 : 1;
      });

    return permissions;
  }

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

  GenerateKey = flow(function * () {
    const wallet = this.client.GenerateWallet();

    if(localStorage.getItem("pk")?.toLowerCase() === this.client.defaultKey?.toLowerCase()) {
      // Ensure saved PK is not default key
      localStorage.removeItem("pk");
    }

    let signer;
    if(localStorage.getItem("pk")) {
      signer = wallet.AddAccount({privateKey: localStorage.getItem("pk")});
    } else {
      const mnemonic = wallet.GenerateMnemonic();
      signer = wallet.AddAccountFromMnemonic({mnemonic});
    }

    this.client.SetSigner({signer});
    localStorage.setItem("pk", signer._signingKey().privateKey);

    const fabricToken = yield this.client.CreateFabricToken({
      duration: 48 * 60 * 60 * 1000
    });

    this.walletClient.SetAuthorization({
      fabricToken,
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
      walletType: "LocalKey",
      walletName: "LocalKey"
    });

    this.client.SetStaticToken({token: fabricToken});

    console.timeEnd("Generate");
  });

  UpdatePageDimensions() {
    this.pageDimensions = { width: window.innerWidth, height: window.innerHeight };

    document.documentElement.style.setProperty("--vw", `${window.innerWidth * 0.01}px`);
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }

  ResetAccount() {
    localStorage.removeItem("pk");

    setTimeout(() => {
      const url = new URL(window.location.href);
      if(url.pathname.includes("clear")) {
        url.pathname = "/";
      }

      setTimeout(() => window.location.href = url.toString(), 2000);
    });
  }

  GoBack() {
    if(this.backAction) {
      this.backAction();
    }

    this.backAction = undefined;
  }

  SetBackAction(action) {
    this.backAction = action;
  }
}

export const rootStore = new RootStore();
export const paymentStore = rootStore.paymentStore;

window.rootStore = rootStore;
