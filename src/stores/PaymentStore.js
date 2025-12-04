import {flow, makeAutoObservable} from "mobx";
import {parse as ParseUUID, v4 as UUID} from "uuid";
//import {loadStripe} from "@stripe/stripe-js";
import UrlJoin from "url-join";

class PaymentStore {
  currency = "USD";
  stripe;

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
    const permissionItem = this.rootStore.pocketStore.permissionItems[permissionItemId];
    const confirmationId = this.ConfirmationId();
    const response = yield this.client.utils.ResponseToJson(
      this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: "/as/checkout/stripe/instant",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          items: [{ sku: permissionItem.marketplace_sku, quantity: 1 }],
          elv_addr: this.client.CurrentAccountAddress(),
          currency: this.currency,
          success_url: window.location.href,
          cancel_url: window.location.href,
          name: this.rootStore.userIdCode,
          client_reference_id: confirmationId
        }
      })
    );

    console.log(response);

    // Initialize Stripe for polling
    if(!this.stripe) {
      yield this.InitializeStripe(response.publishable_key);
    }

    delete response.buy_url;
    response.address = this.client.CurrentAccountAddress();
    response.permissionItem = {
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

    return {
      response,
      url
    };
  });

  CompletePurchase = flow(function * ({paymentIntent, clientReferenceId}) {
    yield this.client.utils.ResponseToJson(
      this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: "/as/otp/stripe/instant/callback",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          payment_intent: paymentIntent,
          client_reference_id: clientReferenceId
        }
      })
    );
  });

  PurchaseStatus = flow(function * ({clientSecret}) {
    const { paymentIntent, error } = yield this.stripe.retrievePaymentIntent(clientSecret);

    if(error) { throw error; }

    return paymentIntent;
  });

  PurchaseStatus2 = flow(function * ({permissionItemId, confirmationId}) {
    const permissionItem = this.rootStore.permissionItems[permissionItemId];
    return yield this.walletClient.PurchaseStatus({
      marketplaceParams: {
        marketplaceId: permissionItem.marketplace.marketplace_id
      },
      confirmationId
    });
  });

  PurchaseApplePay = flow(function * ({permissionItemId}) {
    const permissionItem = this.rootStore.permissionItems[permissionItemId];
    const confirmationId = this.ConfirmationId();

    if(!permissionItem) {
      return;
    }

    const paymentRequest = {
      countryCode: "US",
      currencyCode: "USD",
      supportedNetworks: ["visa", "masterCard", "amex"],
      merchantCapabilities: [ "supports3DS", "supportsCredit", "supportsDebit" ],
      total: {
        label: "Demo (Card will not be charged)",
        amount: permissionItem.marketplaceItem.price.USD
      },
      merchantIdentifier: "merchant.ap.eluv.io"
    };

    let session;
    const result = yield new Promise(resolve => {
      try {
        session = new window.ApplePaySession(4, paymentRequest);
      } catch(error) {
        resolve({error});
      }

      session.onvalidatemerchant = async event => {
        try {
          const response = await this.client.authClient.MakeAuthServiceRequest({
            method: "POST",
            path: "/as/otp/webhook/applepay",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              validationURL: event.validationURL,
              domain: window.location.hostname
            }
          });

          if(!response.ok) {
            resolve({error: response});
          }

          await session.completeMerchantValidation(
            await this.client.utils.ResponseToJson(response)
          );
        } catch(error) {
          resolve({error});
        }
      };

      session.onpaymentauthorized = async event => {
        try {
          const response = await this.client.authClient.MakeAuthServiceRequest({
            method: "POST",
            path: "/as/otp/webhook/applepay/process",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              currency: this.rootStore.currency,
              payment: event.payment,
              elv_addr: this.client.CurrentAccountAddress(),
              client_reference_id: confirmationId,
              items: [{sku: permissionItem.marketplace_sku, quantity: 1}],
              mode: EluvioConfiguration["purchase-mode"],
              success_url: window.location.href,
              cancel_url: window.location.href
            }
          });

          if(!response.ok) {
            resolve({error: response});
          }

          const result = await this.client.utils.ResponseToJson(response);

          if(result.success) {
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            resolve({result});
          } else {
            resolve({error: result});
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          }
        } catch(error) {
          resolve({error});
        }
      };

      session.oncancel = () => {
        resolve({error: { cancelled: true }});
      };

      session.begin();
    });

    if(result?.error) {
      console.error(result);

      try {
        session?.abort();
      } catch(error) {
        console.error(error);
      }
    }

    return {
      result,
      confirmationId
    };
  });
}

export default PaymentStore;
