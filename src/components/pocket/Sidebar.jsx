import SidebarStyles from "@/assets/stylesheets/modules/sidebar.module.scss";

import {observer} from "mobx-react-lite";
import {useParams} from "wouter";
import {rootStore, pocketStore, mediaDisplayStore} from "@/stores/index.js";
import {CreateModuleClassMatcher} from "@/utils/Utils.js";
import {HashedLoaderImage, Linkish, MediaItemImageUrl} from "@/components/common/Common.jsx";
import UrlJoin from "url-join";
import SVG from "react-inlinesvg";
import {useEffect, useState} from "react";
import PurchaseHistory from "@/components/pocket/PurchaseHistory.jsx";
import Modal from "@/components/common/Modal.jsx";

import XIcon from "@/assets/icons/x.svg";
import BagIcon from "@/assets/icons/bag.svg";
import LeftArrowIcon from "@/assets/icons/left-arrow.svg";
import PIPIcon from "@/assets/icons/pip.svg";
import EyeIcon from "@/assets/icons/eye.svg";
import MultiviewIcon from "@/assets/icons/multiview.svg";

const S = CreateModuleClassMatcher(SidebarStyles);

const Item = observer(({
  title,
  subtitle,
  scheduleInfo,
  disabled,
  onClick,
  primaryMediaId,
  contentItem,
  noBorder,
  noActions,
  toggleOnClick,
  streamLimit,
  multiviewMode,
  displayedContent,
  setDisplayedContent
}) => {
  streamLimit = streamLimit || mediaDisplayStore.streamLimit;
  multiviewMode = multiviewMode || mediaDisplayStore.multiviewMode;
  displayedContent = displayedContent || mediaDisplayStore.displayedContent;
  setDisplayedContent = setDisplayedContent || (content => mediaDisplayStore.SetDisplayedContent(content));

  const {pocketSlugOrId} = useParams();
  const [hovering, setHovering] = useState(false);

  const isMediaItem = contentItem.type === "media-item";
  const isActive = !!(displayedContent || []).find(item => item.type === contentItem.type && item.id === contentItem.id);
  const isPrimary =
    (displayedContent || []).findIndex(item => item.type === contentItem.type && item.id === contentItem.id) === 0 ||
    (displayedContent.length === 0 && primaryMediaId === contentItem.id);

  const mediaItem = isMediaItem ?
    pocketStore.MediaItem(contentItem.id) :
    pocketStore.MediaItem(contentItem.mediaItemId);

  const permissions = pocketStore.MediaItemPermissions({mediaItem});

  const imageInfo = isMediaItem ?
    MediaItemImageUrl({mediaItem}) :
    {imageUrl: contentItem.image?.url, imageHash: contentItem.image_hash};

  let linkPath;
  if(!toggleOnClick && !onClick) {
    linkPath = UrlJoin("~/", pocketSlugOrId, mediaItem.slug || mediaItem.id, contentItem.type === "additional-view" ? `?v=${contentItem.index}` : "");
  }

  const ToggleMultiview = () => {
    if(isActive) {
      setDisplayedContent(displayedContent.filter(item => contentItem.id !== item.id));
    } else if(multiviewMode === "pip" && displayedContent.length >= 1) {
      setDisplayedContent([displayedContent[0], contentItem]);
    } else if(displayedContent.length < streamLimit) {
      setDisplayedContent([...displayedContent, contentItem]);
    }
  };

  onClick = onClick ? onClick :
    toggleOnClick ? ToggleMultiview :
      !isActive ?
        () => setDisplayedContent([contentItem]) :
        contentItem.id !== primaryMediaId ?
          () => setDisplayedContent([{type: "media-item", id: primaryMediaId}]) :
          undefined;

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        S(
          "item",
          disabled ? "item--disabled" : "",
          noBorder ? "item--no-border" : "",
          (hovering && !disabled) ? "item--hover" : "",
          isPrimary ? "item--primary" : "",
          isActive && !isPrimary ? "item--active" : "",
          contentItem.type === "additional-view" ? "item--additional-view" : "",
        )
      }
    >
      {
        !imageInfo?.imageUrl ? null :
          <Linkish
            onClick={onClick}
            to={linkPath}
            disabled={disabled}
            className={S("item__image-container", "item__image-container--landscape")}
          >
            <HashedLoaderImage
              src={imageInfo.imageUrl}
              hash={imageInfo.imageHash}
              alt={imageInfo.alt}
              width={600}
              className={S("item__image")}
            />
            {
              !scheduleInfo?.currentlyLive ? null :
                <div className={S("live-badge")}>Live</div>
            }
            {
              !isMediaItem || permissions.authorized || permissions.permissionItems?.length === 0 ? null :
                <div className={S("purchase-badge")}>
                  <SVG src={BagIcon} />
                </div>
            }
          </Linkish>
      }
      <Linkish
        onClick={onClick}
        to={linkPath}
        disabled={disabled}
        className={S("item__text", imageInfo?.imageUrl ? "item__text--with-image" : "")}
      >
        <div title={title} className={S("item__title")}>
          {title}
        </div>
        {
          isPrimary && isMediaItem && permissions.authorized && permissions.anyItemsAvailable ?
            // Link to additional purchase options for this content
            <Linkish
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                rootStore.SetAttribute("showAdditionalPurchaseOptions", true);
              }}
              className={S("item__subtitle", "item__subtitle--purchase")}
            >
              Additional Purchase Options
            </Linkish> :
            <>
              {
                !subtitle ? null :
                  <div className={S("item__subtitle")}>
                    {subtitle}
                  </div>
              }
              {
                !scheduleInfo?.isLiveContent ? null :
                  scheduleInfo.currentlyLive ?
                    <div className={S("item__date")}>
                      Live Now
                    </div> :
                    <div className={S("item__date")}>
                      {scheduleInfo.displayStartDateLong} at {scheduleInfo.displayStartTime}
                    </div>
              }
            </>
        }
      </Linkish>
      {
        noActions ? null :
          <div className={S("item__actions")}>
            <Linkish
              disabled={!isActive && displayedContent.length >= streamLimit}
              onClick={ToggleMultiview}
              className={S("item__action", isActive ? "item__action--active" : "")}
            >
              <SVG
                src={
                  multiviewMode === "pip" ?
                    PIPIcon : EyeIcon
                }
              />
            </Linkish>
          </div>
      }
    </div>
  );
});

