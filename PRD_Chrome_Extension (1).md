# PixelShift — Chrome Extension Product Requirements Document

## 1. Product Overview

**Product:** PixelShift  
**Type:** Chrome Browser Extension  
**Platform:** Google Chrome (Manifest V3)  
**Hackathon:** AI HACKS  
**Duration:** 24 hours

PixelShift is a **Chrome extension**, not a website or web application. It runs inside Chrome and interacts with the currently open webpage through Chrome Extension APIs.

PixelShift lets users detect images on the current webpage, select an image, convert it to a supported format locally in the browser, and download the converted file without opening or uploading the image to an external image-conversion website.

### Product vision

> Turn any usable webpage image into the format you need, directly from Chrome.

### Important product boundary

PixelShift must be implemented and presented as a **browser extension only**.

It must **not** require:
- A standalone website
- A hosted frontend
- A web-app URL
- A user account
- An external image-conversion website
- A backend server for the core conversion workflow

The primary user interface is the **Chrome extension popup**. Page-level interaction is handled through a **content script**, and background extension operations are handled by the **Manifest V3 service worker**.

---

## 2. Problem Statement

Users often need to save an image from a webpage in a different format. The usual workflow is:

1. Save the image.
2. Open an external image-conversion website.
3. Upload the image.
4. Select the desired format.
5. Convert it.
6. Download the result.

This is slow, repetitive, and inconvenient.

PixelShift moves the extraction and conversion workflow into a Chrome extension:

**Open webpage → Open PixelShift → Find/select image → Choose format → Convert locally → Download**

No external conversion website should be required.

---

## 3. Target Users

- Students
- Developers
- Designers
- Content creators
- Researchers
- General Chrome users

---

## 4. Goals

The MVP must:

- Run as a functional Chrome extension.
- Scan the currently active webpage for usable images.
- Display extracted images inside the extension popup.
- Allow the user to select an image.
- Show useful image metadata where available.
- Allow the user to choose a target format.
- Convert supported image formats locally in the browser.
- Download the converted image through Chrome.
- Clearly display **"Conversion not possible."** when a requested conversion cannot be performed.
- Prefer local/browser-side processing for privacy.
- Allow direct selection of an image from the webpage.
- Avoid requiring a separate website or backend for the core workflow.

---

## 5. Non-Goals

The MVP will not attempt to:

- Become a standalone website or web application.
- Replace Photoshop or a full image editor.
- Provide permanent cloud image storage.
- Require user accounts or authentication.
- Build a social platform.
- Guarantee extraction from every website.
- Bypass website access controls, DRM, authentication, or protected content.
- Implement advanced raster-to-vector reconstruction.
- Support every possible image format.
- Upload user images to a remote server for the core conversion process.
- Build a full image editing suite.

---

## 6. Chrome Extension User Experience

### 6.1 Primary interface

The main PixelShift interface is the **Chrome extension popup** opened by clicking the PixelShift icon in Chrome's toolbar.

The popup should contain:

1. PixelShift header/logo
2. **Scan Page** button
3. **Select From Page** button
4. Image gallery
5. Image selection controls
6. Image metadata
7. Target-format selector
8. **Convert** button
9. Download/success state
10. Error and empty states

The popup should be compact and usable within normal Chrome extension popup dimensions.

### 6.2 Page interaction

When the user activates **Select From Page**, PixelShift communicates with a content script running on the current webpage.

The content script:

- Detects selectable images.
- Highlights an image when the user hovers over it.
- Allows the user to click an image.
- Sends the selected image information back to the extension.
- Removes its temporary UI/highlights when selection is complete or cancelled.

The webpage itself is **not replaced or converted into a PixelShift website**.

### 6.3 Extension lifecycle

Typical lifecycle:

```text
Chrome Toolbar
      |
      v
PixelShift Popup
      |
      +------ Scan Page ------> Content Script
      |                            |
      |                            v
      |                       Image Detection
      |                            |
      |                            v
      |<---------------------- Image Data
      |
      v
Image Gallery
      |
      v
Select Image
      |
      v
Choose Format
      |
      v
Local Conversion
      |
      v
Chrome Download API
      |
      v
Downloaded File
```

