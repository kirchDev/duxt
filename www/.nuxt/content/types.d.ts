import type { PageCollectionItemBase, DataCollectionItemBase } from '@nuxt/content'

declare module '@nuxt/content' {
   interface DocsDuxtCollectionItem extends PageCollectionItemBase {
    icon?: string
    layout?: string
    navigation?: boolean
  }
  
   interface DocsWorkflowsCollectionItem extends PageCollectionItemBase {
    icon?: string
    layout?: string
    navigation?: boolean
  }
  
   interface DocsWorkflowsV070CollectionItem extends PageCollectionItemBase {
    icon?: string
    layout?: string
    navigation?: boolean
  }
  

  interface PageCollections {
    docs_duxt: DocsDuxtCollectionItem
    docs_workflows: DocsWorkflowsCollectionItem
    docs_workflows_v0_7_0: DocsWorkflowsV070CollectionItem
  }

  interface Collections {
    docs_duxt: DocsDuxtCollectionItem
    docs_workflows: DocsWorkflowsCollectionItem
    docs_workflows_v0_7_0: DocsWorkflowsV070CollectionItem
  }
}
