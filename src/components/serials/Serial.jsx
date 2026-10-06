import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {observer} from "mobx-react-lite";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import Bumper from "@/components/serials/Bumper.jsx";
import Video from "@/components/common/Video.jsx";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index.js";
import {useEffect, useState} from "react";
import SVG from "react-inlinesvg";

import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";

const S = CreateModuleClassMatcher(SerialStyles);

const SerialMediaProgressItem = observer(({type, active, finished}) => {
  if(type === "bumper") {
    return <div className={S("serial-progress__bumper-item", active || finished ? "serial-progress__bumper-item--active" : "")} />;
  }

  return (
    <div className={S("serial-progress__item", "serial-progress__media-item")}>
      <div
        style={{
          width:
            finished ? "100%" :
              !active ? "0%" :
                `${Math.max(0, Math.min(100, (pocketStore.serialMediaProgress || 0) * 100))}%`
        }}
        className={S("serial-progress__media-item-progress")}
      />
    </div>
  );
});

const SerialProgress = observer(({serial, activeItemIndex}) => {
  let components = [];

  serial.items.forEach((item, index) => {
    if(item.type === "media") {
      components.push({
        type: "media",
        finished: index < activeItemIndex,
        active: index === activeItemIndex,
      });
    } else if(components.slice(-1)[0]?.type !== "bumper") {
      components.push({
        type: "bumper",
        finished: index < activeItemIndex,
        active: index === activeItemIndex,
      });
    }
  });

  return (
    <div
      key={`serial-progress-${rootStore.pageDimensions.width}`}
      style={{width: (document.querySelector(`.${S("serial")}`)?.getBoundingClientRect().width - 10)}}
      className={S("serial-progress")}
    >
      {
        components.map((props, index) =>
          <SerialMediaProgressItem key={`item-${index}`} {...props} />
        )
      }
    </div>
  );
});

const SerialItem = observer(({active, title, titleIcon, item, id}) => {
  let className, content;

  if(item.type === "bumper") {
    const bumper = pocketStore.bumpers?.[item.bumper_id];

    if(!bumper) {
      return null;
    }

    className = "serial-item--bumper";
    content = (
      <Bumper
        bumper={bumper}
        mobile
        unmute
        className={S("serial-item__bumper")}
      />
    );
  } else {
    const mediaItem = pocketStore.MediaItem(item.media_item_id);

    if(!mediaItem) {
      return null;
    }

    className = "serial-item--media";
    content = (
      <>
        <div className={S("serial-item__title-container")}>
          {
            !titleIcon ? null :
              <img src={titleIcon} alt="Title Icon" className={S("serial-item__title-icon")} />
          }
          <div className={S("serial-item__title")}>
            { title }
          </div>
        </div>
        <Video
          videoLink={mediaItem.media_link}
          videoLinkInfo={mediaItem.media_link_info}
          className={S("serial-item__media")}
          playerOptions={{
            autoplay: EluvioPlayerParameters.autoplay.OFF,
            keyboardControls: EluvioPlayerParameters.keyboardControls.ARROW_KEYS_DISABLED,
            muted: EluvioPlayerParameters.muted.OFF,
            controls: EluvioPlayerParameters.controls.OFF,
            capLevelToPlayerSize: true,
            showLoader: false,
            backgroundColor: "transparent",
          }}
        />
      </>
    );
  }

  return (
    <div className={S("serial-item", className, active ? "serial-item--active" : "")}>
      {
        !active ? null :
          content
      }
    </div>
  );
});

const Serial = observer(({serialId, index, active, className=""}) => {
  const [ref, setRef] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const serial = pocketStore.Serial(serialId);

  const GetItemNodes = ref => Array.from(ref?.querySelectorAll(`.${S("serial-item")}`) || []);

  useEffect(() => {
    if(!ref) { return; }

    let debounceTimeout;
    const FindCurrent = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        const left = ref.getBoundingClientRect().left;

        let closest = 1000;
        let closestIndex = 0;
        GetItemNodes(ref)
          .forEach((node, i) => {
            const diff = Math.abs(left - node.getBoundingClientRect().left);

            if(diff < closest) {
              closest = diff;
              closestIndex = i;
            }
          });

        setActiveItemIndex(closestIndex);
      }, 10);
    };

    ref.addEventListener("scroll", FindCurrent);

    return () => ref.removeEventListener("scroll", FindCurrent);
  });

  console.log(activeItemIndex);
  return (
    <div className={JoinClassNames(S("serial-wrapper"), className)}>
      <button
        disabled={activeItemIndex === 0}
        onClick={() => GetItemNodes(ref)[activeItemIndex - 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--horizontal", "serial-arrow--left")}
      >
        <SVG src={ChevronLeftIcon}/>
      </button>
      {
        !ref || !active ? null :
          <SerialProgress
            serial={serial}
            activeItemIndex={activeItemIndex}
          />
      }
      <div
        ref={setRef}
        className={S("serial", active ? "serial--active" : "")}
      >
        {
          serial.items.map((item, itemIndex) =>
            <SerialItem
              key={`serial-item-${item.id}`}
              id={`serial-item-${index}-${item.id}`}
              title={serial.title}
              titleIcon={serial.title_icon?.url}
              item={item}
              active={active && itemIndex === activeItemIndex}
            />
          )
        }
      </div>
      <button
        disabled={activeItemIndex >= serial.items.length - 1}
        onClick={() => GetItemNodes(ref)[activeItemIndex + 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--horizontal", "serial-arrow--right")}
      >
        <SVG src={ChevronRightIcon}/>
      </button>
    </div>
  );
});

export default Serial;
