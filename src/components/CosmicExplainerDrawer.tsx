import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Send, Sparkles, X } from 'lucide-react';
import { apiUrl, parseJsonResponse } from '../config/api';
import { Article, ExplainerMode, ExplainerResponse, ExplainerTurn } from '../types';

interface CosmicExplainerDrawerProps {
  open: boolean;
  article: Article | null;
  onClose: () => void;
  onClearArticle: () => void;
}

const MODE_OPTIONS: Array<{ id: ExplainerMode; label: string }> = [
  { id: 'explain-simple', label: 'Simple Explanation' },
  { id: 'summarize', label: 'Summarize Brief' },
  { id: 'significance', label: 'Why It Matters' },
  { id: 'glossary', label: 'Key Terms' },
];

const STARTER_QUESTIONS = [
  'How does gravitational lensing let JWST see galaxies from the early universe?',
  'What is the difference between a neutron star, a pulsar, and a magnetar?',
  'Why is the Hubble tension one of the biggest unsolved problems in cosmology?',
  'How do astronomers detect molecules in exoplanet atmospheres during transits?',
];

export function CosmicExplainerDrawer({
  open,
  article,
  onClose,
  onClearArticle,
}: CosmicExplainerDrawerProps) {
  const [activeMode, setActiveMode] = useState<ExplainerMode>('explain-simple');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainerResponse | null>(null);
  const [history, setHistory] = useState<ExplainerTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setResult(null);
    setHistory([]);
    setError(null);
    setQuestion('');
    if (article) {
      setActiveMode('explain-simple');
    } else {
      setActiveMode('qa');
    }
  }, [article?.id, open]);

  const runExplainer = async (mode: ExplainerMode, customQuestion?: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setActiveMode(mode);
    setLoading(true);
    setError(null);

    const submittedQuestion = (customQuestion ?? question).trim();

    try {
      const response = await fetch(apiUrl('/api/explainer'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          mode,
          question: submittedQuestion,
          history: history.slice(-6),
          article: article
            ? {
                title: article.title,
                excerpt: article.excerpt,
                publisher: article.publisher,
                category: article.category,
                publishedAt: article.publishedAt,
              }
            : undefined,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        setError(
          `Cosmic Explainer could not be reached right now (HTTP ${response.status}). Please try again.`
        );
        setResult(null);
        return;
      }

      const data = await parseJsonResponse<ExplainerResponse & { error?: string }>(
        response,
        'Cosmic Explainer API'
      );
      if (!response.ok) {
        setError(data.error || `Cosmic Explainer could not complete this request (HTTP ${response.status}).`);
        setResult(null);
        return;
      }

      const explainerRes = data as ExplainerResponse;
      setResult(explainerRes);
      const userTurnText =
        mode === 'qa'
          ? submittedQuestion
          : `${MODE_OPTIONS.find((m) => m.id === mode)?.label || mode}${article ? `: ${article.title}` : ''}`;
      setHistory((prev) =>
        [
          ...prev,
          { role: 'user' as const, text: userTurnText },
          { role: 'model' as const, text: explainerRes.answer },
        ].slice(-6)
      );
      if (mode === 'qa') {
        setQuestion('');
      }
    } catch {
      setError('Unable to reach Cosmic Explainer right now. Please try again.');
      setResult(null);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current || loading) return;
    const trimmed = question.trim();
    if (trimmed.length < 3) {
      setError('Please enter a question of at least 3 characters.');
      return;
    }
    void runExplainer('qa', trimmed);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cosmic-explainer-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#1E293B] bg-[#090D16] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#A78BFA]">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="cosmic-explainer-title"
                className="font-serif text-lg font-medium text-[#F1F5F9]"
              >
                COSMIC EXPLAINER
              </h2>
              <p className="text-xs text-[#94A3B8]">
                AI-Assisted Science Literacy Desk
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cosmic Explainer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Selected Article Context */}
          {article ? (
            <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-5">
              <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
                <span>
                  {article.category} · {article.publisher}
                </span>
                <button
                  type="button"
                  onClick={onClearArticle}
                  className="text-[#60A5FA] hover:text-[#93C5FD] transition-colors cursor-pointer"
                >
                  Switch to General Q&amp;A
                </button>
              </div>
              <h3 className="mt-2 font-serif text-base font-medium text-[#F1F5F9]">
                {article.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8] line-clamp-3">
                {article.excerpt}
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:text-[#93C5FD]"
              >
                <span>Open original publisher report</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>

              {/* Action Mode Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={loading}
                    onClick={() => void runExplainer(option.id)}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors text-left cursor-pointer ${
                      activeMode === option.id && result
                        ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                        : 'border-[#1E293B] bg-[#07090E] text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-[#CBD5E1]">
                Ask about any astrophysics concept, cosmology theory, telescope instrument, or planetary phenomenon — or click <strong className="font-medium text-white">Explain</strong> on any article to analyze it in context.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-mono text-[#94A3B8]">Suggested Inquiries</p>
                {STARTER_QUESTIONS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setQuestion(starter);
                      void runExplainer('qa', starter);
                    }}
                    className="block w-full rounded-xl border border-[#1E293B] bg-[#0D121E] px-4 py-3 text-left text-xs leading-relaxed text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white transition-colors cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Output Area */}
          {loading && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0D121E] p-5 space-y-3">
              <p className="text-xs font-mono text-[#60A5FA]">
                Synthesizing verified scientific explanation…
              </p>
              <div className="h-3 w-full animate-pulse rounded-full bg-[#1E293B]" />
              <div className="h-3 w-11/12 animate-pulse rounded-full bg-[#1E293B]" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#1E293B]" />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm leading-relaxed text-[#FCA5A5]"
            >
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#C4B5FD]">
                  <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>AI-Generated Scientific Explanation</span>
                </span>
                <span className="font-mono text-[#64748B]">{result.model}</span>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-[#E2E8F0] whitespace-pre-line">
                {result.answer}
              </div>

              <p className="border-t border-[#1E293B] pt-3 text-xs text-[#94A3B8]">
                {result.disclaimer}
              </p>
            </div>
          )}
        </div>

        {/* Question Form Footer */}
        <form
          onSubmit={handleQuestionSubmit}
          className="border-t border-[#1E293B] bg-[#07090E] p-4"
        >
          <label htmlFor="cosmic-explainer-input" className="sr-only">
            Ask Cosmic Explainer a scientific question
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cosmic-explainer-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                article
                  ? 'Ask a follow-up question about this article…'
                  : 'Ask any astronomy or astrophysics question…'
              }
              className="h-11 flex-1 rounded-full border border-[#1E293B] bg-[#0D121E] px-4 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Send question to Cosmic Explainer"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#2563EB] px-5 text-sm font-medium text-white hover:bg-[#3B82F6] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Ask</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
