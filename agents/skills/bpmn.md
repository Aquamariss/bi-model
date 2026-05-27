# Skill : Génération BPMN 2.0 XML

## Objectif

Générer un diagramme BPMN 2.0 valide en **XML natif** (compatible Camunda Modeler, Signavio, Activiti, bpmn-js).  
Le fichier comprend deux sections obligatoires : la sémantique (`<process>`) et le layout visuel (`<bpmndi:BPMNDiagram>`).

---

## Format de sortie

Retourner **uniquement** un bloc XML complet et valide :

````xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions ...>
  <process ...> ... </process>
  <bpmndi:BPMNDiagram> ... </bpmndi:BPMNDiagram>
</definitions>
````

---

## Namespaces obligatoires sur `<definitions>`

```xml
xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"
targetNamespace="http://bpmn.io/schema/bpmn"
id="Definitions_1"
```

> ⚠️ Le namespace `bioc` est **obligatoire** dès qu'une couleur est utilisée.

---

## Éléments sémantiques

| Élément BPMN | Tag XML | Attributs clés |
|---|---|---|
| Événement début | `<startEvent>` | `id`, `name` |
| Événement fin | `<endEvent>` | `id`, `name` |
| Tâche utilisateur | `<userTask>` | `id`, `name` |
| Tâche service/système | `<serviceTask>` | `id`, `name` |
| Tâche générique | `<task>` | `id`, `name` |
| Passerelle exclusive (XOR) | `<exclusiveGateway>` | `id`, `name`, `gatewayDirection="Diverging"` |
| Passerelle parallèle (AND) | `<parallelGateway>` | `id`, `name` |
| Flux de séquence | `<sequenceFlow>` | `id`, `sourceRef`, `targetRef` |
| Flux conditionnel | `<sequenceFlow>` | + `name="Oui"` ou `name="Non"` |

**Règles sémantiques :**
- Chaque élément doit avoir `<incoming>` et `<outgoing>` listant les IDs des flux.
- `<startEvent>` n'a que `<outgoing>`.
- `<endEvent>` n'a que `<incoming>`.
- Les passerelles XOR doivent avoir exactement 1 entrée et N sorties (ou N entrées et 1 sortie en convergence).

---

## Swimlanes (processus collaboratif)

Pour un processus avec plusieurs acteurs, utiliser des lanes :

```xml
<process id="Process_1" isExecutable="false">
  <laneSet id="LaneSet_1">
    <lane id="Lane_1" name="Acteur A">
      <flowNodeRef>StartEvent_1</flowNodeRef>
      <flowNodeRef>Task_1</flowNodeRef>
    </lane>
    <lane id="Lane_2" name="Acteur B">
      <flowNodeRef>Task_2</flowNodeRef>
      <flowNodeRef>EndEvent_1</flowNodeRef>
    </lane>
  </laneSet>
  <!-- éléments du processus ici -->
</process>
```

---

## Section DI — Règles de coordonnées

### Grille de base (processus sans lanes)

- Ligne de base horizontale : **y = 100** (centre des éléments)
- Première colonne : **x = 150**
- Espacement horizontal entre éléments : **160 px**

| Élément | Largeur | Hauteur | Offset y depuis centre |
|---|---|---|---|
| StartEvent / EndEvent | 36 | 36 | -18 |
| Task / UserTask / ServiceTask | 100 | 80 | -40 |
| ExclusiveGateway | 50 | 50 | -25 |
| ParallelGateway | 50 | 50 | -25 |

**Exemple :** StartEvent à x=150 → Bounds `x="150" y="82" w="36" h="36"`  
Task suivante → Bounds `x="256" y="60" w="100" h="80"` (x = 150+36+70 ≈ 256)  
Flow entre eux → waypoints : sortie StartEvent (x+36, y+18) → entrée Task (x, y+40)

### Grille avec swimlanes (Participant / Pool)

- Pool extérieur : `x="100" y="50" width="[total]" height="[nb_lanes × 180]"`
- Chaque lane : `x="130" y="[50 + n×180]" width="[total-30]" height="180"`
- Ligne de base de chaque lane : centre à `y_lane + 90`
- Premiere lane : `y=50`, centre à `y=140`
- Deuxième lane : `y=230`, centre à `y=320`
- etc.

Les éléments dans une lane utilisent la même grille x qu'un processus sans lane, avec le y centré dans la lane.

---

