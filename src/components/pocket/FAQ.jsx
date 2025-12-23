import "@mantine/core/styles/Accordion.css";
import "@mantine/core/styles/Accordion.layer.css";
import FAQStyles from "@/assets/stylesheets/modules/faq.module.scss";

import {useEffect, useState} from "react";
import {observer} from "mobx-react-lite";
import {pocketStore, rootStore} from "@/stores/index.js";
import {Accordion, MantineProvider} from "@mantine/core";
import {HashedLoaderImage, Linkish, RichText} from "@/components/common/Common.jsx";
import {Redirect, useParams} from "wouter";
import SVG from "react-inlinesvg";

import PlusIcon from "@/assets/icons/plus.svg";
import MinusIcon from "@/assets/icons/minus.svg";
import Video from "@/components/common/Video.jsx";
import {CreateModuleClassMatcher, SetHTMLMetaTags} from "@/utils/Utils.js";
import Header from "@/components/pocket/Header.jsx";

const S = CreateModuleClassMatcher(FAQStyles);

const QuestionImages = observer(({images=[], center=false}) => {
  if(images.length === 0) {
    return null;
  }

  return (
    <div className={S("images", center ? "images--centered" : "")}>
      {
        images.map(({image, image_hash, image_mobile, image_mobile_hash, image_alt, link}, imageIndex) =>
          <Linkish href={link} className={S("image-container")} key={`image-${imageIndex}`}>
            <HashedLoaderImage
              src={
                rootStore.pageDimensions.width <= 1000 && image_mobile?.url ?
                  image_mobile.url :
                  image?.url
              }
              hash={
                rootStore.pageDimensions.width <= 1000 && image_mobile?.url ?
                  image_mobile_hash :
                  image_hash
              }
              alt={image_alt}
              className={S("image")}
            />
          </Linkish>
        )
      }
    </div>
  );
});

const FAQPage = observer(() => {
  const [openedItem, setOpenedItem] = useState(undefined);
  const {pocketSlugOrId} = useParams();

  useEffect(() => {
    rootStore.Initialize({pocketSlugOrId, noMedia: true})
      .then(pocket =>
        pocket && SetHTMLMetaTags(pocket.metadata.meta_tags)
      );
  }, [pocketSlugOrId]);

  if(!rootStore.initialized || !pocketStore.pocket) { return null; }

  let faq = pocketStore.pocket.metadata?.faq || {};

  if((faq.questions || []).length === 0) {
    return <Redirect to={`/${pocketSlugOrId}`} />;
  }

  return (
    <MantineProvider defaultColorScheme="dark" withCssVariables>
      <div className="page-container">
        <Header simple />
        <div
          style={
            !CSS.supports("color", faq.background_color) ? {} :
              { backgroundColor: faq.background_color }

          }
          className={S("faq-page")}
        >
          {
            !faq.header_image ? null :
              <HashedLoaderImage
                src={
                  rootStore.pageDimensions.width <= 1000 && faq.header_image_mobile?.url ?
                    faq.header_image_mobile.url :
                    faq.header_image?.url
                }
                hash={
                  rootStore.pageDimensions.width <= 1000 && faq.header_image_mobile?.url ?
                    faq.header_image_mobile_hash :
                    faq.header_image_hash
                }
                alt="Background Image"
                className={S("image")}
              />
          }
          <div
            style={
              !faq.header_text_color ? null :
                { "--header-text-color": faq.header_text_color }
            }
            className={S("container")}
          >
            {
              !faq.title ? null :
                <h1 className={S("title")}>{faq.title}</h1>
            }
            {
              !faq.title ? null :
                <p className={S("description")}>{faq.description}</p>
            }

            {
              <Accordion
                variant="unstyled"
                value={openedItem}
                onChange={setOpenedItem}
                className={S("questions")}
                classNames={{
                  item: S("question"),
                  label: S("question__label", "opacity-hover")
                }}
              >
                {
                  faq.questions.map(({question, answer, video, images}, index) => {
                    images = images || [];
                    const beforeImages = images.filter(i => i.position === "before");
                    const afterImages = images.filter(i => i.position === "after");
                    const insideImages = images.filter(i => i.position === "inside" || !i.position);

                    return (
                      <>
                        <QuestionImages center images={beforeImages} />
                        <Accordion.Item key={`question-${index}`} value={index.toString()}>
                          <Accordion.Control
                            chevron={
                              <SVG
                                src={openedItem === index.toString() ? MinusIcon : PlusIcon}
                                className={S("chevron")}
                              />
                            }
                          >
                            <div className={S("question__label")}>{question}</div>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <div className={S("answer")}>
                              {
                                !video || openedItem !== index.toString() ? null :
                                  <Video
                                    videoLink={video}
                                    playerOptions={{
                                      autoplay: false
                                    }}
                                    className={S("video")}
                                  />
                              }
                              {
                                openedItem !== index.toString() ? null :
                                  <QuestionImages images={insideImages} />
                              }
                              <RichText richText={answer} className={S("")}/>
                            </div>
                          </Accordion.Panel>
                        </Accordion.Item>
                        <QuestionImages center images={afterImages} />
                      </>
                    );
                  })
                }
              </Accordion>
            }
          </div>
        </div>
      </div>
    </MantineProvider>
  );
});

export default FAQPage;
