# BigPharma key-free educational video library

## Actual scope and results — 23 October 2026

Database inspection and a final SQL count confirmed:

| Measure | Actual result |
|---|---:|
| Verified global catalog medication records | 0 |
| Existing saved user medication records | 1 |
| Existing drug/formulation research targets evaluated | 1 of 1 |
| Real video resources stored in the new library | 13 |
| Approved video resources | 1 |
| Pending-review video resources | 12 |
| Rejected video resources | 0 |
| Existing medications with approved related education | 1 |
| Existing medications with approved medication-specific video | 0 |

There are not 500-plus catalog medications in this database. No fictional medication rows or video matches were added to achieve that count. This session implements the library and researches the actual scope; it does not complete the prior medication-import request.

The existing Atorvastatin tablet record now has Cleveland Clinic's **How Do Statins Lower Cholesterol? | Tamanna Singh, MD**, explicitly labeled **Related education — medication class**. The current NHS atorvastatin page confirms its statin-class relevance. This is not advertised as a demonstration of that user's exact prescription or an atorvastatin-specific short video.

### Medication still needing specific video content

**Atorvastatin (Tablet / Lipitor)**. Two actual medication-specific candidates are pending:

- Doctor O'Donovan — `N4G2EbXD12o`. Full public transcript retrieved; missed-dose and grapefruit statements differ from the current NHS page, so updated clinical review is required.
- JHP Medical UK — `xskiMEwrPR0`. Exact title/channel/oEmbed retrieved; full clinical and publisher review is incomplete.

## Complete current medication-to-video export

`docs/medication-video-mapping.csv` contains every matching resource for the one actual drug/formulation, with title, publisher, URL, classification, approval and embed-check status. Blank durations mean **not verified**, not zero-length videos.

Administrators can generate and share an up-to-date full CSV from Profile → Video Library Administration. The export includes every research target, pending matches and missing-content rows; it is not limited to the current 20-row UI page. It does not expose account identifiers or patient notes.

## Database and preservation

Added:

- `medication_videos`: requested metadata fields, nullable unknown values, exact alias/form/route/device constraints, citations and review evidence.
- `medication_video_research`: catalog IDs where present, deduplicated actual saved drug/formulation targets, evaluations, findings and citations. Route stays null because it is absent in the existing saved-medication schema.
- `medication_video_source_runs`: source extraction counts, errors and unresolved dynamic-page limitations.
- `medication_video_admins`: explicitly assigned reviewers; no self-enrollment.
- `medication_video_review_log`: audit trail for administrator decisions and replacements.

Existing accounts, medication records, reminders, the old researched metformin video and all existing authentication flows were preserved. Legacy videos are **not** automatically considered approved in the new library. No user records were corrected or deleted, including the existing Atorvastatin record's generic/brand field labeling.

RLS is enabled for every new table. Ordinary users read only approved video resources. Candidate insertion, verification, approval, research, progress and full-library export require a database-assigned administrator. Publishing requires recent public oEmbed verification, source metadata, exact names/forms and review notes. Technique videos additionally require a confirmed device. Metadata changes to a title/channel send the resource back to pending review.

### Assign an administrator

The project owner should use Cloud → Data → `medication_video_admins` to insert the existing reviewer's `user_profiles.id` as `user_id`. No private service credential or API key belongs in the app. No administrator was chosen on the user's behalf. Non-admins receive an access-denied page, and server checks independently enforce the restriction.

## Sources actually read

- Yale Health: https://yalehealth.yale.edu/topic/how-use-prescription-products — product/manufacturer links reviewed; no automatic YouTube match assumed.
- Henry Ford Health: https://www.henryford.com/services/pharmacy/medication-instructional-videos — extracted five exact public video links and verified their title/channel/embed metadata.
- UC Davis Health: https://health.ucdavis.edu/internal-medicine/pulmonary/resources/inhaled-medication-edu — read device library; extracted content did not expose individual video IDs.
- National Jewish Health: https://www.nationaljewish.org/education/health-information/multimedia/devices-to-inhale-medication — playlist and device transcript found; no fabricated individual IDs.
- MedlinePlus: https://medlineplus.gov/medlineplus-videos/ — condition/general-health material was not mislabeled as medication-specific content.
- NHS atorvastatin reference: https://www.nhs.uk/medicines/atorvastatin/
- Cleveland Clinic and other actual video watch pages, transcripts and public YouTube oEmbed endpoints.

## Stored resource inventory

