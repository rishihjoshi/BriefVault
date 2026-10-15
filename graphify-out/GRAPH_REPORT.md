# Graph Report - BriefVault  (2026-10-14)

## Corpus Check
- Corpus is ~8,044 words - fits in a single context window. You may not need a graph.

## Summary
- 104 nodes · 160 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Digest Build Pipeline
- Frontend Render & PWA
- PWA Manifest
- Package & Scripts
- Test Suite
- Vercel Deploy Config
- Service Worker

## God Nodes (most connected - your core abstractions)
1. `esc()` - 9 edges
2. `renderTab()` - 8 edges
3. `main()` - 8 edges
4. `newsItem()` - 6 edges
5. `rankedBlock()` - 5 edges
6. `scripts` - 5 edges
7. `fetchWeather()` - 5 edges
8. `safeUrl()` - 4 edges
9. `topStory()` - 4 edges
10. `renderWeather()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `resolvePicks()`  [EXTRACTED]
  scripts/build-digest.mjs → scripts/build-digest.mjs  _Bridges community 4 → community 0_

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "Digest Build Pipeline"
Cohesion: 0.12
Nodes (22): buildPrompt(), __dirname, extractJson(), FEEDS, fetchJson(), fetchMarkets(), fetchPool(), fetchStooq() (+14 more)

### Community 1 - "Frontend Render & PWA"
Cohesion: 0.21
Nodes (20): esc(), fmtNum(), fmtUpdated(), freshness(), HERO, heroBanner(), init(), loadDigest() (+12 more)

### Community 2 - "PWA Manifest"
Cohesion: 0.12
Nodes (15): background_color, categories, description, display, display_override, icons, id, lang (+7 more)

### Community 3 - "Package & Scripts"
Cohesion: 0.12
Nodes (15): dependencies, @anthropic-ai/sdk, rss-parser, description, name, private, scripts, build (+7 more)

### Community 4 - "Test Suite"
Cohesion: 0.19
Nodes (5): resolvePicks(), DIGEST, els, csv, pool

### Community 5 - "Vercel Deploy Config"
Cohesion: 0.25
Nodes (7): buildCommand, data, framework, git, deploymentEnabled, outputDirectory, $schema

## Knowledge Gaps
- **46 isolated node(s):** `TITLES`, `HERO`, `id`, `scope`, `lang` (+41 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 52 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@anthropic-ai/sdk` connect `Package & Scripts` to `Digest Build Pipeline`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `newsItem()` (e.g. with `rankedBlock()` and `subSection()`) actually correct?**
  _`newsItem()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TITLES`, `HERO`, `id` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Digest Build Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.11692307692307692 - nodes in this community are weakly interconnected._
- **Why does `rss-parser` connect `Package & Scripts` to `Digest Build Pipeline`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `PWA Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Package & Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._