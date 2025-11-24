import HeaderStyles from "@/assets/stylesheets/modules/header.module.scss";

import {observer} from "mobx-react-lite";
import SVG from "react-inlinesvg";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {rootStore} from "@/stores/index.js";
import {useState} from "react";
import Modal from "@/components/common/Modal.jsx";

import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import Logo from "@/assets/icons/logo.svg";
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

const Header = observer(({mediaItem, authorized}) => {
  const [menuControls, setMenuControls] = useState(undefined);

  let header;
  if(mediaItem && (rootStore.backAction || (rootStore.mobile && !authorized))) {
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
          {mediaItem.title}
        </div>
      </header>
    );
  } else {
    const logoKey = rootStore.mobile && rootStore.pocket.metadata.header_logo_mobile ? "header_logo_mobile" :
      rootStore.pocket.metadata.header_logo ? "header_logo" : "";
    header = (
      <header key="header" className={S("header")}>
        <Linkish href={rootStore.pocket.metadata.header_logo_link} className={S("logo")}>
          {
            logoKey ?
              <HashedLoaderImage
                width={200}
                src={rootStore.pocket.metadata[logoKey].url}
                hash={rootStore.pocket.metadata[`${logoKey}_hash`]}
                className={S("logo__image")}
              /> :
              <SVG src={Logo} alt="Eluvio"/>
          }
        </Linkish>
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
