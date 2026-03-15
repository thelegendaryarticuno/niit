import { niitPages, siteChrome, type NiitPageKey } from "@/lib/generated/niit-site-data";

type NiitPageProps = {
  pageKey: NiitPageKey;
};

export function NiitPage({ pageKey }: NiitPageProps) {
  const page = niitPages[pageKey];

  const bodyClassScript = `document.body.className = ${JSON.stringify(page.bodyClass)};`;
  const activeNavScript = `
    (() => {
      const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
      const navItems = document.querySelectorAll("[data-niit-route-list] > li");

      navItems.forEach((item) => {
        const link = item.querySelector("a");
        if (!link) {
          return;
        }

        const href = new URL(link.getAttribute("href") || "/", window.location.origin).pathname.replace(/\\/$/, "") || "/";
        if (href === currentPath) {
          item.classList.add("current-menu-item", "current_page_item");
          link.setAttribute("aria-current", "page");
        }
      });
    })();
  `;

  return (
    <div className="niit-site-root">
      <script dangerouslySetInnerHTML={{ __html: bodyClassScript }} />
      <div dangerouslySetInnerHTML={{ __html: siteChrome.headerHtml }} />
      <script dangerouslySetInnerHTML={{ __html: activeNavScript }} />
      <div className="page-wrapper" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      <div className="footer-wrapper" dangerouslySetInnerHTML={{ __html: siteChrome.footerHtml }} />
    </div>
  );
}
