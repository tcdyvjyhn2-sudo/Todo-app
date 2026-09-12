import { useEffect, useState } from 'react';

const QUERY = '(max-width: 480px)';

// True on iPhone-width viewports (matches the CSS breakpoint used for the
// same purpose elsewhere) - lets a couple of components swap full weekday/
// month names for abbreviations so their <select> renders narrower.
export function useIsCompact() {
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setIsCompact(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isCompact;
}
