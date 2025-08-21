import {flow, makeAutoObservable} from "mobx";

class PaymentStore {

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  PurchaseApplePay = flow(function * ({permissionItemId}) {
    const permissionItem = this.rootStore.permissionItems[permissionItemId];

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
              payment: event.payment,
              user_addr: this.client.CurrentAccountAddress()
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
      try {
        session?.abort();
      } catch(error) {
        console.error(error);
      }
    }
  });
}

export default PaymentStore;
