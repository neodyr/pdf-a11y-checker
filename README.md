# Vérificateur d'accessibilité PDF

Un outil **100 % dans le navigateur** pour vérifier l'accessibilité d'un document PDF
(RGAA 4.1 / PDF-UA) : balisage, titre, langue, texte réel vs scan, alternatives des images,
signets, formulaires.

> **Confidentiel par conception** : le PDF n'est jamais envoyé sur un serveur. Toute l'analyse
> se fait localement, dans votre navigateur. Idéal pour des documents sensibles.

> Un outil [**Neodyr**](https://neodyr.com) — audit, mise en conformité et formation RGAA.

## ✨ Ce que l'outil vérifie

| Point | Pourquoi |
|---|---|
| **Balisage** (structure logique) | Sans balises, l'ordre de lecture, les titres et les tableaux ne sont pas restitués. Le défaut n°1. |
| **Titre du document** | Identifie le document (barre de titre, lecteur d'écran). |
| **Langue** | Nécessaire à une restitution vocale correcte. |
| **Texte réel / scan** | Un PDF scanné (image) est illisible pour un lecteur d'écran. |
| **Alternatives des images** | Les images porteuses d'information doivent être décrites (si le PDF est balisé). |
| **Signets** | Facilitent la navigation, surtout dans les longs documents. |
| **Formulaires** | Signale la présence d'un formulaire à vérifier manuellement. |

## ⚠️ Ce qu'il ne fait pas

Il **vérifie**, il ne **corrige** pas. Rendre un PDF réellement accessible demande aussi une
**vérification humaine** (ordre de lecture, pertinence des alternatives, structure des
tableaux). L'outil ne remplace pas un audit — il en donne un premier état des lieux.

## 🚀 Utilisation

Rendez-vous sur la version en ligne (GitHub Pages), ou ouvrez `index.html` en local via un
petit serveur :

```bash
npx http-server . -p 8080
# puis http://localhost:8080
```

Déposez un PDF (ou cliquez pour le choisir) → le rapport s'affiche.

## ♿ Accessibilité de l'outil

L'outil est lui-même conçu pour être accessible (RGAA / WCAG 2.1 AA) : structure sémantique,
formulaire étiqueté, navigation clavier, focus visible, résultats annoncés aux technologies
d'assistance. Une CI (GitHub Actions) le vérifie avec **axe** à chaque *push*.

## 🛠️ Technique

- **pdf.js** (Mozilla, Apache-2.0) — vendorisé dans `assets/vendor/`, aucune dépendance externe au runtime.
- Aucune étape de build : site statique, hébergé sur **GitHub Pages**.

## 📄 Licence

Code de l'outil sous licence **MIT** (voir [LICENSE](LICENSE)). pdf.js est distribué sous
licence Apache-2.0.

## À propos de Neodyr

[**Neodyr**](https://neodyr.com) — audit RGAA, mise en conformité et formation à
l'accessibilité numérique. contact@neodyr.com