const SidebarContent = observer(({primaryMediaItem}) => {
  const [tabIndex, setTabIndex] = useState(parseInt(sessionStorage.getItem("sidebar-tab-index") || 0));
  const [containerRef, setContainerRef] = useState(null);
  const tab = pocketStore.sidebarContent[tabIndex];
  const permissions = pocketStore.MediaItemPermissions({mediaItem: primaryMediaItem});

  useEffect(() => {
    // Preserve selected tab
    sessionStorage.setItem("sidebar-tab-index", tabIndex.toString());
  }, [tabIndex]);

  if(!tab) {
    return null;
  }

  if(rootStore.showMyItems) {
    return (
      <>
        <div className={S("media")}>
          <div className={S("media-section")}>
            <div className={S("media-section__title", "media-section__title--large")}>
              <span>My Items</span>
              <Linkish onClick={() => rootStore.SetAttribute("showMyItems", false)} className={S("media-section__close")}>
              <SVG src={XIcon} />
            </Linkish>
            </div>
            <div className={S("media-section__media")}>
              {
                (pocketStore.FilteredMedia({select: {permissions: "authorized", sort_order: "time_asc"}}))
                  .map((item, index) =>
                    <Item
                      noBorder={index === 0}
                      title={item.title}
                      subtitle={item.subtitle}
                      scheduleInfo={item.scheduleInfo}
                      key={`item-${item.id}`}
                      contentItem={{type: "media-item", id: item.id}}
                      primaryMediaId={primaryMediaItem.id}
                      noActions
                    />
                  )
              }
            </div>
          </div>
        </div>
        <div className={S("history-link")}>
          Missing something? Check your <Linkish onClick={() => rootStore.SetAttribute("showPurchaseHistory", true)}>Purchase History</Linkish>.
        </div>
      </>
    );
  }

  if(pocketStore.hasSingleItem) {
    return null;
  }

  return (
    <div ref={setContainerRef} className={S("media")}>
      {
        pocketStore.sidebarContent.length <= 1 ? null :
          <div className={S("tabs")}>
            {
              pocketStore.sidebarContent.map((tab, index) =>
                <button
                  key={`tab-${index}`}
                  onClick={() => {
                    setTabIndex(index);
                    if(containerRef?.parentElement.scrollTop > 95) {
                      containerRef?.parentElement?.scrollTo({top: 95, behavior: "smooth"});
                    }
                  }}
                  className={S("tab", index === tabIndex ? "tab--active" : "")}
                >
                  { tab.title }
                </button>
              )
            }
          </div>
      }
      {
        tab.groups.map(({title, content}) =>
          content.length === 0 ? null :
            <div key={title} className={S("media-section")}>
              {
                !title ? null :
                  <div className={S("media-section__title")}>{title}</div>
              }
              <div className={S("media-section__media")}>
                {
                  content.map((item, index) =>
                    <>
                      <Item
                        noBorder={index === 0}
                        title={item.title}
                        subtitle={item.subtitle}
                        scheduleInfo={item.scheduleInfo}
                        key={`item-${item.id}`}
                        contentItem={{type: "media-item", id: item.id}}
                        primaryMediaId={primaryMediaItem.id}
                        noActions={!permissions.authorized || rootStore.mobile || !item.resolvedPermissions?.authorized || !item.isMultiviewable}
                      />
                      {
                        rootStore.mobile || (item?.additional_views || [])?.length === 0 || !item.isMultiviewable ? null :
                          (item.additional_views || []).map((view, index) =>
                            <Item
                              title={view.label}
                              key={`item-${item.id}-${index}`}
                              scheduleInfo={item.scheduleInfo}
                              contentItem={{
                                ...view,
                                type: "additional-view",
                                id: `${item.id}-${index}`,
                                mediaItemId: item.id,
                                index,
                                label: `${item.title} - ${view.label}`
                              }}
                              primaryMediaId={primaryMediaItem.id}
                              noActions={!permissions.authorized}
                            />
                          )
                      }
                    </>
                  )
                }
              </div>
            </div>
        )
      }
    </div>
  );
});

