# What makes GolemGuard unique

**GolemGuard** is the product identity behind our multimodal authenticity stack (**Detect. Explain. Trust.**). This note is for judges: it explains **why the approach is differentiated**, not only what buttons exist. For a feature-by-feature walkthrough, see [FEATURES.md](FEATURES.md).

---

## 1. “Guard” is the product idea, not a single model

Many demos are **one API call → one score**. GolemGuard is built around **defense in depth**:

- **Specialized detectors** per modality (e.g. image/video signals, audio deepfake checks, document-level AI text scoring).
- **Independent LLM passes** that do not merely parrot the first score — they add **separate** visual reasoning and narrative explanations.
- A **documented fusion policy** (thresholds, tie-breaks, when to trust which signal) so the final verdict is an **ensemble outcome**, not a black box.

That design matches how real misinformation spreads: single-model tools fail on edge cases; **layered evidence** is harder to game and easier to defend in review.

---

## 2. Authenticity plus **context** — not only “AI or not?”

A file can look fine in isolation but be **misleading** when paired with a headline or URL. GolemGuard exposes a **three-axis contextual mode** (see [FEATURES.md §4](FEATURES.md#4-contextual-three-axis-verification)):

| Axis | Question it approximates |
|------|---------------------------|
| **Authenticity** | Does the **media** itself look AI-generated or manipulated? |
| **Context** | Does the **image/video** match the **claim** (caption, headline)? |
| **Source** | Is the **linked source** credible or consistent with the story? |

Those axes run **in parallel** where inputs exist, and the stack supports **server-side media URLs** so a browser extension can analyze content **without** a perfect file upload path. That combination — **modal detection + claim checking + source pass** — is uncommon in student or hackathon projects, which usually stop at file classification.

---

## 3. Video is treated as a **system**, not a longer image

The video pipeline is deliberately **asymmetric**:

- **Audio is checked first** (short segment). If speech is flagged as synthetic, the job can **short-circuit** — because synthetic audio alone is often the smoking gun for viral fakes.
- **Visual analysis** can use full video signals when available, with a **fallback** to representative frames if a provider path fails — so a single API outage does not zero out the whole run.

That mirrors how real deepfake incidents combine **voice + picture**; GolemGuard encodes that intuition in code.

---

## 4. Explainability is a first-class output

Results are not only `verdict + %`. The backend persists **which models ran**, **which were skipped and why**, **per-model evidence** (where APIs allow), and **signals** (e.g. high-risk sentences in documents). The UI can show **proof-style** detail instead of a lone number.

For judges, this matters: **trust** requires **auditability** — you can see *why* the system disagreed with itself before it fused the answer.

---

## 5. Distribution: truth **in the feed**, not only on our site

The **browser extension** meets users where disinformation is consumed — e.g. **Twitter/X** — with platform-aware scraping plus the same authenticated API as the web app. “Install our product” is a high bar; “work inside the timeline you already use” is a different class of **reach**.

---

## 6. Engineering choices that support credibility

- **Authenticated users**, **job queue**, **idempotent result writes**, and **rate limiting** are not glamorous, but they signal **seriousness**: the demo behaves like something you could **ship**, not a one-off script.
- **Clear failure taxonomy** (e.g. unrecoverable vs retriable) avoids silent wrong answers when storage or limits break.

---

## 7. Brand and experience

The public site leans into a cohesive story: **GolemGuard** naming, **Guard Villager** hero art, glass UI, and in-app **documentation** — so the project reads as a **product**, not a loose notebook of API calls.

---

## Summary for judges

| Dimension | GolemGuard’s angle |
|-----------|---------------------|
| Detection | Multimodal **ensemble** with explicit fusion, not one score |
| Misinformation | **Media + claim + source** when using contextual mode |
| Video | **Audio-aware** pipeline with visual fallback |
| Trust | **Explainable** outputs (evidence, skips, signals) |
| Reach | **Extension** for inline analysis on social feeds |
| Quality bar | **Auth, queue, idempotency** — production-shaped |

For implementation details and endpoints, use [FEATURES.md](FEATURES.md). For deploy and test commands, see [DEPLOYMENT.md](DEPLOYMENT.md) and [TESTING.md](TESTING.md).
