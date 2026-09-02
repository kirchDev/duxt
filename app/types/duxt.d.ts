/** A navbar, footer or landing link. `children` turns a navbar entry into a dropdown. */
interface DuxtLink {
  label: string;
  to?: string;
  icon?: string;
  description?: string;
  external?: boolean;
  children?: DuxtLink[];
}

interface DuxtAction extends DuxtLink {
  variant?:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'destructive';
}

interface DuxtFeature {
  title: string;
  description?: string;
  icon?: string;
}

interface DuxtLanding {
  badge?: string;
  headline?: string;
  description?: string;
  actions?: DuxtAction[];
  features?: DuxtFeature[];
}

interface DuxtConfig {
  title: string;
  /** Shown as a badge beside the title. */
  version?: string;
  navigation?: DuxtLink[];
  /** The second navbar row: top-level parts of the documentation. */
  sections?: DuxtLink[];
  /** Fixed links under the table of contents. */
  aside?: {
    title?: string;
    links?: DuxtLink[];
  };
  links?: DuxtLink[];
  landing?: DuxtLanding;
  footer?: {
    note?: string;
    links?: DuxtLink[];
  };
}

// Typing the config is what makes a consumer's override checkable — without
// this it is inferred structurally from the layer's own literal, and every
// optional key the layer happens not to use becomes a type error downstream.
declare module 'nuxt/schema' {
  interface AppConfigInput {
    duxt?: Partial<DuxtConfig>;
  }

  interface AppConfig {
    duxt: DuxtConfig;
  }
}

export {};
