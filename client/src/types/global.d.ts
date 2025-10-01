// client/src/types/global.d.ts
export {};

declare global {
  // Browser-compatible timeout types (instead of NodeJS.Timeout)
  type TimeoutId = ReturnType<typeof setTimeout>;
  type IntervalId = ReturnType<typeof setInterval>;


  // Custom utility types
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

  type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

  // Function types to avoid 'any'
  type VoidFunction = () => void;
  type AnyFunction = (...args: unknown[]) => unknown;
  type EventHandler<T = Event> = (event: T) => void;
}

// Browser API extensions
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}