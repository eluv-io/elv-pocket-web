import CommonStyles from "@/assets/stylesheets/modules/common.module.scss";
import {observer} from "mobx-react-lite";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import {useEffect, useState} from "react";
import SVG from "react-inlinesvg";

import BackIcon from "@/assets/icons/chevron-left.svg";
import ForwardIcon from "@/assets/icons/chevron-right.svg";

const S = CreateModuleClassMatcher(CommonStyles);

const Carousel = observer(({children, className=""}) => {
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const [visibility, setVisibility] = useState([]);

  useEffect(() => {
    if(!containerRef) { return; }

    let updateTimeout;
    const Update = () => {
      if(updateTimeout) {
        return;
      }

      updateTimeout = setTimeout(() => {
        const items = Array.from(containerRef?.children)?.filter(element => !element.dataset.ignore);
        const parentDimensions = containerRef.getBoundingClientRect();

        setVisibility(
          items.map(child => {
            const dimensions = child.getBoundingClientRect();

            const visibleLeft = dimensions.left > 0;
            const visibleRight = dimensions.right > 0 && dimensions.right < parentDimensions.width;


            return visibleLeft && visibleRight;
          })
        );

        updateTimeout = undefined;
      }, 50);
    };

    Update();

    containerRef.addEventListener("scroll", Update);
    document.addEventListener("resize", Update);

    return () => {
      containerRef.removeEventListener("scroll", Update);
      document.removeEventListener("resize", Update);
    };
  }, [containerRef]);

  const ScrollTo = index => {
    if(!containerRef) { return; }

    const items = Array.from(containerRef?.children)?.filter(element => !element.dataset.ignore);
    items[index]?.scrollIntoView({behavior: "smooth"});
    setLastActiveIndex(index);
  };

  let previousIndex = visibility.findIndex((visible, index) => !visible && visibility[index + 1]);
  let nextIndex = visibility.findIndex((visible, index) => !visible && visibility[index - 1]);

  // If visibility is uncertain, ensure something is set using previously seen index
  if(previousIndex < 0 && nextIndex < 0) {
    previousIndex = lastActiveIndex > 0 ? lastActiveIndex - 1 : -1;
    nextIndex = lastActiveIndex + 1 > containerRef?.children.length - 3 ? -1 : lastActiveIndex + 1;
  }

  return (
    <div ref={setContainerRef} className={JoinClassNames(S("carousel"), className)}>
      <button
        data-ignore="true"
        disabled={previousIndex < 0}
        onClick={() => ScrollTo(previousIndex)}
        className={S("carousel__button", "carousel__button--previous")}
      >
        <SVG src={BackIcon} alt="Back" />
      </button>
      {children}
      <button
        data-ignore="true"
        disabled={nextIndex < 0}
        onClick={() => ScrollTo(nextIndex)}
        className={S("carousel__button", "carousel__button--next")}
      >
        <SVG src={ForwardIcon} alt="Forward" />
      </button>
    </div>
  );
});

export default Carousel;
