import ModalStyles from "@/assets/stylesheets/modules/modal.module.scss";

import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import SVG from "react-inlinesvg";

import XIcon from "@/assets/icons/x.svg";

const S = CreateModuleClassMatcher(ModalStyles);

const Modal = observer(({children, align="center", SetMenuControls, onHide}) => {
  const [dialog, setDialog] = useState(undefined);
  const [container, setContainer] = useState(undefined);
  const [controls, setControls] = useState({});
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if(!dialog) {
      setControls({Show: () => {}, Hide: () => {}});
      return;
    }

    const Show = () => {
      setOpen(true);
      setClosing(false);
      dialog.showModal();
    };

    const Hide = () => {
      setOpen(false);
      setClosing(true);

      if(!dialog.open) {
        return;
      }

      onHide?.();

      setTimeout(() => {
        setClosing(false);
        dialog.close();
      }, 250);
    };

    setControls({Show, Hide});

    const DialogObserver = new MutationObserver(records => {
      records.forEach( (record) => {
        if(record.attributeName !== "open") { return; }
        if(record.target.hasAttribute("open")) {
          record.target.dispatchEvent(new CustomEvent("dialog-open"));
        }
      });
    });

    DialogObserver.observe(dialog, {attributes: true});

    dialog.addEventListener("dialog-open", Show);
    dialog.addEventListener("close", Hide);

    return () => {
      dialog.removeEventListener("dialog-open", Show);
      dialog.removeEventListener("close", Hide);
    };
  }, [dialog]);

  useEffect(() => {
    if(Object.keys(controls).length === 0) {
      return;
    }

    SetMenuControls?.({
      ...controls,
      open,
      closing
    });
  }, [controls, open, closing]);

  useEffect(() => {
    if(!open) { return; }

    container?.scrollTo(0, 0);
  }, [open]);

  return (
    <dialog
      ref={setDialog}
      onClick={controls.Hide}
      className={S("modal", `modal--align-${align}`, open ? "modal--visible" : "modal--hidden")}
    >
      <div ref={setContainer} className={S("container")}>
        <button
          onClick={() => controls.Hide()}
          className={S("close", "opacity-hover")}
        >
          <SVG src={XIcon}/>
        </button>
        <div
          onClick={event => {
            event.stopPropagation();
            event.preventDefault();
          }}
          className={S("content")}
        >
          {open || closing ? children : null}
        </div>
      </div>
    </dialog>
  );
});

export default Modal;
