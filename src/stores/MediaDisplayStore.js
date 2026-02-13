import {makeAutoObservable, runInAction} from "mobx";

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

