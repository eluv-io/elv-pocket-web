import {makeAutoObservable, runInAction} from "mobx";
import {mediaDisplayStore, pocketStore} from "@/stores/index.js";

class MediaDisplayStore {
  displayedContent = [];
  sidebarContent = {};
  mediaTags = {};

  isFullscreen = false;
  selectedMultiviewMode = "multiview";
  showSidebar = true;
  showTagSidebar = false;
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
    this.mediaTags = {};

    this.showSidebar = true;
    this.showTagSidebar = false;
    this.showMultiviewSelectionModal = false;
  }

  SetMultiviewMode(mode) {
    this.selectedMultiviewMode = mode;
  }

  SetDisplayedContent(displayedContent) {
    this.displayedContent = displayedContent;
  }

  SetSidebarContent(sidebarContent) {
    this.sidebarContent = sidebarContent;
  }

  SetShowSidebar(show) {
    this.showSidebar = show;
  }

  SetShowTagSidebar(show) {
    this.showTagSidebar = show;
  }

  SetShowMultiviewSelectionModal(show) {
    this.showMultiviewSelectionModal = show;
  }
}

export default MediaDisplayStore;

