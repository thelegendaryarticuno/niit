import { NiitPage } from "@/components/niit/niit-page";
import { niitPages } from "@/lib/generated/niit-site-data";

export const metadata = {
  title: niitPages.blogsNewsletter.title,
};

export default function BlogsNewsletterPage() {
  return <NiitPage pageKey="blogsNewsletter" />;
}
