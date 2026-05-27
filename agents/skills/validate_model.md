# Skill : Validation du Modèle

## Objectif

Vérifier silencieusement le diagramme généré par rapport aux règles du projet et aux bonnes pratiques de modélisation. Retourner une liste structurée de non-conformités. Ce skill ne bloque pas la génération — il produit des avertissements affichés à l'utilisateur.

---

## Déclenchement

Ce skill est exécuté automatiquement après chaque génération de diagramme, en arrière-plan.

---

## Entrées requises

- `code` : le code Mermaid ou XML BPMN du diagramme généré.
- `diagram_type` : le type de diagramme (`bpmn`, `orgchart`, `sequence`, `flowchart`).
- `project_rules` : le texte des règles du projet (champ `rules_text` du projet).
- `task_description` : la description de la tâche de modélisation.

---

## Règles de validation générales (tous types)

| Règle | Vérification |
|---|---|
| Début et fin présents | Le diagramme a au moins un événement de début et un de fin |
| Pas de nœuds isolés | Chaque nœud est connecté à au moins un autre |
| Labels non vides | Aucun nœud ni flèche sans label |
| Longueur raisonnable | Le diagramme a entre 4 et 25 nœuds |
| Cohérence du type | Le code correspond bien au type déclaré |

## Règles spécifiques par type

### BPMN
- Au moins 2 swim lanes présentes
- Chaque passerelle a toutes ses branches labellisées
- Chaque branche d'une passerelle converge vers un chemin valide

### Organigramme
- Un seul nœud racine
- Pas de cycles dans la hiérarchie
- Maximum 4 niveaux de profondeur

### Séquence
- Les messages synchrones ont un retour visible
- Les blocs `alt`/`loop` sont correctement fermés

### Flowchart
- Toutes les sorties des losanges sont labellisées
- Pas de chemin menant à une impasse

## Validation contre les règles projet

Analyse le texte `project_rules` et vérifie point par point si le diagramme les respecte.

Exemples de règles fréquentes et leur vérification :
- "Utiliser les swim lanes par département" → vérifier la présence de subgraph par département dans BPMN
- "Inclure le rôle Valideur" → vérifier qu'un acteur "Valideur" ou équivalent est présent
- "Indiquer les délais SLA" → vérifier la présence d'annotations temporelles sur les tâches critiques
- "Nommer les tâches avec un verbe à l'infinitif" → vérifier que les labels de tâches commencent par un verbe infinitif

---

## Format de sortie

Retourne un objet JSON strictement structuré :

```json
{
  "is_valid": true | false,
  "warnings": [
    {
      "severity": "error" | "warning" | "info",
      "rule": "Nom de la règle violée",
      "message": "Description courte du problème en français",
      "suggestion": "Comment le corriger (optionnel)"
    }
  ],
  "summary": "Résumé en une phrase : ex. '2 avertissements détectés — règles projet partiellement respectées.'"
}
```

- `error` : non-conformité grave (diagramme structurellement invalide ou règle projet explicite violée)
- `warning` : bonne pratique non respectée (lisibilité, convention)
- `info` : suggestion d'amélioration non critique

---

## Comportement

- Si aucune non-conformité : `"is_valid": true`, `"warnings": []`, summary positif.
- Si `project_rules` est vide : appliquer uniquement les règles générales et spécifiques au type.
- Ne pas bloquer l'utilisateur : les avertissements sont informatifs uniquement.
- Maximum 5 avertissements affichés à l'utilisateur (agréger les petits problèmes similaires).
