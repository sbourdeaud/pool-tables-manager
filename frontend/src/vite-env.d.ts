/// <reference types="vite/client" />

declare const __FRONTEND_BUILD__: {
  readonly builtAt: string
  readonly commit: string | null
  readonly status: 'clean' | 'dirty' | 'unknown'
}
