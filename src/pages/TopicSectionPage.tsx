import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Article, NewsCategory } from '../types';
import { filterAndSearchArticles } from '../utils/newsLogic';
import { ArticleCard } from '../components/ArticleCard';

interface TopicSectionPageProps {
  kicker: string;
  title: string;
  description: string;
  heroImage: string;
  heroImageAlt: string;
  categories: NewsCategory[];
  articles: Article[];
  onExplainArticle: (article: Article) => void;
  onOpenExplainer: () => void;
}

export function TopicSectionPage({
  kicker,
  title,
  description,
  heroImage,
  heroImageAlt,
  categories,
  articles,
  onExplainArticle,
  onOpenExplainer,
}: TopicSectionPageProps) {
  const [selectedSubCategory, setSelectedSubCategory] = useState<NewsCategory | 'All'>('All');

  const sectionArticles = useMemo(() => {
    const primary = filterAndSearchArticles(articles, {
      categories: selectedSubCategory === 'All' ? categories : [selectedSubCategory],
      sort: 'newest',
    });
    return primary;
  }, [articles, categories, selectedSubCategory]);

  const leadArticle = sectionArticles[0];
  const restArticles = sectionArticles.slice(1);

  return (
    <div>
      {/* Editorial Section Masthead */}
      <section className="relative overflow-hidden border-b border-[#1E293B]">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt={heroImageAlt}
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/90 to-[#07090E]/55" />
        </div>

        <div className="relative mx-auto max-w-[1360px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-mono text-[#60A5FA] tracking-wider">{kicker}</p>
          <h1 className="mt-2 font-serif text-4xl lg:text-5xl font-medium text-[#F8FAFC] max-w-3xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#CBD5E1]">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubCategory('All')}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                selectedSubCategory === 'All'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'border border-[#1E293B] bg-[#0D121E]/85 text-[#CBD5E1] hover:border-[#334155] hover:text-white'
              }`}
            >
              All {title}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedSubCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  selectedSubCategory === cat
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'border border-[#1E293B] bg-[#0D121E]/85 text-[#CBD5E1] hover:border-[#334155] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              type="button"
              onClick={onOpenExplainer}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/45 bg-[#8B5CF6]/15 pl-2 pr-4 py-1.5 text-xs font-medium text-[#DDD6FE] hover:bg-[#8B5CF6]/25 transition-colors cursor-pointer"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8B5CF6]/25 text-[#C4B5FD]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span>Ask Cosmic Explainer</span>
            </button>
          </div>
        </div>
      </section>

      {/* Curated Content */}
      <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6 lg:px-8">
        {sectionArticles.length === 0 ? (
          <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-10 text-center">
            <p className="font-serif text-xl text-[#F1F5F9]">
              No current dispatches matched this sub-desk filter.
            </p>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Select “All {title}” above or explore the full Latest News wire.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {leadArticle && (
              <ArticleCard
                article={leadArticle}
                variant="lead"
                onExplain={onExplainArticle}
                onSelectCategory={(cat) => {
                  if (categories.includes(cat)) setSelectedSubCategory(cat);
                }}
              />
            )}

            {restArticles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onExplain={onExplainArticle}
                    onSelectCategory={(cat) => {
                      if (categories.includes(cat)) setSelectedSubCategory(cat);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
