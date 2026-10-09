import SerialStyles from "@/assets/stylesheets/modules/serials.module.scss";

import {observer} from "mobx-react-lite";
import {rootStore, pocketStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, JoinClassNames} from "@/utils/Utils.js";
import Bumper from "@/components/serials/Bumper.jsx";
import {useEffect, useState} from "react";
import SVG from "react-inlinesvg";

import ChevronLeftIcon from "@/assets/icons/chevron-left.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";
import SerialVideo from "@/components/serials/SerialVideo.jsx";

const S = CreateModuleClassMatcher(SerialStyles);

const SerialMediaProgressItem = observer(({type, active, finished}) => {
  if(type === "bumper") {
    return <div className={S("serial-progress__bumper-item", active || finished ? "serial-progress__bumper-item--active" : "")} />;
  }

  return (
    <div className={S("serial-progress__item", "serial-progress__media-item", active ? "serial-progress__media-item--active" : "")}>
      <div className={S("serial-progress__media-item-active-background")} />
      <div
        style={{
          width:
            finished ? "100%" :
              !active ? "0%" :
                `${Math.max(0, Math.min(100, (pocketStore.currentSerialItemProgress || 0) * 100))}%`
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

const SerialItem = observer(({active, title, titleIcon, item, Next}) => {
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
        Next={Next}
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
      <SerialVideo
        title={title}
        titleIcon={titleIcon}
        contentTitle={mediaItem.title}
        contentSubtitle={mediaItem.subtitle}
        videoLink={mediaItem.media_link}
        videoLinkInfo={mediaItem.media_link_info}
        showPlayPause
        showDetails
        saveSettings
        onEnd={Next}
        onProgress={progress => pocketStore.SetSerialProgress(progress)}
        className={S("serial-item__media", "serial-item__video")}
      />
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
            key={`progress-${serialId}-${active}`}
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
              titleIcon={{
                url: serial.title_icon?.url,
                hash: serial.title_icon_hash
              }}
              item={item}
              active={active && itemIndex === activeItemIndex}
              Next={
                itemIndex >= serial.items.length - 1 ? null :
                  () => GetItemNodes(ref)[itemIndex + 1]?.scrollIntoView({behavior: "smooth"})
              }
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
