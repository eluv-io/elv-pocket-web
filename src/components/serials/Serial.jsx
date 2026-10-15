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

const SerialMediaProgressItem = observer(({type, active, finished, index}) => {
  if(type === "bumper") {
    return (
      <div
        id={`progress-item-${index}`}
        className={S("serial-progress__bumper-item", active || finished ? "serial-progress__bumper-item--active" : "")}
      />
    );
  }

  return (
    <div
      id={`progress-item-${index}`}
      className={S("serial-progress__item", "serial-progress__media-item", active ? "serial-progress__media-item--active" : "")}
    >
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

const SerialProgress = observer(({serialId, activeItemIndex}) => {
  const [progressSerialItems] = useState(pocketStore.ProgressSerialItems(serialId));

  useEffect(() => {
    // Scroll the progress so that the current item is roughly in the center
    setTimeout(() => {
      const item = document.querySelector(`#progress-item-${activeItemIndex}`);

      if(!item) { return; }

      item.parentElement.scrollTo({
        left:
          item.getBoundingClientRect().left + item.parentElement.scrollLeft -
          item.parentElement.getBoundingClientRect().left - (item.parentElement.getBoundingClientRect().width / 2),
        behavior: "smooth"
      });
    }, 250);
  }, [activeItemIndex]);

  let components = [];

  progressSerialItems.forEach(item => {
    if(item.type === "media") {
      components.push({
        type: "media",
        index: item.itemIndex,
        finished: item.itemIndex < activeItemIndex,
        active: item.itemIndex === activeItemIndex,
      });
    } else if(components.slice(-1)[0]?.type !== "bumper") {
      components.push({
        type: "bumper",
        index: item.itemIndex,
        finished: item.itemIndex < activeItemIndex,
        active: item.itemIndex === activeItemIndex,
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

let finishedBumpers = {};
const SerialItem = observer(({serialItemId, active, title, titleIcon, subtitle, item, SetScrollEnabled, Next}) => {
  const [ref, setRef] = useState(null);

  useEffect(() => {
    if(!active) { return; }

    if(item.type !== "bumper") {
      SetScrollEnabled(true);
    } else {
      const bumper = pocketStore.bumpers?.[item.bumper_id];

      if(!bumper?.passable) { return; }

      if(!finishedBumpers[serialItemId]) {
        SetScrollEnabled(false);
        setTimeout(() => ref?.scrollIntoView({behavior: "smooth"}), 250);
      }

      return () => finishedBumpers[serialItemId] = true;
    }
  }, [active]);

  let className, content;

  if(active) {
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
          SetScrollEnabled={SetScrollEnabled}
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
          subtitle={subtitle}
          contentTitle={mediaItem.title}
          contentSubtitle={mediaItem.subtitle}
          videoLink={mediaItem.media_link}
          videoLinkInfo={mediaItem.media_link_info}
          autohideControls
          showPlayPause
          showDetails
          saveSettings
          onEnd={Next}
          onProgress={progress => pocketStore.SetSerialProgress(progress)}
          className={S("serial-item__media", "serial-item__video")}
        />
      );
    }
  }

  return (
    <div
      ref={setRef}
      className={S("serial-item", className, active ? "serial-item--active" : "")}
    >
      {
        !active ? null :
          content
      }
    </div>
  );
});

const Serial = observer(({serialId, active, scrollEnabled, setScrollEnabled, className=""}) => {
  const [ref, setRef] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [visibleSerialItems] = useState(pocketStore.VisibleSerialItems(serialId));
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
        disabled={!scrollEnabled || activeItemIndex === 0}
        onClick={() => GetItemNodes(ref)[activeItemIndex - 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--horizontal", "serial-arrow--left")}
      >
        <SVG src={ChevronLeftIcon}/>
      </button>
      {
        !ref || !active ? null :
          <SerialProgress
            key={`progress-${serialId}-${active}`}
            serialId={serialId}
            activeItemIndex={activeItemIndex}
          />
      }
      <div
        ref={setRef}
        className={S("serial", active ? "serial--active" : "")}
      >
        {
          visibleSerialItems.map((item, itemIndex) =>
            <SerialItem
              key={`serial-item-${item.id}`}
              serialItemId={item.id}
              title={serial.title}
              titleIcon={{
                url: serial.title_icon?.url,
                hash: serial.title_icon_hash
              }}
              subtitle={serial.subtitle}
              item={item}
              active={active && itemIndex === activeItemIndex}
              SetScrollEnabled={setScrollEnabled}
              Next={
                itemIndex < visibleSerialItems.length - 1 ?
                  // Scroll to next item when this item finishes
                  () => GetItemNodes(ref)[itemIndex + 1]?.scrollIntoView({behavior: "smooth"}) :
                  // Last item should ensure scroll is re-enabled
                  () => setScrollEnabled(true)
              }
            />
          )
        }
      </div>
      <button
        disabled={!scrollEnabled || activeItemIndex >= visibleSerialItems.length - 1}
        onClick={() => GetItemNodes(ref)[activeItemIndex + 1]?.scrollIntoView({behavior: "smooth"})}
        className={S("serial-arrow", "serial-arrow--horizontal", "serial-arrow--right")}
      >
        <SVG src={ChevronRightIcon}/>
      </button>
    </div>
  );
});

export default Serial;
