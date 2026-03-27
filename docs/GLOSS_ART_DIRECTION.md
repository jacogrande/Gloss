# Gloss Art Direction

This document defines a concrete visual direction for Gloss based on the product brief, the frontend rules, and lessons borrowed from `stagehand.dev`.

It is intentionally not a direct copy of Stagehand.

2026-03-27 update:

The active implementation direction has since shifted toward a much quieter, more minimal, content-first interface. Treat the more graphic Stagehand-derived guidance below as historical reference unless a task explicitly calls for that denser visual language.

Gloss is not about browser automation. It is about reading, lexical depth, nuance, and cultivated command of language. The visual system should borrow Stagehand’s structural rigor and tactile presence, then twist it toward a literary and scholarly product.

## One-Sentence Direction

**A scholarly diagrammatic interface for serious readers.**

Gloss should feel like:

- a marked-up reading notebook
- a linguistic field guide
- an annotated folio
- a study system built by adults for adults

It should not feel like:

- startup minimalism
- playful gamification
- soft productivity SaaS
- retro book nostalgia for its own sake
- browser automation graphics copied into a vocabulary product

## Core Design Thesis

Borrow from Stagehand:

- visible structure
- hard edges
- graphic confidence
- texture as identity
- component distinctiveness

Twist it for Gloss:

- warmer and more paper-like
- more literary than industrial
- more note-like than command-line-like
- more annotation-driven than machine-diagram-driven
- calmer and more reflective, while still feeling designed

## Visual Metaphor

Gloss should feel like a **reading desk covered in active thought**.

That suggests:

- ruled paper
- marginal notes
- underlines
- callout brackets
- lexical contrasts shown as linked artifacts
- morphology shown as a deliberate breakdown
- source context treated like a preserved excerpt

The system should imply:

- study
- discrimination
- close reading
- intellectual patience

## Mood Keywords

Required mood:

- adult
- serious
- calm
- precise
- literary
- high-rigor
- tactile
- diagrammatic

Avoid:

- cute
- game-like
- gummy
- excessively futuristic
- childish color blocking
- glassmorphism
- sterile monochrome minimalism

## Typography

## Role Split

Gloss should use three typographic roles.

### 1. UI Sans

Use a strong editorial grotesk for navigation, labels, controls, and body copy.

Target feel:

- contemporary
- serious
- neutral but not bland

Preferred direction:

- `Neue Montreal`
- `General Sans`
- `Suisse Int'l`

Practical fallback direction if licensing or implementation simplicity matters:

- `IBM Plex Sans`

### 2. Lexical Serif

Use a literary serif for:

- word heads
- major route titles
- important contextual excerpts
- key conceptual headings

Target feel:

- learned
- adult
- text-rich
- not ornamental

Preferred direction:

- `Iowan Old Style`
- `Source Serif 4`
- `Tiempos Text`

### 3. Annotation Mono

Use a mono or technical annotation face sparingly for:

- schema or trace references
- source metadata labels
- exercise status
- machine-readable side notes

Preferred direction:

- `IBM Plex Mono`
- `Berkeley Mono`

## Type Rules

- large headlines should be confident, not airy
- route titles should feel like dossier headings
- word titles can be bigger and more literary than UI titles
- labels should read like annotations, not marketing microcopy
- avoid excessive uppercase outside of annotation labels

## Color System

Gloss should use a restrained, paper-based palette with a few disciplined accents.

## Core Tokens

### Base

- `ink-950`: `#171412`
- `ink-800`: `#2b2623`
- `paper-50`: `#f6f0e6`
- `paper-100`: `#ece3d6`
- `paper-200`: `#ddd2c0`
- `graphite-400`: `#81776d`

### Primary Accent

- `ochre-500`: `#b67a1e`
- `ochre-200`: `#ead2a5`

Use this for:

- active stage badges
- annotation labels
- focal highlights
- selected comparison emphasis

### Secondary Accents

- `oxide-500`: `#b24a27`
- `folio-blue-400`: `#7ea8c7`
- `sage-400`: `#8f9f8f`

Use these sparingly and semantically:

- `oxide`
  error, tension, contrast, warning
- `folio-blue`
  supporting system framing, links, contextual structure
- `sage`
  stable / matured / confirmed states

## Color Rules

- the app should remain mostly paper, ink, and graphite
- accents should feel like annotations on a page, not app-brand gradients
- yellow should not become cheerful startup sunshine
- blue should support structure, not dominate the brand
- red should stay rare and meaningful

## Surfaces

Gloss should move away from glass panels and soft blur.

Preferred surface model:

- paper-like panels
- visible rules and borders
- slight tonal layering
- faint grain or hatch textures
- very light or no shadow

Good surfaces:

- off-white folio cards
- ruled-paper panels
- slightly darker note inserts
- ink-framed callout boxes

Avoid:

- floating translucent glass cards
- heavy blur
- diffuse glow
- overly smooth rounded-white SaaS boxes

## Shape Language

Stagehand’s hard geometry is worth borrowing, but Gloss should soften it slightly.

Use:

- small-to-medium radii
- squared cards
- file-tab headers
- annotation brackets
- callout rails
- split panels

Avoid:

- giant pill buttons
- over-rounded nav capsules
- excessive softness

Recommended radii:

- `4px` for technical or annotation elements
- `8px` for cards and metadata tiles
- `12px` max for primary surfaces

## Texture System

Texture should become a core part of Gloss’s identity.

### Primary Textures

- faint ruled-paper grid
- subtle crosshatch in secondary surfaces
- dotted connector lines between related lexical elements
- underlined or bracketed callouts

