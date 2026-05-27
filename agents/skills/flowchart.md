# Skill : Génération de Flowchart

## Objectif

Générer un diagramme de flux représentant un processus logique avec des étapes, des décisions et des chemins alternatifs. Le flowchart est le type le plus polyvalent : processus métier simple, arbre de décision, procédure opérationnelle, algorithme.

---

## Format de sortie

Utilise la syntaxe Mermaid `flowchart TD` (top-down, recommandé) ou `flowchart LR` (left-right pour les processus très linéaires).

---

## Conventions de notation

| Élément | Notation Mermaid | Usage |
|---|---|---|
| Début / Fin | `A([Texte])` | Événements terminaux (ovale) |
| Étape / Action | `B[Texte]` | Tâche réalisée (rectangle) |
| Décision | `C{Question?}` | Choix binaire ou multiple (losange) |
| Processus externe | `D[[Système externe]]` | Appel externe (rectangle double) |
| Document / Livrable | `E[/Document/]` | Artefact produit (parallélogramme) |
| Base de données | `F[(Base de données)]` | Stockage (cylindre) |
| Sous-processus | `G[[/Sous-processus/]]` | Processus délégué |
| Flèche avec label | `A -->|Label| B` | Condition sur le flux |
| Flèche sans label | `A --> B` | Flux direct |

---

## Règles de génération

1. **Un seul point d'entrée** et **au moins un point de sortie** bien définis.
2. **Décisions nommées** : le losange doit poser une question explicite avec un `?`.
3. **Branches labellisées** : toutes les sorties d'un losange doivent avoir un label (`|Oui|`, `|Non|`, `|Cas A|`...).
4. **Pas de chemin mort** : chaque branche aboutit à une étape suivante ou à un événement de fin.
5. **Convergence propre** : quand des branches alternatives se rejoignent, elles convergent vers un seul nœud avant de continuer.
6. **Profondeur maximale** : 3-4 niveaux de décision imbriqués. Au-delà, décomposer en sous-processus.
7. **Orientation** : `TD` (top-down) pour les processus hiérarchiques, `LR` pour les pipelines linéaires.

---

## Structure type

```mermaid
flowchart TD
  A([Début]) --> B[Étape 1]
  B --> C{Décision?}
  C -->|Oui| D[Chemin A]
  C -->|Non| E[Chemin B]
  D --> F[Étape commune]
  E --> F
  F --> G{Autre décision?}
  G -->|Validé| H([Fin — Succès])
  G -->|Rejeté| I[Traiter l'exception]
  I --> B
```

---

## Exemple complet : Processus d'évaluation annuelle

```mermaid
flowchart TD
  A([Début — Octobre]) --> B[RH envoie les formulaires]
  B --> C[Collaborateur remplit l'auto-évaluation]
  C --> D[Manager prépare l'évaluation]
  D --> E[Entretien en face-à-face]
  E --> F{Accord sur l'évaluation?}

  F -->|Oui| G[Signature des deux parties]
  F -->|Non| H[Médiation RH]
  H --> E

  G --> I[Transmission à la DRH]
  I --> J{Validation N+2 requise?}

  J -->|Oui| K[Validation par le N+2]
  J -->|Non| L[Validation automatique]

  K --> M{Décision N+2?}
  M -->|Validé| N[Archivage & Plan de développement]
  M -->|Révision demandée| G

  L --> N
  N --> O([Fin — Dossier clôturé])
```

---

## Cas d'usage privilégiés

- Procédures opérationnelles standard (SOP)
- Arbres de décision (eligibilité, diagnostic)
- Processus d'approbation séquentiels
- Flux de traitement de demandes (tickets, commandes)
- Processus sans notion de couloir/acteur dominant

## Quand préférer BPMN à Flowchart

Utilise BPMN si : il y a plusieurs acteurs clairement distincts avec des responsabilités séparées, ou si le processus inclut des événements de déclenchement (timer, message externe).
