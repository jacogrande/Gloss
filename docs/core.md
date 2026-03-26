# Depth-First Vocabulary App Spec

## 1. Product summary

This product is a **depth-first vocabulary app for advanced English readers**. It is designed for adults with at least college-level reading ability who do not need basic word definitions or gamified beginner drills. They want something more serious: a system that helps them take words encountered in real reading and turn them into durable, nuanced, usable knowledge.

The app does not position vocabulary as a list of isolated definitions. It treats each unknown or half-known word as a **seed**. Over time, that seed grows into a richer understanding of the word’s:

- meaning in context
- shades of meaning
- morphology and word family
- collocations and usage patterns
- contrast with similar words
- register and tone
- broader semantic relations
- etymological structure when useful

This growth happens through **spaced, effortful, varied exercises**, not just passive review. That direction is supported by the research base: durable vocabulary learning depends not just on breadth, but also on **depth of word knowledge**, contextual diversity, retrieval practice, and high-involvement tasks rather than mere exposure.

### Core positioning

**A depth-first vocabulary product for advanced readers.**
Not “word of the day.”
Not “flashcards with definitions.”
Not “ESL basics.”
Not “SAT cramming.”

Instead:

> A system that helps serious readers grow precise, flexible vocabulary from the words they actually encounter in books, articles, essays, and everyday reading.

---

## 2. Product thesis

Most vocabulary apps fail advanced readers for one of three reasons:

1. They are **too shallow**
   They teach dictionary glosses, not usable word knowledge.

2. They are **too decontextualized**
   They separate words from the reading encounter that made them meaningful.

3. They are **too static**
   They do not evolve a learner’s understanding from recognition to nuance, distinction, and production.

This product assumes that advanced users are not trying to “know more words” in the abstract. They are trying to:

- read with fewer interruptions
- grasp subtle distinctions faster
- internalize literary, academic, and high-register language
- improve their active command of English
- build long-term sensitivity to tone, precision, and connotation

The app’s central bet is that **depth is the real unmet need**. Research on vocabulary learning and reading comprehension supports this: knowing a word well means more than knowing a definition. Morphology, collocation, semantic relationships, contextual flexibility, and register all contribute to deep vocabulary knowledge, and depth contributes uniquely to comprehension.

---

## 3. Target user

### Primary user

Advanced English readers, typically adults, who:

- read books, essays, criticism, journalism, literary fiction, nonfiction, or academic prose
- frequently encounter words they partly know but cannot fully distinguish or use
- care about nuance and precision
- dislike childish or low-rigor learning products
- are willing to do effortful review if it feels intellectually worthwhile

### Likely user segments

- literary readers
- humanities and social science readers
- lawyers, academics, writers, editors, journalists
- graduate students
- intellectually curious professionals
- advanced second-language users with near-native reading goals
- vocabulary hobbyists who want a better system than Anki plus notes

### Non-goals

This product is not optimized for:

- children
- beginner ESL learners
- standardized test prep as a primary mode
- casual “one word per day” users
- users seeking pure entertainment or lightweight trivia

---

## 4. Positioning statement

### External positioning

A **depth-first vocabulary app** that turns words from real reading into lasting, nuanced knowledge through context, contrast, and spaced practice.

### Internal positioning

A **reading-linked vocabulary mastery system** for advanced adults.

### Messaging pillars

#### 1. Vocabulary from real reading

Words start where the user actually encounters them, not in an arbitrary feed.

#### 2. Depth, not just definitions

Each word develops into a richer knowledge structure over time.

#### 3. Practice that teaches nuance

The app does not just repeat. It teaches distinctions, usage, register, and relationships.

#### 4. Built for serious readers

The tone, UX, and exercise design assume intelligence and patience, not gamified infantilization.

---

## 5. Learning philosophy

The product should be explicitly grounded in a few research-backed principles.

### A. Vocabulary depth matters

Vocabulary knowledge includes not just meanings but relations, forms, usage, and contextual flexibility. Deep word knowledge is especially relevant for advanced readers, because many difficult words are not wholly unknown. They are partially known, confused, weakly distinguished, or passively recognized but not deeply integrated.

### B. Context and deliberate practice should be combined

Research suggests that contextual exposure and deliberate, word-focused learning are not alternatives. They work best together. The app should preserve the original reading context, then build deliberate exercises around it.

### C. Diverse contexts improve transfer

Encountering a word in varied contexts supports more flexible, generalizable knowledge than repeatedly seeing it in one fixed sentence. This matters for a depth-first product because the goal is not merely familiarity, but transferable understanding.

