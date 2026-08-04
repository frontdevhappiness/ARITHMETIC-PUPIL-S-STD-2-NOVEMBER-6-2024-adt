/*
 * The ADT localization runtime writes translated strings into every element
 * carrying data-id. Some converted layouts place data-id on a rich container
 * (a number grid, MathML expression, linked address, or input row). Replacing
 * that container's text removes the markup that supplies its visual layout or
 * interaction. English is the only packaged language in this book, so retain
 * the authored rich markup while the same data-id continues to provide its
 * read-aloud audio mapping.
 */
(() => {
  /* ADT Studio exposes image narration as a separate read-aloud preference.
   * Its runtime default is false, which makes continuous playback filter every
   * <img data-id> out of the audio sequence even when a description and MP3 are
   * packaged. Default it on for new readers, but never overwrite an explicit
   * stored choice made through the accessibility settings. */
  try {
    if (localStorage.getItem("describeImagesMode") === null) {
      localStorage.setItem("describeImagesMode", "true")
    }
  } catch {
    /* Storage can be unavailable in privacy-restricted browser contexts. */
  }

  const snapshots = new Map()

  /* A converted subtraction exercise coloured its numbering with
   * `::first-letter`. That only colours the first digit of 10–18, leaving the
   * second digit and full stop black. Wrap the complete leading number after
   * localization/activity rendering so the whole token has one source blue.
   */
  const wrapExerciseNumber = (element) => {
    if (element.querySelector(":scope > .source-question-number")) return

    const leadingText = Array.from(element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && /\S/.test(node.textContent || ""),
    )
    if (!leadingText) return

    const match = (leadingText.textContent || "").match(/^(\s*)(\d+\.)(\s*)/)
    if (!match) return

    const number = document.createElement("span")
    number.className = "source-question-number"
    number.textContent = match[2]

    const remainder = (leadingText.textContent || "").slice(match[0].length)
    leadingText.replaceWith(
      document.createTextNode(match[1]),
      number,
      document.createTextNode(`${match[3]}${remainder}`),
    )
  }

  const wrapExerciseNumbers = () => {
    for (const element of document.querySelectorAll(".exercise-line")) {
      wrapExerciseNumber(element)
    }
  }

  /* The reader pages came from several conversion templates, so visually
   * identical source-book labels were emitted as unrelated headings, spans and
   * pills. Mark the actual visible pill (not merely its inner i18n span) so the
   * repeated PDF layouts use one source-faithful treatment across the book.
   */
  const bannerPattern = /^(Exercise\s+\d+|Example(?:\s+\d+)?|Activity|Questions)$/i
  const framedExerciseSections = new Set([
    "pg114_sec001",
    "pg114_sec002",
    "pg115_sec001",
    "pg116_sec001",
    "pg117_sec001",
    "pg118_sec001",
    "pg120_sec002",
    "pg121_sec001",
    "pg126_sec001",
    "pg130_sec001",
    "pg132_sec002",
    "pg133_sec001",
    "pg142_sec001",
    "pg143_sec001",
  ])

  const isVisiblePill = (element, sectionWidth) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const radius = parseFloat(style.borderTopLeftRadius) || 0
    const border = parseFloat(style.borderTopWidth) || 0
    const background = style.backgroundColor
    const hasBackground = background !== "rgba(0, 0, 0, 0)" && background !== "transparent"
    return radius >= 10 && rect.width < sectionWidth * 0.8 && (border > 0 || hasBackground)
  }

  const isSourcePanel = (element, bannerWidth) => {
    if (!(element instanceof HTMLElement)) return false
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const border = Math.max(
      parseFloat(style.borderTopWidth) || 0,
      parseFloat(style.borderRightWidth) || 0,
      parseFloat(style.borderBottomWidth) || 0,
      parseFloat(style.borderLeftWidth) || 0,
    )
    const radius = Math.max(
      parseFloat(style.borderTopLeftRadius) || 0,
      parseFloat(style.borderTopRightRadius) || 0,
    )
    return border >= 1 && radius >= 10 && rect.width > bannerWidth * 1.4
  }

  const normalizeSourceBanners = () => {
    for (const section of document.querySelectorAll("[data-section-id^='pg']")) {
      const pageMatch = section.dataset.sectionId?.match(/^pg(\d{3})_/)
      const sourcePage = pageMatch ? Number(pageMatch[1]) : 0
      if (sourcePage < 1 || sourcePage > 143) continue

      const sectionWidth = section.getBoundingClientRect().width || 1
      for (const textElement of section.querySelectorAll("[data-id]")) {
        if (textElement.querySelector("[data-id]")) continue
        const label = (textElement.textContent || "").trim().replace(/\s+/g, " ")
        const match = label.match(bannerPattern)
        if (!match) continue

        const kind = match[1].toLowerCase().startsWith("exercise")
          ? "exercise"
          : match[1].toLowerCase().startsWith("example")
            ? "example"
            : match[1].toLowerCase()

        let host = textElement
        let candidate = textElement
        while (candidate && candidate !== section) {
          const candidateText = (candidate.textContent || "").trim().replace(/\s+/g, " ")
          if (candidateText === label && isVisiblePill(candidate, sectionWidth)) {
            host = candidate
            break
          }
          candidate = candidate.parentElement
        }

        /* Plain Questions subheadings in the PDF remain plain. Only the green
         * Questions pill on the song page is normalized as a banner. */
        if (kind === "questions" && host === textElement && !isVisiblePill(host, sectionWidth)) continue

        host.classList.add("source-book-banner", `source-book-banner-${kind}`)
        const row = host.parentElement
        if (
          row &&
          row !== section &&
          row.children.length === 1 &&
          (row.textContent || "").trim().replace(/\s+/g, " ") === label
        ) {
          row.classList.add("source-book-banner-row")
        }

        const bannerContainer = row?.classList.contains("source-book-banner-row") ? row : host
        if (kind === "exercise" || kind === "example") {
          const bannerWidth = host.getBoundingClientRect().width || 1
          let panel = bannerContainer.parentElement
          while (panel && panel !== section.parentElement) {
            if (isSourcePanel(panel, bannerWidth)) break
            if (panel === section) {
              panel = null
              break
            }
            panel = panel.parentElement
          }

          if (panel) {
            panel.classList.add("source-book-banner-panel")
            bannerContainer.classList.add("source-book-attached-banner")
          } else if (
            kind === "exercise" &&
            framedExerciseSections.has(section.dataset.sectionId) &&
            bannerContainer.parentElement === section
          ) {
            section.classList.add("source-book-framed-exercise", "source-book-banner-panel")
            bannerContainer.classList.add("source-book-attached-banner")
          }
        }
      }
    }
  }

  for (const element of document.querySelectorAll("[data-id]")) {
    if (element.childElementCount === 0) continue
    snapshots.set(
      element,
      Array.from(element.childNodes, (node) => node.cloneNode(true)),
    )
  }

  let restoring = false
  const restoreFlattenedContainers = () => {
    if (restoring) return
    restoring = true
    try {
      for (const [element, children] of snapshots) {
        if (!element.isConnected || element.childElementCount > 0) continue
        element.replaceChildren(...children.map((node) => node.cloneNode(true)))
      }
    } finally {
      restoring = false
    }
    wrapExerciseNumbers()
    normalizeSourceBanners()
  }

  const observer = new MutationObserver(restoreFlattenedContainers)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  /* Run once synchronously as well in case another script localized content
   * between parsing this file and installing the observer. */
  restoreFlattenedContainers()
  wrapExerciseNumbers()
  normalizeSourceBanners()
})()
