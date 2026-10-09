import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {observer} from "mobx-react-lite";
import {pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import Serial from "@/components/serials/Serial.jsx";
import {useEffect, useState} from "react";

import ChevronUpIcon from "@/assets/icons/chevron-up.svg";
import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import SVG from "react-inlinesvg";

const S = CreateModuleClassMatcher(SerialStyles);

const Serials = observer(() => {
  const [ref, setRef] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const GetItemNodes = ref => Array.from(ref?.querySelectorAll(`.${S("serials-container__item")}`) || []);

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
    <div className={S("serial-page")}>
      <button
        disabled={activeIndex === 0}
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
              className={S("serials-container__item")}
            />
          )
        }
      </div>
      <button
        disabled={activeIndex >= pocketStore.serialList.length - 1}
        onClick={() => GetItemNodes(ref)[activeIndex + 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--vertical", "serial-arrow--bottom")}
      >
        <SVG src={ChevronDownIcon}/>
      </button>
    </div>
  );
});

export default Serials;