## Exemple complet — Processus de validation de facture

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://bpmn.io/schema/bpmn"
             id="Definitions_1">

  <process id="Process_1" isExecutable="false">
    <laneSet id="LaneSet_1">
      <lane id="Lane_Fournisseur" name="Fournisseur">
        <flowNodeRef>Start_1</flowNodeRef>
        <flowNodeRef>Task_Emettre</flowNodeRef>
      </lane>
      <lane id="Lane_Compta" name="Comptabilité">
        <flowNodeRef>Task_Verifier</flowNodeRef>
        <flowNodeRef>GW_Conforme</flowNodeRef>
        <flowNodeRef>Task_Enregistrer</flowNodeRef>
        <flowNodeRef>End_1</flowNodeRef>
      </lane>
    </laneSet>

    <startEvent id="Start_1" name="Réception commande">
      <outgoing>Flow_1</outgoing>
    </startEvent>
    <userTask id="Task_Emettre" name="Émettre facture">
      <incoming>Flow_1</incoming>
      <outgoing>Flow_2</outgoing>
    </userTask>
    <userTask id="Task_Verifier" name="Vérifier la facture">
      <incoming>Flow_2</incoming>
      <outgoing>Flow_3</outgoing>
    </userTask>
    <exclusiveGateway id="GW_Conforme" name="Conforme ?" gatewayDirection="Diverging">
      <incoming>Flow_3</incoming>
      <outgoing>Flow_4</outgoing>
      <outgoing>Flow_5</outgoing>
    </exclusiveGateway>
    <task id="Task_Enregistrer" name="Enregistrer en comptabilité">
      <incoming>Flow_4</incoming>
      <outgoing>Flow_6</outgoing>
    </task>
    <endEvent id="End_1" name="Facture traitée">
      <incoming>Flow_6</incoming>
    </endEvent>

    <sequenceFlow id="Flow_1" sourceRef="Start_1"       targetRef="Task_Emettre"/>
    <sequenceFlow id="Flow_2" sourceRef="Task_Emettre"  targetRef="Task_Verifier"/>
    <sequenceFlow id="Flow_3" sourceRef="Task_Verifier" targetRef="GW_Conforme"/>
    <sequenceFlow id="Flow_4" name="Oui" sourceRef="GW_Conforme"   targetRef="Task_Enregistrer"/>
    <sequenceFlow id="Flow_5" name="Non" sourceRef="GW_Conforme"   targetRef="Task_Emettre"/>
    <sequenceFlow id="Flow_6" sourceRef="Task_Enregistrer" targetRef="End_1"/>
  </process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">

      <!-- Lanes -->
      <bpmndi:BPMNShape id="Lane_Fournisseur_di" bpmnElement="Lane_Fournisseur" isHorizontal="true">
        <dc:Bounds x="130" y="50" width="750" height="180"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Compta_di" bpmnElement="Lane_Compta" isHorizontal="true">
        <dc:Bounds x="130" y="230" width="750" height="180"/>
      </bpmndi:BPMNShape>

      <!-- Lane 1 — y_centre = 140 -->
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="200" y="122" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="178" y="165" width="80" height="27"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Emettre_di" bpmnElement="Task_Emettre">
        <dc:Bounds x="310" y="100" width="100" height="80"/>
      </bpmndi:BPMNShape>

      <!-- Lane 2 — y_centre = 320 -->
      <bpmndi:BPMNShape id="Task_Verifier_di" bpmnElement="Task_Verifier">
        <dc:Bounds x="470" y="280" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GW_Conforme_di" bpmnElement="GW_Conforme" isMarkerVisible="true">
        <dc:Bounds x="635" y="295" width="50" height="50"/>
        <bpmndi:BPMNLabel><dc:Bounds x="628" y="352" width="64" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Enregistrer_di" bpmnElement="Task_Enregistrer">
        <dc:Bounds x="750" y="280" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="912" y="302" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="890" y="345" width="80" height="27"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- Flows -->
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="140"/><di:waypoint x="310" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="180"/><di:waypoint x="360" y="320"/><di:waypoint x="470" y="320"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="570" y="320"/><di:waypoint x="635" y="320"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="685" y="320"/><di:waypoint x="750" y="320"/>
        <bpmndi:BPMNLabel><dc:Bounds x="706" y="302" width="22" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="660" y="295"/><di:waypoint x="660" y="140"/><di:waypoint x="410" y="140"/>
        <bpmndi:BPMNLabel><dc:Bounds x="626" y="218" width="22" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="850" y="320"/><di:waypoint x="912" y="320"/>
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

---

## Règles BPMN impératives

1. Tous les IDs doivent être **uniques** dans le fichier.
2. Chaque `<sequenceFlow>` doit avoir `sourceRef` et `targetRef` correspondant à des éléments existants.
3. Les waypoints de chaque `BPMNEdge` doivent partir du **bord de sortie** de l'élément source et arriver au **bord d'entrée** de l'élément cible.
4. Maximum **3 swimlanes** pour rester lisible.
5. Maximum **10 tâches** par swimlane, **12 tâches** au total ; au-delà, proposer de décomposer en sous-processus.
6. Nommer les branches de passerelle exclusive (`name="Oui"` / `name="Non"` ou condition métier).
7. Tout chemin alternatif doit converger vers un chemin valide jusqu'à un `<endEvent>`.
8. **Section DI — waypoints minimalistes** : utiliser au maximum **2 waypoints** par flux rectiligne, **3 waypoints** pour les flux qui changent de direction ou traversent une swimlane. Ne jamais ajouter de waypoints intermédiaires inutiles.

---

## Couleurs des éléments (bpmn-js bioc)

