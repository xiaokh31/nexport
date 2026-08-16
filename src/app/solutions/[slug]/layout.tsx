import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleLinksSection } from "@/components/content/article-links-section";
import { CTASection } from "@/components/marketing";
import {
  BreadcrumbSchema,
  ServiceSchema,
} from "@/components/seo/structured-data";
import { publicEnv } from "@/config/env/public";
import { defaultLocale } from "@/i18n";
import { getSolutionUiContent } from "@/config/marketing-content";
import {
  getSolutionBySlug,
  solutionConfigs,
} from "@/config/site-config";
import { listPublishedArticles } from "@/lib/articles/public-service";
import { prisma } from "@/lib/prisma";

interface SolutionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

interface SolutionMetadataProps {
  params: Promise<{ slug: string }>;
}

function defaultSolutionContent(slug: string) {
  const config = getSolutionBySlug(slug);
  if (!config) return null;
  const content = getSolutionUiContent(defaultLocale, config.key);
  return { config, title: content.title, description: content.summary };
}

export function generateStaticParams() {
  return solutionConfigs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: SolutionMetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = defaultSolutionContent(slug);
  if (!solution) notFound();

  const canonical = `/solutions/${solution.config.slug}`;
  return {
    title: solution.title,
    description: solution.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: solution.title,
      description: solution.description,
    },
    twitter: {
      card: "summary",
      title: solution.title,
      description: solution.description,
    },
  };
}

export default async function SolutionDetailLayout({
  children,
  params,
}: SolutionLayoutProps) {
  const { slug } = await params;
  const solution = defaultSolutionContent(slug);
  if (!solution) notFound();

  const url = new URL(`/solutions/${solution.config.slug}`, publicEnv.siteUrl).toString();
  const related = await listPublishedArticles(prisma, {
    page: 1,
    limit: 3,
    category: "service",
    relatedTags: [
      solution.config.key,
      solution.config.slug,
      solution.config.serviceType,
      solution.config.serviceType.toLowerCase(),
    ],
  });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "首页", url: publicEnv.siteUrl },
          { name: "物流解决方案", url: new URL("/solutions", publicEnv.siteUrl).toString() },
          { name: solution.title, url },
        ]}
      />
      <ServiceSchema
        name={solution.title}
        description={solution.description}
        url={url}
        serviceType={solution.config.serviceType}
      />
      {children}
      <ArticleLinksSection
        context="related"
        articles={related.articles}
      />
      <CTASection serviceType={solution.config.serviceType} />
    </>
  );
}