### D. Retrieval is important, but not enough by itself

Retrieval practice helps retention, but advanced vocabulary learning should also involve feedback, contrast, evaluation, and context-sensitive tasks.

### E. High-involvement tasks produce stronger learning

Tasks that require inference, selection, comparison, evaluation, and active usage tend to be more effective than passive review. Advanced users are especially good candidates for this kind of cognitively demanding product.

### F. Similar words should be taught carefully

Semantic clustering can cause interference when poorly introduced. That means the app should not overwhelm the learner with large synonym clusters up front. Similar words should be introduced gradually and taught through **distinction exercises**, not just grouped visually.

### G. Morphology is useful when functional

Morphological awareness supports vocabulary learning, especially for advanced and academic language. Roots, prefixes, suffixes, and word families should be used as learning tools rather than trivia.

---

## 6. Core product concept: the Seed Model

The central learning object is not a flashcard. It is a **Word Seed**.

A Word Seed begins as:

- a target word
- the sentence or reading moment where it was encountered
- source metadata
- the user’s initial confidence

Over time, that seed sprouts into a structured understanding of the word.

### Stages of growth

#### Stage 1: Capture

The word is saved from reading, ideally with context.

#### Stage 2: Stabilize

The user builds basic recognition and meaning in context.

#### Stage 3: Deepen

The app introduces morphology, usage patterns, contrasts, and related terms.

#### Stage 4: Differentiate

The learner practices distinguishing it from nearby words and choosing it in appropriate contexts.

#### Stage 5: Transfer

The learner demonstrates flexible understanding in new contexts and possibly active production.

This model reflects the idea that vocabulary mastery is developmental, not instantaneous.

---

## 7. Product pillars

## Pillar 1: Real-reader capture

The app must feel attached to reading life.

### Supported capture modes

#### A. Quick word entry

The user types or pastes a word fast. This is the fallback capture mode and should be frictionless.

#### B. Browser extension

While reading online, the user can:

- highlight a word or phrase
- save the containing sentence
- optionally save surrounding paragraph
- send source URL/title automatically

#### C. In-app reading / clean reader mode

Users can import articles, essays, PDFs, or web pages and capture words inside a dedicated reading environment.

#### D. Ebook / reading platform integrations

Where possible, the app should support importing saved vocabulary or highlights from reading ecosystems.

#### E. Physical book capture

This is strategically important.

Ideal flow:

- user takes a photo of the page
- app OCRs the text
- user taps the target word
- app extracts the sentence and nearby context
- app stores page number and book title if provided

#### F. “Save now, enrich later”

If the user is in reading flow, they should be able to save only the word and return later to add context.

### Capture design principle

Do not ask users to “add a word.” Ask them to **capture a moment of lexical friction**.

That moment may include:

- unknown word
- half-known word
- surprising usage
- beautiful phrase
- subtly different synonym
- word they want in active vocabulary

---

## Pillar 2: Depth-first word growth

Every saved word should gradually develop across multiple dimensions.

### Depth dimensions

#### Meaning

- plain gloss in the original sentence
- alternate senses if relevant
- meaning boundaries

#### Usage

- how the word behaves in real language
- common syntactic patterns
- collocations
- preferred constructions

#### Register and tone

- neutral, formal, literary, archaic, pejorative, academic, ironic, etc.

#### Morphology

- roots, affixes, related forms
- family members if useful

#### Contrast

- nearby words that are commonly confused
- fine-grained distinctions

#### Semantic neighborhood

- carefully selected related terms
- not a giant undifferentiated cloud

#### Etymology

- included only when it illuminates structure or meaning

### Design rule

The app should never front-load all of this. It should **unlock depth gradually through practice**.

---

## Pillar 3: Practice beyond repetition

The product’s core innovation is that review is not just “show front, show back.”

### Review types

#### 1. Meaning-in-context recall

Given the original or a similar sentence, what does the word mean here?

#### 2. Recognition in a new context

Does the user recognize the word in a fresh sentence?

#### 3. Contrastive choice

Which word fits better here: X or Y?

#### 4. Distinction explanation

What is the difference between these two words?

#### 5. Register judgment

Which sentence uses the word in an off-register way?

#### 6. Collocation judgment

Which phrase sounds idiomatic or natural?

#### 7. Morphology decomposition

What root or family clue helps decode the word?

#### 8. Family relation matching

How are these forms related?

#### 9. Productive use

Rewrite or complete a sentence using the target word.

