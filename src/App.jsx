import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {Route, Switch} from "wouter";
import Pocket from "@/components/pocket/Pocket.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import SVG from "react-inlinesvg";

import EIcon from "@/assets/icons/E_Logo_DarkMode_Transparent.svg";
import Payment from "@/components/payment/Payment.jsx";
import FAQPage from "@/components/pocket/FAQ.jsx";

const S = CreateModuleClassMatcher();

const ClearAccount = () => {
  useEffect(() => rootStore.ResetAccount(), []);

  return (
    <div className="page-container home-page">
      <div style={{marginTop: 50, fontSize: 24, fontWeight: "bold"}}>
        Account Reset
      </div>
    </div>
  );
};

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
      <Route path="/clear">
        <ClearAccount />
      </Route>
      <Route path="/:pocketSlugOrId/clear">
        <ClearAccount />
      </Route>
      <Route path="/:pocketSlugOrId/faq">
        <FAQPage />
      </Route>
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
