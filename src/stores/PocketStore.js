import {makeAutoObservable, flow} from "mobx";

console.time("Initial Load");

class PocketStore {
  media = {};
  slugMap = {};
  contentEnded = false;
  pocket;
  permissionItems = {};

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  get mobile() {
    return this.rootStore.mobile;
  }

  get mobileLandscape() {
    return this.rootStore.mobileLandscape;
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

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
  }

  SetContentEnded(ended) {
    this.contentEnded = ended;
  }

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

    if(!select.sort_order) { return content; }

    return content.sort((a, b) => {
      let titleComparison = (a.catalog_title || a.title) < (b.catalog_title || b.title) ? -1 : 1;
      let scheduleComparison = 0;
      let timeComparison = 0;

      // For live comparison, regardless of direction we want live content to show first, followed by vod content
      if(a.live_video) {
        if(b.live_video) {
          timeComparison =
            a.start_time === b.start_time ? titleComparison :
              a.start_time < b.start_time ? -1 : 1;
        } else {
          timeComparison = -1;
          scheduleComparison = -1;
        }
      } else if(b.live_video) {
        scheduleComparison = 1;
        timeComparison = 1;
      }

      switch(select.sort_order) {
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

  LoadPocket = flow(function * ({pocketSlugOrId}) {
    const versionHash = yield this.client.LatestVersionHash({objectId: pocketSlugOrId});

    const metadata = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "/public/asset_metadata/info",
      produceLinkUrls: true
    });

    this.pocket = {
      objectId: pocketSlugOrId,
      versionHash,
      tenantId: yield this.client.ContentObjectTenantId({versionHash}),
      metadata
    };

    yield Promise.all([
      new Promise(resolve => setTimeout(resolve, 3000)),
      this.LoadMedia()
    ]);
  });

  LoadMedia = flow(function * () {
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
    this.slugMap = slugMap;
    this.media = media;
    this.pocket = {
      ...this.pocket,
      metadata,
      mediaLoaded: true,
      mediaLoadIndex: (this.pocket.mediaLoadIndex || 0) + 1
    };

    console.timeEnd("Load Media");
  });
}

export default PocketStore;
