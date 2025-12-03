import PocketStyles from "@/assets/stylesheets/modules/pocket.module.scss";

import {observer} from "mobx-react-lite";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import Header from "@/components/pocket/Header.jsx";
import Sidebar, {Banners} from "@/components/pocket/Sidebar.jsx";

const S = CreateModuleClassMatcher(PocketStyles);

const Page = observer(({children, mediaItem, permissions, hideSidebar, className=""}) => {
  return (
    <div className={JoinClassNames("page-container", className)}>
      {
        rootStore.mobileLandscape ? null :
          <Header
            mediaItem={mediaItem}
            authorized={permissions.authorized}
          />
      }
      <div
        key={`content-${pocketStore.pocket?.mediaLoadIndex}`}
        className={
          S(
            "content",
            pocketStore.hasTopBanners ? "content--with-top-banners" : "",
            permissions.authorized ? "content--authorized " : "content--unauthorized",
            hideSidebar ? "content--no-sidebar" : ""
          )
        }
      >
        {
          !rootStore.mobile || rootStore.mobileLandscape ? null :
            <Banners position="above" />
        }
        { children }
        {
          hideSidebar ? null :
            <Sidebar
              mediaItem={mediaItem}
              permissions={permissions}
            />
        }
      </div>
    </div>
  );
});

export default Page;
