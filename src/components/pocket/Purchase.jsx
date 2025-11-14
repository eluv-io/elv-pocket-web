import PurchaseStyles from "@/assets/stylesheets/modules/purchase.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {paymentStore, rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {FormatPriceString, HashedLoaderImage, Linkish, Loader} from "@/components/common/Common.jsx";
import {useEffect, useState} from "react";
import ApplePayImage from "@/assets/images/apple-pay.svg";
import SVG from "react-inlinesvg";

const S = CreateModuleClassMatcher(PurchaseStyles);

const PurchaseStatus = observer(({permissionItemId, confirmationId, Cancel}) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    //let count = 0;
    const statusInterval = setInterval(async () => {
      let status = await paymentStore.PurchaseStatus({permissionItemId, confirmationId});

      /*
        // For testing
        count += 1;

        if(count >= 3) {
          status = { status: "complete" };
        }
       */

      setStatus(status);

      if(status?.status === "complete") {
        clearInterval(statusInterval);
        setTimeout(() => rootStore.LoadMedia(), 1500);
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
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [error, setError] = useState();

  useEffect(() => {
    setTimeout(() => setError(undefined), 5000);
  }, [error]);

  return (
    <div key={!!error} className={S("payment__actions")}>
      <div key="options" className={S("payment__options")}>
        <Linkish
          onClick={async () => {
            const {result, confirmationId} = await paymentStore.PurchaseApplePay({permissionItemId});
            if(result?.error && !result?.error?.cancelled) {
              setError(result.error);
            } else if(!result?.error) {
              setConfirmationId(confirmationId);
            }
          }}
          className={S("payment__option", "payment__option--apple")}
        >
          <SVG src={ApplePayImage} alt="Apple Pay"/>
        </Linkish>
      </div>
      <div className={S("payment__terms")}>
        {
          !rootStore.mobileLandscape ? null :
            <Linkish onClick={Cancel}>
              BACK
            </Linkish>
        }
        <div>
          By purchasing you are accepting the <a target="_blank" href="https://eluv.io/terms" rel="noreferrer">Terms of Service.</a>
        </div>
      </div>
      {
        !error ? null :
          <div key="error" className={S("payment__error")}>
            Something went wrong, please try again
          </div>
      }
      {
        !confirmationId ? null :
          <PurchaseStatus
            permissionItemId={permissionItemId}
            confirmationId={confirmationId}
            Cancel={() => setConfirmationId(undefined)}
          />
      }
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
            <div className={S("vertical-item__select-container")}>
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
      <div className={S("vertical-item")}>
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
    <div className={S("horizontal-item")}>
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

const Purchase = observer(() => {
  const {pocketMediaSlugOrId} = useParams();
  const [selectedItemId, setSelectedItemId] = useState(null);

  const media = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  useEffect(() => {
    if(selectedItemId) {
      rootStore.SetBackAction(() => setSelectedItemId(undefined));
    }

    return () => rootStore.SetBackAction(undefined);
  }, [selectedItemId]);

  if(!media) {
    return null;
  }

  const permissions = rootStore.PocketMediaItemPermissions(pocketMediaSlugOrId);
  const orientation = rootStore.mobile || permissions.permissionItems.length > 3 ? "horizontal" : "vertical";

  return (
    <div key={pocketMediaSlugOrId} className={S("purchase", rootStore.mobileLandscape ? "purchase--fullscreen" : "")}>
      {
        rootStore.mobile ? null :
          <>
            <HashedLoaderImage
              src={
                media.mediaItem.poster_image?.url ||
                rootStore.splashImage.url
              }
              hash={
                media.mediaItem.poster_image_hash ||
                rootStore.splashImage.hash
              }
              className={S("background")}
            />
            <div className={S("background-cover")} />
          </>
      }
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
    </div>
  );
});

export default Purchase;
