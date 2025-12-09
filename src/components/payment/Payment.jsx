import PaymentStyles from "@/assets/stylesheets/modules/payment.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore, paymentStore} from "@/stores/index.js";
import {Utils} from "@eluvio/elv-client-js/src/index.js";
import {useEffect, useState} from "react";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import {FormatPriceString, Linkish, Loader} from "@/components/common/Common.jsx";
import QRCode from "@/components/common/QRCode.jsx";

const S = CreateModuleClassMatcher(PaymentStyles);

const CardPayment = async ({clientSecret, clientReferenceId, permissionItemId, cardElement}) => {
  const { error, paymentIntent } = await paymentStore.stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
  });

  if(error) { throw error; }

  if(paymentIntent && paymentIntent.status === "succeeded") {
    await paymentStore.CompletePurchase({
      paymentIntent,
      clientReferenceId,
      permissionItemId
    });

    return true;
  } else if (paymentIntent && paymentIntent.status === "processing") {
    throw "Payment processing.";
  } else if (paymentIntent && paymentIntent.status === "requires_payment_method") {
    throw "Payment failed. Try another card.";
  } else {
    throw paymentIntent;
  }
};

const WalletPayment = async ({
  event,
  clientSecret,
  clientReferenceId,
  permissionItemId,
  onSuccess,
  onError,
}) => {
  try {
    let { error, paymentIntent } = await paymentStore.stripe.confirmCardPayment(
      clientSecret,
      { payment_method: event.paymentMethod.id },
      { handleActions: true }
    );

    if(error) { throw error; }

    if(paymentIntent?.status === "requires_action") {
      const response = await paymentStore.stripe.confirmCardPayment(clientSecret);

      if(response.error) { throw response; }

      paymentIntent = response.paymentIntent;
    } else if(paymentIntent?.status !== "succeeded") {
      throw "Payment processing.";
    }

    await paymentStore.CompletePurchase({
      paymentIntent,
      clientReferenceId,
      permissionItemId
    });

    event.complete("success");
    onSuccess?.();
  } catch(error) {
    onError(error);
    event.complete("fail");
  }
};

export const Payment = observer(({
  params,
  url,
  showQR,
  onSuccess,
  onCancel,
  className=""
}) => {
  const [container, setContainer] = useState(undefined);
  const [error, setError] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);

  const [formDetails, setFormDetails] = useState({});

  useEffect(() => {
    if(!params) { return; }

    paymentStore.InitializeStripe(params.publishable_key)
      .then(() => {
        const elements = paymentStore.stripe.elements({ appearance: { theme: "night" } });
        const paymentRequest = paymentStore.stripe.paymentRequest({
          country: "US",
          currency: params.currency.toLowerCase(),
          total: { label: params.description, amount: params.amount },
          requestPayerName: false,
          requestPayerEmail: true,
          requestShipping: false
        });

        paymentRequest.canMakePayment().then(function (result) {
          if(result?.applePay || result?.googlePay) {
            // Wallet payment flow
            paymentRequest.on(
              "paymentmethod",
              async event => WalletPayment({
                event,
                onError: setError,
                onSuccess,
                clientSecret: params.client_secret,
                clientReferenceId: params.client_reference_id,
                permissionItemId: params.permissionItem.id
              })
            );

            setFormDetails({
              type: "wallet",
              element: elements.create("paymentRequestButton", {
                paymentRequest,
                style: {
                  paymentRequestButton: {type: "default", theme: "dark", height: "48px"}
                }
              })
            });
          } else {
            setFormDetails({
              type: "card",
              element: elements.create("card", {
                style: {
                  base: {
                    color: "#eee",
                    iconColor: "#bbb",
                    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
                    fontSize: "16px",
                    "::placeholder": {color: "#888"}
                  },
                  invalid: {color: "#ff6b6b", iconColor: "#ff6b6b"}
                }
              })
            });
          }
        });
      });
  }, [!!params]);

  useEffect(() => {
    if(!container || !formDetails?.element) { return; }

    container.innerHTML = "";
    formDetails.element.mount(container);
  }, [container, formDetails]);

  if(!params || !formDetails.type) {
    return (
      <div className={S("payment", "payment--loader")}>
        <Loader />
      </div>
    );
  }

  if(formDetails.type === "card" && showQR && url) {
    return (
      <div className={S("qr-container")}>
        <QRCode
          url={url.toString()}
          className={JoinClassNames(S("qr"), className)}
        />
      </div>
    );
  }

  return (
    <div className={JoinClassNames(S("payment"), className)}>
      {
        formDetails.type === "card" ?
          <div className={S("card")}>
            <div ref={setContainer} className={S("card__input")}/>
            <button
              disabled={submitting}
              onClick={async () => {
                try {
                  setSubmitting(true);
                  await CardPayment({
                    clientSecret: params.client_secret,
                    clientReferenceId: params.client_reference_id,
                    cardElement: formDetails.element,
                    permissionItemId: params.permissionItem.id
                  });

                  onSuccess?.();
                } catch(error) {
                  console.error(error);
                  if(typeof error === "string") {
                    setError(error);
                    // Let stripe form show validation errors
                  } else if(error?.type !== "validation_error") {
                    setError("Something went wrong, please try again");
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
              className={S("card__submit")}
            >
              Pay with Card
            </button>
          </div> :
          <div className={S("wallet")}>
            <div ref={setContainer} className={S("wallet__input")}/>
          </div>
      }
      <div className={S("terms")}>
        {
          !rootStore.mobileLandscape || !onCancel ? null :
            <Linkish onClick={onCancel}>
              BACK
            </Linkish>
        }
        <div>
          By purchasing you are accepting the <a target="_blank" href="https://eluv.io/terms" rel="noreferrer">Terms of Service.
        </a>
        </div>
      </div>
      {
        !error ? null :
          <div className={S("error")}>{error.toString()}</div>
      }
    </div>
  );
});

const Item = observer(({item}) => {
  return (
    <div className={S("item")}>
      {
        !item.access_title ? null :
          <div className={S("item__access-title")}>
            {item.access_title}
          </div>
      }
      <div className={S("item__title")}>
        {item.title}
      </div>
      <div className={S("item__price")}>
      {FormatPriceString(item.price)}
      </div>
      {
        !item.subtitle ? null :
          <div className={S("item__subtitle")}>
            {item.subtitle}
          </div>
      }
    </div>
  );
});

const PaymentPage = observer(() => {
  const {pocketSlugOrId, paymentParams} = useParams();
  const [success, setSuccess] = useState(false);
  const params = JSON.parse(Utils.FromB58ToStr(paymentParams));

  useEffect(() => {
    rootStore.Initialize({pocketSlugOrId, noMedia: true});
  }, []);

  if(!rootStore.initialized) {
    return (
      <div className={S("payment-page", "payment-page--centered")}>
        <Loader/>
      </div>
    );
  }

  if(success) {
    return (
      <div className={S("payment-page", "payment-page--centered")}>
        <div className={S("success")}>
          Thank you for your purchase!
        </div>
      </div>
    );
  }

  return (
    <div className={S("payment-page")}>
      <Item item={params.permissionItem} />
      <Payment
        params={params}
        onSuccess={() => setSuccess(true)}
        className={S("payment-page__payment")}
      />
    </div>
  );
});

export default PaymentPage;