---

## 7. Core User Flows

### Flow A — Scan and convert

```text
Open webpage
→ Click PixelShift extension icon
→ Click Scan Page
→ Extension communicates with content script
→ Images are detected
→ Images appear in popup gallery
→ Select image
→ Choose target format
→ Convert locally
→ Download
```

### Flow B — Direct page selection

```text
Open webpage
→ Click PixelShift extension icon
→ Click Select From Page
→ Content script activates
→ Hover over an image
→ Image is highlighted
→ Click image
→ Popup receives selected image
→ Choose target format
→ Convert locally
→ Download
```

### Flow C — Batch conversion

```text
Scan Page
→ Select multiple images
→ Choose target format
→ Convert All
→ Download individually
   OR
→ Download as ZIP
```

Batch conversion is optional for the 24-hour MVP.

---

## 8. Functional Requirements

### FR-01 — Chrome extension startup

The extension shall be installable and runnable in Google Chrome using **Manifest V3**.

The extension shall open its popup when the user clicks the PixelShift toolbar icon.

---

### FR-02 — Active tab detection

The extension shall identify the currently active Chrome tab when the user requests a scan or page selection.

The extension shall handle pages where content scripts cannot operate gracefully.

Examples may include restricted Chrome pages such as:
- `chrome://` pages
- Chrome Web Store pages
- Other browser-restricted contexts

---

### FR-03 — Page scanning

The user shall be able to scan the active webpage from the extension popup.

The scan shall be performed by a content script running in the context of the current page.

---

### FR-04 — Image extraction

The extension should detect, where technically feasible:

- `<img>` elements
- `src` URLs
- Responsive `srcset`
- `<picture>` sources
- SVG images
- CSS background images

The implementation should prioritize reliable extraction over attempting to support every possible webpage technique.

---

### FR-05 — Image metadata

Display available:

- Filename
- Source format
- Width
- Height
- File size, when obtainable
- Source URL

Metadata retrieval must not prevent an image from appearing in the gallery if some metadata is unavailable.

---

### FR-06 — Image preview

Every detected usable image should appear as a thumbnail/card inside the **extension popup**.

The popup should use efficient thumbnail rendering so large pages do not unnecessarily freeze the extension UI.

---

### FR-07 — Image selection

Users shall be able to select one or more images from the extension gallery.

The selected state must be visually obvious.

---

### FR-08 — Direct image selection

Users shall be able to activate a page-selection mode.

While active:

1. The content script identifies selectable images.
2. Hovering over an image temporarily highlights it.
3. Clicking an image selects it.
4. The selected image information is sent to the extension.
5. The selection overlay/highlight is removed.

The extension must not permanently modify the webpage.

---

### FR-09 — Format selection

Initial target formats:

- JPG/JPEG
- PNG
- WebP
- GIF where technically supported
- SVG only where technically feasible

The UI should avoid offering conversions that the conversion engine cannot reliably perform.

---

### FR-10 — Conversion

Supported raster conversions should preferably happen locally inside the browser using:

- Browser APIs
- Canvas APIs where appropriate
- Blob/File APIs
- WebAssembly-based processing where required

The conversion engine should not require a remote conversion website.

---

### FR-11 — Unsupported conversion

If conversion cannot be performed, show:

> Conversion not possible.

The extension must not silently fail.

---

### FR-12 — Download

The user can download the converted file through Chrome's download functionality.

The downloaded file should have:

- An appropriate filename
- The correct target extension
- The correct converted image data

Where appropriate, the extension should use the Chrome Downloads API rather than navigating the current webpage.

---

### FR-13 — Duplicate filtering

Duplicate image URLs should be removed from displayed scan results.

Where URLs differ but clearly refer to the same resource, deduplication may be applied only if it can be done reliably without removing legitimate images.

---

### FR-14 — Small-image filtering

Provide an optional minimum-dimension filter to reduce noise from:

- Tiny icons
- Tracking pixels
- Very small decorative assets

The filter must be user-controllable.

---

### FR-15 — Batch conversion

If time permits, users can:

1. Select multiple images.
2. Choose one target format.
3. Convert all selected images.
4. Download the results individually or as a ZIP.