### Secondary Textures

- diagonal hatch fills for stage markers or contrast blocks
- fine noise or grain in dark panels
- margin-rule stripes for metadata areas

## Texture Rules

- texture should be faint but intentional
- texture should support hierarchy, not compete with text
- use texture to separate semantic layers:
  - source context
  - metadata
  - enrichment
  - review

## Illustration And Graphics

Do not copy Stagehand’s cubes.

Instead, create a Gloss-specific diagram language based on language itself.

### Recommended Motifs

- seed and growth diagrams
- word-family ladders
- contrast lines between nearby terms
- sentence fragments with annotation marks
- morphological branching
- marginalia symbols
- page markers
- lexical map fragments

### Visual Style

- vector-based
- diagrammatic
- precise
- abstract enough to scale
- tied to reading and language, not generic productivity

## Motion

Gloss should use motion sparingly and sharply.

Use:

- `120ms` to `180ms` transitions for hover/focus
- `180ms` to `240ms` for section reveals
- crisp directional transforms
- underline or bracket expansion
- tab shifts

Avoid:

- floaty easing
- parallax
- decorative ambient animation
- constant shimmer or looping movement

Motion should feel:

- intentional
- mechanical
- editorial

not playful or atmospheric.

## Layout System

## Shell

The app shell should feel like a tool, not a landing page.

Rules:

- compact top rail
- strong route identity
- no oversized hero copy on every internal page
- account area should feel like a small status block, not a marketing card

Recommended shell composition:

- top-left brand mark and current route family
- top-center or top-right utility info
- concise tab rail beneath
- main page canvas below

## Page Rhythm

Pages should be composed from a few strong sections, not many equal cards.

Preferred rhythm:

1. route heading / page identity
2. primary working surface
3. supporting context
4. metadata / evidence / side structures

## Component Direction

## Navigation

Use:

- file-tab or dossier-tab navigation
- visible active state with ink or ochre emphasis
- thin rule-based container

Avoid:

- generic pill nav
- oversized top-nav marketing treatment

## Buttons

Primary button direction:

- rectangular
- split-cell or framed-edge treatment
- ink fill or ochre fill depending on context
- visible border

Secondary button direction:

- paper fill
- dashed or ruled border
- strong hover inversion or underline

## Cards

Gloss cards should feel like indexed notes.

Use:

- label strip
- clear title
- one strong content block
- metadata row separated by a rule

Avoid:

- lots of equally weighted mini cards
- generic shadowed card mosaics

## Form Fields

Fields should feel like form artifacts on a study page.

Use:

- ruled or boxed inputs
- visible focus ring
- label-as-annotation
- grouped sections with explicit purpose

## Status Tags

Stage or enrichment status should use:

- compact tags
- paper or annotation-chip styling
- restrained accent color
- optional hatch texture

## Tables And Comparisons

This is one of the most valuable systems to borrow from Stagehand.

Gloss should use clear comparison matrices for:

- word contrasts
- review results
- subtle meaning distinctions

Rules:

- visible grid
- one emphasized column or row
- little ornament
- clean scanability

## Page-Specific Direction

## Login

Should feel like entering a serious study tool.

Use:

- one strong framed sign-in surface
- restrained intro copy
- no “MVP” or prototype language
- a calm but assertive structure

## Capture

Should feel like capturing an annotated reading moment.

Use:

- one main worksheet panel
- word field as the dominant input
- source metadata grouped as a secondary layer
- clear note that capture precedes enrichment

## Library

Should feel like a personal catalogue.

Use:

- structured index-card rhythm
- stage labels
- visible source metadata
- scanning-optimized grid or list

It should feel closer to:

- annotated filing system

than to:

- content-feed dashboard

## Seed Detail

This should be the strongest page in the app.

Recommended composition:

- top dossier heading with word and stage
- preserved source sentence in a distinguished context block
- source metadata as a structured side panel
- enrichment block as a clearly separate interpretive layer
- later review history or exercise queue as a lower section

The main visual thesis:

**captured evidence first, interpretation second**

## Review

Review should feel focused and cognitively sharp.

Use:

- one large prompt surface
- small number of answer objects
- explicit comparison or sentence context
- result feedback as annotations, not celebratory game UI

Avoid:

- candy-colored correctness states
- swipe-card gamification
- noisy progress theatrics

## Borrow / Twist / Reject

## Borrow From Stagehand

- visible grids
- line-based structure
- stronger geometry
- texture as identity
- deliberate tab and command artifacts
- diagrammatic layout
- section-level assertiveness

## Twist For Gloss

- replace automation diagrams with lexical diagrams
- warm the palette toward paper and annotation
- introduce a literary serif where appropriate
- reduce industrial intensity slightly
- emphasize reading, evidence, and nuance

## Reject For Gloss

- exact Stagehand cube/iconography
- bright devtool yellow as the dominant brand note everywhere
- fully square industrial harshness on every surface
- overtly “toolish” command framing on all components

## Implementation Checklist

When applying this direction to the app, the frontend should satisfy these rules:

- no glassmorphism
- no oversized landing-page hero inside authenticated routes
- one coherent shell treatment across capture, library, and seed detail
- one card system, not multiple unrelated card styles
- stage, source, context, and enrichment should be visually separable at a glance
- word titles should feel literary
- metadata should feel annotated
- enrichment should feel structured, not dumped

## Final Position

Gloss should not look like a startup dashboard.

It should look like a **designed instrument for serious reading and lexical study**:

- structured like a technical system
- toned like a literary one
- tactile like a paper artifact
- rigorous like a reference work

That is the correct twist on the Stagehand reference.
