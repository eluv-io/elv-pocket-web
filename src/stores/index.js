import {makeAutoObservable, flow, runInAction} from "mobx";
import {ElvWalletClient, Utils} from "@eluvio/elv-client-js/src/index.js";
import SiteConfiguration from "@eluvio/elv-client-js/src/walletClient/Configuration";
import PaymentStore from "@/stores/PaymentStore.js";
import {parse as ParseUUID, v4 as UUID} from "uuid";
import PocketStore from "@/stores/PocketStore.js";
import {parseDomain} from "parse-domain";
import UrlJoin from "url-join";

import LocalizationEN from "@/assets/localizations/en.yml";
import MediaDisplayStore from "@/stores/MediaDisplayStore.js";

console.time("Initial Load");

const urlParams = new URLSearchParams(window.location.search);
class RootStore {
  appId = "eluvio-pocket-web";
  l10n = LocalizationEN;
  siteConfiguration = SiteConfiguration[EluvioConfiguration.network][EluvioConfiguration.mode];
  isLocal = window.location.hostname.includes("localhost") || urlParams.has("dev");
  tooManyLogins = false;

  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;

  client;
  walletClient;
  oryClient;
  authenticating = false;
  initialized = false;
  shortURLs = {};
  signedIn = false;

  showMyItems = false;
  showPurchaseHistory = false;
  showAdditionalPurchaseOptions = false;

  useOryLogin = false;
  userIdCode = localStorage.getItem("user-id-code") || Utils.B58(ParseUUID(UUID())).slice(0, 12);
  nonce = localStorage.getItem("nonce") || Utils.B58(ParseUUID(UUID()));
  tokenStatusInterval;

  pageDimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  backAction = undefined;

  _loginAuthInfo = localStorage.getItem(`auth-${EluvioConfiguration.network}`);

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
    this.mediaDisplayStore = new MediaDisplayStore(this);

