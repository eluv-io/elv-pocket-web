import CommonStyles from "@/assets/stylesheets/modules/common.module.scss";

import {observer} from "mobx-react-lite";
import Modal from "@/components/common/Modal.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {useEffect, useState} from "react";
import {pocketStore} from "@/stores/index.js";
import {useParams} from "wouter";

const S = CreateModuleClassMatcher(CommonStyles);

const PreviewPasswordForm = observer(() => {
  const {pocketSlugOrId} = useParams();
  const [modalControls, setModalControls] = useState(undefined);
  const [password, setPassword] = useState("");
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if(!modalControls) { return; }

    modalControls.Show();
  }, [modalControls]);

  useEffect(() => {
    setValid(true);
  }, [password]);

  const Submit = async () => {
    if(!(await pocketStore.SetPassword({pocketSlugOrId, password}))) {
      setValid(false);
    }
  };

  return (
    <Modal align="center" closable={false} SetMenuControls={setModalControls}>
      <div className={S("preview-password")}>
        <h1 className={S("preview-password__message")}>Please enter the preview password to proceed</h1>
        <input
          autoFocus
          aria-errormessage={valid ? undefined : "Invalid Password"}
          placeholder="Password"
          type="password"
          value={password}
          onKeyDown={event => event.key === "Enter" && Submit()}
          onChange={event => setPassword(event.target.value)}
          className={S("preview-password__input", !valid ? "preview-password__input--invalid" : "")}
        />
        <div className={S("preview-password__actions")}>
          <button onClick={Submit} className={S("preview-password__action", "opacity-hover")}>
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
});

export default PreviewPasswordForm;
