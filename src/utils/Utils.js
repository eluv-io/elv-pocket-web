import SharedStyles from "@/assets/stylesheets/modules/shared.module.scss";

export const JoinClassNames = (...cs) => cs.map(c => c || "").join(" ");

export const CreateModuleClassMatcher = (...modules) => {
  modules = [SharedStyles, ...modules];

  return (...classes) => JoinClassNames(
    ...(classes.map(c => {
      return modules
        .map(m => m?.[c])
        .filter(c => c)
        .join(" ");
    }))
  );
};

export const SetImageUrlDimensions = ({url, height, width}) => {
  if(!url) { return ""; }

  url = new URL(url);
  if(width) {
    url.searchParams.set("width", width);
  } else if(height) {
    url.searchParams.set("height", height);
  }

  return url.toString();
};

export const LinkTargetHash = (link) => {
  if(!link) { return; }

  if(typeof link === "string") {
    return link.split("/").find(segment => segment.startsWith("hq__"));
  }

  if(link["."] && link["."].source) {
    return link["."].source;
  }

  if(link["/"] && link["/"].startsWith("/qfab/")) {
    return link["/"].split("/").find(segment => segment.startsWith("hq__"));
  }

  if(link["."] && link["."].container) {
    return link["."].container;
  }
};

export const SetHTMLMetaTags = (metaTags={}) => {
  const SetMetaTag = (tag, value) => {
    const element = document.getElementById(`__meta-${tag}`);

    if(element) {
      if(tag === "favicon") {
        element.href = value;
      } else {
        element.content = value;
      }
    }
  };

  SetMetaTag("favicon", metaTags.favicon);

  SetMetaTag("og:site_name", metaTags.site_name || "Eluvio Media Wallet");
  SetMetaTag("og:title", metaTags.title || "Eluvio Media Wallet");
  SetMetaTag("og:description", metaTags.description || "");
  SetMetaTag("og:image", metaTags.image || "");
  SetMetaTag("og:image:alt", metaTags.image_alt || "");
  SetMetaTag("og:url", window.location.href);

  SetMetaTag("twitter:site", metaTags.site_name || "Eluvio Media Wallet");
  SetMetaTag("twitter:title", metaTags.title || "Eluvio Media Wallet");
  SetMetaTag("twitter:description", metaTags.description || "");
  SetMetaTag("twitter:image", metaTags.image || "");
  SetMetaTag("twitter:image:alt", metaTags.image_alt || "");

  document.title = metaTags.title || "Eluvio Pocket TV";
};

export const Copy = async (value) => {
  try {
    value = (value || "").toString();

    await navigator.clipboard.writeText(value);
  // eslint-disable-next-line no-unused-vars
  } catch(error) {
    const input = document.createElement("input");

    input.value = value;
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
  }
};

export const SHA512 = async (str) => {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str));
  return Array.prototype.map.call(new Uint8Array(buf), x=>(("00"+x.toString(16)).slice(-2))).join("");
};

export const ValidEmail = email => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email);
};
