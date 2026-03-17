import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const snapshotDir = path.join(rootDir, "htmlpages");
const generatedLibDir = path.join(rootDir, "lib", "generated");
const generatedLibFile = path.join(generatedLibDir, "niit-site-data.ts");
const generatedComponentsDir = path.join(rootDir, "components", "niit", "generated");
const generatedPagesDir = path.join(generatedComponentsDir, "pages");

const siteOrigin = "https://niituniversity.in";

const pageDefinitions = [
  {
    key: "home",
    componentName: "HomePageContent",
    fileName: "home-page-content.tsx",
    snapshotFile: "index.html",
    route: "/",
    url: `${siteOrigin}/`,
  },
  {
    key: "aboutUs",
    componentName: "AboutUsPageContent",
    fileName: "about-us-page-content.tsx",
    snapshotFile: "about-us.html",
    route: "/about-us",
    url: `${siteOrigin}/about-us`,
  },
  {
    key: "blogsNewsletter",
    componentName: "BlogsNewsletterPageContent",
    fileName: "blogs-newsletter-page-content.tsx",
    snapshotFile: "blogs-newsletter.html",
    route: "/blogs-newsletter",
    url: `${siteOrigin}/blogs-newsletter`,
  },
  {
    key: "latestAtNu",
    componentName: "LatestAtNuPageContent",
    fileName: "latest-at-nu-page-content.tsx",
    snapshotFile: "latest-at-nu.html",
    route: "/latest-at-nu",
    url: `${siteOrigin}/latest-at-nu`,
  },
  {
    key: "alumni",
    componentName: "AlumniPageContent",
    fileName: "alumni-page-content.tsx",
    snapshotFile: "alumni.html",
    route: "/alumni",
    url: `${siteOrigin}/alumni`,
  },
  {
    key: "careersNu",
    componentName: "CareersNuPageContent",
    fileName: "careers-nu-page-content.tsx",
    snapshotFile: "careers-nu.html",
    route: "/careers-nu",
    url: `${siteOrigin}/careers-nu`,
  },
  {
    key: "quickLinks",
    componentName: "QuickLinksPageContent",
    fileName: "quick-links-page-content.tsx",
    snapshotFile: "quick-links.html",
    route: "/quick-links",
    url: `${siteOrigin}/quick-links`,
  },
];

const routeMap = new Map([
  ["", "/"],
  ["index", "/"],
  ["index.html", "/"],
  ["about-us", "/about-us"],
  ["about-us.html", "/about-us"],
  ["blogs-newsletter", "/blogs-newsletter"],
  ["blogs-newsletter.html", "/blogs-newsletter"],
  ["latest-at-nu", "/latest-at-nu"],
  ["latest-at-nu.html", "/latest-at-nu"],
  ["alumni", "/alumni"],
  ["alumni.html", "/alumni"],
  ["careers-nu", "/careers-nu"],
  ["careers-nu.html", "/careers-nu"],
  ["quick-links", "/quick-links"],
  ["quick-links.html", "/quick-links"],
]);

const assetPrefixes = ["wp-content/", "wp-includes/", "images/"];
const rootAssetFiles = ["backblue.gif", "fade.gif"];

const excludedStylesheetSnippets = [
  "cookie-notice",
  "responsivevoice-text-to-speech",
  "pojo-accessibility",
];

const excludedScriptSnippets = [
  "cookie-notice",
  "responsivevoice",
  "pojo-accessibility",
  "static.cloudflareinsights.com",
];

const sharedInlineScriptIds = new Set([
  "my-child-theme-script-js-extra",
  "eael-general-js-extra",
  "tc_csca-country-auto-script-js-extra",
  "wp-i18n-js-after",
  "contact-form-7-js-before",
  "wpcf7-redirect-script-js-extra",
  "vamtam-all-js-extra",
  "vamtam-all-js-after",
  "elementor-frontend-js-extra",
  "elementor-frontend-js-before",
  "uacf7-redirect-script-js-extra",
  "uacf7-multistep-js-extra",
  "wpcf7cf-scripts-js-extra",
  "elementor-pro-frontend-js-before",
  "anwp-pg-scripts-js-extra",
  "elementskit-elementor-js-extra",
]);

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const inlineTags = new Set([
  "a",
  "b",
  "br",
  "cite",
  "font",
  "i",
  "img",
  "input",
  "span",
  "strong",
  "time",
]);

