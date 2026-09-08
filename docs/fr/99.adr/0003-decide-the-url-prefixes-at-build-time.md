---
title: Décider les préfixes d’URL à la compilation
description: L’apparition d’un segment de dépôt ou de version est tranchée par la liste des sources avant la première requête, jamais par requête.
status: accepted
date: 2026-09-06
---

## Contexte

Un site construit à partir de plusieurs sources doit servir un segment de dépôt
et un segment de version dans ses URL, et un site construit à partir d’un seul
dossier ne le doit pas — personne ne veut `/my-project/main/guides/deploying`
pour un projet doté d’un unique dossier de documentation non versionné.

Rendre chaque segment facultatif par requête ne fonctionne pas. Les deux étant
facultatifs, le premier segment de `/guides/…` pourrait être un dossier, un dépôt
ou une version, et seule la consultation des trois le dirait. Cette ambiguïté
n’est pas un désagrément de routage ; elle fait dépendre le sens d’une URL de ce
qui se trouve exister.

## Décision

Chaque préfixe est activé **pour le site entier, à la compilation, à partir de la
liste des sources** : un segment de dépôt dès que plus d’un dépôt est publié ou
qu’une option le force, un segment de version dès qu’une source publie plus d’une
ref ou qu’une option le force. Une ref par dépôt est servie sans aucun segment de
version.

## Conséquences

La forme de chaque URL est figée avant la première requête : le routeur ne devine
donc jamais, et un lien écrit dans une page peut être résolu par une vérification
à la compilation plutôt qu’en l’essayant.

Un dossier unique non versionné sert des chemins qui ne trahissent en rien
l’existence de dépôts ou de versions, et c’est ce qui rend le cas le plus simple
gratuit.

Faire passer un site d’une source à deux change chaque URL qu’il sert. C’est une
migration, et c’est la machinerie de redirection qui la rend supportable.

Il reste une collision, et aucune conception ne peut l’écarter : un dossier de
documentation nommé comme un segment de dépôt ou de version, où le préfixe
l’emporte et le dossier devient inatteignable. La compilation la rejette avec un
message plutôt que de la trancher silencieusement dans un sens.

Parce que le préfixe propre à une page n’est connu que de la compilation, les
liens à l’intérieur des pages s’écrivent comme des chemins de documentation nus
et sont résolus par rapport à la source de la page au moment du rendu. Une page
qui code en dur son propre préfixe est correcte sur exactement un site.
