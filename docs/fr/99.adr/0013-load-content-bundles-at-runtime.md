---
title: Charger les bundles de contenu à l’exécution
description: Restreindre le choix de la reconstruction aux déploiements Node et SQLite qui activent cette exception, après comparaison d’un paquet de contenu et d’une compilation complète.
status: accepted
date: 2026-11-04
---

# ADR-0013 — Charger les bundles de contenu à l’exécution

## Contexte

Une wiki peut modifier son Markdown plus souvent que son code. Reconstruire une
image pour chaque modification lie le contenu au cycle de publication ; un pod
sans accès réseau sortant ne peut pas récupérer les sources lui-même.
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime)
a choisi des déploiements immuables, un défaut utile pour les sites statiques et
les Workers.

L’exception devait démontrer que le contenu pouvait être empaqueté sans compiler
l’application. L’essai du 2026-11-04 utilisait `apps/www` au commit
`725534546886f06220f62a99525070ee63978a50`, Node 26.11.1, Nuxt 4.6.2 et
Content 3.16.2 : 96 collections, 9 603 fichiers et 95 exports de collections publiques.

Les deux processus tournaient depuis `apps/www` sur la même machine à huit CPU,
avec les mêmes sources et dépendances installées. Des miroirs Git publics figés
fournissaient les sources distantes par HTTPS sur une boucle locale isolée, sans
réseau externe. Ils démarraient sans base d’analyse Content ni anciennes
structures générées et analysaient tous les 9 603 fichiers. Préparer le runner
et copier les entrées était exclu du chronométrage. Les deux codes de sortie
étaient `0`.

| Mesure | Contenu seul | `nuxt build` complet |
| :--- | ---: | ---: |
| Durée réelle | 110.36 s | 278.54 s |
| Part de la compilation complète | 39.62% | 100% |
| Exports de collections | 95 | 95 |

Les 95 exports compressés et les littéraux de `checksums` et `checksumsStructure` étaient identiques octet par octet. Les fichiers complets `database.compressed.mjs`, `manifest.ts` et `sql_dump.txt` correspondaient aussi ; les tables du manifeste contenaient chacune 96 entrées.

| File | Bytes | SHA-256 (both runs) |
| :--- | ----: | :----------------- |
| `database.compressed.mjs` | 18,747,182 | `e708db643cc47bc0cd742e910124f5cdd63586e9d06fd4c6301a35d871a2bb1f` |
| `manifest.ts` | 104,380 | `43bd5c30c30e426a117053d9256684aa992c52a9b72493c4af2b95ee1ea8df65` |
| `sql_dump.txt` | 76,747,454 | `eba31689710dc03ce165dfeb9770c666c7f561083336a7fc1ba85828c334fb00` |


La séquence limitée au contenu était :

```js
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';

const buildDir = await mkdtemp(join(process.cwd(), '.nuxt-pack-'));
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dev: false,
  overrides: { buildDir }
});
try {
  nuxt.options._prepare = true;
  await buildNuxt(nuxt);
  // Save buildDir/content before disposing the temporary directory.
} finally {
  await nuxt.close();
}
```

L’initialisation des modules de production et l’analyse étaient terminées
**avant** d’activer `_prepare`. L’activer plus tôt aurait évité l’analyse ;
réutiliser le répertoire aurait permis de reprendre d’anciens fichiers générés.
Les templates ont été produits sans regrouper Vite ni Nitro. La comparaison
exécutait `build` avec la CLI Nuxt installée depuis `apps/www`, sans surcharge de
configuration. L’essai n’ajoutait ni empaqueteur de production ni chargeur à
l’exécution.

`cd apps/www && node node_modules/nuxt/bin/nuxt.mjs build`

## Décision

Autoriser les bundles de contenu comme option explicite des déploiements Node
avec SQLite. Cela restreint ADR-0006 à cette seule exception ; reconstruire
reste le défaut et la voie des Workers et des sorties statiques. L’essai a
satisfait les deux critères : exports et sommes identiques octet par octet,
et durée du pack inférieure ou égale à la moitié de celle de la compilation.

Un bundle peut changer le contenu, les redirections et les médias documentaires.
Un changement de schéma, une nouvelle source ou version et du nouveau code MDC
nécessitent toujours une image. Compatibilité et empreintes sont vérifiées avant
d’importer toutes les collections dans une transaction SQLite et de publier les
sommes Content correspondantes. Un rejet conserve le contenu actif.

Le transport est un répertoire géré par l’opérateur, avec remplacement atomique
du pointeur `current` ; la couche n’a besoin ni de client de stockage, ni
d’identifiants, ni de réseau sortant. Le packer provient du commit de
l’application, avec une seconde cible Docker testée et une empreinte de
compatibilité attendue vérifiée avant publication. Les composants MDC existants
sont globaux en mode bundle ; le contenu peut en utiliser un sous-ensemble.
Les réplicas basculent indépendamment, avec un décalage accepté jusqu’à
l’intervalle de scrutation plus la durée de l’import.

## Conséquences

Les publications de contenu et d’application deviennent indépendantes dans ce
périmètre, au prix d’une validation de compatibilité et d’une activation atomique.
Le format d’export Content, sa route et l’objet mutable des sommes nécessitent
des tests de contrat. Le pack à froid passait encore l’essentiel de son temps à
analyser ; la mesure établit le gain pour cet arbre, pas pour chaque utilisateur
ou état du cache. Le décalage des réplicas et un navigateur conservant son contenu
jusqu’au prochain rechargement complet sont des coûts acceptés.

## Alternatives envisagées

**Reconstruire une image à chaque push de contenu.** Reste le défaut ; l’étape
mesurée a justifié une exception pour la wiki à l’origine de la proposition.

**Remplacer ADR-0006 partout.** Rejeté : sites statiques et Workers conservent leur
modèle de compilation immuable.

**Laisser Content restaurer à la demande, ou accéder au stockage depuis la couche.**
Une restauration par collection ne peut pas toutes les basculer atomiquement.
Un client de stockage apporterait identifiants et réseau sortant dans
l’application au lieu de laisser le transport à l’opérateur.
