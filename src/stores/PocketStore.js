import {makeAutoObservable, flow} from "mobx";
import {LinkTargetHash, SHA512} from "@/utils/Utils.js";

import SanitizeHTML from "sanitize-html";

const urlParams = new URLSearchParams(window.location.search);
class PocketStore {
  media = {};
  slugMap = {};
  contentEnded = false;
  pocketInfo;
  pocket;
  permissionItems = {};
  userItems = [];

  preview = urlParams.has("preview") || urlParams.has("previewAll") || sessionStorage.getItem("preview");
  requirePassword = false;
  previewPasswordDigest;

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

  get hasSingleItem() {
    return (
      this.sidebarContent.length === 1 &&
      this.sidebarContent[0].groups.length === 1 &&
      this.sidebarContent[0].groups[0].content.length === 1
    );
  }

  get splashImage() {
    const backgroundKey = this.mobile && !this.mobileLandscape && this.pocket?.metadata?.splash_screen_background_mobile ?
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

  get appName() {
    return this.pocket?.metadata?.app_name || "Pocket TV";
  }

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;

    if(this.preview) {
      sessionStorage.setItem("preview", "true");
    }
  }

  SetContentEnded(ended) {
    this.contentEnded = ended;
  }

  MediaItem(mediaItemSlugOrId) {
    const mediaItemId = this.slugMap[mediaItemSlugOrId] || mediaItemSlugOrId;

    return this.media[mediaItemId];
  }

  MediaItemInfo(mediaItemId) {
    let bumpers = this.pocket.metadata.bumpers || [];
    let sequential = false;

    for(let tabIndex = 0; tabIndex < this.sidebarContent.length; tabIndex++) {
      const tab = this.sidebarContent[tabIndex];
      for(let groupIndex = 0; groupIndex < tab.groups.length; groupIndex++) {
        const group = tab.groups[groupIndex];
        const itemIndex = group.content.findIndex(item => item.id === mediaItemId);

        if(itemIndex >= 0) {
          sequential = tab.sequential || group.sequential;
          bumpers = tab.override_bumpers ? tab.bumpers || [] : bumpers;

          const isFree = this.MediaItemPermissions({mediaItemSlugOrId: mediaItemId})?.public;

          if(!isFree) {
            bumpers = bumpers.filter(bumper => !bumper.free_only);
          }

          let nextItemId;
          if(sequential) {
            nextItemId = (
              group.content[itemIndex + 1] ||
              (tab.sequential && tab.groups[groupIndex + 1]?.content[0])
            )?.id;
          }

          return {
            tab,
            tabIndex,
            group,
            groupIndex,
            itemIndex,
            sequential,
            nextItemId,
            bumpers,
            isFree
          };
        }
      }
    }

    return {};
  }