#### 10. Semantic neighborhood refinement

Which nearby word is stronger, narrower, more literary, or more pejorative?

These review modes map well onto the research on high-involvement tasks and vocabulary depth.

---

## 8. The learning engine

The app should not have one “memory score” per word. It should track several dimensions.

### Proposed learning model

Each word has separate but related mastery traces:

#### A. Recognition

Can the user recognize the word and its broad meaning?

#### B. Contextual understanding

Can they interpret it in a sentence?

#### C. Distinction

Can they separate it from nearby or confusable words?

#### D. Usage

Can they choose or produce it appropriately?

#### E. Structural understanding

Do they benefit from knowing the word family, morphology, or etymology?

This matters because a user may:

- recognize a word
- yet still misuse it
- or confuse it with a close neighbor
- or fail to generalize it to a new context

A depth-first app should reflect that.

### Review scheduling model

Use spaced repetition as infrastructure, but schedule different review types differently.

#### Example

A user may be:

- strong on recognition
- medium on context
- weak on distinction
- weak on production

The app should therefore serve more distinction and usage tasks, not more basic definition cards.

### Seed-to-network progression

Early reviews should focus on basic stabilization. Later reviews should introduce richer networked understanding.

This respects the risk of semantic interference from introducing too many similar words too early.

---

## 9. Word neighborhoods, not word clouds

The user’s revised instinct is correct. Do not show a giant semantic cloud upfront.

### Why not

A large upfront cloud can:

- overwhelm the user
- create weak or noisy associations
- front-load information the user does not yet need
- increase confusion among similar terms

### Better model

Each word begins with a **tight neighborhood**:

- 1 core gloss
- 1 usage note
- 1 close relative
- 1 contrastive neighbor
- 1 structural note
- optional register tag

Over time, as the learner demonstrates stability, the neighborhood can widen.

### Long-term vision

Eventually, the app may build a hidden semantic-morphological graph behind the scenes. But the UI should present that graph only in small, intentional steps.

The graph is for pedagogy and scheduling, not spectacle.

---

## 10. Exercise sequencing

The order of learning matters.

### Phase 1: Encounter and stabilization

Goal: establish the word as a meaningful unit.

Exercises:

- meaning in original sentence
- simple recognition
- basic paraphrase
- confidence rating

### Phase 2: Controlled elaboration

Goal: deepen understanding without overload.

Exercises:

- one related word
- one contrastive word
- register note
- morphology clue
- second or third example sentence

### Phase 3: Distinction and discrimination

Goal: avoid false familiarity.

Exercises:

- choose among near-synonyms
- identify misuse
- compare two words
- select strongest fit

### Phase 4: Flexible transfer

Goal: move from passive to adaptable knowledge.

Exercises:

- novel contexts
- rewriting
- fill in with nuanced alternatives
- short production tasks

### Phase 5: Long-term maintenance

Goal: preserve nuanced command efficiently.

Exercises:

- intermittent challenge reviews
- rare but difficult distinction tasks
- cluster refreshers across related words

---

## 11. Content generation strategy

This product will likely use a hybrid of structured lexical data and LLM-generated scaffolding.

### Use structured sources for:

- lemma and part of speech
- frequency and register estimates
- morphology and word families
- dictionary glosses
- synonym/antonym candidates
- example attestations where licensed

### Use LLMs for:

- plain-English glosses in context
- generating contrast explanations
- creating nuanced exercises
- generating fresh context sentences
- surfacing likely confusions
- explaining morphology in learner-friendly terms
- adapting exercise difficulty

### Constraints on LLM use

The app must not allow the model to freely hallucinate semantic relations or fake etymologies. Outputs should be:

- verified against lexical sources where possible
- constrained to a small number of high-quality relations
- optimized for pedagogical clarity, not verbosity

### Product principle

Use AI to make word knowledge **teachable**, not merely expansive.

---

## 12. UX philosophy

The app should feel:

- intelligent
- calm
- literary or academic in tone
- adult
- serious without being sterile

### It should not feel:

- childish
- streak-driven
- cartoonish
- flashy
- like a casual mobile game

### Interface implications

- elegant typography
- restrained motion
- minimal clutter
- high information density, but staged carefully
- emphasis on language, examples, and subtle structure

### Core emotional outcome

Users should feel:

- “this app respects my intelligence”
- “this app is helping me think more precisely”
- “this word is getting richer over time”
- “I’m not just memorizing, I’m learning how the word lives”

---

## 13. Core user journey

## A. Capture

