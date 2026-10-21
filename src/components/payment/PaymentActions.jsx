import PaymentStyles from "@/assets/stylesheets/modules/payment.module.scss";

import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {paymentStore, pocketStore, rootStore} from "@/stores/index.js";
import {Loader} from "@/components/common/Common.jsx";
import {useParams} from "wouter";
import {Payment} from "@/components/payment/Payment.jsx";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";

const S = CreateModuleClassMatcher(PaymentStyles);

const MintingStatus = observer(({permissionItemId, confirmationId}) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const statusInterval = setInterval(async () => {
      let status = await paymentStore.MintingStatus({permissionItemId, confirmationId});

      setStatus(status);

      if(status?.status === "complete") {
        clearInterval(statusInterval);

        const permissionItem = pocketStore.permissionItems[permissionItemId];
        pocketStore.AnalyticsEvent({
          eventType: "purchase",
          params: {
            transaction_id: confirmationId,
            currency: paymentStore.currency,
            value: permissionItem?.marketplaceItem?.price?.[paymentStore.currency],
            items: [{
              item_id: permissionItem?.marketplaceItem.sku,
              item_name: permissionItem?.title,
              price: permissionItem?.marketplaceItem?.price?.[paymentStore.currency],
              quantity: 1
            }]
          }
        });

        setTimeout(async () => {
          await pocketStore.Reload({
            toastMessage: {
              title: permissionItem?.toast_message_title || "Purchase Successful",
              subtitle: permissionItem?.toast_message_subtitle || permissionItem.title
            }
          });
          rootStore.SetAttribute("showAdditionalPurchaseOptions", false);
        }, 3500);
      } else if(status?.status === "failed") {
        clearInterval(statusInterval);
      }
    }, 1000);

    return () => clearInterval(statusInterval);
  }, [permissionItemId, confirmationId]);

  if(status?.status === "failed") {
    return (
      <div className={S("payment-actions__error")}>
        Something went wrong, please try again
      </div>
    );
  }

  return (
    <div className={S("payment-actions__status")}>
      <Loader/>
    </div>
  );
});

const PaymentActions = observer(({permissionItemId, title, Cancel, className=""}) => {
  const {pocketSlugOrId} = useParams();

  useEffect(() => {
    paymentStore.InitiatePurchase({pocketSlugOrId, permissionItemId, title})
      .then(() => paymentStore.StartPollPurchaseStatus({permissionItemId}));

    return () => paymentStore.StopPollPurchaseStatus({permissionItemId});
  }, []);

  if(
    paymentStore.purchaseDetails[permissionItemId]?.success ||
    paymentStore.purchaseStatus[permissionItemId]?.status === "succeeded"
  ) {
    return (
      <div className={JoinClassNames(S("payment-actions__status"), className)}>
        <MintingStatus
          permissionItemId={permissionItemId}
          confirmationId={paymentStore.purchaseDetails[permissionItemId].response.client_reference_id}
        />
      </div>
    );
  }

  return (
    <div className={JoinClassNames(S("payment-actions"), className)}>
      <Payment
        showQR={!rootStore.mobile}
        //showQR
        url={paymentStore.purchaseDetails[permissionItemId]?.url}
        params={paymentStore.purchaseDetails[permissionItemId]?.response}
        onCancel={Cancel}
        className={S("payment-actions__form")}
      />
    </div>
  );
});

export default PaymentActions;
