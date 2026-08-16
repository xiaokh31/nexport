import {
  HeroSection,
  StatsSection,
  SolutionsSection,
  FeaturesSection,
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
      <StatsSection />
      <SolutionsSection />
      <FeaturesSection />
      <ArticleLinksSection
        title="最新文章"
        description="从服务公告到行业趋势，查看最新已发布内容。"
        articles={latestArticles.articles}
      />
      <CTASection />
    </>
  );
}
