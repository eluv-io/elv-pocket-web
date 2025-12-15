import HeaderStyles from "@/assets/stylesheets/modules/header.module.scss";

import {observer} from "mobx-react-lite";
import SVG from "react-inlinesvg";
import {HashedLoaderImage, Linkish} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {rootStore, pocketStore} from "@/stores/index.js";
import {useEffect, useState} from "react";
import Modal from "@/components/common/Modal.jsx";

import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import Logo from "@/assets/icons/logo.svg";
import ItemsIcon from "@/assets/icons/my-items.svg";
import PurchaseHistoryIcon from "@/assets/icons/purchase-history.svg";

const S = CreateModuleClassMatcher(HeaderStyles);

const MobileMenu = observer(({menuControls}) => {
  return (
    <div className={S("menu")}>
      <Linkish
        onClick={() => {
          rootStore.SetMenu("my-items");
          menuControls.Hide();
        }}
        className={S("menu__link", "opacity-hover")}
      >
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

const HeaderMenu = observer(() => {
  const [showMenu, setShowMenu] = useState(false);
  const [mobileMenuControls, setMobileMenuControls] = useState(undefined);
  const [menuElement, setMenuElement] = useState(undefined);

  useEffect(() => {
    setShowMenu(false);
    setMobileMenuControls(undefined);
  }, [rootStore.mobile]);

  useEffect(() => {
    if(menuElement && showMenu) {
      // Click outside handler
      const onClickOutside = () => {
        setTimeout(() => {
          if(!menuElement.contains(document.activeElement)) {
            setShowMenu(false);
          }
        }, 100);
      };

      window.addEventListener("focusout", onClickOutside, {passive: true});
      window.addEventListener("blur", onClickOutside, {passive: true});

      return () => {
        window.removeEventListener("focusout", onClickOutside);
        window.removeEventListener("blur", onClickOutside);
      };
    }
  }, [showMenu, menuElement]);

  return (
    <>
      <div ref={setMenuElement} className={S("header-menu")}>
        <Linkish
          onClick={() => {
            if(rootStore.mobile) {
              mobileMenuControls.Show();
            } else {
              setShowMenu(!showMenu);
            }
          }}
          className={S("header-menu__button")}
        >
          <span>More</span>
          <SVG src={ChevronDownIcon} alt="More"/>
        </Linkish>
        {
          !showMenu ? null :
            <div className={S("header-menu__dropdown")}>
              <Linkish
                autoFocus={true}
                onClick={() => {
                  rootStore.SetMenu("my-items");
                  setShowMenu(false);
                }}
                className={S("header-menu__option")}
              >
                <SVG src={ItemsIcon} />
                <span>My Items</span>
              </Linkish>
              <Linkish
                onClick={() => {
                  rootStore.SetMenu("purchase-history");
                  setShowMenu(false);
                }}
                className={S("header-menu__option")}
              >
                <SVG src={PurchaseHistoryIcon} />
                <span>Purchase History</span>
              </Linkish>
            </div>
        }
      </div>
      {
        !rootStore.mobile ? null :
          <Modal align="top" SetMenuControls={setMobileMenuControls}>
            <MobileMenu menuControls={mobileMenuControls} />
          </Modal>
      }
    </>
  );
});

const MobileHeader = observer(({mediaItem}) => {
  const logoKey = rootStore.mobile && pocketStore.pocket.metadata.header_logo_mobile ? "header_logo_mobile" :
    pocketStore.pocket.metadata.header_logo ? "header_logo" : "";

  if(mediaItem && rootStore.backAction) {
    return (
      <header key="header--back" className={S("header", "header--back")}>
        {
          !rootStore.backAction ? null :
            <Linkish
              onClick={() => rootStore.GoBack()}
              className={S("back")}
            >
              <SVG src={ChevronLeftIcon} alt="Eluvio"/>
            </Linkish>
        }
        <div className={S("logo")}>
          {
            logoKey ?
              <HashedLoaderImage
                width={400}
                src={pocketStore.pocket.metadata[logoKey].url}
                hash={pocketStore.pocket.metadata[`${logoKey}_hash`]}
                className={S("logo__image")}
              /> :
              <SVG src={Logo} alt="Eluvio"/>
          }
        </div>
        <div className={S("title", "ellipsis")}>
          {mediaItem.title}
        </div>
      </header>
    );
  } else {
    return (
      <header key="header" className={S("header")}>
        <Linkish href={pocketStore.pocket.metadata.header_logo_link} className={S("logo")}>
          {
            logoKey ?
              <HashedLoaderImage
                width={400}
                src={pocketStore.pocket.metadata[logoKey].url}
                hash={pocketStore.pocket.metadata[`${logoKey}_hash`]}
                className={S("logo__image")}
              /> :
              <SVG src={Logo} alt="Eluvio"/>
          }
        </Linkish>
        <HeaderMenu />
      </header>
    );
  }
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
              width={400}
              src={pocketStore.pocket.metadata[logoKey].url}
              hash={pocketStore.pocket.metadata[`${logoKey}_hash`]}
              className={S("logo__image")}
            /> :
            <SVG src={Logo} alt="Eluvio"/>
        }
      </Linkish>
      {
        simple ? null :
          <HeaderMenu />
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
