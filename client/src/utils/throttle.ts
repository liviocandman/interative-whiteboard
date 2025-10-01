// client/src/utils/throttle.ts

// Define function types more specifically to avoid 'any'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export function throttle<T extends AnyFunction>(
  func: T,
  delay: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeoutId: TimeoutId | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      lastExecTime = currentTime;
      return func(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
      
      // Retorno explícito de undefined quando não executamos imediatamente
      return undefined;
    }
  };
}

export function debounce<T extends AnyFunction>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: TimeoutId | null = null;

  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

export function rafThrottle<T extends AnyFunction>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  const execute = (): void => {
    if (latestArgs) {
      func(...latestArgs);
      latestArgs = null;
    }
    rafId = null;
  };

  return (...args: Parameters<T>): void => {
    latestArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(execute);
    }
  };
}