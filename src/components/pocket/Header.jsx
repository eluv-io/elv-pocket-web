import HeaderStyles from "@/assets/stylesheets/modules/header.module.scss";

import {observer} from "mobx-react-lite";
import SVG from "react-inlinesvg";
import {Linkish} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {rootStore} from "@/stores/index.js";

import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";

const S = CreateModuleClassMatcher(HeaderStyles);

const Header = observer(({pocketMediaItem, authorized}) => {
  if(pocketMediaItem && (rootStore.backAction || (rootStore.mobile && !authorized))) {
    return (
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
  }


  return (
    <header key="header" className={S("header")}>
      <div className={S("logo")}>
        <SVG src={EIcon} alt="Eluvio"/>
      </div>
      <Linkish className={S("link")}>
        Watch
      </Linkish>
      <Linkish className={S("link")}>
        <span>More</span>
        <SVG src={ChevronDownIcon} alt="More" />
      </Linkish>
    </header>
  );
});

export default Header;
