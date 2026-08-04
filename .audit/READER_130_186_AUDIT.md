# Reader Pages 130–186 — PDF Fidelity Audit

## Scope

- Reader entries checked: 57 (pages 130 through 186 inclusive).
- Source-backed textbook sections: 49.
- Interactive quizzes without a direct PDF counterpart: 8.
- Corresponding source material: physical PDF pages 104 through 143, with a small amount of page-144 continuation already merged into the final section.
- Every source-backed section was rendered and compared beside its PDF page image.

## Repairs completed

- Replaced the invented solid rounded page border and shadow with a grainy pale-blue frame sampled directly from the uploaded PDF; retained a white centre and the PDF's measured frame spacing. The plain first PDF page remains unframed.
- Matched the blue chapter, filled Example, outlined Exercise, green Activity and green Questions treatments used by the source book.
- Normalized all 44 visible source-book banner pills in the range: 2 px borders, source colours, consistent 22 px Sassoon Primary text and compact padding.
- Restored separate rounded frames for Exercise 3 and Exercise 4 on `pg108_sec001`, with each banner overlapping its own top rule as in the PDF.
- Restored compact ruled rows and columns for fraction, measurement, mass, volume and shape tables.
- Restored the single continuous Example outline on `pg123_sec001`: rounded top corners, overlapping blue label and uninterrupted light-blue side rules through the measurement table, matching PDF page 123 without its watermark or crop marks.
- Applied the same PDF-derived label/panel rules to all 14 Example pages across the HTML book, while retaining each source panel's own height; regression-rendered all 42 detected Exercise pages after the shared update.
- Returned Exercise 4 on `pg108_sec001` to the source three-column by two-row layout.
- Replaced application-style coloured activity cards with compact textbook lists, ruled response lines and source-colour numbering.
- Attached the top Exercise labels to their own rounded panels on the split sections from reader pages 142–186, instead of leaving the labels on the outer page wrapper.
- Restored the page-121 picture activity to plain source-style answer rules, removed duplicate icon/chip decorations and returned its Questions heading to black.
- Compacted the page-127 Activity response rows so the three prompts follow the source page proportions.
- Returned the page-136 continuation questions to a plain full-width textbook list instead of a blue application card.
- Framed the page-140 Exercise 4 continuation while keeping the following non-plane-figures introduction plain, as in the PDF.
- Removed the empty continuation banner on `pg133_sec002`.
- Removed duplicated content from `pg139_sec001` by using a diagram-only crop while retaining live, accessible question text and controls.
- Moved Exercise 4 questions 4–6 and the non-plane-figures continuation to `pg140_sec001`, matching their source-page order; removed the extra visible Example pill that is not present in the rendered PDF.
- Cropped composite source images on `pg108_sec001` and `pg127_sec002` so question numbers, headings and instructions are not shown twice.
- Compacted oversized picture rows on pages 104, 118, 121, 126, 128, 130, 134, 140, 141 and 142 to the PDF proportions.
- Kept all live book text and form controls at the user-requested 22 px Sassoon Primary size.
- Kept image descriptions and their read-aloud mappings; blank boxes now reuse the packaged `blank` narration rather than having missing audio mappings.
- Enabled ADT Studio's existing `Describe images` preference by default for new readers, so continuous read-aloud includes the 379 packaged image-description MP3s; an explicit saved user choice to disable it is still respected.

## Verification

| Check | Result |
|---|---:|
| Desktop/mobile browser entries | 114 passed |
| Post-repair comparison renders | 57 of 57 captured |
| Fatal page loads | 0 |
| Hidden content | 0 |
| Horizontal content overflow | 0 |
| Overflowing visible elements | 0 |
| Broken images | 0 |
| Missing Sassoon Primary | 0 |
| Page-script errors | 0 |
| Range image-description issues | 0 |
| Range image-audio issues | 0 |
| Range image-alt/localization mismatches | 0 |
| Missing audio mappings in bundle | 0 |
| Missing referenced audio files | 0 |
| Whole-book uniform font deviations | 0 of 7,343 elements |

## Page-boundary note

The conversion split some physical PDF pages into two ADT sections and merged some continuation material into one longer section. This audit preserves the existing 186-entry reading order and repairs the visual composition inside each entry. Rebuilding the manifest to enforce exactly one reader entry per physical PDF page would be a separate structural change because it would remove or combine existing reader pages and move quizzes.

## Evidence

- `reader-130-186/report.json` — rendered geometry, tables, images and banner diagnostics.
- `reader-130-186/contact-sheets/` — PDF/ADT comparison sheets for all 57 reader entries.
- `browser-report-130-186.json` — desktop and mobile regression results.
- `uniform-font-report.json` — computed typography results across all 186 entries.
- `structural-report.json` — current image, audio, navigation and accessibility structure results.
