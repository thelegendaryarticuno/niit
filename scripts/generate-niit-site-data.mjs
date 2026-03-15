import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

// Local regeneration helper.
// The checked-in generated TS file is enough for dev/build/deploy.
// Only run this when you intentionally refresh data from extracted HTML.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const htmlDir = path.join(rootDir, "htmlpages");
const outputDir = path.join(rootDir, "lib", "generated");
const outputFile = path.join(outputDir, "niit-site-data.ts");

const pageDefinitions = [
  { key: "home", file: "index.html", route: "/", label: "Home" },
  { key: "aboutUs", file: "about-us.html", route: "/about-us", label: "About us" },
  { key: "blogsNewsletter", file: "blogs-newsletter.html", route: "/blogs-newsletter", label: "Blog & Newsletter" },
  { key: "latestAtNu", file: "latest-at-nu.html", route: "/latest-at-nu", label: "Latest at NU" },
  { key: "alumni", file: "alumni.html", route: "/alumni", label: "Alumni" },
  { key: "careersNu", file: "careers-nu.html", route: "/careers-nu", label: "Careers @ NU" },
  { key: "quickLinks", file: "quick-links.html", route: "/quick-links", label: "Quick links" },
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

function normalizePathSlashes(value) {
  return value.replace(/\\/g, "/");
}

function stripSiteOrigin(value) {
  return value.replace(/^https?:\/\/(?:www\.)?niituniversity\.in\/?/i, "");
}

function splitSuffix(value) {
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  return {
    path: match?.[1] ?? value,
    suffix: match?.[2] ?? "",
  };
}

function makeAbsoluteAssetPath(input) {
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
      return makeAbsoluteAssetPath(localCandidate);
    }

    return trimmed;
  }

  const normalized = normalizePathSlashes(trimmed)
    .replace(/^\.\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\//, "");

  if (assetPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return `/${normalized}`;
  }

  if (rootAssetFiles.includes(normalized)) {
    return `/${normalized}`;
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

  const absoluteAsset = makeAbsoluteAssetPath(basePath);
  if (absoluteAsset !== basePath) {
    return `${absoluteAsset}${suffix}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalized = normalizePathSlashes(basePath)
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");

  const route =
    routeMap.get(normalized) ??
    routeMap.get(normalized.replace(/\/index\.html$/i, "")) ??
    routeMap.get(normalized.replace(/\.html$/i, ""));

  if (route) {
    return `${route}${suffix}`;
  }

  const externalPath = normalized
    .replace(/\/index\.html$/i, "")
    .replace(/index\.html$/i, "")
    .replace(/\.html$/i, "");

  return `https://niituniversity.in/${externalPath}${suffix}`;
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
      const rewrittenUrl = makeAbsoluteAssetPath(url);
      return [rewrittenUrl, ...rest].join(" ").trim();
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteCssUrls(value) {
  return value.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
    const rewritten = makeAbsoluteAssetPath(url);
    return rewritten === url ? match : `url(${quote}${rewritten}${quote})`;
  });
}

function sanitizeFragment(fragmentHtml) {
  const $ = cheerio.load(`<root>${fragmentHtml}</root>`, {
    decodeEntities: false,
  });

  $("script, noscript, link[rel='stylesheet']").remove();
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
        $(element).attr(attribute, makeAbsoluteAssetPath(value));
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

function serializeInlineScripts(scripts) {
  return JSON.stringify(scripts, null, 2);
}

function serializeStringArray(values) {
  return JSON.stringify(values, null, 2);
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
  menuList.empty().attr("data-niit-route-list", "true");

  for (const item of pageDefinitions) {
    const menuItem = $("<li></li>")
      .addClass(
        "menu-item menu-item-type-custom menu-item-object-custom nav-item elementskit-mobile-builder-content"
      )
      .attr("data-vertical-menu", "750px");

    const link = $("<a></a>")
      .addClass("ekit-menu-nav-link")
      .attr("href", item.route)
      .text(item.label);

    menuItem.append(link);
    menuList.append(menuItem);
  }

  navSection.find("#responsivetextlistner").remove();

  const html = wrapper.prop("outerHTML") ?? "";
  return sanitizeFragment(html);
}

function buildPageData(fileName) {
  return fs.readFile(path.join(htmlDir, fileName), "utf8").then((html) => {
    const $ = cheerio.load(html, { decodeEntities: false });

    return {
      html,
      title: $("title").text().trim(),
      bodyClass: ($("body").attr("class") ?? "").trim(),
      contentHtml: sanitizeFragment($(".page-wrapper").html() ?? ""),
      inlineScripts: extractInlineScripts($),
    };
  });
}

async function main() {
  const pageEntries = await Promise.all(
    pageDefinitions.map(async (definition) => ({
      definition,
      page: await buildPageData(definition.file),
    }))
  );

  const homeHtml = pageEntries.find((entry) => entry.definition.key === "home")?.page.html;
  if (!homeHtml) {
    throw new Error("Home page HTML could not be loaded.");
  }

  const home$ = cheerio.load(homeHtml, { decodeEntities: false });
  const footerHtml = sanitizeFragment(home$(".footer-wrapper").html() ?? "");

  const stylesheetSet = new Set();
  const externalScriptSet = new Set();
  const styleBlocks = [];
  const seenStyleBlocks = new Set();

  for (const { page } of pageEntries) {
    const $ = cheerio.load(page.html, { decodeEntities: false });

    $("link[rel='stylesheet']").each((_, element) => {
      const href = $(element).attr("href");
      if (!href || !shouldKeepStylesheet(href)) {
        return;
      }

      stylesheetSet.add(makeAbsoluteAssetPath(href));
    });

    $("script[src]").each((_, element) => {
      const src = $(element).attr("src");
      if (!src || !shouldKeepExternalScript(src)) {
        return;
      }

      externalScriptSet.add(makeAbsoluteAssetPath(src));
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

  const homeInlineScripts = extractInlineScripts(home$);
  const sharedInlineScripts = homeInlineScripts.filter((script) => {
    return (
      sharedInlineScriptIds.has(script.id ?? "") ||
      script.code.startsWith("var elementskit =") ||
      script.code.startsWith("const lazyloadRunObserver")
    );
  });

  const pageDataOutput = Object.fromEntries(
    pageEntries.map(({ definition, page }) => [
      definition.key,
      {
        route: definition.route,
        title: page.title,
        bodyClass: page.bodyClass,
        contentHtml: page.contentHtml,
      },
    ])
  );

  const fileContents = `/* eslint-disable */
// This file is auto-generated by scripts/generate-niit-site-data.mjs.

export type NiitInlineScript = {
  id: string | null;
  key: string;
  code: string;
};

export const sharedStylesheets = ${serializeStringArray([...stylesheetSet])} as const;

export const sharedStyleBlocks = ${serializeStringArray(styleBlocks)} as const;

export const sharedInlineScripts = ${serializeInlineScripts(sharedInlineScripts)} as const;

export const sharedExternalScripts = ${serializeStringArray([...externalScriptSet])} as const;

export const siteChrome = {
  headerHtml: ${JSON.stringify(createHeaderFragment(homeHtml))},
  footerHtml: ${JSON.stringify(footerHtml)},
} as const;

export const niitPages = ${JSON.stringify(pageDataOutput, null, 2)} as const;

export type NiitPageKey = keyof typeof niitPages;
`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, fileContents, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
