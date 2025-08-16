import {makeAutoObservable, flow} from "mobx";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/index.js";

class RootStore {
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

  LoadPocket = flow(function * ({pocketIdOrSlug}) {
    yield this.InitializeClient();
    const versionHash = yield this.client.LatestVersionHash({objectId: pocketIdOrSlug});
    this.pocket = {
      objectId: pocketIdOrSlug,
      versionHash,
      metadata: yield this.client.ContentObjectMetadata({
        versionHash,
        metadataSubtree: "/public/asset_metadata/info",
        produceLinkUrls: true
      })
    };

    return this.pocket;
  });

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