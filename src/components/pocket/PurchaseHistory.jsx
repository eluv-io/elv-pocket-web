import PurchaseHistoryStyles from "@/assets/stylesheets/modules/purchase-history.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {pocketStore, rootStore} from "@/stores/index.js";
import {useState} from "react";
import Modal from "@/components/common/Modal.jsx";
import {useParams} from "wouter";
import SVG from "react-inlinesvg";

import XIcon from "@/assets/icons/x.svg";
import ReceiptExampleImage from "@/assets/images/receipt-example.jpg";

const S = CreateModuleClassMatcher(PurchaseHistoryStyles);

const RecoveryForm = observer(({menuControls, setMenuControls}) => {
  const {pocketSlugOrId} = useParams();
  const [input, setInput] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const Submit = async () => {
    if(input.length !== 12) { return; }

    setSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    await rootStore.Initialize({pocketSlugOrId, customUserIdCode: input, force: true});

    menuControls.Hide();
  };

  return (
    <Modal align="center" SetMenuControls={setMenuControls}>
      <div className={S("recovery")}>
        <div className={S("recovery__title-container")}>
          <div className={S("recovery__title")}>
            Recover Purchases
          </div>
          <div className={S("recovery__subtitle")}>
            Missing something? Add the PocketTV ID from your purchase receipt to recover it
          </div>
        </div>
        <div className={S("recovery__form")}>
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if(event.key === "Enter") {
                Submit();
              }
            }}
            onFocus={() => setIsInvalid(false)}
            onBlur={event => setIsInvalid(![0, 12].includes(event.target.value.length))}
            placeholder="Enter Your Pocket TV ID"
            className={S("input", "recovery__input", isInvalid ? "recovery__input--invalid" : "")}
          />
          <button
            disabled={input.length !== 12 || submitting}
            title={input.length !== 12 ? "Please enter a valid Pocket TV ID" : ""}
            onClick={() => Submit()}
            className={S("opacity-hover", "button", "recovery__submit")}
          >
            {
              submitting ?
                "CHECKING..." :
                "SUBMIT"
            }
          </button>
        </div>
        <div className={S("recovery__info")}>
          <div className={S("recovery__image-container")}>
            <img src={ReceiptExampleImage} alt="Purchase Receipt Example" className={S("recovery__image")} />
          </div>
          <div className={S("recovery__info-text")}>
            <div className={S("recovery__info-title")}>
              Where is my PocketTV ID?
            </div>
            <div className={S("recovery__info-description")}>
              Look for your emailed receipt, sent to you at the time of your purchase. The receipt’s sender will be Eluvio, Inc. Your PocketTV ID is located on your receipt above the name of the item you purchased.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

const PurchaseHistory = observer(() => {
  const [recoveryMenuControls, setRecoveryMenuControls] = useState(undefined);

  return (
    <>
      <div className={S("menu")}>
        <div className={S("block", "header")}>
          <span>Purchase History</span>
          <button
            title="Close Purchase History"
            onClick={() => rootStore.SetAttribute("showPurchaseHistory", false)}
            className={S("header__close")}
          >
            <SVG src={XIcon}/>
          </button>
        </div>
        {
          pocketStore.userItems.length === 0 ?
            <div className={S("block", "no-items")}>
              {"You haven't purchased any items yet"}
            </div> :
            pocketStore.userItems.map(item => {
              const permissionItem = pocketStore.permissionItems[item.permissionItemId];

              return (
                <div key={item.tokenId} className={S("block", "item")}>
                  <div className={S("item__name")}>
                    {item.name}
                  </div>
                  {
                    !permissionItem?.access_title && !item.metadata.edition_name ? null :
                      <div
                        style={{
                          backgroundColor: permissionItem.access_title_background_color,
                          color: permissionItem.access_title_text_color
                        }}
                        className={S("item__badge")}
                      >
                        { permissionItem?.access_title || item.metadata.edition_name }
                      </div>
                  }
                </div>
              );
            })
        }
        <div className={S("block", "missing")}>
          <div className={S("missing__text")}>
            <div>Missing something?</div>
            <div>Enter the PocketTV ID from your purchase receipt to recover it</div>
          </div>
          <div className={S("missing__actions")}>
            <button
              onClick={() => recoveryMenuControls?.Show()}
              className={S("opacity-hover", "button", "missing__action")}
            >
              RECOVER
            </button>
          </div>
        </div>
        <div className={S("block", "support")}>
          <div>
            Trouble accessing content?
          </div>
          <div>
            Visit this <a href={pocketStore.pocket.metadata.support_link || "https://eluviolive.zendesk.com/hc/en-us/requests/new"}>support link</a> for additional assistance.
          </div>
        </div>
      </div>
      <RecoveryForm
        menuControls={recoveryMenuControls}
        setMenuControls={setRecoveryMenuControls}
      />
    </>
  );
});

export default PurchaseHistory;
