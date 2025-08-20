import MediaStyles from "@/assets/stylesheets/modules/media.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import Video from "@/components/common/Video.jsx";
import {useEffect, useState} from "react";
import Countdown from "@/components/pocket/Countdown.jsx";
import {HashedLoaderImage} from "@/components/common/Common.jsx";

const S = CreateModuleClassMatcher(MediaStyles);

const MediaCountdown = observer(({mediaItem, setStarted}) => {
  if(!mediaItem.scheduleInfo.isLiveContent) {
    return null;
  }

  const backgroundKey = rootStore.mobile && mediaItem.display.countdown_background_mobile ?
    "countdown_background_mobile" :
    "countdown_background_desktop";

  return (
    <div className={S("countdown-page")}>
      <HashedLoaderImage
        src={
          mediaItem.display[backgroundKey]?.url ||
          rootStore.splashImage.url
        }
        hash={
          mediaItem.display[`${backgroundKey}_hash`]?.url ||
          rootStore.splashImage.hash
        }
        alt={mediaItem.display.title}
        className={S("countdown-page__image")}
      />
      <div className={S("countdown-page__cover")}/>
      <div className={S("countdown-page__content")}>
        {
          mediaItem.display.icons?.length === 0 ? null :
            <div className={S("countdown-page__icons")}>
              {mediaItem.display.icons.map(({icon, icon_hash, alt_text}, index) =>
                <HashedLoaderImage
                  key={`icon-${index}`}
                  src={icon.url}
                  hash={icon_hash}
                  alt={alt_text}
                  className={S("countdown-page__icon")}
                />
              )}
            </div>
        }
        {
          (mediaItem.display.headers || []).length === 0 ? null :
            <div className={S("countdown-page__headers")}>
              {mediaItem.display.headers.map((header, index) =>
                <div key={`header-${index}`} className={S("countdown-page__header")}>{header}</div>
              )}
            </div>
        }
        <div className={S("countdown-page__title")}>
          {mediaItem.display.title}
        </div>
        <Countdown
          displayTime={mediaItem.scheduleInfo.startTime}
          time={mediaItem.scheduleInfo.streamStartTime}
          OnEnded={() => setStarted(true)}
          className={S("countdown-page__countdown")}
        />
      </div>
    </div>
  );
});

const Media = observer(() => {
  const {pocketMediaSlugOrId} = useParams();

  const media = rootStore.PocketMediaItem(pocketMediaSlugOrId);
  const scheduleInfo = media?.mediaItem && rootStore.MediaItemScheduleInfo(media.mediaItem);
  const [started, setStarted] = useState(!scheduleInfo.isLiveContent || scheduleInfo.started);

  useEffect(() => {
    setStarted(!scheduleInfo.isLiveContent || scheduleInfo.started);
  }, [pocketMediaSlugOrId, scheduleInfo]);

  if(!media) {
    return null;
  }

  return (
    <div key={pocketMediaSlugOrId} className={S("media")}>
      {
        !started ?
          <MediaCountdown mediaItem={media} setStarted={setStarted} /> :
          <Video
            isLive={media.scheduleInfo.currentlyLive}
            videoLink={media.mediaItem.media_link}
            posterImage={
              media.mediaItem.poster_image?.url ||
              rootStore.splashImage.url
            }
            className={S("video")}
            contentInfo={{
              title: media.display.title,
              subtitle: media.display.subtitle,
              description: media.display.description
            }}
          />
      }
    </div>
  );
});

export default Media;
