# Citations Wikipédia

Repérer les articles qui renvoient vers une publication et vérifier les notes de référence dans lesquelles elle apparaît.

**Version de travail. Deux directions graphiques locales sont proposées avant le choix de la version finale. Aucun nouveau site n’a été déployé.**

## Essayer sur son ordinateur

Installer une version récente de Node.js (22 ou 24), télécharger ce dépôt et ouvrir un terminal dans son dossier :

```sh
npm ci
npm run dev
```

Ouvrir l’adresse locale indiquée dans le terminal. Aucun compte ni clé API nécessaire. Les requêtes partent du navigateur vers les API publiques Wikimédia.

- `/?v=1` : direction éditoriale, ivoire et brun.
- `/?v=2` : direction studio, blanc et bleu.
- Ajouter `&demo=1` pour afficher un exemple **fictif**, sans requête aux API.

## Comprendre le résultat

Lire [la méthode, l’audit et les limites](docs/AUDIT.md). Les emplacements des liens sont montrés pour permettre une vérification. Le relevé n’est pas exhaustif.

## Vérifier le code

```sh
npm test
npm run build
```

Le site compilé se trouve dans `dist/`. Le dossier `src/` contient le code du navigateur, `tests/` les cas de régression. `linkedom` est utilisé uniquement pour les tests HTML, sous sa licence ISC. Aucune bibliothèque n’est chargée dans le navigateur.

## Licences

Code sous [MIT](LICENSE). Textes, guides et créations visuelles originaux sous [CC BY-SA 4.0](LICENSE-DOCS.md). Attribution : **p5ykomat**. Les données externes conservent leurs licences et attributions.

## Reprendre une collecte

Les appels sont séquentiels, avec une pause d’au moins une seconde après chaque réponse et des pages de 100 liens au maximum pour le repérage. Si le service limite les requêtes, l’outil attend et réessaie, jusqu’à six tentatives par appel. Les résultats arrivent progressivement.

**Mettre en pause** conserve l’avancement. **Reprendre le relevé** poursuit la collecte sans recommencer les pages déjà reçues. Le dernier relevé est sauvegardé dans ce navigateur et peut être restauré pendant 24 heures, même après un rechargement. Une nouvelle recherche repart de zéro pour actualiser les données. Si le stockage du navigateur est plein ou interdit, la reprise reste disponible tant que la page demeure ouverte.

Une panne durable de l’API peut laisser un relevé partiel : les données reçues restent consultables et exportables, avec cette limite indiquée. Aucun résultat manquant n’est remplacé par un chiffre inventé.