const attributeMap = new Map([
  ["class", "className"],
  ["for", "htmlFor"],
  ["tabindex", "tabIndex"],
  ["srcset", "srcSet"],
  ["fetchpriority", "fetchPriority"],
  ["itemprop", "itemProp"],
  ["allowfullscreen", "allowFullScreen"],
  ["frameborder", "frameBorder"],
  ["colspan", "colSpan"],
  ["rowspan", "rowSpan"],
  ["contenteditable", "contentEditable"],
  ["spellcheck", "spellCheck"],
  ["readonly", "readOnly"],
  ["maxlength", "maxLength"],
  ["minlength", "minLength"],
  ["autocomplete", "autoComplete"],
  ["autofocus", "autoFocus"],
  ["crossorigin", "crossOrigin"],
  ["referrerpolicy", "referrerPolicy"],
  ["playsinline", "playsInline"],
  ["datetime", "dateTime"],
]);

const booleanAttributes = new Set([
  "required",
  "checked",
  "selected",
  "muted",
  "disabled",
  "readOnly",
  "autoFocus",
  "allowFullScreen",
  "playsInline",
]);

const droppedAttributes = new Set(["display", "postion"]);
const numericAttributes = new Set(["tabIndex", "colSpan", "rowSpan", "size"]);

function normalizePathSlashes(value) {
  return value.replace(/\\/g, "/");
}

function stripSiteOrigin(value) {
  const stripped = value.replace(/^https?:\/\/(?:www\.)?niituniversity\.in\/?/i, "");

  if (!stripped && /^https?:\/\/(?:www\.)?niituniversity\.in\/?$/i.test(value)) {
    return "/";
  }

  return stripped;
}

function splitSuffix(value) {
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  return {
    path: match?.[1] ?? value,
    suffix: match?.[2] ?? "",
  };
}

