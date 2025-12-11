import PurchaseHistoryStyles from "@/assets/stylesheets/modules/purchase-history.module.scss";

import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {pocketStore, rootStore} from "@/stores/index.js";
import {useEffect, useState} from "react";
import Modal from "@/components/common/Modal.jsx";
import {CopyableField} from "@/components/common/Common.jsx";
import {useParams} from "wouter";

const S = CreateModuleClassMatcher(PurchaseHistoryStyles);

const AccountForm = observer(() => {
  const {pocketSlugOrId} = useParams();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const Submit = async () => {
    if(input.length !== 12) { return; }

    setSubmitting(true);

    await rootStore.Initialize({pocketSlugOrId, customUserIdCode: input, force: true});
  };

  return (
    <div className={S("account")}>
      <div className={S("account__message")}>
        Missing something? Add the PocketTV ID from your purchase receipt.
      </div>
      <div className={S("account__form")}>
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if(event.key === "Enter") {
              Submit();
            }
          }}
          placeholder="Enter Your Pocket TV ID"
          className={S("input", "account__input")}
        />
        <button
          disabled={input.length !== 12 || submitting}
          title={input.length !== 12 ? "Please enter a valid Pocket TV ID" : ""}
          onClick={() => Submit()}
          className={S("opacity-hover", "account__submit")}
        >
          {
            submitting ?
              "CHECKING..." :
              "SUBMIT"
          }
        </button>
      </div>
      <div className={S("account__id")}>
        Your current Pocket TV ID:
        <CopyableField value={rootStore.userIdCode}>
          { rootStore.userIdCode }
        </CopyableField>
      </div>
    </div>
  );
});

const PurchaseHistory = observer(() => {
  const [menuControls, setMenuControls] = useState(undefined);

  useEffect(() => {
    if(!menuControls) {
      return;
    }

    rootStore.menu === "purchase-history" ?
      menuControls.Show() :
      menuControls.Hide();

  }, [menuControls, rootStore.menu]);

  return (
    <Modal onHide={() => rootStore.SetMenu()} align="center" SetMenuControls={setMenuControls}>
      <div className={S("menu")}>
        <AccountForm />
        {
          pocketStore.userItems.length === 0 ?
            <div className={S("no-items")}>
              {"You haven't purchased any items yet"}
            </div> :
            pocketStore.userItems.map(item =>
              <div key={item.id} className={S("item")}>
                <div className={S("item__name")}>
                  { item.name }
                </div>
                <div className={S("item__badge")}>
                  { item.metadata.edition_name }
                </div>
              </div>
            )
        }
        <div className={S("support")}>
          <div>
            Trouble accessing content?
          </div>
          <div>
            Email <a href="mailto:support@eluv.io">support@eluv.io</a> with your purchase receipt.
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default PurchaseHistory;
