import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.latestAtNu.title,
};

export default function LatestAtNuPage() {
  return <NiitPage pageKey="latestAtNu" />;
}