User sees an unfamiliar or interesting word while reading and saves it.

## B. First encounter screen

The app presents:

- original sentence
- concise meaning in context
- confidence prompt
- why save this word

## C. First review cycle

The app gives:

- quick meaning check
- sentence-level recognition
- one clarifying note

## D. Second review cycle

The app introduces:

- one contrastive word
- one nearby example
- one structural clue

## E. Later review cycles

The app expands into:

- distinction tasks
- collocation tasks
- register and usage tasks
- transfer to fresh contexts

## F. Maturity state

The word becomes part of the user’s long-term vocabulary garden, with occasional resurfacing based on actual weakness patterns.

---

## 14. MVP recommendation

The MVP should not try to model all of language. It should prove the core thesis.

### MVP goal

Show that advanced readers prefer a **depth-first, reading-linked vocabulary experience** over standard definition-plus-SRS products.

### MVP features

#### Capture

- manual word entry
- browser extension for article capture
- optional source sentence
- optional source metadata

#### Word Seed object

- target word
- original context
- plain gloss
- confidence
- part of speech
- register label
- one related word
- one contrastive word
- one morphology note

#### Review engine

Support 4–6 exercise types:

- meaning in context
- recognize in new sentence
- choose between two similar words
- collocation choice
- register judgment
- basic morphology/family task

#### Scheduling

Basic spaced repetition with multi-skill state:

- recognition
- distinction
- usage confidence

#### Library

Personal word collection with filters:

- new
- stabilizing
- deepening
- mature
- confused with
- from this book/article

### What MVP should avoid

- giant knowledge graphs
- full social layer
- broad gamification
- too many integrations
- advanced production scoring
- open-ended AI tutor chat as a core mode

---

## 15. Success criteria

The product should be evaluated not just by retention, but by richer outcomes.

### User-level outcomes

- users save words from real reading consistently
- users return for review because it feels meaningful
- users report better grasp of nuances and distinctions
- users feel that words become easier to recognize in future reading
- users report stronger active precision in writing or speech

### Learning metrics

- retention of target words over time
- improvement in distinction tasks
- reduction in confusions among similar words
- transfer performance in fresh contexts
- depth coverage per word over time
- completion rates by exercise type

### Product metrics

- capture-to-review conversion
- 7-day and 30-day retention
- average number of reviews per saved word
- percentage of words reaching “deepened” state
- repeat capture from ongoing reading activity

---

## 16. Risks and mitigations

### Risk 1: Over-intellectualizing the product

The app could become too dense, too academic, or too slow.

**Mitigation:** stage depth gradually and keep first interactions simple.

### Risk 2: Semantic overload

Users may be overwhelmed by too many related words.

**Mitigation:** introduce a small neighborhood first and expand only when the word stabilizes.

### Risk 3: Weak or hallucinatory AI output

Generated explanations may be verbose or wrong.

**Mitigation:** constrain generation with lexical scaffolding and quality filters.

### Risk 4: Friction in capture

If saving words breaks reading flow, users will stop.

**Mitigation:** invest heavily in low-friction capture and enrich later workflows.

### Risk 5: Too much passive review

The app may slip into flashcard behavior.

**Mitigation:** prioritize distinction, usage, and context-sensitive tasks.

---

## 17. Product principles

1. **Depth before breadth**
2. **Context before abstraction**
3. **Distinction before synonym pileups**
4. **Practice before passive exposure**
5. **Growth over time, not info dumps**
6. **Adult tone, adult rigor**
7. **Reading-linked by default**
8. **Teach how a word behaves, not just what it means**

---

## 18. Recommended one-paragraph product vision

This is a depth-first vocabulary app for advanced English readers that turns words encountered in real reading into durable, nuanced knowledge. Each saved word begins as a seed, rooted in its original context, and gradually grows through spaced, effortful practice into a richer understanding of meaning, register, morphology, collocation, and contrast with related words. Rather than showing users a definition and asking them to repeat it, the product teaches how words actually work across contexts, how they differ from nearby alternatives, and how they become part of a reader’s long-term verbal precision. Its goal is not just vocabulary accumulation, but cultivated command of language.

## 19. Recommended short tagline options

- **Depth-first vocabulary for serious readers**
- **Grow a deeper vocabulary from what you read**
- **Vocabulary beyond definitions**
- **From reading encounter to real word knowledge**
- **A richer way to learn words**

If you want, I can turn this into a more formal PRD-style document next with sections like goals, non-goals, user stories, system objects, and MVP v1 requirements.