export const Banners = observer(({position="below"}) => {
  const {pocketSlugOrId, mediaItemSlugOrId} = useParams();

  const mediaItem = pocketStore.MediaItem(mediaItemSlugOrId);

  const config = pocketStore.pocket.metadata.sidebar_config || {};

  const banners = (config.banners || [])
    .filter(banner =>
      banner.image && (banner.link_type !== "media" || mediaItem.id !== banner.media_id)
    )
    .filter(banner =>
      !rootStore.mobile ||
      (position === "above" ? banner.mobile_position === "above" : !banner.mobile_position)
    );

  if(banners.length === 0 || rootStore.showMyItems){
    return null;
  }

  return (
    <div className={S("banners")}>
      {
        banners.map((banner, index) => {
          const imageKey = rootStore.mobile && banner.image_mobile?.url ?
            "image_mobile" :
            "image";

          return (
            <Linkish
              key={index}
              href={banner.link_type === "external" && banner.url}
              to={
                banner.link_type === "media" &&
                UrlJoin("~/", pocketSlugOrId, pocketStore.PocketMediaItem(banner.media_id)?.slug || banner.media_id)
              }
              onClick={
                banner.link_type !== "reset" ? undefined :
                  () => confirm("Are you sure you want to reset your account?") ?
                    rootStore.ResetAccount() : undefined
              }
              className={S("banner")}
            >
              <HashedLoaderImage
                src={banner[imageKey]?.url}
                hash={banner[`${imageKey}_hash`]}
                width={1000}
                alt={banner.image_alt}
                className={S("banner__image")}
              />
            </Linkish>
          );
        })
      }
    </div>
  );
});

