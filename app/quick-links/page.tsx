import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.quickLinks.title,
};

export default function QuickLinksPage() {
  return <NiitPage pageKey="quickLinks" />;
}
