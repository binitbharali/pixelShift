# PixelShift --- Product Requirements Document

## 1. Product Overview

**Product:** PixelShift\
**Type:** Browser extension\
**Hackathon:** AI HACKS\
**Duration:** 24 hours

PixelShift is a Chrome/Chromium browser extension that lets users
extract images from webpages, select an image, convert it into a
supported format, and download it without needing an external
image-conversion website.

### Product vision

> Any image. Any webpage. One click to the format you need.

------------------------------------------------------------------------

## 2. Problem Statement

Users often need to save an image from a webpage in a different format.
The usual workflow is:

1.  Save the image.
2.  Open an external image-conversion website.
3.  Upload the image.
4.  Select the desired format.
5.  Convert it.
6.  Download the result.

This is slow, repetitive, and inconvenient.

PixelShift combines image extraction and conversion directly inside the
browser.

------------------------------------------------------------------------

## 3. Target Users

-   Students
-   Developers
-   Designers
-   Content creators
-   Researchers
-   General web users

------------------------------------------------------------------------

## 4. Goals

The MVP must:

-   Scan the current webpage for images.
-   Display extracted images in a gallery.
-   Allow the user to select an image.
-   Show useful image metadata where available.
-   Allow the user to choose a target format.
-   Convert supported image formats.
-   Download the converted image.
-   Clearly display **"Conversion not possible."** when a requested
    conversion cannot be performed.
-   Prefer local/browser-side processing for privacy.

------------------------------------------------------------------------

## 5. Non-Goals

The MVP will not attempt to:

-   Replace Photoshop or a full image editor.
-   Provide permanent cloud image storage.
-   Require user accounts.
-   Build a social platform.
-   Guarantee extraction from every website.
-   Bypass website access controls or protected content.
-   Implement advanced raster-to-vector reconstruction.
-   Support every possible image format.

------------------------------------------------------------------------

## 6. Core User Flows

### Flow A --- Scan and convert

Open webpage → Open PixelShift → Scan Page → Browse images → Select
image → Choose format → Convert → Download.

### Flow B --- Direct page selection

Open PixelShift → Select From Page → Hover over an image → Image is
highlighted → Click image → Choose format → Convert → Download.

### Flow C --- Batch conversion

Scan Page → Select multiple images → Choose target format → Convert All
→ Download individually or as ZIP.

------------------------------------------------------------------------

## 7. Functional Requirements

### FR-01 --- Page scanning

The user shall be able to scan the active webpage.

### FR-02 --- Image extraction

The extension should detect, where technically feasible:

-   `<img>` elements
-   `src` URLs
-   responsive `srcset`
-   `<picture>` sources
-   SVG images
-   CSS background images

### FR-03 --- Image metadata

Display available:

-   Filename
-   Source format
-   Width
-   Height
-   File size, when obtainable
-   Source URL

### FR-04 --- Image preview

Every detected image should appear as a thumbnail/card.

### FR-05 --- Image selection

Users can select one or more images from the extension gallery.

### FR-06 --- Direct image selection

Users can activate a page-selection mode and click an image directly on
the webpage.

### FR-07 --- Format selection

Initial target formats:

-   JPG/JPEG
-   PNG
-   WebP
-   GIF where supported
-   SVG only where technically feasible

The UI should avoid offering conversions that the conversion engine
cannot reliably perform.

### FR-08 --- Conversion

Supported raster conversions should preferably happen locally in the
browser using browser APIs and/or WebAssembly-based processing.

### FR-09 --- Unsupported conversion

If conversion cannot be performed, show:

> Conversion not possible.

The extension should not silently fail.

### FR-10 --- Download

The user can download the converted file with an appropriate filename
and extension.

### FR-11 --- Duplicate filtering

Duplicate image URLs should be removed from the displayed results.

### FR-12 --- Small-image filtering

Provide an optional minimum-dimension filter to reduce noise from tiny
icons and tracking pixels.

### FR-13 --- Batch conversion

If time permits, users can select multiple images and convert them to
the same target format.

### FR-14 --- ZIP download

If batch conversion is implemented, provide an optional ZIP download.

------------------------------------------------------------------------

## 8. Non-Functional Requirements

### Performance

-   Page scanning should complete quickly on normal webpages.
-   UI should remain responsive during conversion.
-   Large images should not freeze the popup.

### Privacy

-   Prefer local image processing.
-   Do not upload images to a server unless a future feature explicitly
    requires it.
-   Do not store extracted images permanently.

### Reliability

-   Failed image loads must not crash the extension.
-   Failed conversions must produce a clear error state.
-   Unsupported formats must be handled gracefully.

### Usability

A first-time user should understand the main workflow without
documentation.

------------------------------------------------------------------------

## 9. Proposed Architecture

