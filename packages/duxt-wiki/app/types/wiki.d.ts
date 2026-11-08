declare module 'nuxt/schema' {
  interface AppConfig {
    wiki: { sidebar: boolean };
  }
  interface AppConfigInput {
    wiki?: { sidebar?: boolean };
  }
}
export {};
