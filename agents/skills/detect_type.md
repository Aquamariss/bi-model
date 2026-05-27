# Skill : Détection du Type d'Artifact

## Objectif

Analyser le contenu d'un artifact uploadé (code, texte, fichier) et déterminer son type de diagramme. Utilisé lors de l'ajout d'un artifact avec l'option "détection automatique".

---

## Déclenchement

Ce skill est exécuté à l'upload d'un artifact quand le champ `type` n'est pas renseigné manuellement.

---

## Entrées requises

- `content` : contenu textuel de l'artifact (code Mermaid, XML, texte brut, description d'image).
- `filename` (optionnel) : nom du fichier avec extension.
- `mime_type` (optionnel) : type MIME du fichier.

---

## Règles de détection

### Par extension de fichier (prioritaire)
| Extension | Type détecté |
|---|---|
| `.bpmn` | `bpmn` |
| `.mmd`, `.mermaid` | selon contenu |
| `.png`, `.jpg`, `.svg` | `image` |
| `.pdf` | `other` (nécessite description manuelle) |
| `.md`, `.txt` | `text` |

### Par contenu Mermaid (analyse des mots-clés)
| Indicateur dans le code | Type détecté |
|---|---|
| `sequenceDiagram` | `sequence` |
| `subgraph` + flèches + `actor` | `bpmn` |
| `graph TD`/`LR` + nœuds simples sans losanges | `orgchart` |
| `flowchart` + `{...}` losanges | `flowchart` |
| `flowchart` sans losanges + `subgraph` | `bpmn` (BPMN simplifié) |

### Par contenu XML
| Indicateur | Type détecté |
|---|---|
| `<bpmn:`, `<process`, `<startEvent` | `bpmn` |
| Autre XML | `other` |

### Par analyse sémantique du texte (si code ambigu)
Analyse le contenu et détermine si le document décrit :
- Un flux de processus avec acteurs séparés → `bpmn`
- Une hiérarchie organisationnelle → `orgchart`
- Des échanges entre systèmes dans le temps → `sequence`
- Un flux de décisions → `flowchart`
- Du texte descriptif sans structure de diagramme → `text`

---

## Format de sortie

```json
{
  "detected_type": "bpmn" | "orgchart" | "sequence" | "flowchart" | "image" | "text" | "url" | "other",
  "confidence": "high" | "medium" | "low",
  "reason": "Explication courte en français de la détection",
  "alternative_type": "type alternatif possible si ambiguïté" | null
}
```

---

## Comportement

- `confidence: "high"` → proposer le type détecté comme valeur par défaut confirmée.
- `confidence: "medium"` → proposer le type détecté avec un badge "À confirmer".
- `confidence: "low"` → demander à l'utilisateur de sélectionner manuellement.
- En cas d'image sans texte associé : toujours retourner `image` avec `confidence: "high"`.
