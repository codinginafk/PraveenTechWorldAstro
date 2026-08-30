/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Turnstile {
  render(
    container: string | HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "auto" | "light" | "dark";
    }
  ): string;
  getResponse(widgetId: string): string;
  reset(widgetId: string): void;
}

interface PagefindUIOptions {
  element: string | HTMLElement;
  pageSize?: number;
  showImages?: boolean;
  resetStyles?: boolean;
}

interface PagefindUIInstance {
  triggerSearch(query: string): void;
}

interface Window {
  turnstile?: Turnstile;
  PagefindUI?: new (options: PagefindUIOptions) => PagefindUIInstance;
}