function makeAbsoluteAssetUrl(input) {
  const trimmed = input.trim();

  if (
    !trimmed ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const localCandidate = stripSiteOrigin(trimmed);
    if (localCandidate !== trimmed) {
      return makeAbsoluteAssetUrl(localCandidate);
    }

    return trimmed;
  }

  const normalized = normalizePathSlashes(trimmed)
    .replace(/^\.\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\//, "");

  if (assetPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return `${siteOrigin}/${normalized}`;
  }

  if (rootAssetFiles.includes(normalized)) {
    return `${siteOrigin}/${normalized}`;
  }

  return trimmed;
}

function rewriteHref(input) {
  const trimmed = input.trim();

  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return trimmed;
  }

  const { path: rawPath, suffix } = splitSuffix(trimmed);
  const basePath = stripSiteOrigin(rawPath);

  if (basePath !== rawPath) {
    return `${rewriteHref(basePath)}${suffix}`;
  }

  const absoluteAsset = makeAbsoluteAssetUrl(basePath);
  if (absoluteAsset !== basePath) {
    return `${absoluteAsset}${suffix}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalized = normalizePathSlashes(basePath)
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/$/, "");

  const route =
    routeMap.get(normalized) ??
    routeMap.get(normalized.replace(/\/index\.html$/i, "")) ??
    routeMap.get(normalized.replace(/index\.html$/i, "")) ??
    routeMap.get(normalized.replace(/\.html$/i, ""));

  if (route) {
    return `${route}${suffix}`;
  }

  const externalPath = normalized
    .replace(/\/index\.html$/i, "")
    .replace(/index\.html$/i, "")
    .replace(/\.html$/i, "");

  if (!externalPath) {
    return `${siteOrigin}/${suffix}`;
  }

  return `${siteOrigin}/${externalPath}${suffix}`;
}

function rewriteSrcset(value) {
  return value
    .split(",")
    .map((item) => {
      const trimmed = item.trim();
      if (!trimmed) {
        return "";
      }

      const [url, ...rest] = trimmed.split(/\s+/);
      const rewrittenUrl = makeAbsoluteAssetUrl(url);
      return [rewrittenUrl, ...rest].join(" ").trim();
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteCssUrls(value) {
  return value.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
    const rewritten = makeAbsoluteAssetUrl(url);
    return rewritten === url ? match : `url(${quote}${rewritten}${quote})`;
  });
}

function sanitizeFragment(fragmentHtml) {
  const $ = cheerio.load(`<root>${fragmentHtml}</root>`, {
    decodeEntities: false,
  });

  $("script, noscript, style, link[rel='stylesheet']").remove();
  $("button.responsivevoice-button")
    .closest(".elementor-element, .elementor-widget, .elementor-shortcode")
    .remove();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      $(element).attr("href", rewriteHref(href));
    }
  });

  ["src", "data-src", "poster"].forEach((attribute) => {
    $(`[${attribute}]`).each((_, element) => {
      const value = $(element).attr(attribute);
      if (value) {
        $(element).attr(attribute, makeAbsoluteAssetUrl(value));
      }
    });
  });

  $("[srcset]").each((_, element) => {
    const srcset = $(element).attr("srcset");
    if (srcset) {
      $(element).attr("srcset", rewriteSrcset(srcset));
    }
  });

  $("[style]").each((_, element) => {
    const style = $(element).attr("style");
    if (style) {
      $(element).attr("style", rewriteCssUrls(style));
    }
  });

  $("[data-settings]").each((_, element) => {
    const settings = $(element).attr("data-settings");
    if (settings) {
      $(element).attr("data-settings", rewriteCssUrls(settings));
    }
  });

  return $("root").html() ?? "";
}

function shouldKeepStylesheet(href) {
  return !excludedStylesheetSnippets.some((snippet) => href.includes(snippet));
}

function shouldKeepExternalScript(src) {
  return !excludedScriptSnippets.some((snippet) => src.includes(snippet));
}

function shouldKeepInlineScript({ id, type, code }) {
  if (!code.trim()) {
    return false;
  }

  if (type === "application/ld+json" || type === "speculationrules") {
    return false;
  }

  const blockedPatterns = [
    "googletagmanager",
    "clarity",
    "npf_",
    "nopaperforms",
    "chatbot.nopaperforms",
    "widgets.nopaperforms",
    "responsiveVoice",
    "listenButton",
    "append top menu in mobile menu",
    "landscapeOverlay",
    "RocketPreloadLinksConfig",
    "rocket-preload-links",
    "rocket-browser-checker",
    "dropdown-item').click",
    "hide ticker js start here",
    "PojoA11yOptions",
    "cnArgs",
  ];

  if (blockedPatterns.some((pattern) => code.includes(pattern) || id.includes(pattern))) {
    return false;
  }

  return true;
}

function extractInlineScripts($) {
  const scripts = [];

  $("script:not([src])").each((index, element) => {
    const code = ($(element).html() ?? "").trim();
    const id = $(element).attr("id") ?? "";
    const type = $(element).attr("type") ?? "text/javascript";

    if (!shouldKeepInlineScript({ id, type, code })) {
      return;
    }

    scripts.push({
      id: id || null,
      key: id || `inline-script-${index}`,
      code,
    });
  });

  return scripts;
}

function createHeaderFragment(homeHtml) {
  const $ = cheerio.load(homeHtml, { decodeEntities: false });
  const wrapper = $(".ekit-template-content-markup").first();
  const root = wrapper.find(".elementor-988041").first();

  root.children().slice(2).remove();

  const banner = root.children().eq(0);
  banner.find("a[href='#']").closest(".elementor-element").remove();

  const navSection = root.children().eq(1);
  navSection.removeClass("elementor-hidden-tablet elementor-hidden-mobile");

  const logoLink = navSection.find("#top-menu-logo a").first();
  if (logoLink.length) {
    logoLink.attr("href", "/");
  }

  const menuList = navSection.find("#menu-top-navigation").first();
  if (menuList.length) {
    menuList.attr("data-niit-route-list", "true");
  }

  navSection.find("#responsivetextlistner").remove();

  const html = wrapper.prop("outerHTML") ?? "";
  return sanitizeFragment(html);
}

function createFooterFragment(homeHtml) {
  const $ = cheerio.load(homeHtml, { decodeEntities: false });
  const wrapper = cheerio.load(`<root>${$(".footer-wrapper").html() ?? ""}</root>`, {
    decodeEntities: false,
  });

  wrapper("input[name='referer_title']").attr("data-niit-dynamic", "refererTitle").removeAttr("value");
  wrapper("input[name='queried_id']").attr("data-niit-dynamic", "queriedId").removeAttr("value");

  return sanitizeFragment(wrapper("root").html() ?? "");
}

function extractQueriedId(bodyClass) {
  const pageId = bodyClass.match(/\bpage-id-(\d+)\b/)?.[1];
  if (pageId) {
    return pageId;
  }

  return bodyClass.match(/\belementor-page-(\d+)\b/)?.[1] ?? "";
}

function cleanPageTitle(title) {
  return title.replace(/Accessibility Tools[\s\S]*$/i, "").trim();
}

async function fetchPage(definition) {
  const response = await fetch(definition.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${definition.url} (${response.status}).`);
  }

  return response.text();
}