``` text
                         WEB PAGE
                            |
                            v
                    +---------------+
                    | Content Script|
                    | Image Detection|
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | Image Manager |
                    | Filter        |
                    | Deduplicate   |
                    | Metadata      |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | React UI      |
                    | Gallery       |
                    | Selection     |
                    | Format Picker |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | Conversion    |
                    | Engine        |
                    | Canvas / WASM |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | Download      |
                    | Manager       |
                    +---------------+
```

------------------------------------------------------------------------

## 10. Suggested Project Structure

``` text
pixelshift/
├── source/
│   ├── PRD.md
│   └── TECH_STACK.md
├── public/
│   └── icons/
├── src/
│   ├── popup/
│   ├── content/
│   ├── background/
│   ├── converter/
│   └── utils/
├── manifest.json
├── package.json
└── README.md
```

------------------------------------------------------------------------

## 11. Error States

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

------------------------------------------------------------------------

## 12. Optional AI Feature

AI should be an enhancement, not a dependency of the core product.

### Smart Image Categorization

Extracted images can optionally be categorized as:

-   Photos
-   Logos
-   Illustrations
-   Product images
-   Screenshots
-   Other

Users could then filter the gallery using natural language or
categories.

Example:

> Show me all product images.

The core extraction and conversion pipeline must continue to work if the
AI feature is unavailable.

------------------------------------------------------------------------

## 13. 24-Hour MVP Priorities

### Must Have

1.  Browser extension works.
2.  Scan current page.
3.  Extract images.
4.  Display image gallery.
5.  Select an image.
6.  Choose format.
7.  Convert common raster formats.
8.  Download result.
9.  Show "Conversion not possible" for unsupported conversions.

### Should Have

10. Direct image selection.
11. Image metadata.
12. Duplicate filtering.
13. Small-image filtering.
14. Batch conversion.

### Nice to Have

15. ZIP download.
16. AI image categorization.
17. Compression controls.
18. Conversion history.
19. Advanced filters.
20. Theme customization.

------------------------------------------------------------------------

## 14. Development Timeline

### Hours 0--1

Planning, repository setup, architecture, task assignment.

### Hours 1--3

Manifest V3 extension skeleton and popup.

### Hours 3--6

Image extraction and metadata.

### Hours 6--9

Gallery and selection UI.

### Hours 9--13

Core PNG/JPG/WebP conversion.

### Hours 13--15

Download functionality and error handling.

### Hours 15--17

Direct image selection from webpage.

### Hours 17--19

Batch conversion if core system is stable.

### Hours 19--21

UI polish and UX improvements.

### Hours 21--22

Cross-site testing and bug fixing.

### Hours 22--23

Demo, README, presentation.

### Hours 23--24

Final testing, Git freeze, backup, submission.

------------------------------------------------------------------------

## 15. Team Division

### Developer 1 --- Extension/Core

-   Manifest V3
-   Content scripts
-   Page scanning
-   Chrome APIs

### Developer 2 --- Frontend

-   React
-   TypeScript
-   Tailwind
-   Gallery
-   Selection UI

### Developer 3 --- Image Processing

-   Conversion engine
-   Canvas/Web APIs
-   Blob handling
-   Downloads
-   Batch processing

### Developer 4 --- AI/QA/Product

-   Optional AI feature
-   Testing
-   Error cases
-   README/PDR
-   Presentation/demo

------------------------------------------------------------------------

## 16. Testing Checklist

### Extraction

-   [ ] JPG detected
-   [ ] PNG detected
-   [ ] WebP detected
-   [ ] GIF tested
-   [ ] SVG tested
-   [ ] `srcset` tested
-   [ ] `<picture>` tested
-   [ ] Duplicate filtering works
-   [ ] Tiny-image filtering works

### Conversion

-   [ ] JPG → PNG
-   [ ] JPG → WebP
-   [ ] PNG → JPG
-   [ ] PNG → WebP
-   [ ] WebP → JPG
-   [ ] WebP → PNG
-   [ ] Unsupported conversion handled

### Download

-   [ ] Correct extension
-   [ ] Correct filename
-   [ ] Download succeeds
-   [ ] Batch downloads work if implemented

### UX

-   [ ] Loading state
-   [ ] Empty state
-   [ ] Error state
-   [ ] Success state
-   [ ] Conversion failure state

------------------------------------------------------------------------

## 17. Demo Strategy

The ideal live demo should take less than two minutes:

1.  Open an image-heavy webpage.
2.  Open PixelShift.
3.  Click **Scan Page**.
4.  Show extracted images.
5.  Select one image.
6.  Convert WebP → PNG or PNG → WebP.
7.  Download it.
8.  Demonstrate **Select From Page**.
9.  Optionally show batch conversion.
10. Show the unsupported-conversion message.
11. Briefly explain local processing and the optional AI enhancement.

### 30-second pitch

> Downloading an image from the web shouldn't require three different
> tools. PixelShift is a browser extension that finds images on a
> webpage, lets you select exactly what you need, converts it to a
> supported format, and downloads it directly inside your browser. The
> core processing happens locally, keeping the workflow fast and
> privacy-friendly.
