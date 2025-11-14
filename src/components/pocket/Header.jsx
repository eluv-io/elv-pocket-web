import HeaderStyles from "@/assets/stylesheets/modules/header.module.scss";

import {observer} from "mobx-react-lite";
import SVG from "react-inlinesvg";
import {Linkish} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {rootStore} from "@/stores/index.js";
import {useState} from "react";
import Modal from "@/components/common/Modal.jsx";

import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";
import ItemsIcon from "@/assets/icons/videos.svg";
import PurchaseHistoryIcon from "@/assets/icons/purchase-history.svg";

const S = CreateModuleClassMatcher(HeaderStyles);

const Menu = observer(() => {
  return (
    <div className={S("menu")}>
      <Linkish className={S("menu__link", "opacity-hover")}>
        <SVG src={ItemsIcon} />
        My Items
      </Linkish>
      <Linkish className={S("menu__link", "opacity-hover")}>
        <SVG src={PurchaseHistoryIcon} />
        Purchase History
      </Linkish>
    </div>
  );
});

const Header = observer(({pocketMediaItem, authorized}) => {
  const [menuControls, setMenuControls] = useState(undefined);

  let header;
  if(pocketMediaItem && (rootStore.backAction || (rootStore.mobile && !authorized))) {
    header = (
      <header key="header--back" className={S("header", "header--back")}>
        {
          !rootStore.backAction ? null :
            <Linkish
              onClick={() => rootStore.GoBack()}
              className={S("logo", "back")}
            >
              <SVG src={ChevronLeftIcon} alt="Eluvio"/>
            </Linkish>
        }
        <div className={S("title", "ellipsis")}>
          {pocketMediaItem.display.title}
        </div>
      </header>
    );
  } else {
    header = (
      <header key="header" className={S("header")}>
        <div className={S("logo")}>
          <SVG src={EIcon} alt="Eluvio"/>
        </div>
        <Linkish className={S("link")}>
          Watch
        </Linkish>
        <Linkish onClick={() => menuControls.Show()} className={S("link")}>
          <span>More</span>
          <SVG src={ChevronDownIcon} alt="More"/>
        </Linkish>
      </header>
    );
  }

  return (
    <>
      { header }
      <Modal align="top" SetMenuControls={setMenuControls}>
        <Menu open={menuControls?.open} />
      </Modal>
    </>
  );
});

export default Header;