    localStorage.setItem("user-id-code", this.userIdCode);
    localStorage.setItem("nonce", this.nonce);
  }

  SetAttribute(attribute, value) {
    this[attribute] = value;
  }

  InitializeClient = flow(function * () {
    clearInterval(this.tokenStatusInterval);

    console.time("Initialize Client");
    const walletClient = yield ElvWalletClient.Initialize({
      appId: "pocket",
      network: EluvioConfiguration.network,
      mode: EluvioConfiguration.mode,
      storeAuthToken: false
    });

    this.walletClient = walletClient;
    this.client = walletClient.client;
    console.timeEnd("Initialize Client");
  });

  Initialize = flow(function * ({pocketSlugOrId, customUserIdCode, isPaymentFlow, force=false}) {
    if(this.loading && !force) { return; }

    this.loading = true;
    this.initialized = false;

    yield this.InitializeClient();

    yield this.pocketStore.LoadPocketInfo({pocketSlugOrId});
    yield this.pocketStore.LoadPocket({pocketSlugOrId, isPaymentFlow});

    if(this.pocketStore.requirePassword) {
      this.loading = false;
      return;
    }

    this.useOryLogin = this.pocketStore.pocket.metadata?.login?.settings?.use_oauth_login || false;

    // TODO: ory login flag

    if(!this.useOryLogin) {
      yield this.AuthenticateCode({customUserIdCode, force});
    } else if(this.LoginAuthInfo()) {
      yield this.AuthenticateSavedAuth();
    }

    if(this.signedIn) {
      // Don't load media if blocked on ory login
      yield Promise.all([
        new Promise(resolve => setTimeout(resolve, 3000)),
        this.pocketStore.LoadMedia()
      ]);
    }

    this.initialized = true;
    this.loading = false;
  });

  AuthenticateCode = flow(function * ({customUserIdCode, force=false}) {
    this.signedIn = false;

    console.time("Log in");
    if(
      !customUserIdCode &&
      localStorage.getItem(`token-${EluvioConfiguration.network}`) &&
      parseInt(localStorage.getItem("token-expires")) - Date.now() > 6 * 60 * 60 * 1000
    ) {
      yield this.walletClient.Authenticate({token: localStorage.getItem("token")});
    } else {
      try {
        const {signingToken} = yield this.walletClient.AuthenticateOAuth({
          userIdCode: customUserIdCode || this.userIdCode,
          tenantId: this.pocketStore.pocketInfo.tenantId,
          nonce: this.nonce,
          extraData: {
            origin: "Pocket TV Web"
          },
          force
        });

        localStorage.setItem(`token-${EluvioConfiguration.network}`, signingToken);
        localStorage.setItem(`token-expires-${EluvioConfiguration.network}`, (Date.now() + 24 * 60 * 60 * 1000).toString());

        this.tooManyLogins = false;
        this.signedIn = true;
      } catch(error) {
        console.error(error);
        this.tooManyLogins = true;
      }
    }
    console.timeEnd("Log in");

    localStorage.setItem("user-id-code", customUserIdCode || this.userIdCode);
    this.userIdCode = customUserIdCode || this.userIdCode;

    // Periodically check to ensure the token has not been revoked
    const CheckTokenStatus = async () => {
      if(!(await this.walletClient.TokenStatus())) {
        runInAction(() => this.tooManyLogins = true);
      }
    };

    CheckTokenStatus();
    this.tokenStatusInterval = setInterval(() => {
      CheckTokenStatus();
    }, 60000);
  });

  AuthenticateSavedAuth = flow(function * () {
    let tokenInfo = this.LoginAuthInfo();

    try {
      const newTokens = yield this.client.MakeAuthServiceRequest({
        format: "JSON",
        method: "POST",
        path: UrlJoin("as", "wlt", "refresh", "csat"),
        body: {
          last_csat: tokenInfo.fabricToken,
          refresh_token: tokenInfo.refreshToken,
          nonce: tokenInfo.nonce
        },
        headers: {
          Authorization: `Bearer ${tokenInfo.fabricToken}`
        }
      });

      tokenInfo.fabricToken = newTokens.token;
      tokenInfo.refreshToken = newTokens.refresh_token;
      tokenInfo.expiresAt = newTokens.expires_at;
    } catch(error) {
      console.error("Error refreshing:");
      console.error(error);
    }

    try {
      this._loginAuthInfo = yield this.walletClient.Authenticate({
        token: this.client.utils.B58(JSON.stringify(tokenInfo))
      });

      this.signedIn = true;
    } catch(error) {
      console.error("Error authenticating");
      console.error(error);
    }
  });

  InitializeOryClient = flow(function * () {
    if(this.oryClient) { return; }

    let oryUrl = EluvioConfiguration.ory_configuration.url;
    const parsedUrl = parseDomain(window.location.hostname);
    if(parsedUrl.type !== "INVALID" && parsedUrl.type !== "RESERVED") {
      oryUrl = new URL(`https://ory.svc.${parsedUrl.domain}.${parsedUrl.topLevelDomains.join(".")}`).toString();
    }

    // Initialize Ory client
    const {Configuration, FrontendApi} = yield import("@ory/client");
    this.oryClient = new FrontendApi(
      new Configuration({
        features: {
          kratos_feature_flags_use_continue_with_transitions: true,
          use_continue_with_transitions: true
        },
        basePath: oryUrl,
        // we always want to include the cookies in each request
        // cookies are used for sessions and CSRF protection
        baseOptions: {
          withCredentials: true
        }
      })
    );
  });

  AuthenticateOry = flow(function * ({nonce, installId, origin, userData, sendWelcomeEmail, welcomeEmailPath, sendVerificationEmail, force=false}={}) {
    if(this.authenticating) { return; }

    try {
      this.authenticating = true;
      const response = yield this.oryClient.toSession({tokenizeAs: EluvioConfiguration.ory_configuration.jwt_template});
      const email = response.data.identity.traits.email;

      const {signingToken} = yield this.walletClient.AuthenticateOAuth({
        idToken: response.data.tokenized,
        email,
        tenantId: this.pocketStore.pocketInfo.tenantId,
        shareEmail: true,
        extraData: {
          ...(userData || {}),
          origin: origin || "Unknown"
        },
        nonce: nonce || this.nonce,
        installId,
        appName: origin,
        force,
        tokenDuration: 24
      });

      this._loginAuthInfo = signingToken;
      localStorage.setItem(`auth-${EluvioConfiguration.network}`, signingToken);

      //clientAuthToken = tokens.authToken;
      //clientSigningToken = tokens.signingToken;

      if(sendWelcomeEmail) {
        let previouslySignedIn = yield this.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: this.appId,
          key: `signed-in-${EluvioConfiguration.network}`
        });

        if(!previouslySignedIn) {
           this.SendLoginEmail({email, path: welcomeEmailPath, type: "send_welcome_email"});

          yield this.walletClient.SetProfileMetadata({
            type: "app",
            mode: "private",
            appId: this.appId,
            key: `signed-in-${EluvioConfiguration.network}`,
            value: "true"
          });
        }
      }

      if(sendVerificationEmail) {
        this.SendLoginEmail({email, type: "request_email_verification"});
      }

      // Reload media
      yield this.pocketStore.LoadMedia();

      this.signedIn = true;

      return true;
    } catch(error) {
      console.error("Error logging in with Ory:");
      console.error(error);

      if([400, 403, 503].includes(parseInt(error?.status))) {
        throw { login_limited: true };
      }
    } finally {
      this.authenticating = false;
    }
  });

  SignOut = flow(function * () {
    clearInterval(this.tokenStatusInterval);

    localStorage.removeItem(`auth-${EluvioConfiguration.network}`);

    if(this.oryClient) {
      try {
        const response = yield this.oryClient.createBrowserLogoutFlow();
        yield this.oryClient.updateLogoutFlow({token: response.data.logout_token});
      } catch(error) {
        console.error(error);
      }
    }

    yield this.walletClient?.LogOut();

    // eslint-disable-next-line no-self-assign
    window.location.href = window.location.href;
  });

  LoginAuthInfo() {
    if(!this._loginAuthInfo) {
      return;
    }

    return JSON.parse(this.client.utils.FromB58ToStr(this._loginAuthInfo));
  }

  SendLoginEmail = flow(function * ({email, type, code, path, pocketSlugOrId}) {
    const tenantId = this.pocketStore.pocketInfo.tenantId;
    path = path || window.location.pathname;

    let callbackUrl = new URL(window.location.origin);
    callbackUrl.pathname = path;

    switch(type) {
      case "request_email_verification":
        callbackUrl.pathname = UrlJoin(callbackUrl.pathname, "verify");
        callbackUrl.searchParams.set("next", path);
        break;
      case "create_account":
        callbackUrl.pathname = "/register";
        callbackUrl.searchParams.set("next", path);
        callbackUrl.searchParams.set("pid", pocketSlugOrId);
        break;
    }

    try {
      return yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "ory", type),
          method: "POST",
          queryParams: code ? { code } : {},
          body: {
            tenant: tenantId,
            email,
            callback_url: callbackUrl.toString()
          },
          headers: type === "reset_password" ?
            {} :
            { Authorization: `Bearer ${this.walletClient.AuthToken()}` }
        })
      );
    } catch(error) {
      console.error(error);
      throw error;
    }
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
    localStorage.removeItem(`token-${EluvioConfiguration.network}`);
    localStorage.removeItem(`token-expires-${EluvioConfiguration.network}`);
    localStorage.removeItem("nonce");
    localStorage.removeItem("user-id-code");

    setTimeout(() => {
      const url = new URL(window.location.href);
      if(url.pathname.includes("/clear")) {
        url.pathname = url.pathname.replace("/clear", "");
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
export const mediaDisplayStore = rootStore.mediaDisplayStore;

window.rootStore = rootStore;
