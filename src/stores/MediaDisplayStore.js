import {makeAutoObservable} from "mobx";

class MediaDisplayStore {
  displayedContent = [];
  sidebarContent = {};
  mediaTags = {};

  multiviewMode = "pip";
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
    return this.rootStore.pageDimensions.width > 1400 ? 16 :
      this.rootStore.pageDimensions.width > 850 ? 9 : 8;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
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
    this.multiviewMode = mode;
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

