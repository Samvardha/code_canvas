import { useEffect, useRef, useCallback } from "react";

export function useIntersectionObserver(
  callback: () => void,
  deps: any[] = []
) {
  const observer = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    },
    [callback]
  );

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.current.observe(currentElement);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [handleIntersect, ...deps]);

  return elementRef;
}
