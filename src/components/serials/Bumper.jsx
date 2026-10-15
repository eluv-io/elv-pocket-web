import BumperStyles from "@/assets/stylesheets/modules/bumpers.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import SerialVideo from "@/components/serials/SerialVideo.jsx";
import {CircleTimer, HashedLoaderImage, PermissionItemPrice} from "@/components/common/Common.jsx";
import {useState} from "react";
import PaymentActions from "@/components/payment/PaymentActions.jsx";
import {pocketStore} from "@/stores/index.js";

const S = CreateModuleClassMatcher(BumperStyles);

const BumperPurchase = observer(({offer, Cancel}) => {
  const permissionItem = pocketStore.permissionItems[offer.permission_item_id];

  return (
    <div className={S("purchase-container")}>
      <div className={S("purchase")}>
        <div className={S("purchase__offer")}>
          {
            !permissionItem.access_title ? null :
              <div className={S("purchase__offer-subtitle")}>
                {permissionItem.access_title}
              </div>
          }
          <div className={S("purchase__offer-title")}>
            {permissionItem.title}
          </div>
          <PermissionItemPrice permissionItem={permissionItem} className={S("purchase__offer-price")} />
          {
            !permissionItem.subtitle ? null :
              <div className={S("purchase__offer-subtitle")}>
                {permissionItem.subtitle}
              </div>
          }
          {
            !permissionItem.description ? null :
              <div className={S("purchase__offer-description")}>
                { permissionItem.description }
              </div>
          }
        </div>
        <PaymentActions
          title={offer.title}
          permissionItemId={offer.permission_item_id}
          className={S("purchase__actions")}
          Cancel={Cancel}
        />
        <button onClick={Cancel} className={S("purchase__back")}>
          Back
        </button>
      </div>
    </div>
  );
});