function serializeStringArray(values) {
  return JSON.stringify(values, null, 2);
}

function serializeInlineScripts(scripts) {
  return JSON.stringify(scripts, null, 2);
}

function parseInlineStyle(styleText) {
  const declarations = styleText
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean);

  if (!declarations.length) {
    return "undefined";
  }

  const parts = [];

  for (const declaration of declarations) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const rawName = declaration.slice(0, separatorIndex).trim();
    const rawValue = declaration.slice(separatorIndex + 1).trim();

    if (!rawName || !rawValue) {
      continue;
    }

    const styleName = rawName.startsWith("--")
      ? rawName
      : rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    parts.push(`${JSON.stringify(styleName)}: ${JSON.stringify(rawValue.replace(/\s*!important\s*/gi, ""))}`);
  }

  if (!parts.length) {
    return "undefined";
  }

  return `{ ${parts.join(", ")} }`;
}

function isInlineLikeNode(node) {
  if (!node) {
    return false;
  }

  if (node.type === "text") {
    return Boolean(node.data.replace(/[ \t\r\n\f]+/g, ""));
  }

  if (node.type !== "tag") {
    return false;
  }

  return inlineTags.has(node.name) || voidTags.has(node.name);
}

function renderTextNode(node, level, siblings, index) {
  const collapsed = node.data.replace(/[ \t\r\n\f]+/g, " ");

  if (!collapsed) {
    return "";
  }

  if (!collapsed.trim()) {
    const previous = siblings[index - 1];
    const next = siblings[index + 1];

    if (!isInlineLikeNode(previous) && !isInlineLikeNode(next)) {
      return "";
    }
  }

  return `${"  ".repeat(level)}{${JSON.stringify(collapsed)}}`;
}

function renderAttribute(name, value, element) {
  const mappedName = attributeMap.get(name) ?? name;

  if (droppedAttributes.has(mappedName)) {
    return "";
  }

  if (name === "style") {
    const styleObject = parseInlineStyle(value);
    return styleObject === "undefined" ? "" : `style={${styleObject}}`;
  }

  if (name === "value" && element.name === "input") {
    const dynamicSource = element.attribs["data-niit-dynamic"];
    if (dynamicSource === "refererTitle") {
      return "defaultValue={refererTitle}";
    }

    if (dynamicSource === "queriedId") {
      return "defaultValue={queriedId}";
    }

    return `defaultValue={${JSON.stringify(value)}}`;
  }

  if (name === "checked" && element.name === "input") {
    return "defaultChecked={true}";
  }

  if (name === "data-niit-dynamic") {
    return "";
  }

  if (element.name === "font" && name === "size") {
    return "";
  }

  if (value === "" && (mappedName === "target" || mappedName === "rel")) {
    return "";
  }

  if (booleanAttributes.has(mappedName)) {
    return `${mappedName}={true}`;
  }

  if (numericAttributes.has(mappedName) && /^-?\d+$/.test(value)) {
    return `${mappedName}={${Number(value)}}`;
  }

  return `${mappedName}={${JSON.stringify(value)}}`;
}

