import PurchaseStyles from "@/assets/stylesheets/modules/purchase.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {pocketStore, paymentStore, rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {FormatPriceString, HashedLoaderImage, Linkish, Loader} from "@/components/common/Common.jsx";
import {useEffect, useState} from "react";
import Carousel from "@/components/common/Carousel.jsx";
import {Payment} from "@/components/payment/Payment.jsx";

const S = CreateModuleClassMatcher(PurchaseStyles);

const MintingStatus = observer(({permissionItemId, confirmationId, Cancel}) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const statusInterval = setInterval(async () => {
      let status = await paymentStore.MintingStatus({permissionItemId, confirmationId});

      setStatus(status);

      if(status?.status === "complete") {
        clearInterval(statusInterval);
        setTimeout(() => pocketStore.LoadMedia(), 1500);
      } else if(status?.status === "failed") {
        clearInterval(statusInterval);
        setTimeout(() => Cancel(), 5000);
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

const PaymentActions = observer(({permissionItemId, Cancel}) => {
  const {pocketSlugOrId} = useParams();

  useEffect(() => {
    paymentStore.InitiatePurchase({pocketSlugOrId, permissionItemId})
      .then(() => paymentStore.StartPollPurchaseStatus({permissionItemId}));

    return () => paymentStore.StopPollPurchaseStatus({permissionItemId});
  }, []);

  if(
    paymentStore.purchaseDetails[permissionItemId]?.success ||
    paymentStore.purchaseStatus[permissionItemId]?.status === "succeeded"
  ) {
    return (
      <div className={S("payment__actions")}>
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
        showQR
        url={paymentStore.purchaseDetails[permissionItemId]?.url}
        params={paymentStore.purchaseDetails[permissionItemId]?.response}
        onCancel={Cancel}
      />
    </div>
  );
});

const SelectedItem = observer(({permissionItem, Cancel}) => {
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
            <div className={S("vertical-item__price")}>
              {FormatPriceString(permissionItem.marketplaceItem.price)}
            </div>
            {
              !permissionItem.subtitle ? null :
                <div className={S("vertical-item__subtitle")}>
                  {permissionItem.subtitle}
                </div>
            }
            <div className={S("vertical-item__actions")}>
              <Linkish
                onClick={Cancel}
                className={S("vertical-item__action")}
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
              <div className={S("vertical-item__price")}>
                {FormatPriceString(permissionItem.marketplaceItem.price)}
              </div>
              {
                !permissionItem.subtitle ? null :
                  <div className={S("vertical-item__subtitle")}>
                    {permissionItem.subtitle}
                  </div>
              }
            </div>
        }
        <PaymentActions permissionItemId={permissionItem.id} Cancel={Cancel} />
      </div>
    </div>
  );
});

const PurchaseItem = observer(({permissionItem, orientation="vertical", Select}) => {
  if(orientation === "vertical") {
    return (
      <div data-pid={permissionItem.id} className={S("vertical-item")}>
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
          <div className={S("vertical-item__price")}>
            {FormatPriceString(permissionItem.marketplaceItem.price)}
          </div>
          {
            !permissionItem.subtitle ? null :
              <div className={S("vertical-item__subtitle")}>
                {permissionItem.subtitle}
              </div>
          }
        </div>
        <div className={S("vertical-item__actions")}>
          <Linkish
            onClick={Select}
            className={S("vertical-item__action")}
          >
            SELECT
          </Linkish>
        </div>
      </div>
    );
  }

  return (
    <div data-pid={permissionItem.id} className={S("horizontal-item")}>
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
        <div className={S("horizontal-item__price")}>
          {FormatPriceString(permissionItem.marketplaceItem.price)}
        </div>
        <Linkish
          onClick={Select}
          className={S("horizontal-item__action")}
        >
          SELECT
        </Linkish>
      </div>
    </div>
  );
});


const Purchase = observer(({setShowPreview}) => {
  const {mediaItemSlugOrId} = useParams();
  const [selectedItemId, setSelectedItemId] = useState(null);

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);

  useEffect(() => {
    if(selectedItemId) {
      rootStore.SetBackAction(() => setSelectedItemId(undefined));
    } else if(rootStore.mobile) {
      rootStore.SetBackAction(() => setShowPreview(true));
    }

    return () => rootStore.SetBackAction(undefined);
  }, [selectedItemId]);

  if(!mediaItem) {
    return null;
  }

  const permissions = pocketStore.MediaItemPermissions(mediaItemSlugOrId);
  const orientation = rootStore.mobile && permissions.permissionItems.length > 2 ? "horizontal" : "vertical";

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
    </div>
  );
});

export default Purchase;