bpmn-js supporte la colorisation via les attributs `bioc:fill` (fond) et `bioc:stroke` (bordure/texte) **directement sur les `<bpmndi:BPMNShape>` et `<bpmndi:BPMNEdge>`** dans la section DI.

### Syntaxe

```xml
<!-- Forme colorée -->
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"
    bioc:fill="#bbdefb" bioc:stroke="#1e88e5">
  <dc:Bounds x="310" y="100" width="100" height="80"/>
</bpmndi:BPMNShape>

<!-- Flux coloré -->
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"
    bioc:stroke="#1e88e5">
  <di:waypoint x="236" y="140"/>
  <di:waypoint x="310" y="140"/>
</bpmndi:BPMNEdge>
```

> ⚠️ Les couleurs **ne s'appliquent que dans la section `<bpmndi:BPMNDiagram>`**. Ne pas ajouter d'attributs de couleur sur les éléments sémantiques (`<userTask>`, `<sequenceFlow>`, etc.).

### Palette recommandée

| Rôle | fill | stroke |
|---|---|---|
| Événement début | `#c8e6c9` | `#43a047` |
| Événement fin | `#ffcdd2` | `#e53935` |
| Tâche utilisateur | `#bbdefb` | `#1e88e5` |
| Tâche service/système | `#e1bee7` | `#8e24aa` |
| Tâche générique | `#f5f5f5` | `#757575` |
| Passerelle XOR | `#fff9c4` | `#f9a825` |
| Passerelle parallèle | `#dcedc8` | `#689f38` |
| Lane (swimlane) | *(pas de bioc sur les lanes)* | — |

### Règle d'usage

- Ne jamais inventer de couleurs non demandées. Si l'utilisateur ne précise pas de couleur, ne pas en ajouter.
- Si l'utilisateur demande des couleurs **sans préciser lesquelles**, utiliser la palette ci-dessus selon le type d'élément.

### Schéma par couloir (swimlane) — cas fréquent

Si l'utilisateur demande **"une couleur par couloir"** ou **"chaque lane a sa propre couleur"**, assigner automatiquement une teinte distincte à chaque lane et appliquer cette teinte à **tous les éléments** (tâches, passerelles, événements) situés dans ce couloir.

Palette par défaut pour les lanes (jusqu'à 4 couloirs) :

| Lane | fill | stroke |
|---|---|---|
| Lane 1 | `#bbdefb` | `#1e88e5` |
| Lane 2 | `#c8e6c9` | `#43a047` |
| Lane 3 | `#ffe0b2` | `#fb8c00` |
| Lane 4 | `#e1bee7` | `#8e24aa` |

**Exemple :** 2 lanes → tous les `BPMNShape` de la Lane 1 reçoivent `bioc:fill="#bbdefb" bioc:stroke="#1e88e5"`, tous ceux de la Lane 2 reçoivent `bioc:fill="#c8e6c9" bioc:stroke="#43a047"`. Les `BPMNEdge` (flux) reçoivent `bioc:stroke` de la lane source.

> Les `BPMNShape` des **lanes elles-mêmes** ne prennent **pas** d'attributs `bioc:` (non supporté par bpmn-js).

---

## Règles XML strictes — à respecter absolument

⚠️ Le XML doit être **100 % valide**. Toute erreur empêche le rendu.

### Tags auto-fermants obligatoires

Ces éléments n'ont **jamais** de contenu texte — ils doivent **toujours** être auto-fermants (`/>`):

```xml
<!-- CORRECT -->
<dc:Bounds x="150" y="82" width="36" height="36"/>
<di:waypoint x="188" y="100"/>

<!-- INTERDIT -->
<dc:Bounds x="150" y="82" width="36" height="36"></dc:Bounds>  ← INVALIDE
<di:waypoint x="188" y="100"></di:waypoint>                     ← INVALIDE
```

### `<bpmndi:BPMNLabel>` — usage simplifié

N'inclure `<bpmndi:BPMNLabel>` que si le label nécessite un positionnement explicite. Dans ce cas :

```xml
<!-- CORRECT — tag fermé sur la même ligne ou immédiatement après -->
<bpmndi:BPMNLabel>
  <dc:Bounds x="178" y="165" width="80" height="27"/>
</bpmndi:BPMNLabel>

<!-- Si pas de label particulier : omettre entièrement la balise BPMNLabel -->
```

### Checklist avant de retourner le XML

- [ ] Chaque `<dc:Bounds ... />` est auto-fermant
- [ ] Chaque `<di:waypoint ... />` est auto-fermant
- [ ] Chaque tag ouvert (`<X>`) a son tag fermant (`</X>`)
- [ ] Aucun commentaire XML (`<!-- -->`) dans la section `<bpmndi:BPMNDiagram>`
- [ ] Les IDs des `BPMNShape` et `BPMNEdge` dans la section DI correspondent exactement aux IDs sémantiques
- [ ] Si des couleurs sont utilisées : namespace `xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"` présent sur `<definitions>`, attributs `bioc:fill`/`bioc:stroke` uniquement sur les `BPMNShape`/`BPMNEdge`, pas sur les éléments sémantiques
- [ ] Le fichier se termine bien par `</definitions>`
