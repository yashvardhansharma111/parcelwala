// Global type declarations for React Native/Expo

declare var __DEV__: boolean;

// Fetch API types (available in React Native)
interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
  mode?: RequestMode;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
  signal?: AbortSignal;
}

// URLSearchParams (available in React Native)
declare var URLSearchParams: {
  new (init?: string[][] | Record<string, string> | string | URLSearchParams): URLSearchParams;
  prototype: URLSearchParams;
};

// Console (available in React Native)
declare var console: Console;
