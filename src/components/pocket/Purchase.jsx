import PurchaseStyles from "@/assets/stylesheets/modules/purchase.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {pocketStore, paymentStore, rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {FormatPriceString, HashedLoaderImage, Linkish, Loader} from "@/components/common/Common.jsx";
import {useEffect, useState} from "react";
import Carousel from "@/components/common/Carousel.jsx";
import {Payment} from "@/components/payment/Payment.jsx";
import SVG from "react-inlinesvg";

import XIcon from "@/assets/icons/x.svg";

const S = CreateModuleClassMatcher(PurchaseStyles);

const PermissionItemPrice = observer(({permissionItem, className}) =>
  permissionItem.type === "external" && !permissionItem?.price?.USD ? null :
    <div className={className}>
      {
        FormatPriceString(
          permissionItem.type === "external" ?
            permissionItem?.price :
            permissionItem?.marketplaceItem?.price
        )
      }
    </div>
);

const MintingStatus = observer(({permissionItemId, confirmationId}) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const statusInterval = setInterval(async () => {
      let status = await paymentStore.MintingStatus({permissionItemId, confirmationId});

      setStatus(status);

      if(status?.status === "complete") {
        clearInterval(statusInterval);
        setTimeout(async () => {
          await pocketStore.LoadMedia();
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
      <div className={S("payment__error")}>
        Something went wrong, please try again
      </div>
    );
  }

  return (
    <div className={S("payment__status")}>
      <Loader/>
    </div>
  );
});

const PaymentActions = observer(({permissionItemId, mediaItem, Cancel}) => {
  const {pocketSlugOrId} = useParams();

  useEffect(() => {
    paymentStore.InitiatePurchase({pocketSlugOrId, permissionItemId, mediaTitle: mediaItem.title})
      .then(() => paymentStore.StartPollPurchaseStatus({permissionItemId}));

    return () => paymentStore.StopPollPurchaseStatus({permissionItemId});
  }, []);

  if(
    paymentStore.purchaseDetails[permissionItemId]?.success ||
    paymentStore.purchaseStatus[permissionItemId]?.status === "succeeded"
  ) {
    return (
      <div className={S("payment__status")}>
        <MintingStatus
          permissionItemId={permissionItemId}
          confirmationId={paymentStore.purchaseDetails[permissionItemId].response.client_reference_id}
        />
      </div>
    );
  }

  return (
    <div className={S("payment__actions")}>
      <Payment
        showQR={!rootStore.mobile && !rootStore.isLocal}
        //showQR
        url={paymentStore.purchaseDetails[permissionItemId]?.url}
        params={paymentStore.purchaseDetails[permissionItemId]?.response}
        onCancel={Cancel}
        className={S("payment__form")}
      />
    </div>
  );
});

const SelectedItem = observer(({permissionItem, mediaItem, Cancel}) => {
  return (
    <div className={S("selected-item")}>
      {
        rootStore.mobile ? null :
          <div className={S("vertical-item")}>
            {
              !permissionItem.access_title ? null :
                <div className={S("vertical-item__access-title")}>
                  {permissionItem.access_title}
                </div>
            }
            <div className={S("vertical-item__title")}>
              {permissionItem.title}
            </div>
            <PermissionItemPrice permissionItem={permissionItem} className={S("vertical-item__price")} />
            {
              !permissionItem.subtitle ? null :
                <div className={S("vertical-item__subtitle")}>
                  {permissionItem.subtitle}
                </div>
            }
            <div className={S("vertical-item__actions")}>
              <Linkish
                onClick={Cancel}
                className={S("styled-secondary-button", "opacity-hover", "vertical-item__action")}
              >
                BACK
              </Linkish>
            </div>
          </div>
      }
      <div className={S("payment")}>
        {
          !rootStore.mobile ? null :
            <div className={S("payment__item-info")}>
              {
                !permissionItem.access_title ? null :
                  <div className={S("vertical-item__access-title")}>
                    {permissionItem.access_title}
                  </div>
              }
              <div className={S("vertical-item__title")}>
                {permissionItem.title}
              </div>
              <PermissionItemPrice permissionItem={permissionItem} className={S("vertical-item__price")} />
              {
                !permissionItem.subtitle ? null :
                  <div className={S("vertical-item__subtitle")}>
                    {permissionItem.subtitle}
                  </div>
              }
            </div>
        }
        <PaymentActions
          mediaItem={mediaItem}
          permissionItemId={permissionItem.id}
          Cancel={Cancel}
        />
      </div>
    </div>
  );
});

const PurchaseItem = observer(({permissionItem, orientation="vertical", Select}) => {
  if(permissionItem.subsumed) {
    return null;
  }

  if(orientation === "vertical") {
    return (
      <div data-pid={permissionItem.id} className={S("vertical-item", permissionItem.owned ? "vertical-item--owned" : "")}>
        <div className={S("vertical-item__details")}>
          {
            !permissionItem.access_title ? null :
              <div className={S("vertical-item__access-title")}>
                {permissionItem.access_title}
              </div>
          }
          <div className={S("vertical-item__title")}>
            {permissionItem.title}
          </div>
          <PermissionItemPrice permissionItem={permissionItem} className={S("vertical-item__price")}/>
          {
            !permissionItem.subtitle ? null :
              <div className={S("vertical-item__subtitle")}>
                {permissionItem.subtitle}
              </div>
          }
        </div>
        <div className={S("vertical-item__actions")}>
          <Linkish
            onClick={permissionItem.type === "owned_item" ? Select : undefined}
            href={permissionItem.type === "external" ? permissionItem.link : undefined}
            className={S("styled-button", "opacity-hover", "vertical-item__action")}
          >
            { permissionItem.owned ? "SELECTED" : "SELECT" }
          </Linkish>
        </div>
      </div>
    );
  }

  return (
    <div data-pid={permissionItem.id} className={S("horizontal-item", permissionItem.owned ? "horizontal-item--owned" : "")}>
      <div className={S("horizontal-item__details")}>
        {
          !permissionItem.access_title ? null :
            <div className={S("horizontal-item__access-title")}>
              {permissionItem.access_title}
            </div>
        }
        <div className={S("horizontal-item__title")}>
          {permissionItem.title}
        </div>
        {
          !permissionItem.subtitle ? null :
            <div className={S("horizontal-item__subtitle")}>
              {permissionItem.subtitle}
            </div>
        }
      </div>
      <div className={S("horizontal-item__actions")}>
        <PermissionItemPrice permissionItem={permissionItem} className={S("horizontal-item__price")} />
        <Linkish
          onClick={Select}
          className={S("styled-button", "opacity-hover", "horizontal-item__action")}
        >
          { permissionItem.owned ? "SELECTED" : "SELECT" }
        </Linkish>
      </div>
    </div>
  );
});


const Purchase = observer(({setShowPreview}) => {
  const {mediaItemSlugOrId} = useParams();
  const [selectedItemId, setSelectedItemId] = useState(null);

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);
  const permissions = pocketStore.MediaItemPermissions({mediaItem});

  useEffect(() => {
    if(selectedItemId) {
      rootStore.SetBackAction(() => setSelectedItemId(undefined));
    } else if(rootStore.mobile) {
      if(permissions.authorized) {
        rootStore.SetBackAction(() => rootStore.SetAttribute("showAdditionalPurchaseOptions", false));
      } else {
        rootStore.SetBackAction(() => setShowPreview(true));
      }
    }

    return () => rootStore.SetBackAction(undefined);
  }, [selectedItemId]);

  if(!mediaItem) {
    return null;
  }

  const orientation = rootStore.mobile && permissions.displayedPermissionItems.length > 2 ? "horizontal" : "vertical";

  return (
    <div key={mediaItemSlugOrId} className={S("purchase", rootStore.mobileLandscape ? "purchase--fullscreen" : "")}>
      {
        rootStore.mobile ? null :
          <>
            <HashedLoaderImage
              src={
                mediaItem.poster_image?.url ||
                pocketStore.splashImage.url
              }
              hash={
                mediaItem.poster_image_hash ||
                pocketStore.splashImage.hash
              }
              className={S("background")}
            />
            <div className={S("background-cover")} />
          </>
      }
      {
        !rootStore.mobile && !selectedItemId ?
          <Carousel className={S("item-carousel")}>
            {
              permissions.permissionItems.map((permissionItem, index) =>
                  selectedItemId && selectedItemId !== permissionItem.id ? null :
                    <PurchaseItem
                      orientation={orientation}
                      key={permissionItem.id + index}
                      selected={selectedItemId === permissionItem.id}
                      Select={() => setSelectedItemId(permissionItem.id)}
                      permissionItem={permissionItem}
                    />
                )
            }
          </Carousel> :
          <div className={S("items", `items--${orientation}`)}>
            {
              selectedItemId ?
                <SelectedItem
                  mediaItem={mediaItem}
                  permissionItem={permissions.permissionItems.find(item => item.id === selectedItemId)}
                  Cancel={() => setSelectedItemId(undefined)}
                /> :
                permissions.permissionItems.map(permissionItem =>
                  selectedItemId && selectedItemId !== permissionItem.id ? null :
                    <PurchaseItem
                      orientation={orientation}
                      key={permissionItem.id}
                      selected={selectedItemId === permissionItem.id}
                      Select={() => setSelectedItemId(permissionItem.id)}
                      permissionItem={permissionItem}
                    />
                )
            }
          </div>
      }

      {
        !rootStore.showAdditionalPurchaseOptions ? null :
          <button
            title="Back to Media"
            onClick={() => rootStore.SetAttribute("showAdditionalPurchaseOptions", false)}
            className={S("close", "opacity-hover")}
          >
            <SVG src={XIcon} />
          </button>
      }
    </div>
  );
});

export default Purchase;