const ContentInfo = observer(({mediaItem}) => {
  const permissions = pocketStore.MediaItemPermissions({mediaItem});

  return (
    <div className={S("content-info")}>
      {
        !mediaItem.scheduleInfo.currentlyLive ? null :
          <div className={S("live-badge")}>LIVE</div>
      }
      {
          <div className={S("current-item")}>
            <div className={S("title-container")}>
              {
                mediaItem.icons?.map(icon =>
                    !icon.icon?.url ? null :
                      <img
                        key={icon.icon.url}
                        src={icon.icon.url}
                        alt={icon.alt_text || "Title Icon"}
                        className={S("title-icon")}
                      />
                )
              }
              <div className={S("title")}>
                {mediaItem.title}
              </div>
              {
                !rootStore.mobile || !pocketStore.showMultiview ? null :
                  <button
                    className={S("multiview-modal-button")}
                    onClick={() => mediaDisplayStore.SetShowMultiviewSelectionModal(true)}
                  >
                    <SVG src={MultiviewIcon} />
                  </button>
              }
            </div>
            <div className={(S("subtitle"))}>
              {
                !mediaItem.scheduleInfo.isLiveContent ?
                  mediaItem.subtitle :
                  `${mediaItem.scheduleInfo.displayStartDateLong} at ${mediaItem.scheduleInfo.displayStartTime}`
              }
            </div>
            {
              !pocketStore.hasSingleItem || !permissions.authorized || !permissions.anyItemsAvailable ? null :
                // Link to additional purchase options for this content
                <Linkish
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    rootStore.SetAttribute("showAdditionalPurchaseOptions", true);
                  }}
                  className={S("subtitle", "subtitle--purchase")}
                >
                  Additional Purchase Options
                </Linkish>
            }
          </div>
      }
    </div>
  );
});

const Sidebar = observer(({mediaItem, hideTitle}) => {
  const {pocketSlugOrId} = useParams();

  if(!mediaItem || rootStore.mobileLandscape) {
    return null;
  }

  if(rootStore.showPurchaseHistory) {
    return (
      <PurchaseHistory />
    );
  }

  return (
    <>
      <div className={S("sidebar")}>
        {
          rootStore.showMyItems || !pocketStore.showMultiview ? null :
            <div className={S("sidebar__actions")}>
              {
                !pocketStore.showMultiview ? null :
                  <div className={S("multiview-switch")}>
                    <button
                      onClick={() => mediaDisplayStore.SetMultiviewMode("pip")}
                      title="Picture-in-Picture Mode"
                      className={S("multiview-switch__button", mediaDisplayStore.multiviewMode === "pip" ? "multiview-switch__button--active" : "")}
                    >
                      <SVG src={PIPIcon}/>
                    </button>
                    <button
                      onClick={() => mediaDisplayStore.SetMultiviewMode("multiview")}
                      title="Multiview Mode"
                      className={S("multiview-switch__button", mediaDisplayStore.multiviewMode === "multiview" ? "multiview-switch__button--active" : "")}
                    >
                      <SVG src={MultiviewIcon} />
                    </button>
                  </div>
              }
            </div>
        }
        {
          !rootStore.showMyItems ? null :
            <div className={S("sidebar__actions")}>
              {
                !rootStore.showMyItems ? null :
                  <Linkish onClick={() => rootStore.SetAttribute("showMyItems", false)} className={S("sidebar__close")}>
                    <SVG src={XIcon} />
                  </Linkish>
              }
            </div>
        }
        {
          hideTitle ? null :
            <ContentInfo
              key={mediaItem.id}
              mediaItem={mediaItem}
            />
        }
        {
          rootStore.mobile && !pocketStore.hasSingleItem ? null :
            <Banners position="below"/>
        }
        {
          rootStore.mobile && mediaDisplayStore.multiviewing ? null :
            <>
              <SidebarContent primaryMediaItem={mediaItem} />
              <div className={S("links")}>
                <Linkish href={pocketStore.pocket.metadata?.support_link || "https://eluviolive.zendesk.com/hc/en-us/requests/new"}>
                  Get Support
                </Linkish>
                {
                  (pocketStore.pocket.metadata?.faq?.questions || []).length === 0 ? null :
                    <Linkish href={UrlJoin(window.location.origin, pocketSlugOrId, "faq", pocketStore.preview ? "?preview=" : "")}>
                      FAQ
                    </Linkish>
                }
              </div>
            </>
        }
    </div>
      {
        !rootStore.mobile || rootStore.mobileLandscape || pocketStore.hasSingleItem || (rootStore.mobile && mediaDisplayStore.multiviewing) ? null :
          <Banners position="below" />
      }
    </>
  );
});

