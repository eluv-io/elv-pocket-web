import {mediaDisplayStore, pocketStore} from "@/stores/index.js";
import {flow, makeAutoObservable, runInAction} from "mobx";

class MediaDisplayStore {
  displayedContent = [];
  sidebarContent = {};
  mediaProgress = {};

  isFullscreen = false;
  selectedMultiviewMode = "multiview";
  showMultiviewSelectionModal = false;

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  get pocket() {
    return this.rootStore.pocketStore.pocket;
  }

  get streamLimit() {
    return this.rootStore.pageDimensions.width > 1400 ? 16 : 8;
  }

  get multiviewMode() {
    return this.rootStore.pageDimensions.width > 1000 ?
      this.selectedMultiviewMode : "multiview";
  }

  get multiviewing() {
    return this.displayedContent.length > 1;
  }

  get multiviewAvailable() {
    const firstItem = this.displayedMediaInfo[0];

    if(!firstItem) { return false; }

    const primaryMediaItem = pocketStore.MediaItem(firstItem.mediaItemId || firstItem.id);
    const scheduleInfo = primaryMediaItem && pocketStore.MediaItemScheduleInfo(primaryMediaItem);

    return scheduleInfo?.isMultiviewable;
  }

  get displayedMediaInfo() {
    return this.displayedContent
      .map(item => {
        if(item.type === "additional-view") {
          return {
            id: item.id,
            index: item.index,
            type: "additional-view",
            mediaItemId: item.mediaItemId,
            mediaItem: {
              media_link: item.media_link,
              media_link_info: item.media_link_info,
            },
            display: {
              title: item.label
            }
          };
        } else {
          const mediaItem = pocketStore.MediaItem(item.id);

          if(!mediaItem) {
            return;
          }

          const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;

          return {
            id: item.id,
            type: "media-item",
            mediaItem,
            display
          };
        }
      })
      .filter(item => item)
      .slice(0, mediaDisplayStore.streamLimit);
  }

  get primaryDisplayedMediaId() {
    return this.displayedContent[0]?.mediaItemId || this.displayedContent[0]?.id;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);

    document.addEventListener("fullscreenchange", () => runInAction(() => this.isFullscreen = !!document.fullscreenElement));
  }

  Reset() {
    this.displayedContent = [];
    this.sidebarContent = {};
    this.showMultiviewSelectionModal = false;
  }

  SetMultiviewMode(mode) {
    this.selectedMultiviewMode = mode;
  }

  SetDisplayedContent(displayedContent) {
    this.displayedContent = displayedContent;
  }

  SetShowMultiviewSelectionModal(show) {
    this.showMultiviewSelectionModal = show;
  }

  SetMediaProgress = flow(function * ({mediaItemId, progress}) {
    if(!this.rootStore.signedIn) { return; }

    const pocketId = this.rootStore.pocketStore.pocketInfo.id;

    if(!pocketId) { return; }

    if(!this.mediaProgress[pocketId]) {
      this.mediaProgress[pocketId] = {};
    }

    progress = parseFloat(parseFloat(progress).toFixed(5));

    if(progress < 0.01) {
      delete this.mediaProgress[pocketId][mediaItemId];
    } else {
      this.mediaProgress[pocketId][mediaItemId] = Math.min(1, Math.max(0, progress));
    }

    yield this.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: this.rootStore.appId,
      key: `media-progress-${pocketId}`,
      value: JSON.stringify(this.mediaProgress[pocketId])
    });
  });

  LoadMediaProgress = flow(function * () {
    if(!this.rootStore.signedIn) { return; }

    const pocketId = this.rootStore.pocketStore.pocketInfo.id;

    if(!pocketId) { return; }

    if(!this.mediaProgress[pocketId]) {
      this.mediaProgress[pocketId] = {};
    }

    let progress = {};
    try {
      progress = JSON.parse(
        yield this.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: this.rootStore.appId,
          key: `media-progress-${pocketId}`
        })
      );
    // eslint-disable-next-line no-unused-vars
    } catch(error) { /* empty */ }

    this.mediaProgress[pocketId] = progress;
  });

  GetMediaProgress({mediaItemId}) {
    return this.mediaProgress[this.rootStore.pocketStore.pocketInfo.id]?.[mediaItemId];
  }

  async _ClearMediaProgress() {
    if(!this.rootStore.signedIn) { return; }

    const pocketId = this.rootStore.pocketStore.pocketInfo.id;

    if(!pocketId) { return; }

    await this.walletClient.RemoveProfileMetadata({
      type: "app",
      mode: "private",
      appId: this.rootStore.appId,
      key: `media-progress-${pocketId}`,
    });
  }
}

export default MediaDisplayStore;

