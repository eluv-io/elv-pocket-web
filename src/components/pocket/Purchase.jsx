import PurchaseStyles from "@/assets/stylesheets/modules/purchase.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {FormatPriceString, HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {useState} from "react";
import ApplePayImage from "@/assets/images/apple-pay.svg";
import SVG from "react-inlinesvg";

const S = CreateModuleClassMatcher(PurchaseStyles);

const SelectedItem = observer(({permissionItem, Cancel}) => {
  return (
    <div className={S("selected-item")}>
      <div className={S("item")}>
        {
          !permissionItem.access_title ? null :
            <div className={S("item__access-title")}>
              {permissionItem.access_title}
            </div>
        }
        <div className={S("item__title")}>
          {permissionItem.title}
        </div>
        <div className={S("item__price")}>
          {FormatPriceString(permissionItem.marketplaceItem.price)}
        </div>
        {
          !permissionItem.subtitle ? null :
            <div className={S("item__subtitle")}>
              {permissionItem.subtitle}
            </div>
        }
        <div className={S("item__select-container")}>
          <Linkish
            onClick={Cancel}
            className={S("item__select")}
          >
            BACK
          </Linkish>
        </div>
      </div>
      <div className={S("payment")}>
        {
          !rootStore.mobile ? null :
            <div className={S("payment__item-info")}>
              {
                !permissionItem.access_title ? null :
                  <div className={S("item__access-title")}>
                    {permissionItem.access_title}
                  </div>
              }
              <div className={S("item__title")}>
                {permissionItem.title}
              </div>
              <div className={S("item__price")}>
                {FormatPriceString(permissionItem.marketplaceItem.price)}
              </div>
              {
                !permissionItem.subtitle ? null :
                  <div className={S("item__subtitle")}>
                    {permissionItem.subtitle}
                  </div>
              }
            </div>
        }
        <div className={S("payment__options")}>
          <Linkish
            onClick={() => {}}
            className={S("payment__option", "payment__option--apple")}
          >
            <SVG src={ApplePayImage} alt="Apple Pay" />
          </Linkish>
          {
            !rootStore.mobile ? null :
              <Linkish
                onClick={Cancel}
                className={S("payment__option", "payment__option--back")}
              >
                BACK
              </Linkish>
          }
        </div>
        <div className={S("payment__terms")}>
          By purchasing you are accepting the <a target="_blank" href="https://eluv.io/terms" rel="noreferrer">Terms of Service.</a>
        </div>
      </div>
    </div>
  );
});

const PurchaseItem = observer(({permissionItem, Select}) => {
  return (
    <div className={S("item")}>
      {
        !permissionItem.access_title ? null :
          <div className={S("item__access-title")}>
            {permissionItem.access_title}
          </div>
      }
      <div className={S("item__title")}>
        {permissionItem.title}
      </div>
      <div className={S("item__price")}>
        {FormatPriceString(permissionItem.marketplaceItem.price)}
      </div>
      {
        !permissionItem.subtitle ? null :
          <div className={S("item__subtitle")}>
            {permissionItem.subtitle}
          </div>
      }
      <div className={S("item__select-container")}>
        <Linkish
          onClick={Select}
          className={S("item__select")}
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

  if(!media) {
    return null;
  }

  const permissions = rootStore.PocketMediaItemPermissions(pocketMediaSlugOrId);

  return (
    <div key={pocketMediaSlugOrId} className={S("purchase")}>
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
      <div className={S("items")}>
        {
          selectedItemId ?
            <SelectedItem
              permissionItem={permissions.permissionItems.find(item => item.id === selectedItemId)}
              Cancel={() => setSelectedItemId(undefined)}
            /> :
            permissions.permissionItems.map(permissionItem =>
              selectedItemId && selectedItemId !== permissionItem.id ? null :
                <PurchaseItem
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
