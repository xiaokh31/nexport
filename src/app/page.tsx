import {
  HeroSection,
  OperationsSection,
  SolutionsSection,
  CapabilitiesSection,
  CTASection,
} from "@/components/marketing";
import { ArticleLinksSection } from "@/components/content/article-links-section";
import { listPublishedArticles } from "@/lib/articles/public-service";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const latestArticles = await listPublishedArticles(prisma, {
    page: 1,
    limit: 3,
  });

  return (
    <>
      <HeroSection />
      <OperationsSection />
      <SolutionsSection />
      <CapabilitiesSection />
      <ArticleLinksSection
        context="home"
        articles={latestArticles.articles}
      />
      <CTASection />
    </>
  );
}
