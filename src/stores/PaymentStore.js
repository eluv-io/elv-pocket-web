import {flow, makeAutoObservable, runInAction} from "mobx";
import {parse as ParseUUID, v4 as UUID} from "uuid";
import UrlJoin from "url-join";

class PaymentStore {
  currency = "USD";
  stripe;
  purchaseDetails = {};
  purchaseStatus = {};

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  ConfirmationId() {
    return this.client.utils.B58(ParseUUID(UUID()));
  }

  InitializeStripe = flow(function * (publishableKey) {
    if(!this.stripe) {
      this.stripe = yield window.Stripe(publishableKey);
    }
  });

  InitiatePurchase = flow(function * ({pocketSlugOrId, permissionItemId}) {
    if(!this.purchaseDetails[permissionItemId]) {
      const permissionItem = this.rootStore.pocketStore.permissionItems[permissionItemId];
      const confirmationId = this.ConfirmationId();
      const response = yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: "/as/checkout/stripe/instant",
          body: {
            items: [{sku: permissionItem.marketplace_sku, quantity: 1}],
            elv_addr: this.client.CurrentAccountAddress(),
            currency: this.currency,
            success_url: window.location.href,
            cancel_url: window.location.href,
            name: this.rootStore.userIdCode,
            client_reference_id: confirmationId
          }
        })
      );

      // Initialize Stripe for polling
      if(!this.stripe) {
        yield this.InitializeStripe(response.publishable_key);
      }

      delete response.buy_url;
      response.address = this.client.CurrentAccountAddress();
      response.permissionItem = {
        id: permissionItemId,
        title: permissionItem.title,
        subtitle: permissionItem.subtitle,
        access_title: permissionItem.access_title,
        price: permissionItem.marketplaceItem.price
      };

      const url = new URL(window.location.origin);
      url.pathname = UrlJoin(
        pocketSlugOrId,
        "pay",
        this.client.utils.B58(JSON.stringify(response))
      );

      // TODO: Remove testing
      if(url.hostname === "localhost") {
        url.hostname = "192.168.0.28";
      }

      this.purchaseDetails[permissionItemId] = {
        response,
        url: yield this.rootStore.CreateShortURL(url)
      };
    }

    return this.purchaseDetails[permissionItemId];
  });

  StartPollPurchaseStatus({permissionItemId}) {
    this.StopPollPurchaseStatus({permissionItemId});

    if(!this.purchaseDetails[permissionItemId]) { return; }

    this.purchaseDetails[permissionItemId].pollIntervalId = setInterval(async () => {
      const { paymentIntent, error } = await this.stripe.retrievePaymentIntent(
        this.purchaseDetails[permissionItemId].response.client_secret
      );

      runInAction(() =>
        this.purchaseStatus[permissionItemId] = {
          ...paymentIntent,
          error
        }
      );
    }, 5000);
  }

  StopPollPurchaseStatus({permissionItemId}) {
    clearInterval(this.purchaseDetails[permissionItemId]?.pollIntervalId);
  }

  CompletePurchase = flow(function * ({paymentIntent, clientReferenceId, permissionItemId}) {
    yield this.client.utils.ResponseToJson(
      this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: "/as/otp/stripe/instant/callback",
        body: {
          payment_intent: paymentIntent,
          client_reference_id: clientReferenceId
        }
      })
    );

    if(this.purchaseDetails[permissionItemId]) {
      this.purchaseDetails[permissionItemId].success = true;
    }
  });

  MintingStatus = flow(function * ({confirmationId}) {
    return (yield this.walletClient.MintingStatus({
      tenantId: this.rootStore.pocketStore.pocket.tenantId
    }))
      .find(status => status.op === confirmationId);
  });
}

export default PaymentStore;
