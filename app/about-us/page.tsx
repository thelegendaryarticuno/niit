import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.aboutUs.title,
};

export default function AboutUsPage() {
  return <NiitPage pageKey="aboutUs" />;
}
