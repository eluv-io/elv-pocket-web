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
  media = {};
  slugMap = {};
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

  get sidebarContent() {
    if(!this.pocket || !this.pocket.mediaLoaded) {
      return [];
    }

    return this.pocket.metadata.sidebar_config.tabs.map(tab => ({
      ...tab,
      groups: tab.groups.map(group => ({
        ...group,
        content: group.type === "automatic" ?
          this.FilteredMedia({select: group.select}) :
          group.content.map(mediaItemId => this.media[mediaItemId])
      }))
    }));
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

    let media = {};
    let slugMap = {};
    yield Promise.all(
      metadata.media_catalogs.map(async mediaCatalogId => {
        const info = await this.client.ContentObjectMetadata({
          versionHash: await this.client.LatestVersionHash({objectId: mediaCatalogId}),
          metadataSubtree: "/public/asset_metadata/info",
          select: [ "media", "slug_map" ],
          produceLinkUrls: true
        });

        media = {
          ...media,
          ...(info?.media || {})
        };

        slugMap = {
          ...slugMap,
          ...(info.slug_map || {})
        };
      })
    );

    // Determine permission ids and generate schedule info
    let permissionItemIds = [];
    Object.keys(media).forEach(mediaItemId => {
      media[mediaItemId] = {
        ...media[mediaItemId],
        scheduleInfo: this.MediaItemScheduleInfo(media[mediaItemId])
      };

      (media[mediaItemId].permissions || []).forEach(({permission_item_id}) =>
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
    this.media = media;
    this.pocket = {
      ...this.pocket,
      metadata,
      mediaLoaded: true,
      mediaLoadIndex: (this.pocket.mediaLoadIndex || 0) + 1
    };

    console.timeEnd("Load Media");
  });

  MediaItem(mediaItemSlugOrId) {
    const mediaItemId = this.slugMap[mediaItemSlugOrId] || mediaItemSlugOrId;

    return this.media[mediaItemId];
  }

  MediaItemPermissions(mediaItemSlugOrId) {
    const item = this.MediaItem(mediaItemSlugOrId);

    if(!item) { return; }

    let permissions = {
      authorized: (item?.permissions || []).length === 0,
      dvr: false,
      permissionItems: []
    };

    permissions.permissionItems = item.permissions
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

  FilteredMedia({select}) {
    let content = Object.values(this.media);

    // Schedule filter
    // Only videos can be filtered by schedule
    if(select.schedule) {
      const now = new Date();
      content = content.filter(mediaItem => {
        if(!mediaItem.live_video || mediaItem.media_type !== "Video" || !mediaItem.start_time) {
          return false;
        }

        const startTime = new Date(mediaItem.start_time);
        const endTime = mediaItem.end_time && new Date(mediaItem.end_time);

        const started = startTime < now;
        const ended = endTime < now;
        const afterStartLimit = !select.start_time || new Date(select.start_time) < startTime;
        const beforeEndLimit = !select.end_time || new Date(select.end_time) > startTime;

        switch(select.schedule) {
          case "live":
            return started && !ended;
          case "live_and_upcoming":
            return !ended && beforeEndLimit;
          case "upcoming":
            return !started && beforeEndLimit;
          case "past":
            return ended && afterStartLimit;
          case "period":
            return afterStartLimit && beforeEndLimit;
        }
      });
    }

    if(select.date) {
      const baseDate = select.date.split("T")[0];
      content = content.filter(mediaItem => mediaItem.date && mediaItem.date.split("T")[0] === baseDate);
    }

    if(select.tags?.length > 0) {
      content = content.filter(mediaItem =>
        !select.tags.find(tag => !mediaItem.tags.includes(tag))
      );
    }

    select.attributes?.forEach(attributeId => {
      content = content.filter(mediaItem =>
        mediaItem.attributes?.[attributeId]?.includes(select.attribute_values[attributeId])
      );
    });

    return content;
  }

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
