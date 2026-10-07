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