Batch conversion is a **Should Have** feature for the hackathon.

---

### FR-16 — ZIP download

If batch conversion is implemented, provide an optional ZIP download.

ZIP functionality is not required for the core MVP.

---

## 9. Chrome Extension Architecture

PixelShift should use a standard **Chrome Manifest V3 extension architecture**.

```text
                    CHROME BROWSER
                         |
                         v
              +----------------------+
              | Extension Popup      |
              | React + TypeScript   |
              | Gallery / Controls   |
              +----------+-----------+
                         |
                chrome.runtime
                messaging
                         |
          +--------------+--------------+
          |                             |
          v                             v
+----------------------+     +----------------------+
| Content Script       |     | Service Worker       |
| Page interaction     |     | Background logic     |
| Image detection      |     | Chrome APIs         |
| Direct selection     |     | Downloads           |
+----------+-----------+     +----------+-----------+
           |                            |
           +-------------+--------------+
                         |
                         v
              +----------------------+
              | Image/State Manager  |
              | Filtering            |
              | Deduplication        |
              | Metadata             |
              +----------+-----------+
                         |
                         v
              +----------------------+
              | Conversion Engine    |
              | Canvas / Web APIs    |
              | Optional WASM        |
              +----------+-----------+
                         |
                         v
              +----------------------+
              | Chrome Downloads API |
              +----------------------+
```

### 9.1 Popup

The popup is the primary UI.

Responsibilities:

- Render the gallery.
- Manage image selection.
- Display metadata.
- Provide format selection.
- Start conversions.
- Display progress, errors, and success states.
- Communicate with content scripts/service worker.

---

### 9.2 Content script

Responsibilities:

- Inspect the current webpage DOM.
- Detect images.
- Extract relevant image information.
- Support direct image-selection mode.
- Temporarily highlight selectable images.
- Communicate with the popup/service worker.

The content script should not permanently alter webpage content.

---

### 9.3 Manifest V3 service worker

Responsibilities may include:

- Background message handling.
- Chrome extension API interaction.
- Download orchestration.
- Coordination between extension components where required.

The service worker must remain lightweight and should not hold unnecessary persistent state because Manifest V3 service workers can be suspended and restarted.

---

### 9.4 Conversion engine

Responsibilities:

- Receive image data.
- Validate the source format.
- Convert supported raster images.
- Return a Blob or equivalent downloadable representation.
- Report conversion failures clearly.

Conversion should happen locally whenever technically feasible.

---

## 10. Chrome Permissions and Security

The extension should request the **minimum permissions necessary**.

Potential permissions/host access should be evaluated based on the final implementation.

Likely Chrome capabilities may include:

- Active tab access for interacting with the current tab.
- Scripting/content-script injection where required.
- Downloads for saving converted files.
- Host permissions only when necessary for page image access.

The implementation should avoid requesting broad permissions without a functional reason.

### Security requirements

- Do not execute arbitrary webpage code.
- Do not bypass authentication or access controls.
- Do not transmit image data to an external server for the core workflow.
- Sanitize filenames before download.
- Validate messages between extension components.
- Avoid storing sensitive image data unnecessarily.

---

## 11. Data Flow

### Scan Page

```text
User clicks "Scan Page"
        |
        v
Popup sends message
        |
        v
Content Script scans DOM
        |
        v
Image URLs + metadata
        |
        v
Popup receives results
        |
        v
Filter + deduplicate
        |
        v
Gallery renders thumbnails
```

### Convert Image

```text
User selects image
        |
        v
User selects target format
        |
        v
Conversion Engine
        |
        +---- Success ----> Converted Blob
        |                       |
        |                       v
        |                Chrome Downloads API
        |
        +---- Failure ----> "Conversion not possible."
```

---

## 12. Non-Functional Requirements

### Performance

- Page scanning should complete quickly on normal webpages.
- The popup must remain responsive during conversion.
- Large images should not unnecessarily freeze Chrome.
- Expensive processing should be handled carefully to avoid blocking the UI.
- Batch operations should provide visible progress where implemented.

### Privacy

