import BumperStyles from "@/assets/stylesheets/modules/bumpers.module.scss";

import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import Video from "@/components/common/Video.jsx";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";

const S = CreateModuleClassMatcher(BumperStyles);

const BumperOffer = observer(({offer, format, compact}) => {
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
            <button className={S("compact-offer__button", `compact-offer__button--${offer.display.button_variant}`)}>
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
        <button className={S("offer__button", `offer__button--${offer.display.button_variant}`)}>
          {offer.display.button_text}
        </button>
      </div>
    );
  }

  return (
    <button className={S("offer-button")}>
      { offer.display.button_text }
    </button>
  );
});

export const Bumper = observer(({bumper, mobile, className=""}) => {
  const [player, setPlayer] = useState(undefined);

  const showCompactOffers = bumper.offers.format === "details" && bumper.offers.items.length > 2;

  const imageUrl = mobile ? bumper.image_mobile?.url : bumper.image?.url;
  const position = mobile ? bumper.offers?.position_mobile || "center" : bumper.offers?.position || "bottom_right";
  const showOfferTextBackground = mobile && bumper.offers.format === "button" && (bumper.offers.title || bumper.offers.subtitle);

  const videoLink = mobile ? bumper.video_mobile : bumper.video;
  const videoLinkInfo = mobile ? bumper.video_mobile && bumper.video_mobile_info : bumper.video && bumper.video_info;

  return (
    <div className={JoinClassNames(S("bumper", mobile ? "bumper--mobile" : "", bumper.blur ? "bumper--blur" : ""), className)}>
      {
        !imageUrl ? null :
          <div className={S("bumper__image-container")}>
            <img alt={bumper.image_alt} src={imageUrl} className={S("bumper__image")}/>
          </div>
      }
      {
        !videoLink ? null :
          <div className={S("bumper__video-container")}>
            <Video
              aspectRatio={mobile ? 9/16 : 16/9}
              videoLink={videoLink}
              videoLinkInfo={videoLinkInfo}
              className={S("bumper__video")}
              playerOptions={{
                muted: EluvioPlayerParameters.muted.OFF,
                autoplay: EluvioPlayerParameters.autoplay.OFF,
                controls: EluvioPlayerParameters.controls.OFF,
                loop: bumper.loop,
                capLevelToPlayerSize: true,
                showLoader: false,
                backgroundColor: "transparent",
              }}
              SetPlayer={setPlayer}
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
        {
          (bumper.offers?.items || []).length === 0 ? null :
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
              <div className={S("bumper__offer-items")}>
                {
                  bumper.offers.items.map((offer, index) =>
                    <BumperOffer
                      key={`offer-${index}`}
                      format={bumper.offers.format}
                      compact={showCompactOffers}
                      offer={offer}
                    />
                  )
                }
              </div>
              {
                !bumper.offers.bottom_text ? null :
                  <div className={S("bumper__offers-bottom-text")}>{bumper.offers.bottom_text}</div>
              }
            </div>
        }
      </div>
    </div>
  );
});

export default Bumper;
