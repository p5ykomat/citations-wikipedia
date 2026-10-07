# Audit du compteur de citations Wikipédia

## Constats sur l’ancien compteur

1. Les lignes de `exturlusage` étaient présentées comme des « références ». Cette API indique des liens externes dans des pages, pas uniquement des notes bibliographiques.
2. Le total de plusieurs sources pouvait compter deux fois un lien lorsque les domaines recherchés se recouvraient.
3. Les URL distinctes étaient additionnées entre langues, ce qui pouvait compter plusieurs fois une même URL.
4. Une erreur sur un wiki interrompait l’ensemble de l’analyse et masquait les résultats déjà collectés.

## Corrections

- Le total principal est nommé **liens article / URL**. Une paire n’est comptée qu’une fois. Les occurrences répétées d’une même URL dans un article ne sont pas mesurées.
- L’espace de noms des articles est demandé à l’API et contrôlé dans les résultats.
- Les articles et liens sont dédoublonnés au total global, même si deux domaines se recouvrent. Les URL distinctes sont dédoublonnées entre langues au sein d’une source.
- Les défaillances sont affichées avec le wiki et la source concernés. Les chiffres restent signalés comme partiels.
- Le bouton **Vérifier les références** lit le HTML courant d’un article, après développement des modèles, et compte les notes contenant une URL recherchée dans les listes de références. Une note réutilisée plusieurs fois reste une note.
- L’export contient tous les articles collectés, même lorsque l’affichage est limité à 100 lignes par source.

## Limites

Une URL dans une bibliographie ou une section Liens externes est incluse dans le relevé des liens, mais pas dans le compteur des notes de référence. La vérification ne mesure ni la pertinence ni la fiabilité d’une source. Une citation imprimée sans URL, une archive, une redirection ou une URL raccourcie peut échapper à la recherche. L’index et le HTML courant peuvent correspondre à des instants différents.

Les styles de références atypiques non reconnus peuvent être classés hors des notes. Le résultat donne la version contrôlée, et un lien vers l’article pour vérifier.

## Vérification en direct

Le 7 octobre 2026, une recherche d’URL exacte Gallica sur Wikipédia en français a abouti à zéro résultat. Une tentative de collecte supplémentaire a été limitée par le service distant. Les tests de classification des références reposent donc sur des cas HTML contrôlés ; aucune validation exhaustive sur toutes les éditions n’est revendiquée.

## Ce qui a été contrôlé

- La recherche par domaine et par URL exacte, sans confondre un domaine ressemblant.
- Les pages successives de l’API, y compris une page intermédiaire vide avec continuation.
- Le dédoublonnage, les erreurs, la limite de collecte et l’arrêt demandé.
- Les exports CSV : protection contre l’interprétation des cellules comme formules.
- Les maquettes V1 et V2 sur ordinateur et écran étroit, les dialogues au clavier et les contrastes avec axe.

Ces contrôles ne démontrent pas l’absence de toute erreur. Les index et les pages évoluent pendant un relevé. Les alias, anciennes URL, liens raccourcis et notices sans lien explicite ne sont pas rapprochés automatiquement.

## Documentation officielle

- [API des liens externes](https://www.mediawiki.org/wiki/API:Exturlusage)
- [API de rendu des pages](https://www.mediawiki.org/wiki/API:Parsing_wikitext)
- [Réutilisation globale des fichiers](https://www.mediawiki.org/wiki/Extension:GlobalUsage)
