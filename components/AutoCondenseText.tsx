import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';

interface AutoCondenseTextProps {
  children?: React.ReactNode;
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  minScaleX?: number; // default 0.35
}

/**
 * AutoCondenseText
 * When text is too long for its container, instead of using ellipsis ('...')
 * or proportional scaling (scale), it condenses horizontally (scaleX) while maintaining
 * exact consistent vertical font height.
 */
export const AutoCondenseText: React.FC<AutoCondenseTextProps> = ({
  children,
  text,
  className = '',
  style = {},
  align = 'left',
  minScaleX = 0.35,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scaleX, setScaleX] = useState<number>(1);

  const measure = useCallback(() => {
    if (!containerRef.current || !textRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const textWidth = textRef.current.scrollWidth;

    if (textWidth > containerWidth && containerWidth > 0) {
      const ratio = containerWidth / textWidth;
      setScaleX(Math.max(minScaleX, ratio));
    } else {
      setScaleX(1);
    }
  }, [minScaleX]);

  useLayoutEffect(() => {
    measure();
    const rafId = requestAnimationFrame(measure);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(containerRef.current);
    }

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => measure());
    }

    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children, text, style, className, measure]);

  const origin = align === 'left' ? 'left center' : align === 'right' ? 'right center' : 'center center';
  const justify = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden flex items-center min-w-0 ${justify}`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '100%',
          whiteSpace: 'nowrap',
          transform: scaleX < 1 ? `scaleX(${scaleX})` : undefined,
          transformOrigin: origin,
          width: 'max-content',
        }}
      >
        <span ref={textRef} className={`whitespace-nowrap flex items-center leading-none ${className}`} style={style}>
          {children ?? text}
        </span>
      </div>
    </div>
  );
};
