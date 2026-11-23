import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
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

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (loading || result || error) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    }
  }, [loading, result, error, history.length, prefersReduced]);

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

  const priorTurns = history.length > 2 ? history.slice(0, -2) : [];
  const latestUserPrompt =
    history.length >= 2 && history[history.length - 2]?.role === 'user'
      ? history[history.length - 2].text
      : null;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cosmic-explainer-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? false : { y: 28, opacity: 0.96 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-[92dvh] sm:h-full w-full sm:max-w-xl flex-col overflow-hidden rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-[#1E293B] bg-[#090D16] shadow-2xl"
      >
        {/* Subtle Mobile Sheet Grabber */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[#334155]" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#A78BFA]">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="cosmic-explainer-title"
                className="font-serif text-base sm:text-lg font-medium text-[#F1F5F9] truncate"
              >
                COSMIC EXPLAINER
              </h2>
              <p className="text-xs text-[#94A3B8] truncate">
                AI-Assisted Science Literacy Desk
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cosmic Explainer"
            className="inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white active:scale-[0.95] transition-all cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 space-y-5"
        >
          {/* Selected Article Context */}
          {article ? (
            <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
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
                    className={`min-h-[44px] sm:min-h-0 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all active:scale-[0.98] text-left cursor-pointer ${
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
            <div className="space-y-3.5">
              <p className="text-[15px] sm:text-sm leading-relaxed text-[#CBD5E1]">
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
                    className="block min-h-[46px] w-full rounded-xl border border-[#1E293B] bg-[#0D121E] px-4 py-3 text-left text-[13px] sm:text-xs leading-relaxed text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white active:scale-[0.985] active:border-[#3B82F6]/70 transition-all cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Earlier Conversational Exchanges */}
          {priorTurns.length > 0 && (
            <div className="space-y-3">
              {priorTurns.map((turn, idx) =>
                turn.role === 'user' ? (
                  <div key={`turn-${idx}`} className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#3B82F6]/30 bg-[#13203A]/90 px-4 py-2.5 text-sm leading-relaxed text-[#EFF6FF]">
                      {turn.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`turn-${idx}`}
                    className="rounded-2xl border border-[#1E293B]/80 bg-[#0D121E]/70 p-4 text-sm leading-relaxed text-[#CBD5E1] whitespace-pre-line"
                  >
                    {turn.text}
                  </div>
                )
              )}
            </div>
          )}

          {/* Output Area */}
          {loading && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-[#3B82F6]/30 bg-[#0D121E] p-4 sm:p-5 space-y-3"
            >
              <p className="text-xs font-mono text-[#60A5FA]">
                Synthesizing verified scientific explanation…
              </p>
              <div className="h-3 w-full cosmic-shimmer rounded-full" />
              <div className="h-3 w-11/12 cosmic-shimmer rounded-full" />
              <div className="h-3 w-4/5 cosmic-shimmer rounded-full" />
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm leading-relaxed text-[#FCA5A5]"
            >
              {error}
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key={result.answer.slice(0, 32)}
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              {latestUserPrompt && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#3B82F6]/35 bg-[#13203A] px-4 py-2.5 text-sm leading-relaxed text-[#EFF6FF]">
                    {latestUserPrompt}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/95 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#C4B5FD]">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    <span>AI-Generated Scientific Explanation</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#64748B]">{result.model}</span>
                </div>

                <div className="space-y-3 text-[15px] sm:text-sm leading-[1.68] sm:leading-relaxed text-[#E2E8F0] whitespace-pre-line break-words">
                  {result.answer}
                </div>

                <p className="border-t border-[#1E293B] pt-3 text-xs leading-relaxed text-[#94A3B8]">
                  {result.disclaimer}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sticky Ergonomic Question Form Footer */}
        <form
          onSubmit={handleQuestionSubmit}
          className="border-t border-[#1E293B] bg-[#07090E] px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:p-4"
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
                  ? 'Ask a follow-up about this article…'
                  : 'Ask an astronomy or space question…'
              }
              className="h-12 sm:h-11 min-w-0 flex-1 rounded-full border border-[#1E293B] bg-[#0D121E] px-4 text-base sm:text-sm text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Send question to Cosmic Explainer"
              className="inline-flex h-12 sm:h-11 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-5 text-sm font-medium text-white shadow-[0_6px_20px_rgba(37,99,235,0.3)] hover:from-[#3B82F6] hover:to-[#4F46E5] active:scale-[0.97] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Ask</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
