import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {Route, Switch} from "wouter";
import Pocket from "@/components/pocket/Pocket.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import SVG from "react-inlinesvg";

import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";
import Payment from "@/components/payment/Payment.jsx";

const S = CreateModuleClassMatcher();

const Base = () => {
  return (
    <div className="page-container home-page">
      <div className={S("logo")}>
        <SVG src={EIcon} alt="Eluvio"/>
        <span>POCKET TV</span>
      </div>
    </div>
  );
};


const App = () => {
  useEffect(() => {
    const HandleResize = () => rootStore.UpdatePageDimensions();
    HandleResize();

    window.addEventListener("resize", HandleResize);
    window.addEventListener("orientationchange", HandleResize);

    return () => {
      window.removeEventListener("orientationchange", HandleResize);
      window.removeEventListener("resize", HandleResize);
    };
  }, []);

  return (
    <Switch>
      <Route path="/:pocketSlugOrId/pay/:paymentParams">
        <Payment />
      </Route>
      <Route path="/:pocketSlugOrId/:mediaItemSlugOrId?">
        <Pocket />
      </Route>
      <Route>
        <Base />
      </Route>
    </Switch>
  );
};

export default App;
