import BumperStyles from "@/assets/stylesheets/modules/bumpers.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import SerialVideo from "@/components/serials/SerialVideo.jsx";
import {CircleTimer, HashedLoaderImage} from "@/components/common/Common.jsx";

const S = CreateModuleClassMatcher(BumperStyles);

const BumperOffer = observer(({offer, format, compact, Next}) => {
  const onClick = () => {
    switch(offer.action?.behavior) {
      case "continue":
        Next?.();
        break;
      case "link":
        window.open(offer.action.url);
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
              !offer.display.price ? null :
                <div className={S("compact-offer__price")}>
                  { offer.display.price }
                </div>
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
          !offer.display.price ? null :
            <div className={S("offer__price")}>
              { offer.display.price }
            </div>
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

export const Bumper = observer(({bumper, mobile, Next, className=""}) => {
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
              muteIfNecessary
              showPlayPause={false}
              showTimer={!bumper.duration && !bumper.loop}
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
    </div>
  );
});

export default Bumper;
