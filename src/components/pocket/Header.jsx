import HeaderStyles from "@/assets/stylesheets/modules/header.module.scss";

import {observer} from "mobx-react-lite";
import SVG from "react-inlinesvg";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {rootStore, pocketStore} from "@/stores/index.js";
import {useState} from "react";
import Modal from "@/components/common/Modal.jsx";

import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import Logo from "@/assets/icons/logo.svg";
import HomeIcon from "@/assets/icons/home.svg";
import ItemsIcon from "@/assets/icons/my-items.svg";
import PurchaseHistoryIcon from "@/assets/icons/purchase-history.svg";

const S = CreateModuleClassMatcher(HeaderStyles);

const HeaderButton = observer(({icon, children, onClick, active}) => {
  return (
    <Linkish onClick={onClick} className={S("button", active ? "button--active" : "")}>
      <div className={S("button__content")}>
        {
          !icon ? null :
            <SVG src={icon} className={S("button__icon")} />
        }
        <div className={S("button__text")}>
          { children }
        </div>
      </div>
    </Linkish>
  );
});

const MobileMenu = observer(({menuControls}) => {
  return (
    <div className={S("menu")}>
      <Linkish className={S("menu__link", "opacity-hover")}>
        <SVG src={ItemsIcon} />
        My Items
      </Linkish>
      <Linkish
        onClick={() => {
          rootStore.SetMenu("purchase-history");
          menuControls.Hide();
        }}
        className={S("menu__link", "opacity-hover")}
      >
        <SVG src={PurchaseHistoryIcon} />
        Purchase History
      </Linkish>
    </div>
  );
});

const MobileHeader = observer(({mediaItem}) => {
  const [mobileMenuControls, setMobileMenuControls] = useState(undefined);

  const logoKey = rootStore.mobile && pocketStore.pocket.metadata.header_logo_mobile ? "header_logo_mobile" :
    pocketStore.pocket.metadata.header_logo ? "header_logo" : "";

  let header;
  if(mediaItem && rootStore.backAction) {
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
    header = (
      <header key="header" className={S("header")}>
        <Linkish href={pocketStore.pocket.metadata.header_logo_link} className={S("logo")}>
          {
            logoKey ?
              <HashedLoaderImage
                width={200}
                src={pocketStore.pocket.metadata[logoKey].url}
                hash={pocketStore.pocket.metadata[`${logoKey}_hash`]}
                className={S("logo__image")}
              /> :
              <SVG src={Logo} alt="Eluvio"/>
          }
        </Linkish>
        <Linkish onClick={() => rootStore.SetMenu()} className={S("link")}>
          Watch
        </Linkish>
        <Linkish onClick={() => mobileMenuControls.Show()} className={S("link")}>
          <span>More</span>
          <SVG src={ChevronDownIcon} alt="More"/>
        </Linkish>
      </header>
    );
  }

  return (
    <>
      { header }
      <Modal align="top" SetMenuControls={setMobileMenuControls}>
        <MobileMenu menuControls={mobileMenuControls} />
      </Modal>
    </>
  );
});

const DesktopHeader = observer(({simple}) => {
  const logoKey = rootStore.mobile && pocketStore.pocket.metadata.header_logo_mobile ? "header_logo_mobile" :
    pocketStore.pocket.metadata.header_logo ? "header_logo" : "";

  return (
    <header key="header" className={S("header")}>
      <Linkish href={pocketStore.pocket.metadata.header_logo_link} className={S("logo")}>
        {
          logoKey ?
            <HashedLoaderImage
              width={200}
              src={pocketStore.pocket.metadata[logoKey].url}
              hash={pocketStore.pocket.metadata[`${logoKey}_hash`]}
              className={S("logo__image")}
            /> :
            <SVG src={Logo} alt="Eluvio"/>
        }
      </Linkish>
      {
        simple ? null :
          <>
            <HeaderButton active={!rootStore.menu} icon={HomeIcon} onClick={() => rootStore.SetMenu()}>
              Watch
            </HeaderButton>
            <HeaderButton active={rootStore.menu === "purchase-history"} icon={PurchaseHistoryIcon} onClick={() => rootStore.SetMenu("purchase-history")}>
              Purchase History
            </HeaderButton>
          </>
      }
    </header>
  );
});

const Header = observer(({mediaItem, simple}) =>
  rootStore.mobile && !simple ?
    <MobileHeader mediaItem={mediaItem} /> :
    <DesktopHeader simple={simple} />
);

export default Header;
