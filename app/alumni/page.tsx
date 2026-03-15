import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.alumni.title,
};

export default function AlumniPage() {
  return <NiitPage pageKey="alumni" />;
}