function renderElement(node, level) {
  const tagName = node.name === "font" ? "span" : node.name;
  const attributes = Object.entries(node.attribs ?? {})
    .map(([name, value]) => renderAttribute(name, value, node))
    .filter(Boolean);

  const dynamicSource = node.attribs?.["data-niit-dynamic"];
  if (dynamicSource === "refererTitle") {
    attributes.push("defaultValue={refererTitle}");
  }

  if (dynamicSource === "queriedId") {
    attributes.push("defaultValue={queriedId}");
  }

  const openingTag = `${"  ".repeat(level)}<${tagName}${attributes.length ? ` ${attributes.join(" ")}` : ""}`;

  if (voidTags.has(tagName)) {
    return `${openingTag} />`;
  }

  const children = node.children
    .map((child, index, siblings) => nodeToJsx(child, level + 1, siblings, index))
    .filter(Boolean);

  if (!children.length) {
    return `${openingTag}></${tagName}>`;
  }

  return `${openingTag}>\n${children.join("\n")}\n${"  ".repeat(level)}</${tagName}>`;
}

function nodeToJsx(node, level, siblings, index) {
  if (!node) {
    return "";
  }

  if (node.type === "comment" || node.type === "directive" || node.type === "script" || node.type === "style") {
    return "";
  }

  if (node.type === "text") {
    return renderTextNode(node, level, siblings, index);
  }

  if (node.type === "tag") {
    return renderElement(node, level);
  }

  return "";
}

function fragmentToJsx(fragmentHtml) {
  const $ = cheerio.load(`<root>${fragmentHtml}</root>`, {
    decodeEntities: false,
  });

  return $("root")[0].children
    .map((node, index, siblings) => nodeToJsx(node, 3, siblings, index))
    .filter(Boolean)
    .join("\n");
}

function createComponentFile({ componentName, propsInterfaceName, propsSignature, fragmentHtml }) {
  const imgRuleDirective = fragmentHtml.includes("<img") ? "/* eslint-disable @next/next/no-img-element */\n" : "";
  const interfaceBlock = propsInterfaceName
    ? `type ${propsInterfaceName} = {\n  refererTitle: string;\n  queriedId: string;\n};\n\n`
    : "";

  return `${imgRuleDirective}// This file is auto-generated by scripts/generate-niit-site-data.mjs.

${interfaceBlock}export function ${componentName}(${propsSignature}) {
  return (
    <>
${fragmentToJsx(fragmentHtml)}
    </>
  );
}
`;
}

function createRegistryFile() {
  const imports = pageDefinitions
    .map(
      (page) =>
        `import { ${page.componentName} } from "@/components/niit/generated/pages/${page.fileName.replace(/\.tsx$/, "")}";`
    )
    .join("\n");

  const mappings = pageDefinitions
    .map((page) => `  ${page.key}: ${page.componentName},`)
    .join("\n");

  return `// This file is auto-generated by scripts/generate-niit-site-data.mjs.

import type { ComponentType } from "react";
import type { NiitPageKey } from "@/lib/generated/niit-site-data";
${imports}

export const niitPageComponents: Record<NiitPageKey, ComponentType> = {
${mappings}
};
`;
}

