// Global type declarations for React Native/Expo

declare var __DEV__: boolean;

// React Native module declaration
declare module 'react-native' {
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    Version: number;
    select<T>(spec: { [key: string]: T }): T;
  };
  
  // Add other commonly used exports
  export * from '@types/react-native';
}

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
