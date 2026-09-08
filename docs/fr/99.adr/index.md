---
title: Décisions d’architecture
description: Le journal des décisions — chaque décision d’architecture consignée pour duxt.
icon: lucide:gavel
---

Une décision mérite un ADR lorsqu’elle contraint le travail qui vient ensuite et
que son raisonnement serait sinon perdu : un choix entre de vraies alternatives,
une convention que chaque partie du projet doit suivre, un compromis qui
ressemble à une erreur tant qu’on n’en connaît pas la raison. Les enregistrements
sont en ajout seul — une décision renversée s’écrit comme un nouvel ADR qui
remplace l’ancien, jamais comme une modification de celui-ci.

| ADR                                                                        | Décision                                                           | Statut   | Date       |
| :------------------------------------------------------------------------- | :----------------------------------------------------------------- | :------- | :--------- |
| [ADR-0001](/adr/0001-build-duxt-as-a-layer-carrying-a-module)              | Construire duxt comme une couche portant un module                 | accepted | 2026-09-06 |
| [ADR-0002](/adr/0002-generate-the-collections-from-one-source-list)        | Générer les collections à partir d’une seule liste de sources      | accepted | 2026-09-06 |
| [ADR-0003](/adr/0003-decide-the-url-prefixes-at-build-time)                | Décider les préfixes d’URL à la compilation                        | accepted | 2026-09-06 |
| [ADR-0004](/adr/0004-render-markdown-components-with-mdc)                  | Rendre les composants Markdown avec MDC                            | accepted | 2026-09-06 |
| [ADR-0005](/adr/0005-ship-the-layer-without-owner-specific-links)          | Livrer la couche sans liens propres à un propriétaire              | accepted | 2026-09-06 |
| [ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) | Recompiler de façon planifiée plutôt que rafraîchir à l’exécution  | accepted | 2026-09-06 |
| [ADR-0007](/adr/0007-serve-translations-as-collections-of-their-own) | Servir les traductions comme des collections à part | accepted | 2026-09-06 |
| [ADR-0008](/adr/0008-build-the-theme-on-owned-shadcn-vue-components) | Bâtir le thème sur des composants shadcn-vue possédés | accepted | 2026-09-08 |
| [ADR-0009](/adr/0009-take-the-seo-stack-from-the-nuxt-seo-bundle) | Prendre le socle SEO dans le bundle Nuxt SEO | accepted | 2026-09-08 |
