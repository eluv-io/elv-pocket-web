import {useEffect} from "react"
import {rootStore} from "@/stores/index.js";
import {Route, Switch} from "wouter";
import Pocket from "@/components/pocket/Pocket.jsx";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";

const S = CreateModuleClassMatcher();

const Base = () => {
  return (
    <div className="page-container">
      Eluvio Pocket TV
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
      <Route path="/:pocketIdOrSlug/*?">
        <Pocket />
      </Route>
      <Route>
        <Base />
      </Route>
    </Switch>
  )
};

export default App;
