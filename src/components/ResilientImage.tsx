import { useState, useEffect } from 'react';
import { NewsCategory } from '../types';
import { getFallbackImageForCategory } from '../utils/mediaAssets';

interface ResilientImageProps {
  src?: string;
  alt: string;
  category?: NewsCategory;
  fallbackSrc?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function ResilientImage({
  src,
  alt,
  category = 'Astronomy',
  fallbackSrc,
  className = 'w-full h-full object-cover',
  loading = 'lazy',
}: ResilientImageProps) {
  const defaultFallback = fallbackSrc ?? getFallbackImageForCategory(category);
  const [activeSrc, setActiveSrc] = useState<string>(src || defaultFallback);
  const [failedCompletely, setFailedCompletely] = useState(false);

  useEffect(() => {
    setActiveSrc(src || defaultFallback);
    setFailedCompletely(false);
  }, [src, defaultFallback]);

  if (failedCompletely) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-[#0D1322] via-[#131C31] to-[#080B12] flex items-end p-5 ${className}`}
      >
        <span className="text-xs font-mono text-[#94A3B8] tracking-wide">
          {category} · Observatory Archive
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (activeSrc !== defaultFallback) {
          setActiveSrc(defaultFallback);
        } else {
          setFailedCompletely(true);
        }
      }}
      className={className}
    />
  );
}
