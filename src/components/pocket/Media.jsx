import MediaStyles from "@/assets/stylesheets/modules/media.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {useEffect} from "react";
import {rootStore} from "@/stores/index.js";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import {HashedLoaderImage, PageLoader} from "@/components/common/Common.jsx";
import Video from "@/components/common/Video.jsx";

const S = CreateModuleClassMatcher(MediaStyles);

const Media = observer(() => {
  const {pocketMediaSlugOrId} = useParams();

  const media = rootStore.PocketMediaItem(pocketMediaSlugOrId);

  if(!media) { return null; }

  const backgroundKey = rootStore.mobile && rootStore.pocket.metadata.splash_screen_background_mobile ?
    "splash_screen_background_mobile" :
    "splash_screen_background";

  return (
    <div key={pocketMediaSlugOrId} className={S("media")}>
      <Video
        isLive={media.scheduleInfo.currentlyLive}
        videoLink={media.mediaItem.media_link}
        posterImage={rootStore.pocket.metadata[backgroundKey]?.url}
        className={S("video")}
        contentInfo={{
          title: media.display.title,
          subtitle: media.display.subtitle,
          description: media.display.description
        }}
      />
    </div>
  );
});

export default Media;
