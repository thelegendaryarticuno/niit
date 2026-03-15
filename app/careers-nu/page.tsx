import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.careersNu.title,
};

export default function CareersNuPage() {
  return <NiitPage pageKey="careersNu" />;
}