const BumperOffer = observer(({offer, format, compact, SetPurchaseOffer, Next}) => {
  const onClick = () => {
    switch(offer.action?.behavior) {
      case "continue":
        Next?.();
        break;
      case "link":
        window.open(offer.action.url);
        break;
      case "purchase":
        SetPurchaseOffer(offer);
        break;
    }
  };

  if(format === "details") {
    if(compact) {
      return (
        <div className={S("compact-offer")}>
          <div className={S("compact-offer__text")}>
            {
              !offer.display.subtitle ? null :
                <div className={S("compact-offer__subtitle")}>
                { offer.display.subtitle }
                </div>
            }
            {
              !offer.display.title ? null :
                <div className={S("compact-offer__title")}>
                  { offer.display.title }
                </div>
            }
            {
              !offer.display.description ? null :
                <div className={S("compact-offer__description")}>
                  { offer.display.description }
                </div>
            }
          </div>
          <div className={S("compact-offer__action")}>
            {
              offer.action?.behavior === "purchase" ?
                <PermissionItemPrice
                  permissionItem={pocketStore.permissionItems[offer.permission_item_id]}
                  className={S("compact-offer__price")}
                /> :
                offer.display.price ?
                  <div className={S("compact-offer__price")}>
                    { offer.display.price }
                  </div> : null
            }
            <button
              onClick={onClick}
              className={S("compact-offer__button", `compact-offer__button--${offer.display.button_variant}`)}
            >
              {offer.display.button_text}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={S("offer")}>
        {
          !offer.display.subtitle ? null :
            <div className={S("offer__subtitle")}>
              { offer.display.subtitle }
            </div>
        }
        {
          !offer.display.title ? null :
            <div className={S("offer__title")}>
              { offer.display.title }
            </div>
        }
        {
          offer.action?.behavior === "purchase" ?
            <PermissionItemPrice
              permissionItem={pocketStore.permissionItems[offer.permission_item_id]}
              className={S("offer__price")}
            /> :
            offer.display.price ?
              <div className={S("offer__price")}>
                { offer.display.price }
              </div> : null
        }
        {
          !offer.display.description ? null :
            <div className={S("offer__description")}>
              { offer.display.description }
            </div>
        }
        <div className={S("offer__spacer")} />
        <button
          onClick={onClick}
          className={S("offer__button", `offer__button--${offer.display.button_variant}`)}
        >
          {offer.display.button_text}
        </button>
      </div>
    );
  }

  return (
    <button onClick={onClick} className={S("offer-button")}>
      { offer.display.button_text }
    </button>
  );
});

// Bumpers that have already been viewed can be skipped
export const Bumper = observer(({bumper, mobile, Next, className=""}) => {
  const [purchaseOffer, setPurchaseOffer] = useState(null);
  const showCompactOffers = bumper.offers.format === "details" && bumper.offers.items.length > 2;

  const imageUrl = mobile ? bumper.image_mobile?.url : bumper.image?.url;
  const imageHash = mobile ? bumper.image_mobile_hash : bumper.image_hash;
  const position = mobile ? bumper.offers?.position_mobile || "center" : bumper.offers?.position || "bottom_right";
  const showOfferTextBackground = mobile && bumper.offers.format === "button" && (bumper.offers.title || bumper.offers.subtitle);

  const videoLink = mobile ? bumper.video_mobile : bumper.video;
  const videoLinkInfo = mobile ? bumper.video_mobile && bumper.video_mobile_info : bumper.video && bumper.video_info;

  return (
    <div
      className={JoinClassNames(S("bumper", mobile ? "bumper--mobile" : "", bumper.blur ? "bumper--blur" : ""), className)}>
      {
        !imageUrl ? null :
          <div className={S("bumper__image-container")}>
            <HashedLoaderImage
              alt={bumper.image_alt}
              src={imageUrl}
              hash={imageHash}
              className={S("bumper__image")}
            />
          </div>
      }
      {
        !videoLink ? null :
          <div className={S("bumper__video-container")}>
            <SerialVideo
              videoLink={videoLink}
              videoLinkInfo={videoLinkInfo}
              className={S("bumper__video")}
              playerOptions={{loop: bumper.loop}}
              autohideControls={false}
              muteIfNecessary
              showPlayPause={false}
              showTimer={!bumper.duration && !bumper.loop}
              pause={!!purchaseOffer}
              onEnd={!bumper.duration && !bumper.loop ? Next : undefined}
            />
          </div>
      }
      {
        !bumper.duration ? null :
          <div className={S("bumper__timer-container")}>
            <CircleTimer
              duration={bumper.duration}
              onEnd={Next}
              className={S("bumper__timer")}
            />
          </div>
      }
      {
        purchaseOffer ?
          <BumperPurchase
            offer={purchaseOffer}
            Cancel={() => setPurchaseOffer(undefined)}
          /> :
          <div
            className={
              S(
                "bumper__content",
                `bumper__content--${position}`,
                showOfferTextBackground ? "bumper__content--with-offer-text" : ""
              )
            }
          >
            <div
              className={
                S(
                  "bumper__offers",
                  `bumper__offers--${bumper.offers.format}`,
                  showCompactOffers ? "bumper__offers--compact" : ""
                )
              }
            >
              {
                !bumper.offers.title ? null :
                  <div className={S("bumper__offers-title")}>{bumper.offers.title}</div>
              }
              {
                !bumper.offers.subtitle ? null :
                  <div className={S("bumper__offers-subtitle")}>{bumper.offers.subtitle}</div>
              }
              {
                (bumper.offers?.items || []).length === 0 ? null :
                  <div className={S("bumper__offer-items")}>
                    {
                      bumper.offers.items.map((offer, index) =>
                        <BumperOffer
                          key={`offer-${index}`}
                          format={bumper.offers.format}
                          compact={showCompactOffers}
                          offer={offer}
                          SetPurchaseOffer={setPurchaseOffer}
                          Next={Next}
                        />
                      )
                    }
                  </div>
              }
              {
                !bumper.offers.bottom_text ? null :
                  <div className={S("bumper__offers-bottom-text")}>{bumper.offers.bottom_text}</div>
              }
            </div>
          </div>
        }
    </div>
  );
});

export default Bumper;
