import { niitPageComponents } from "@/components/niit/generated/page-components";
import { NiitSiteFooter, NiitSiteHeader } from "@/components/niit/generated/site-chrome";
import { niitPages, type NiitPageKey } from "@/lib/generated/niit-site-data";

type NiitPageProps = {
  pageKey: NiitPageKey;
};

export function NiitPage({ pageKey }: NiitPageProps) {
  const page = niitPages[pageKey];
  const PageContent = niitPageComponents[pageKey];

  const bodyClassScript = `document.body.className = ${JSON.stringify(page.bodyClass)};`;
  const activeNavScript = `
    (() => {
      const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
      const navItems = document.querySelectorAll("#menu-top-navigation > li");

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
      <NiitSiteHeader />
      <script dangerouslySetInnerHTML={{ __html: activeNavScript }} />
      <div className="page-wrapper">
        <PageContent />
      </div>
      <div className="footer-wrapper">
        <NiitSiteFooter refererTitle={page.title} queriedId={page.queriedId} />
      </div>
    </div>
  );
}