async function main() {
  await fs.mkdir(snapshotDir, { recursive: true });
  await fs.mkdir(generatedLibDir, { recursive: true });
  await fs.mkdir(generatedPagesDir, { recursive: true });

  const pageEntries = await Promise.all(
    pageDefinitions.map(async (definition) => {
      const html = await fetchPage(definition);
      await fs.writeFile(path.join(snapshotDir, definition.snapshotFile), html, "utf8");

      const $ = cheerio.load(html, { decodeEntities: false });
      const bodyClass = ($("body").attr("class") ?? "").trim();

      return {
        definition,
        html,
        title: cleanPageTitle($("title").text().trim()),
        bodyClass,
        queriedId: extractQueriedId(bodyClass),
        contentHtml: sanitizeFragment($(".page-wrapper").html() ?? ""),
      };
    })
  );

  const homeHtml = pageEntries.find((entry) => entry.definition.key === "home")?.html;
  if (!homeHtml) {
    throw new Error("Home page HTML could not be loaded.");
  }

  const home$ = cheerio.load(homeHtml, { decodeEntities: false });
  const sharedInlineScripts = extractInlineScripts(home$).filter((script) => {
    return (
      sharedInlineScriptIds.has(script.id ?? "") ||
      script.code.startsWith("var elementskit =") ||
      script.code.startsWith("const lazyloadRunObserver")
    );
  });

  const stylesheetSet = new Set();
  const externalScriptSet = new Set();
  const styleBlocks = [];
  const seenStyleBlocks = new Set();

  for (const { html } of pageEntries) {
    const $ = cheerio.load(html, { decodeEntities: false });

    $("link[rel='stylesheet']").each((_, element) => {
      const href = $(element).attr("href");
      if (!href || !shouldKeepStylesheet(href)) {
        return;
      }

      stylesheetSet.add(makeAbsoluteAssetUrl(href));
    });

    $("script[src]").each((_, element) => {
      const src = $(element).attr("src");
      if (!src || !shouldKeepExternalScript(src)) {
        return;
      }

      externalScriptSet.add(makeAbsoluteAssetUrl(src));
    });

    $("style").each((_, element) => {
      const css = rewriteCssUrls(($(element).html() ?? "").trim());
      if (!css || seenStyleBlocks.has(css)) {
        return;
      }

      seenStyleBlocks.add(css);
      styleBlocks.push(css);
    });
  }

  const headerFragment = createHeaderFragment(homeHtml);
  const footerFragment = createFooterFragment(homeHtml);

  const siteChromeImgDirective = headerFragment.includes("<img") || footerFragment.includes("<img")
    ? "/* eslint-disable @next/next/no-img-element */\n"
    : "";

  const siteChromeFile = `${siteChromeImgDirective}// This file is auto-generated by scripts/generate-niit-site-data.mjs.

type NiitSiteFooterProps = {
  refererTitle: string;
  queriedId: string;
};

export function NiitSiteHeader() {
  return (
    <>
${fragmentToJsx(headerFragment)}
    </>
  );
}

export function NiitSiteFooter({ refererTitle, queriedId }: NiitSiteFooterProps) {
  return (
    <>
${fragmentToJsx(footerFragment)}
    </>
  );
}
`;

  const libFileContents = `// This file is auto-generated by scripts/generate-niit-site-data.mjs.

export type NiitInlineScript = {
  id: string | null;
  key: string;
  code: string;
};

export const sharedStylesheets = ${serializeStringArray([...stylesheetSet])} as const;

export const sharedStyleBlocks = ${serializeStringArray(styleBlocks)} as const;

export const sharedInlineScripts = ${serializeInlineScripts(sharedInlineScripts)} as const;

export const sharedExternalScripts = ${serializeStringArray([...externalScriptSet])} as const;

export const niitPages = ${JSON.stringify(
    Object.fromEntries(
      pageEntries.map(({ definition, title, bodyClass, queriedId }) => [
        definition.key,
        {
          route: definition.route,
          title,
          bodyClass,
          queriedId,
        },
      ])
    ),
    null,
    2
  )} as const;

export type NiitPageKey = keyof typeof niitPages;
`;

  await fs.writeFile(generatedLibFile, libFileContents, "utf8");
  await fs.writeFile(path.join(generatedComponentsDir, "site-chrome.tsx"), siteChromeFile, "utf8");

  for (const pageEntry of pageEntries) {
    const fileContents = createComponentFile({
      componentName: pageEntry.definition.componentName,
      fragmentHtml: pageEntry.contentHtml,
      propsInterfaceName: null,
      propsSignature: "",
    });

    await fs.writeFile(path.join(generatedPagesDir, pageEntry.definition.fileName), fileContents, "utf8");
  }

  await fs.writeFile(path.join(generatedComponentsDir, "page-components.ts"), createRegistryFile(), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
