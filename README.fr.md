# Wiki Link Count

[English](README.md) | Français

Repérer les articles Wikipédia qui renvoient vers un site, vérifier leurs notes de référence et exporter les résultats. Les totaux comptent les couples article/URL indexés, pas toutes les occurrences ni toutes les citations bibliographiques. Les notes de référence sont vérifiées article par article.

## Utiliser en ligne

[Ouvrir Wiki Link Count sur Toolforge](https://wiki-link-count.toolforge.org/), sans installation.

## Utiliser en local

Installer Node.js 22, télécharger ce dépôt et exécuter :

```sh
npm ci
npm run dev
```

Ouvrir l’adresse locale indiquée dans le terminal. Aucun compte ni clé API nécessaire. Les requêtes partent du navigateur vers les API publiques Wikimédia.

L’interface est disponible en français et en anglais. Les titres et extraits des sources conservent leur langue d’origine.

## Résultats et limites

Les résultats dépendent de l’index de l’API et des données accessibles. Ils ne constituent pas un historique exhaustif.

## Mettre en pause et reprendre

Les appels sont séquentiels, avec une pause d’au moins une seconde après chaque réponse et des pages de repérage de 100 liens au maximum. Les limitations de débit déclenchent un nombre limité de nouvelles tentatives.

**Mettre en pause** conserve l’avancement. **Reprendre le relevé** poursuit la collecte au dernier point sauvegardé. Le dernier relevé peut être restauré dans le même navigateur pendant 24 heures. Si le stockage est indisponible, la reprise reste possible tant que la page demeure ouverte. Une nouvelle recherche repart de zéro pour actualiser les données.

Une panne de l’API peut laisser des résultats partiels. Ils restent consultables et exportables, avec cette limite indiquée.

## Développement et déploiement

```sh
npm test
npm run build
npm start
```

Le site compilé se trouve dans `dist/`, le code du navigateur dans `src/` et les tests dans `tests/`. La dépendance de test HTML `linkedom` utilise la licence ISC et n’est pas chargée dans le navigateur.

## Crédit et licences

[Mathieu Denel WMFR](https://meta.wikimedia.org/wiki/User:Mathieu_Denel_WMFr) · Projet personnel.

Code sous [MIT](LICENSE). Documentation et créations visuelles originales sous [CC BY-SA 4.0](LICENSE-DOCS.md), attribution **p5ykomat**. Les données externes conservent leurs licences et attributions.

