import {flow, makeAutoObservable} from "mobx";

class PaymentStore {

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  PurchaseApplePay = flow(function * ({}) {
    const paymentRequest = {
      countryCode: "US",
      currencyCode: "USD",
      supportedNetworks: ["visa", "masterCard", "amex"],
      merchantCapabilities: [ "supports3DS", "supportsCredit", "supportsDebit" ],
      total: { label: "Demo (Card will not be charged)", amount: "2.99" },
      merchantIdentifier: "merchant.ap.eluv.io"
    };
  });
}

export default PaymentStore;