export const MultiviewSelectionModal = observer(({mediaItem}) => {
  let tabs = pocketStore.sidebarContent?.filter(tab =>
    tab.groups.find(group =>
      group.content.find(item =>
        item.resolvedPermissions.authorized && item.isMultiviewable
      )
    )
  );

  const [selectedContent, setSelectedContent] = useState([...mediaDisplayStore.displayedContent]);
  const [tabIndex, setTabIndex] = useState(0);
  const tab = tabs[tabIndex];
  const [menuControls, setMenuControls] = useState(undefined);

  useEffect(() => {
    if(mediaDisplayStore.showMultiviewSelectionModal) {
      setSelectedContent([...mediaDisplayStore.displayedContent]);
    }
  }, [mediaDisplayStore.showMultiviewSelectionModal]);

  useEffect(() => {
    setSelectedContent(
      selectedContent.slice(0, mediaDisplayStore.streamLimit)
    );
  }, [mediaDisplayStore.streamLimit]);

  useEffect(() => {
    if(!menuControls) { return; }

    window.menuControls = menuControls;

    mediaDisplayStore.showMultiviewSelectionModal ?
      menuControls.Show() :
      menuControls.Hide();
  }, [menuControls, mediaDisplayStore.showMultiviewSelectionModal]);

  if(tabs.length === 0) {
    return null;
  }

  return (
    <Modal
      SetMenuControls={setMenuControls}
      hideCloseButton
      onHide={() => mediaDisplayStore.SetShowMultiviewSelectionModal(false)}
    >
      <div className={S("multiview-selection-modal")}>
        <div className={S("multiview-selection-modal__header")}>
          <Linkish
            className={S("multiview-selection-modal__back")}
            onClick={() => mediaDisplayStore.SetShowMultiviewSelectionModal(false)}
          >
            <SVG src={LeftArrowIcon}/>
          </Linkish>
          <div>
            Select Streams
          </div>
        </div>
        <div className={S("multiview-selection-modal__content")}>
          {
            tabs.length <= 1 ? null :
              <div className={S("tabs-container")}>
                <div className={S("tabs")}>
                  {
                    tabs.map((tab, index) =>
                      <button
                        onClick={() => setTabIndex(index)}
                        key={`tab-${tab.id}`}
                        className={S("tab", tabIndex === index ? "tab--active" : "")}
                      >
                        {tab.title}
                      </button>
                    )
                  }
                </div>
              </div>
          }
          <div className={S("multiview-selection-modal__items")}>
            {
              tab?.groups.map(group =>
                !group.content.find(item => item.resolvedPermissions.authorized && item.isMultiviewable) ? null :
                  <div key={`group-${group.id}`} className={S("multiview-selection-modal__item-section")}>
                    {
                      !group.title ? null :
                        <div className={S("multiview-selection-modal__item-section-title")}>
                          {group.title}
                        </div>
                    }
                    {group.content
                      .filter(item => item.resolvedPermissions.authorized && item.isMultiviewable)
                      .map((item, index) =>
                        <>
                          <Item
                            noBorder={index === 0}
                            toggleOnClick
                            title={item.title}
                            subtitle={item.subtitle}
                            scheduleInfo={item.scheduleInfo}
                            key={`item-${item.id}`}
                            contentItem={{type: "media-item", id: item.id}}
                            primaryMediaId={mediaItem.id}
                            multiviewMode="multiview"
                            displayedContent={selectedContent}
                            setDisplayedContent={setSelectedContent}
                          />
                          {
                            (item?.additional_views || [])?.length === 0 ? null :
                              <div className={S("content__views-container")}>
                                {
                                  (item.additional_views || []).map((view, index) =>
                                    <Item
                                      toggleOnClick
                                      title={view.label}
                                      key={`item-${item.id}-${index}`}
                                      contentItem={{
                                        ...view,
                                        type: "additional-view",
                                        id: `${item.id}-${index}`,
                                        index,
                                        label: `${item.title} - ${view.label}`
                                      }}
                                      primaryMediaId={mediaItem.id}
                                      multiviewMode="multiview"
                                      displayedContent={selectedContent}
                                      setDisplayedContent={setSelectedContent}
                                    />
                                  )
                                }
                              </div>
                          }
                        </>
                      )}
                  </div>
              )
            }
          </div>
        </div>
        <div className={S("multiview-selection-modal__actions")}>
          <button
            onClick={() => mediaDisplayStore.SetShowMultiviewSelectionModal(false)}
            className={S("multiview-selection-modal__action")}
          >
            Cancel
          </button>
          <button
            disabled={selectedContent.length === 0}
            onClick={() => {
              mediaDisplayStore.SetDisplayedContent(selectedContent);
              mediaDisplayStore.SetShowMultiviewSelectionModal(false);
            }}
            className={S("styled-button", "multiview-selection-modal__action")}
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
});

export default Sidebar;
