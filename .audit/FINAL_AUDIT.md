# ADT Automated Audit Baseline

## Current status

The structural, responsive, read-aloud, and automated accessibility baseline is complete. Reader pages 130–186 have now received a dedicated PDF-layout repair pass; exact page-by-page fidelity for the earlier reader range remains under review.

## Scope checked

- Paired contact sheets were generated for all 144 source PDF pages, but the initial review did not sufficiently account for content split and merged across ADT section boundaries.
- All 186 entries in the ADT reading order were checked at desktop and mobile widths.
- All 156 non-quiz content sections were rendered for the visual review.
- Sassoon Primary Std Regular is embedded locally and applied to book content.
- The desktop book canvas follows the source PDF's measured 836 px page width and 1151 px minimum page height, while merged sections expand and smaller screens reflow responsively.
- At the user's direction, ordinary live HTML text and form elements use one computed size: 22 px. The four cover display lines are the sole source-measured exception; navigation chrome and text baked into images are excluded.
- The source colour hierarchy is retained: pale blue page framing, cyan exercise borders, darker blue labels/question numbers, and black instructional and mathematical text.
- Images, figures, descriptions, text IDs, audio mappings, headings, landmarks, ARIA, and table semantics were audited.
- The packaged book was tested with the same axe-core assessment used by the local ADT Studio validation workflow.

## Material repairs

- Corrected heading hierarchy, nested landmarks, prohibited ARIA, table headers, and duplicate IDs.
- Synchronized visible-image alternative text with the localized descriptions.
- Restored missing figures on page 141.
- Recovered the distinct second illustration on page 112 and added its description and ADT Studio-style audio.
- Removed the stray football fragment from the flask illustration in Exercise 1 on source page 120 while preserving its image-description ID and audio.
- Removed reciprocal extraction fragments from the cup and book illustrations in Exercise 2 on source page 121 while preserving both description IDs and audio files.
- Removed duplicated table headers and answer text from the five-pencil and one-pencil crops on source page 21.
- Removed reciprocal orange fragments from the one-third/two-thirds illustrations on source page 111.
- Audited all 389 unique referenced raster assets, including all 24 segmented crops, for stray edge fragments and incomplete neighbouring objects.
- Corrected content and ID collisions on pages 107, 113, 124, 127, and 132.
- Corrected the oversized page 97 image that caused reader rendering failures.
- Added audio mappings for mathematical symbols while retaining intentional silent answer blanks.
- Reconstructed the table of contents with the source hierarchy, spacing, dotted leaders, and page-reference columns.
- Applied the PDF-style pale-blue rounded page wrapper consistently across all 156 content sections.
- Removed generated visible page-number badges; page metadata remains available to the reader's navigation system.
- Restored the PDF's measured cover scale: 75 px “Arithmetic”, 39 px “Pupil’s Book”, 45 px “Standard Two”, and 23 px publisher line.
- Tuned layouts and checked the complete book for broken images, clipping, and overflow.
- Restored ruled rows and columns on all number-reading tables whose generated descendant-border utilities were missing.
- Prevented the reader's localization pass from flattening 132 rich text containers (tables, diagrams, MathML, links, and activity inputs) across 27 files.
- Repaired the five-number exercise rows, place-value diagrams, cup-counter tables, and the page-119 two-image ICT layout shown in the visual review.
- Returned the “Recognizing fractions by using ICT” continuation heading to the end of its source page.
- Replaced ordinary page-local, responsive, heading, body, exercise, table, form and quiz type sizes with one computed 22 px book-text size while retaining the source-measured cover exception.
- Replaced the page-65 `first-letter` numbering rule that split items 10–18 into blue and black digits; all 18 question-number tokens now render in one consistent source blue.
- Repaired reader pages 130–186 against PDF pages 104–143, including source-style banners, compact tables, activities, response rules and image placement.
- Returned the page-109 Exercise 4 content to its source three-column by two-row layout and removed duplicate number/instruction content baked into composite images.
- Corrected the page-139/140 boundary so Exercise 4 questions 1–3, its continuation questions 4–6 and the non-plane-figure table follow the source order; removed the extra Example pill absent from the rendered PDF.
- Standardized the reader-pages 130–186 Exercise, Example, Activity and Questions pills to the source colours and compact border treatment, and restored separate framed panels for Exercise 3 and Exercise 4.

## Final results

| Check | Result |
|---|---:|
| Manifest entries tested | 186 |
| Missing page links | 0 |
| Missing image files | 0 |
| Visible images without descriptions | 0 |
| Image-description audio issues | 0 |
| Duplicate content IDs | 0 |
| Heading-order issues | 0 |
| Table-semantic risks | 0 |
| Nested-aside issues | 0 |
| Missing referenced audio files | 0 |
| Desktop/mobile browser checks | 372 passed |
| Final content renders | 156 at 884 px wide; no clipped wrappers |
| Typography audit | 7,335 visible text/form elements across 186 entries; 0 deviations from their expected 22 px or source-cover sizes |
| Vertical overflow audit | 156 checked; 0 overflowing sections |
| Rich content checked after runtime load | 132 intact; 0 flattened |
| Axe accessibility violations | 0 |
| Axe incomplete/manual-review items | 0 |
| Axe page errors | 0 |

## Intentional exceptions

- The 30 quiz activity container IDs (`qz001` through `qz030`) are structural section identifiers, not localized text nodes.
- Six normal and six easy-read blank-box IDs reuse the packaged `blank` narration, so they no longer create missing audio mappings.
- Some ADT sections combine material from two or three source pages. Those wrappers expand vertically instead of clipping content or trapping it in an internal scrollbar; on mobile they continue to reflow.

## Visual-fidelity work still required

- The ID-prefix diagnostic found 52 ADT sections containing more than one `pgNNN` prefix and 61 prefixes distributed across multiple sections. These prefixes are not always physical PDF-page markers, so the original PDF's page text and geometry must be used for the final mapping.
- These split/merged boundaries explain visible composition differences. The page-64/65 abacus boundary has been repaired; other mapped boundaries remain under review.
- Automated checks for loading, clipping, semantics, and accessibility do not establish pixel or page-composition fidelity. Each mapped source page must be reviewed and repaired against all of its containing ADT sections.

## Evidence

- `structural-report.json` — final structural audit data
- `axe-report.json` — final ADT Studio axe-core results
- `browser-report.json` — final whole-book desktop/mobile browser checks
- `browser-targeted-report.json` — isolated checks of repaired pages
- `vertical-overflow-report.json` — final page-wrapper clipping audit
- `image-edge-fragment-report.json` — book-wide raster edge-fragment audit
- `uniform-font-report.json` — final computed 22 px type-size audit for all 186 entries
- `font-size-report.json` — earlier source-hierarchy audit retained for comparison
- `pdf-text-section-map.json` and `VISUAL_FIDELITY_LEDGER.md` — physical-PDF text mapping and current repair ledger
- `pdf-adt-mapping.json` — preliminary ID-prefix distribution diagnostic; not a substitute for physical PDF-page mapping
- `contact-sheets/` — paired PDF and ADT visual comparison sheets
- `READER_130_186_AUDIT.md`, `reader-130-186/`, and `browser-report-130-186.json` — dedicated PDF comparison and desktop/mobile verification for reader pages 130–186