| Video ID | Exact checked title | Publisher | Review |
|---|---|---|---|
| GMReQi7zHpM | How Do Statins Lower Cholesterol? \| Tamanna Singh, MD | Cleveland Clinic | Approved related education for existing Atorvastatin tablet only |
| y1tul4BvK98 | Diabetes: How to inject insulin \| NHS | NHS | Pending device/content review |
| Pl28IILPDTU | How to do an Insulin Injection | University College London Hospitals NHS Foundation Trust | Pending device/content review |
| odlFtGNjmMQ | How to Use Naloxone Nasal Spray (:30) | CDC | Pending full visual/product review |
| gFGM-8X98zs | How to Use a Metered-Dose Inhaler | Nucleus Medical Media | Pending; no usable oEmbed response |
| xn57MtK1pAY | Proper Technique for Using Albuterol Inhaler - Step by Step Guide | Henry Ford Health | Pending exact device/product review |
| xoTgvXZYtLI | How To Use Your Spiriva® HandiHaler | Henry Ford Health | Pending full content review |
| Jf46KzDeSuE | How To Use Your Advair® Diskus Inhaler | Henry Ford Health | Pending full content review |
| YItTBRltiK4 | How To Properly Take An Oral Antibiotic | Henry Ford Health | Pending; no blanket antibiotic assignments |
| ofLX6M-ib6I | How To Properly Take An Antibiotic Suspension | Henry Ford Health | Pending; no blanket suspension assignments |
| N4G2EbXD12o | ATORVASTATIN (Lipitor) Key Facts \| Common doses, side effects and more [Educational guide] | Doctor O'Donovan | Pending clinical review of dated advice |
| xskiMEwrPR0 | Atorvastatin \| What All Patients Need to Know | JHP Medical UK | Pending clinical/publisher review |
| 4AmiqM6iy8A | METFORMIN for DIABETES \| Doses, side effects & more [Educational video] | Doctor O'Donovan | Pending current formulation/content review |

Runtime verified only where available: CDC's publisher title supplies **30 seconds**; the Henry Ford albuterol watch page explicitly supplies **3:35 (215 seconds)**. Other video runtimes are null. A podcast runtime was not substituted for the corresponding YouTube video's runtime.

## Player and medication pages

Both medication detail and dose-guide pages use the moderated library and pass the actual saved name, generic/brand aliases and dosage form. Matching is exact, never fuzzy; injection is not treated as proof of a pen, and a generic inhaler is not treated as proof of MDI/Diskus/HandiHaler. Conflicting known routes fail the match.

The compact card includes a real YouTube thumbnail, exact title, publisher, verified duration when known, type label, source citation and manual play control. Unmatched products show **Educational video coming soon**. Players are mounted only when requested, to reduce WebView/network overhead.

Native uses the official YouTube iframe API inside WebView; web uses the same official document in an iframe. Embeds use `https://www.youtube-nocookie.com/embed/VIDEO_ID`, user-initiated playback, inline playback, visible controls, fullscreen permission, API origin and `strict-origin-when-cross-origin` referrer policy. Native retains the project's existing BigPharma content origin; deployed application identity/referrer must be validated on installed builds. Web derives the actual browser origin inside an effect.

Ready/error events are from the player, not assumed from a generic HTML load. Web messages check sender and origin. A timeout or YouTube restriction produces retry and **Watch on YouTube** controls in normal document flow. Nothing downloads or rehosts copyrighted videos or bypasses embed restrictions.

## Repeatable research workflow

`medication-video-research` is an administrator-only Edge Function using public institutional pages and public YouTube oEmbed, **not the YouTube Data API**. It extracts actual video IDs and processes bounded batches of three with an explicit source/cursor. Repeated discovery deduplicates by video ID. Each new candidate stays pending; extraction cannot approve a clinical match.

The administrator UI supports next source batch, manual public links, current metadata checks, full player review, exact names/forms/routes/device constraints, classifications, approval/rejection, outdated-link replacement, research findings, pagination, source errors and complete CSV export. Newly added catalog or saved drug/formulation records are synchronized into the research queue. Dynamic JavaScript libraries and non-YouTube manufacturer content are explicitly recorded as needing further manual extraction.

## Verification performed and limitations

Performed:

- Queried actual catalog and saved drug/formulation scope and final resource/coverage counts directly in PostgreSQL.
- Read all five supplied institutional source pages.
- Queried oEmbed for all supplied starter IDs and the extracted/selected candidate IDs.
- Retrieved public transcripts for the Nucleus MDI, Henry Ford albuterol, Doctor O'Donovan atorvastatin and Cleveland Clinic statin-class resources.
- Confirmed exact titles/channels/embed URLs for usable oEmbed responses; saved source evidence and honest unknown values.
- Cross-project search confirmed no `YOUTUBE_API_KEY` dependency and that educational-video callers use the new formulation-aware interface.
- Added `tests/videoLibraryChecks.ts` covering aliases, wrong/unknown formulations, pens versus vials, MDI versus tablets/nebulizers, routes, valid/invalid URL IDs, duration formatting and CSV escaping.

Not performed in this environment:

- Running TypeScript/test commands (no command-execution tool available).
- Installed iOS/Android playback, fullscreen, keyboard and viewport/device testing.
- Authenticated administrator end-to-end review/Edge Function invocation (no administrator assigned).
- Verification of every visual administration step for pending device resources.

**oEmbed availability is evidence of a publicly offered embed URL, not proof of successful playback in every region, age-gated session, network or installed build.** Native referrer behavior, YouTube codes such as 101/150/153, fullscreen and short-screen layouts still require device testing. Public-page extraction may be blocked or omit dynamic video URLs. These are reported rather than treated as completed tests.

There are zero approved medication-specific matches and no claim of 500 videos. The library is implemented, all actual current drug/formulation targets were evaluated, and the remaining current medication-specific gap is named above.