  MediaItemPermissions({mediaItemSlugOrId, mediaItem}) {
    if(mediaItemSlugOrId) {
      mediaItem = this.MediaItem(mediaItemSlugOrId);
    }

    if(!mediaItem) { return {}; }

    let permissions = {
      public: mediaItem.public,
      authorized: mediaItem.public || (mediaItem?.permissions || []).length === 0,
      dvr: false,
      permissionItems: []
    };

    permissions.permissionItems = mediaItem.permissions
      .map(({permission_item_id}) => {
        if(!permission_item_id || !this.permissionItems[permission_item_id]) {
          return;
        }

        if(this.permissionItems[permission_item_id].owned) {
          permissions.authorized = true;

          if(this.permissionItems[permission_item_id].dvr) {
            permissions.dvr = true;
          }
        } else if(!this.permissionItems[permission_item_id].subsumed) {
          permissions.anyItemsAvailable = true;
        }

        return this.permissionItems[permission_item_id];
      })
      .filter(permission => permission)
      .sort((i1, i2) => {
        if(!i1.priority && typeof !i2.priority) {
          return 0;
        } else if(!i2.priority) {
          return -1;
        } else if(!i1.priority) {
          return 1;
        }

        return i1.priority < i2.priority ? -1 : 1;
      });

    permissions.displayedPermissionItems = permissions.permissionItems
      .filter(item => !item?.subsumed);

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
      const displayStartTime = startTime?.toLocaleTimeString?.(this.preferredLocale, {hour: "numeric", minute: "numeric"}).replace(/^0(\d)/, "$1").replace(":00", "");

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
    let content = Object.values(this.media)
      .filter(mediaItem => mediaItem.media_type === "Video");

    if(select.permissions === "authorized") {
      content = content.filter(mediaItem => {
        const permissions = this.MediaItemPermissions({mediaItem});

        return !permissions.public && permissions.authorized && permissions.permissionItems.length > 0;
      });
    } else if(select.permissions === "unauthorized") {
      content = content.filter(mediaItem => {
        const permissions = this.MediaItemPermissions({mediaItem});

        return !permissions.public && !permissions.authorized && permissions.permissionItems.length > 0;
      });
    }

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

  LoadPocketInfo = flow(function * ({pocketSlugOrId}) {
    if(this.pocketInfo) {
      return this.pocketInfo;
    }

    const pocketMap = (yield this.client.ContentObjectMetadata({
      libraryId: this.rootStore.siteConfiguration.siteLibraryId,
      objectId: this.rootStore.siteConfiguration.siteId,
      metadataSubtree: "public/asset_metadata/pocket_properties"
    }));

    let pocketInfo = {};
    for(const pocketSlug of Object.keys(pocketMap)) {
      if(pocketSlug === pocketSlugOrId || pocketMap[pocketSlug]?.property_id === pocketSlugOrId) {
        pocketInfo = {
          slug: pocketSlug,
          id: pocketMap[pocketSlug].property_id,
          hash: LinkTargetHash(pocketMap[pocketSlug]["/"]),
        };
        break;
      }
    }

    /*
    const pocketProperties = (yield this.walletClient.TopLevelInfo()).pocket_properties || [];
    let pocketInfo = pocketProperties.find(pocket => pocket.slug === pocketSlugOrId || pocket.id === pocketSlugOrId);

     */

    if(!pocketInfo?.hash || this.preview) {
      pocketInfo = {
        ...pocketInfo,
        id: pocketInfo.id || pocketSlugOrId,
        hash: yield this.client.LatestVersionHash({objectId: pocketInfo?.id || pocketSlugOrId})
      };
    }

    pocketInfo.tenantId = yield this.client.ContentObjectTenantId({objectId: pocketInfo.id || pocketSlugOrId});

    this.pocketInfo = pocketInfo;
  });

  LoadPocket = flow(function * ({pocketSlugOrId, noMedia}) {
    this.requirePassword = false;

    const metadata = yield this.client.ContentObjectMetadata({
      versionHash: this.pocketInfo.hash,
      metadataSubtree: "/public/asset_metadata/info",
      produceLinkUrls: true,
      // Don't resolve catalog/permission links when previewing, since we will load them separately
      resolveLinks: !this.preview,
      resolveIncludeSource: true,
      resolveIgnoreErrors: true,
      linkDepthLimit: 1
    });

    this.LoadCustomization(metadata);

    // Check for preview password, except in payment flow
    if((this.preview || EluvioConfiguration.mode !== "production") && !noMedia && metadata.preview_password_digest) {
      const digest = yield SHA512(localStorage.getItem(`preview-password-${pocketSlugOrId}`) || "");
       if(digest !== metadata.preview_password_digest) {
         this.requirePassword = true;
         this.previewPasswordDigest = metadata.preview_password_digest;
         return;
       }
    }

    this.pocket = {
      objectId: this.pocketInfo.id || pocketSlugOrId,
      versionHash: this.pocketInfo.hash,
      tenantId: this.pocketInfo.tenantId,
      metadata
    };

    this.LoadAnalytics();

    if(noMedia) {
      return;
    }

    yield Promise.all([
      new Promise(resolve => setTimeout(resolve, 3000)),
      this.LoadMedia()
    ]);
  });

  LoadMedia = flow(function * () {
    console.time("Load Media");

    const metadata = {...this.pocket.metadata};

    let mediaCatalogInfo = {...metadata.media_catalog_links};
    if(this.preview) {
      mediaCatalogInfo = {};
      yield Promise.all(
        (metadata.media_catalogs || []).map(async mediaCatalogId =>
          mediaCatalogInfo[mediaCatalogId] = await this.client.ContentObjectMetadata({
            versionHash: await this.client.LatestVersionHash({objectId: mediaCatalogId}),
            metadataSubtree: "/public/asset_metadata/info",
            select: [ "media", "slug_map" ],
            produceLinkUrls: true
          })
        )
      );
    }

    let media = {};
    let slugMap = {};
    Object.keys(mediaCatalogInfo).forEach(mediaCatalogId => {
      const info = mediaCatalogInfo[mediaCatalogId];

      media = {
        ...media,
        ...(info?.media || {})
      };

      slugMap = {
        ...slugMap,
        ...(info.slug_map || {})
      };
    });

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

    let permissionSetInfo = {...metadata.permission_set_links};
    if(this.preview) {
      permissionSetInfo = {};
      yield Promise.all(
        (metadata.permission_sets || []).map(async permissionSetId =>
          permissionSetInfo[permissionSetId] = await this.client.ContentObjectMetadata({
            versionHash: await this.client.LatestVersionHash({objectId: permissionSetId}),
            metadataSubtree: "/public/asset_metadata/info",
            produceLinkUrls: true
          })
        )
      );
    }

    // Load permission items and determine marketplaces
    let allPermissionItems = {};
    let allMarketplaceIds = [];
    yield Promise.all(
      Object.keys(permissionSetInfo).map(async permissionSetId => {
        const permissionItems = permissionSetInfo[permissionSetId].permission_items || {};

        Object.keys(permissionItems).forEach(permissionItemId => {
          allPermissionItems[permissionItemId] = permissionItems[permissionItemId];
          const marketplaceId = permissionItems[permissionItemId].marketplace?.marketplace_id;

          if(marketplaceId) {
            !allMarketplaceIds.includes(marketplaceId) && allMarketplaceIds.push(marketplaceId);
          }
        });
      })
    );

    while(!this.rootStore.loggedIn) {
      // Don't start determining permissions until logged in
      yield new Promise(resolve => setTimeout(resolve, 250));
    }

    let allUserItems = [];
    let allMarketplaces = {};
    yield Promise.all(
      allMarketplaceIds.map(async marketplaceId => {
        allMarketplaces[marketplaceId] = await this.walletClient.LoadMarketplace({marketplaceId});

        allMarketplaces[marketplaceId].ownedItems = (await this.walletClient.UserItems({
          userAddress: this.client.CurrentAccountAddress(),
          marketplaceId,
          limit: 1000
        })).results || [];

        allUserItems = [...allUserItems, ...allMarketplaces[marketplaceId].ownedItems];
      })
    );

    Object.keys(allPermissionItems).forEach(permissionItemId => {
      const permissionItem = allPermissionItems[permissionItemId];

      if(permissionItem.type !== "owned_item") { return; }

      const marketplace = allMarketplaces[permissionItem.marketplace.marketplace_id];
      const marketplaceItem = marketplace.items.find(item => item.sku === permissionItem.marketplace_sku);
      allPermissionItems[permissionItemId].marketplaceItem = marketplaceItem;
      allPermissionItems[permissionItemId].address = marketplaceItem.nftTemplateMetadata?.address;
      allPermissionItems[permissionItemId].owned = !!marketplace.ownedItems
        .find(({contractAddress}) =>
          this.client.utils.EqualAddress(
            contractAddress,
            marketplaceItem.nftTemplateMetadata.address
          )
        );

      if(allPermissionItems[permissionItemId].address) {
        allUserItems.forEach((item, index) => {
          if(!item.permissionItemId && this.client.utils.EqualAddress(item.contractAddress, allPermissionItems[permissionItemId].address)) {
            allUserItems[index].permissionItemId = permissionItemId;
          }
        });
      }
    });

    Object.keys(allPermissionItems).forEach(permissionItemId => {
      const permissionItem = allPermissionItems[permissionItemId];

      if(!permissionItem.owned) { return; }

      permissionItem.subsumes?.forEach(otherItemId => {
        if(allPermissionItems[otherItemId]) {
          allPermissionItems[otherItemId].subsumed = true;
        }
      });
    });

    try {
      /*
      TODO: Subscription details
      const subscriptions = (yield Utils.ResponseToJson(
        walletClient.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "subs", "list"),
          method: "POST",
          body: {
            tenant: tenantId
          },
          headers: {
            Authorization: `Bearer ${walletClient.client.staticToken}`
          }
        })
      ))?.subscriptions || [];

       */

      this.userItems = allUserItems;
        /*
        .map(item => ({
          ...item,
          subscription: subscriptions.find(sub =>
            Utils.EqualAddress(sub.token_addr, item.details.ContractAddr) &&
            sub.token_id === item.details.TokenIdStr
          )
        }));

         */
    } catch(error) {
      console.error("Error loading items and subscriptions");
      console.error(error);
    }

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

  LoadCustomization(metadata) {
    if(!metadata?.styling) {
      return;
    }

    let css = [];
    let variables = [];
    if(metadata.styling?.font === "custom") {
      if(metadata.styling.custom_font_declaration) {
        if(metadata.styling.custom_font_definition) {
          css.push(metadata.styling.custom_font_definition);
        }

        const customFont = `${metadata.styling.custom_font_declaration}, Montserrat, "Helvetica Neue", helvetica, sans-serif`;

        variables.push(`--font-family: ${customFont};`);
      }
    }

    const buttonSettings = metadata?.styling?.button_style || {};

    // Remove invalid color options
    ["background_color", "background_color_2", "border_color", "text_color"].forEach(key => {
      if(!buttonSettings[key] || !CSS.supports("color", buttonSettings[key])) {
        delete buttonSettings[key];
      }
    });

    if(buttonSettings.background_color) {
      variables.push(`--button-background-color--custom: ${buttonSettings.background_color};`);
      // If border color is not explicitly set, it should default to background color
      variables.push(`--button-border-color--custom: ${buttonSettings.background_color};`);
    }

    if(buttonSettings.background_type === "gradient" && buttonSettings.background_color && buttonSettings.background_color_2) {
      variables.push(
        `--button-background--custom: linear-gradient(${buttonSettings.background_gradient_angle || 0}deg, ${buttonSettings.background_color}, ${buttonSettings.background_color_2});`);
    }

    if(buttonSettings.text_color) {
      variables.push(`--button-text--custom: ${buttonSettings.text_color};`);
    }

    if(metadata.styling?.button_style?.border_color) {
      variables.push(`--button-border-color--custom: ${buttonSettings.border_color};`);
    }

    if(!isNaN(parseInt(buttonSettings.border_width))) {
      variables.push(`--button-border-width--custom: ${buttonSettings.border_width}px;`);
    }

    if(!isNaN(parseInt(buttonSettings.border_radius))) {
      variables.push(`--button-border-radius--custom: ${buttonSettings.border_radius}px;`);
    }

    if(variables.length > 0) {
      css.unshift(":root {\n" + variables.join("\n") + "\n}\n");
    }

    const styleElement = document.createElement("style");
    styleElement.id = "__custom-css";
    styleElement.innerHTML = SanitizeHTML(css.join("\n"));
    document.body.appendChild(styleElement);
  }

  LoadAnalytics() {
    const analyticsIds = this.pocket.metadata?.analytics_ids || [];

    for(const entry of analyticsIds) {
      try {
        switch(entry.type) {
          case "google_analytics_id":
            this.Log("Initializing Google Analytics", "warn");

            const s = document.createElement("script");
            s.setAttribute("src", `https://www.googletagmanager.com/gtag/js?id=${entry.id}`);
            s.async = true;
            document.head.appendChild(s);

            window.dataLayer = window.dataLayer || [];


          function gtag() {
            window.dataLayer.push(arguments);
          }

            window.gtag = gtag;
            gtag("js", new Date());
            gtag("config", entry.id);

            window.ac = {g: gtag};

            break;

          case "google_tag_manager_id":
            this.Log("Initializing Google Tag Manager Analytics", "warn");

            (function(w, d, s, l, i) {
              w[l] = w[l] || [];
              w[l].push({
                "gtm.start":
                  new Date().getTime(), event: "gtm.js"
              });
              var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != "dataLayer" ? "&l=" + l : "";
              j.async = true;
              j.src =
                "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
              f.parentNode.insertBefore(j, f);
            })(window, document, "script", "dataLayer", entry.id);

            break;

          case "meta_pixel_id":
            this.Log("Initializing Meta Analytics", "warn");

            !function(f, b, e, v, n, t, s) {
              if(f.fbq) return;
              n = f.fbq = function() {
                n.callMethod ?
                  n.callMethod.apply(n, arguments) : n.queue.push(arguments);
              };
              if(!f._fbq) f._fbq = n;
              n.push = n;
              n.loaded = !0;
              n.version = "2.0";
              n.queue = [];
              t = b.createElement(e);
              t.async = !0;
              t.src = v;
              s = b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t, s);
            }(window, document, "script",
              "https://connect.facebook.net/en_US/fbevents.js");
            fbq("init", entry.id);
            fbq("track", "PageView");

            break;

          case "app_nexus_segment_id":
            this.Log("Initializing App Nexus Analytics", "warn");

            const pixel = document.createElement("img");

            pixel.setAttribute("width", "1");
            pixel.setAttribute("height", "1");
            pixel.style.display = "none";
            pixel.setAttribute("src", `https://secure.adnxs.com/seg?add=${entry.id}&t=2`);

            document.body.appendChild(pixel);

            break;

          case "twitter_pixel_id":
            this.Log("Initializing Twitter Analytics", "warn");

            !function(e, t, n, s, u, a) {
              e.twq || (s = e.twq = function() {
                s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
              }, s.version = "1.1", s.queue = [], u = t.createElement(n), u.async = !0, u.src = "https://static.ads-twitter.com/uwt.js",
                a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a));
            }(window, document, "script");
            twq("config", entry.id);

            break;

          default:
            break;
        }
      } catch(error) {
        console.error(`Failed to initialize analytics for ${entry.type}`);
        console.error(error, true);
      }
    }
  }
}

export default PocketStore;
