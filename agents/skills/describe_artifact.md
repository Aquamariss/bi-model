# Skill : Génération de Description d'Artifact

## Objectif

Générer automatiquement une description courte et utile pour un artifact, qu'il soit uploadé par l'utilisateur ou produit par génération IA. Cette description enrichit le RAG et permet aux futurs appels de retrouver et utiliser l'artifact de manière pertinente.

---

## Déclenchement

Ce skill est exécuté dans deux situations :
1. Quand un artifact est **approuvé** par l'utilisateur après génération — génération automatique si la description est vide.
2. Quand un artifact est **uploadé** et que l'utilisateur clique sur "Générer la description".

---

## Entrées requises

- `content` : code du diagramme ou texte de l'artifact.
- `artifact_type` : type détecté (`bpmn`, `orgchart`, `sequence`, `flowchart`, `text`, `image`, `url`, `other`).
- `artifact_name` : nom donné par l'utilisateur.
- `project_context` : description du projet (pour contextualiser la description).

---

## Règles de génération

1. **Longueur** : 2 à 4 phrases maximum. Entre 50 et 200 caractères.
2. **Structure de la description** :
   - Phrase 1 : Ce que représente le diagramme (type + sujet).
   - Phrase 2 : Les acteurs ou éléments clés impliqués.
   - Phrase 3 (optionnelle) : La valeur spécifique de cet artifact comme référence.
3. **Vocabulaire RAG-friendly** : utiliser des termes métier précis, éviter les mots vagues ("processus", "schéma", "diagramme" seuls sans qualificatif).
4. **Pas de "je", pas de "voici"** : style factuel et direct.
5. **Mentionner les éléments distinctifs** : acteurs inhabituels, règles spécifiques visibles, nombre d'étapes si significatif.

---

## Format de sortie

Retourne uniquement la description en texte brut, sans formatage Markdown, sans guillemets encadrants.

```
Modèle BPMN du processus de recrutement CDI validé par la DRH. Implique trois acteurs : RH, Manager et Candidat, avec une passerelle de validation à double niveau. Sert de référence pour tous les nouveaux processus d'embauche.
```

---

## Exemples par type

### BPMN
```
Diagramme BPMN du processus d'onboarding pour les nouvelles recrues. Couvre les 90 premiers jours avec trois swim lanes : RH, Manager et IT. Inclut les points de contrôle à J+7, J+30 et J+90.
```

### Organigramme
```
Structure hiérarchique de l'équipe Data (8 postes). Montre les rattachements entre le CDO, les pôles Engineering et Science, avec un lien fonctionnel transversal vers la gouvernance.
```

### Séquence
```
Diagramme de séquence du flux d'authentification SSO entre l'application métier, le fournisseur d'identité et l'annuaire LDAP. Documente les cas de succès et d'échec avec les messages SAML.
```

### Flowchart
```
Flowchart du processus d'évaluation annuelle des collaborateurs. Modélise 8 étapes depuis l'envoi des formulaires RH jusqu'à l'archivage, avec médiation RH en cas de désaccord.
```

---

## Comportement

- Si le contenu est trop court ou vide pour générer une description utile : retourner `null` (l'utilisateur remplira manuellement).
- Ne jamais inventer des détails non présents dans le contenu fourni.
