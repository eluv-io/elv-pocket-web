import {makeAutoObservable, flow} from "mobx";
import {ElvWalletClient, Utils} from "@eluvio/elv-client-js/src/index.js";
import PaymentStore from "@/stores/PaymentStore.js";
import {parse as ParseUUID, v4 as UUID} from "uuid";
import PocketStore from "@/stores/PocketStore.js";

console.time("Initial Load");

class RootStore {
  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;

  client;
  walletClient;
  initialized = false;
  shortURLs = {};
  permissionItems = {};
  menu;

  userIdCode = localStorage.getItem("user-id-code") || Utils.B58(ParseUUID(UUID())).slice(0, 12);
  nonce = localStorage.getItem("nonce") || Utils.B58(ParseUUID(UUID()));
  tokenStatusInterval;

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

  constructor() {
    makeAutoObservable(this);

    this.paymentStore = new PaymentStore(this);
    this.pocketStore = new PocketStore(this);

    localStorage.setItem("user-id-code", this.userIdCode);
    localStorage.setItem("nonce", this.nonce);
  }

  SetMenu(menu) {
    this.menu = menu;
  }

  InitializeClient = flow(function * ({pocketSlugOrId, customUserIdCode, force=false}) {
    clearInterval(this.tokenStatusInterval);

    console.time("Initialize Client");
    const walletClient = yield ElvWalletClient.Initialize({
      appId: "pocket",
      network: EluvioConfiguration.network,
      mode: EluvioConfiguration.mode
    });

    const tenantId = yield walletClient.client.ContentObjectTenantId({objectId: pocketSlugOrId});

    console.time("Log in");
    if(
      !customUserIdCode &&
      localStorage.getItem("token") &&
      parseInt(localStorage.getItem("token-expires")) - Date.now() > 6 * 60 * 60 * 1000
    ) {
      yield walletClient.Authenticate({token: localStorage.getItem("token")});
    } else {
      try {
        const {signingToken} = yield walletClient.AuthenticateOAuth({
          userIdCode: customUserIdCode || this.userIdCode,
          tenantId,
          nonce: this.nonce,
          force
        });

        localStorage.setItem("token", signingToken);
        localStorage.setItem("token-expires", (Date.now() + 24 * 60 * 60 * 1000).toString());
      } catch(error) {
        console.error(error);
        if(confirm("Too many logins - force?")) {
          return this.InitializeClient({pocketSlugOrId, customUserIdCode, force: true});
        } else {
          throw error;
        }
      }
    }
    console.timeEnd("Log in");

    localStorage.setItem("user-id-code", customUserIdCode || this.userIdCode);
    this.userIdCode = customUserIdCode || this.userIdCode;

    // Periodically check to ensure the token has not been revoked
    const CheckTokenStatus = async () => {
      if(!(await walletClient.TokenStatus())) {
        alert("Too many logins! Stop sharing!");
      }
    };

    CheckTokenStatus();
    this.tokenStatusInterval = setInterval(() => {
      CheckTokenStatus();
    }, 60000);

    this.walletClient = walletClient;
    this.client = walletClient.client;
    console.timeEnd("Initialize Client");
  });

  Initialize = flow(function * ({pocketSlugOrId, customUserIdCode, noMedia=false, force=false}) {
    if(this.loading && !force) { return; }

    this.loading = true;
    this.initialized = false;

    yield this.InitializeClient({pocketSlugOrId, customUserIdCode});

    yield this.pocketStore.LoadPocket({pocketSlugOrId, noMedia});

    this.initialized = true;
    this.loading = false;
  });

  CreateShortURL = flow(function * (url) {
    try {
      // Normalize URL
      url = new URL(url).toString();

      if(!this.shortURLs[url]) {
        const {url_mapping} = yield (yield fetch("https://elv.lv/tiny/create", {method: "POST", body: url})).json();

        this.shortURLs[url] = url_mapping.shortened_url;
      }

      return this.shortURLs[url];
    } catch(error) {
      console.error(error);
    }
  });

  UpdatePageDimensions() {
    this.pageDimensions = { width: window.innerWidth, height: window.innerHeight };

    document.documentElement.style.setProperty("--vw", `${window.innerWidth * 0.01}px`);
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }

  ResetAccount() {
    localStorage.removeItem("token");
    localStorage.removeItem("token-expires");
    localStorage.removeItem("nonce");
    localStorage.removeItem("user-id-code");

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
export const pocketStore = rootStore.pocketStore;

window.rootStore = rootStore;
