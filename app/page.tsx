import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.home.title,
};

export default function Home() {
  return <NiitPage pageKey="home" />;
}