- Prefer local image processing.
- Do not upload images to a server for the core feature.
- Do not store extracted images permanently.
- Do not retain page image data after it is no longer needed.
- Any future AI feature that sends image data externally must explicitly communicate this to the user.

### Reliability

- Failed image loads must not crash the extension.
- Failed conversions must produce a clear error state.
- Unsupported formats must be handled gracefully.
- Restricted Chrome pages must produce a useful message instead of crashing.
- Individual broken images should not prevent other valid images from appearing.

### Usability

A first-time user should understand the main workflow without documentation.

The popup should make the primary actions obvious:

**Scan Page → Select → Format → Convert → Download**

---

## 13. Suggested Project Structure

```text
pixelshift/
├── source/
│   ├── PRD.md
│   └── TECH_STACK.md
│
├── public/
│   └── icons/
│
├── src/
│   ├── popup/
│   │   ├── components/
│   │   ├── pages/
│   │   └── popup.tsx
│   │
│   ├── content/
│   │   ├── imageDetector.ts
│   │   ├── pageSelector.ts
│   │   └── content.ts
│   │
│   ├── background/
│   │   └── serviceWorker.ts
│   │
│   ├── converter/
│   │   ├── converter.ts
│   │   └── formats.ts
│   │
│   ├── state/
│   │   └── imageStore.ts
│   │
│   ├── types/
│   │   └── image.ts
│   │
│   └── utils/
│       ├── filename.ts
│       ├── filtering.ts
│       └── messaging.ts
│
├── manifest.json
├── package.json
├── vite.config.ts
└── README.md
```

The exact structure may change during implementation, but the project must remain a **Chrome extension project**, not a website project.

---

## 14. Manifest Requirements

The final project must contain a valid **Manifest V3** `manifest.json`.

The manifest should define the required:

- Extension name
- Version
- Description
- Icons
- Popup
- Service worker
- Required permissions
- Required host permissions/content-script configuration

The manifest must not point the primary product experience to a hosted website.

---

## 15. Error States

### Restricted page

> PixelShift can't access this Chrome page.

### Image cannot be loaded

> Unable to load image.

### Conversion unsupported

> Conversion not possible.

### Conversion fails

> Conversion failed. Please try another format.

### Large image

> Image is too large to process locally.

### No images found

> No supported images found on this page.

### No active page

> Open a webpage and try again.

### Permission/access issue

> PixelShift cannot access this page. Try refreshing the page and opening the extension again.

---

## 16. Optional AI Feature

AI should be an enhancement, not a dependency of the core Chrome extension.

### Smart Image Categorization

Extracted images can optionally be categorized as:

- Photos
- Logos
- Illustrations
- Product images
- Screenshots
- Other

Users could then filter the gallery using natural language or categories.

Example:

> Show me all product images.

### AI architecture constraint

The core extension must continue to work when the AI feature is unavailable.

AI must not be required for:

- Page scanning
- Image extraction
- Image selection
- Format conversion
- Downloading

If AI requires an external API, that integration must be treated as an optional extension feature rather than the core architecture.

---

## 17. 24-Hour MVP Priorities

### Must Have

1. Chrome Manifest V3 extension works.
2. Extension popup works.
3. Scan current webpage.
4. Extract images.
5. Display image gallery.
6. Select an image.
7. Choose format.
8. Convert common raster formats locally.
9. Download result using Chrome.
10. Show "Conversion not possible" for unsupported conversions.
11. Handle restricted pages and common error states.

### Should Have

12. Direct image selection from webpage.
13. Image metadata.
14. Duplicate filtering.
15. Small-image filtering.
16. Batch conversion.

### Nice to Have

17. ZIP download.
18. AI image categorization.
19. Compression controls.
20. Conversion history.
21. Advanced filters.
22. Theme customization.

**Important:** Nice-to-have features must never delay completion of the core extension workflow.

---

## 18. Development Timeline

### Hours 0–1

Planning, repository setup, architecture, task assignment.

### Hours 1–3

Manifest V3 extension skeleton, popup, service worker, content-script communication.

### Hours 3–6

Image extraction and metadata.

### Hours 6–9

Gallery and selection UI.

### Hours 9–13

Core PNG/JPG/WebP conversion.

### Hours 13–15

