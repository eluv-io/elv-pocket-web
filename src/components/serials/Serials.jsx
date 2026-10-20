import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {observer} from "mobx-react-lite";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import Serial from "@/components/serials/Serial.jsx";
import {useEffect, useState} from "react";

import ChevronUpIcon from "@/assets/icons/chevron-up.svg";
import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import SVG from "react-inlinesvg";
import Modal from "@/components/common/Modal.jsx";
import PurchaseHistory from "@/components/pocket/PurchaseHistory.jsx";
import {MyItemsContainer} from "@/components/pocket/Sidebar.jsx";

const S = CreateModuleClassMatcher(SerialStyles);

const PurchaseHistoryModal = observer(() => {
  const [modalControls, setModalControls] = useState(undefined);

  useEffect(() => {
    if(!modalControls) { return; }

    if(rootStore.showPurchaseHistory) {
      modalControls.Show();
    } else {
      modalControls.Hide();
    }
  }, [modalControls, rootStore.showPurchaseHistory]);

  return (
    <Modal align="center" SetMenuControls={setModalControls} onHide={() => rootStore.SetAttribute("showPurchaseHistory", false)}>
      <PurchaseHistory className={S("serial-modal-menu")} />
    </Modal>
  );
});

const MyItemsModal = observer(() => {
  const [modalControls, setModalControls] = useState(undefined);

  useEffect(() => {
    if(!modalControls) { return; }

    if(rootStore.showMyItems) {
      modalControls.Show();
    } else {
      modalControls.Hide();
    }
  }, [modalControls, rootStore.showMyItems]);

  return (
    <Modal align="center" SetMenuControls={setModalControls} onHide={() => rootStore.SetAttribute("showMyItems", false)}>
      <MyItemsContainer className={S("serial-modal-menu")}/>
    </Modal>
  );
});

const Serials = observer(() => {
  const [ref, setRef] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [rendered, setRendered] = useState(false);

  const GetItemNodes = ref => Array.from(ref?.querySelectorAll(`.${S("serials-container__item")}`) || []);

  useEffect(() => {
    // Initial buffer until content is visible to allow for scrolling to the right position
    setTimeout(() => setRendered(true), 500);
  }, []);

  useEffect(() => {
    if(!ref) { return; }

    let debounceTimeout;
    const FindCurrent = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        let closest = 1000;
        let closestIndex = 0;
        GetItemNodes(ref)
          .forEach((node, i) => {
            const diff = Math.abs(node.getBoundingClientRect().top);

            if(diff < closest) {
              closest = diff;
              closestIndex = i;
            }
          });

        setActiveIndex(closestIndex);
      }, 100);
    };

    ref.addEventListener("scroll", FindCurrent);

    return () => ref.removeEventListener("scroll", FindCurrent);
  }, [ref]);

  return (
    <div className={S("serial-page", !rendered ? "serial-page--loading" : "", !scrollEnabled ? "serial-page--scroll-disabled" : "")}>
      <button
        disabled={!scrollEnabled || activeIndex === 0}
        onClick={() => GetItemNodes(ref)[activeIndex - 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--vertical", "serial-arrow--top")}
      >
        <SVG src={ChevronUpIcon}/>
      </button>
      <div ref={setRef} className={S("serials-container")}>
        {
          pocketStore.serialList.map(({serialId}, index) =>
            <Serial
              active={index === activeIndex}
              serialId={serialId}
              index={index}
              key={`${serialId}-${index}`}
              scrollEnabled={scrollEnabled}
              setScrollEnabled={setScrollEnabled}
              className={S("serials-container__item")}
            />
          )
        }
      </div>
      <button
        disabled={!scrollEnabled || activeIndex >= pocketStore.serialList.length - 1}
        onClick={() => GetItemNodes(ref)[activeIndex + 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--vertical", "serial-arrow--bottom")}
      >
        <SVG src={ChevronDownIcon}/>
      </button>
      <MyItemsModal />
      <PurchaseHistoryModal />
    </div>
  );
});

export default Serials;