Chrome download functionality and error handling.

### Hours 15–17

Direct image selection from webpage.

### Hours 17–19

Batch conversion if the core system is stable.

### Hours 19–21

UI polish and UX improvements.

### Hours 21–22

Cross-site testing and bug fixing.

### Hours 22–23

Demo, README, presentation.

### Hours 23–24

Final testing, Git freeze, backup, submission.

---

## 19. Team Division

### Developer 1 — Extension/Core

- Manifest V3
- Chrome extension architecture
- Content scripts
- Page scanning
- Chrome APIs
- Messaging between extension components

### Developer 2 — Extension UI

- React
- TypeScript
- Tailwind
- Popup UI
- Gallery
- Selection UI
- Format picker
- Error/success states

### Developer 3 — Image Processing

- Conversion engine
- Canvas/Web APIs
- Blob handling
- Downloads
- Batch processing

### Developer 4 — AI/QA/Product

- Optional AI feature
- Testing
- Error cases
- README/PRD
- Presentation/demo
- Cross-site compatibility testing

---

## 20. Testing Checklist

### Extension

- [ ] Extension installs successfully in Chrome
- [ ] Manifest V3 is valid
- [ ] Popup opens correctly
- [ ] Service worker loads correctly
- [ ] Content script communication works
- [ ] Restricted pages are handled gracefully

### Extraction

- [ ] JPG detected
- [ ] PNG detected
- [ ] WebP detected
- [ ] GIF tested
- [ ] SVG tested
- [ ] `srcset` tested
- [ ] `<picture>` tested
- [ ] CSS background images tested where supported
- [ ] Duplicate filtering works
- [ ] Tiny-image filtering works

### Conversion

- [ ] JPG → PNG
- [ ] JPG → WebP
- [ ] PNG → JPG
- [ ] PNG → WebP
- [ ] WebP → JPG
- [ ] WebP → PNG
- [ ] Unsupported conversion handled
- [ ] Conversion failure handled
- [ ] Large-image failure handled

### Download

- [ ] Correct extension
- [ ] Correct filename
- [ ] Download succeeds
- [ ] Download does not replace the current webpage
- [ ] Batch downloads work if implemented
- [ ] ZIP download works if implemented

### Direct Selection

- [ ] Selection mode activates
- [ ] Images highlight on hover
- [ ] Clicking an image selects it
- [ ] Selection overlay is removed afterward
- [ ] Webpage remains usable
- [ ] Selection works on multiple representative websites

### UX

- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Success state
- [ ] Conversion failure state
- [ ] Restricted-page state
- [ ] Clear selected-image state

---

## 21. Demo Strategy

The ideal live demo should take less than two minutes.

1. Open an image-heavy webpage in Chrome.
2. Click the PixelShift extension icon.
3. Click **Scan Page**.
4. Show extracted images inside the extension popup.
5. Select one image.
6. Choose PNG or WebP.
7. Convert it locally.
8. Download the result.
9. Demonstrate **Select From Page**.
10. Hover over and select an image directly on the webpage.
11. Optionally show batch conversion.
12. Show the unsupported-conversion message.
13. Briefly explain that PixelShift is a Chrome extension and the core processing happens locally.

### Demo principle

The demo should visibly happen **inside Chrome using the extension**.

Do not demonstrate PixelShift as a separate website.

---

## 22. 30-Second Pitch

> Downloading an image from the web shouldn't require opening another conversion website. PixelShift is a Chrome extension that finds usable images on the page you're already viewing, lets you select exactly what you need, converts it to a supported format directly in your browser, and downloads the result. The core processing happens locally, making the workflow fast, private, and completely extension-based.

---

## 23. Final Product Definition

PixelShift is considered complete for the MVP when a user can:

```text
Open Chrome
   ↓
Open any supported webpage
   ↓
Click the PixelShift extension
   ↓
Scan the page OR select an image directly
   ↓
Choose an image
   ↓
Choose a supported output format
   ↓
Convert locally in the browser
   ↓
Download the converted image
```

The final deliverable is a **Chrome extension package/source repository** containing the Manifest V3 extension and its supporting source code.

The core product does **not** include a separate website or web application.
