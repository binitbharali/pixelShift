# PixelShift --- Technical Stack

## 1. Recommended Stack

### Frontend

-   **React**
-   **TypeScript**
-   **Vite**
-   **Tailwind CSS**

### Browser Extension

-   **Chrome Extension Manifest V3**
-   **Content Scripts**
-   **Extension Service Worker**
-   **Chrome APIs**

### Image Processing

-   **Canvas API**
-   **Blob / File / URL Web APIs**
-   Optional **WebAssembly-based image-processing library** for formats
    or operations that Canvas cannot reliably handle.

### Storage

-   `chrome.storage` for small user preferences.
-   No database required for the MVP.

### Version Control

-   Git
-   GitHub

### Optional AI

-   Vision-capable AI model/API for image categorization and
    natural-language filtering.

------------------------------------------------------------------------

## 2. Why This Stack?

### React

React is useful because the extension UI has multiple states:

``` text
Idle
  ↓
Scanning
  ↓
Images Found
  ↓
Image Selected
  ↓
Converting
  ↓
Success / Error
```

React makes these states and reusable components easier to manage.

Suggested component structure:

``` text
App
├── Header
├── ScanButton
├── PageInfo
├── ImageGallery
│   └── ImageCard
├── ImageDetails
├── FormatSelector
├── ConvertButton
└── StatusMessage
```

### TypeScript

Use interfaces to keep the team aligned on data structures.

Example:

``` typescript
interface ImageData {
  url: string;
  width?: number;
  height?: number;
  format?: string;
  filename?: string;
}
```

This reduces integration mistakes between the extraction, UI, and
conversion code.

### Vite

Vite provides fast development and production builds for the React
frontend.

### Tailwind CSS

Tailwind makes it quick to create a polished hackathon UI without
spending excessive time writing custom CSS.

------------------------------------------------------------------------

## 3. Chrome Extension Architecture

The extension should use Manifest V3.

``` text
                     Chrome Browser
                           |
             +-------------+-------------+
             |                           |
             v                           v
        Popup / UI                 Current Webpage
             |                           |
             |                    Content Script
             |                           |
             +-------------+-------------+
                           |
                           v
                   Extension Messaging
                           |
                           v
                    Service Worker
                           |
                           v
                    Chrome APIs
```

------------------------------------------------------------------------

## 4. Content Script

The content script is responsible for interacting with the webpage DOM.

Initial image detection:

``` javascript
const images = document.querySelectorAll("img");
```

For each image, collect information such as:

``` javascript
{
  url: img.currentSrc || img.src,
  width: img.naturalWidth,
  height: img.naturalHeight,
  alt: img.alt
}
```

The extractor should later expand to:

-   `src`
-   `currentSrc`
-   `srcset`
-   `<picture>`
-   SVG
-   CSS `background-image`

------------------------------------------------------------------------

## 5. Image Extraction Pipeline

``` text
SCAN PAGE
    ↓
Find <img>
    ↓
Inspect currentSrc/src
    ↓
Inspect srcset
    ↓
Inspect <picture>
    ↓
Find accessible background images
    ↓
Resolve URLs
    ↓
Remove duplicates
    ↓
Read dimensions
    ↓
Filter tiny images
    ↓
Return image metadata
```

------------------------------------------------------------------------

## 6. Messaging

The content script and extension UI should communicate through extension
messaging.

Conceptually:

``` text
React Popup
    |
    | "SCAN_PAGE"
    v
Content Script
    |
    | image metadata
    v
React Popup
```

For direct page selection:

``` text
Popup
  |
  | "START_PICKER"
  v
Content Script
  |
  | Highlight hovered image
  |
  | User clicks image
  v
Selected Image
  |
  v
Popup
```

------------------------------------------------------------------------

## 7. Image Conversion Architecture

Prefer browser-side conversion.

``` text
Source Image
     ↓
Load Image
     ↓
Canvas
     ↓
canvas.toBlob()
     ↓
Blob
     ↓
Object URL
     ↓
Download
```

Example:

``` javascript
canvas.toBlob(
  (blob) => {
    // download blob
  },
  "image/png"
);
```

For JPEG:

``` javascript
canvas.toBlob(
  (blob) => {
    // download blob
  },
  "image/jpeg",
  0.9
);
```

The exact implementation should validate that the source image can be
loaded and that the target format is supported before attempting
conversion.

------------------------------------------------------------------------

## 8. SVG Strategy

SVG is vector-based and should be handled separately from raster
formats.

A practical conversion path is:

``` text
SVG
 ↓
Render SVG
 ↓
Canvas
 ↓
PNG/WebP/JPG
```

Raster → SVG is not a simple format conversion. Do not promise automatic
raster-to-vector conversion in the MVP.

For unsupported cases:

``` text
Conversion not possible.
```

------------------------------------------------------------------------

## 9. GIF Strategy

Animated GIFs require special handling because they can contain multiple
frames.

For the 24-hour MVP:

-   Preserve GIF → GIF when no conversion is required.
-   Support static-frame conversion only if the implementation is
    reliable.
-   Use a dedicated GIF decoder/encoder only if time permits.

Do not allow GIF handling to destabilize the core JPG/PNG/WebP pipeline.

------------------------------------------------------------------------

## 10. Download Architecture

The download pipeline should be:

``` text
Converted Blob
     ↓
Object URL
     ↓
Chrome Downloads API
     ↓
User's Downloads folder
```

Filename example:

``` text
photo.webp
photo.png
photo.jpg
```

The extension should update the extension based on the actual target
format.

------------------------------------------------------------------------

## 11. Batch Processing

If implemented:

``` text
Selected Images
       ↓
Conversion Queue
       ↓
Convert Image 1
       ↓
Convert Image 2
       ↓
Convert Image 3
       ↓
Results
       ↓
ZIP / Individual Downloads
```

Use a ZIP library such as JSZip only after the single-image pipeline is
stable.

------------------------------------------------------------------------

## 12. AI Architecture

AI should be optional.

``` text
Extract Images
      ↓
Generate/obtain suitable thumbnails
      ↓
Optional AI classifier
      ↓
Categories
 ├── Photo
 ├── Logo
 ├── Product
 ├── Illustration
 ├── Screenshot
 └── Other
```

Possible user experience:

``` text
Filter:
[ Photos ]

or

"Show product images"
```

The application must still work if the AI service is unavailable.

------------------------------------------------------------------------

## 13. Backend Decision

### Recommended MVP: No backend

The first version can be:

``` text
React
+
TypeScript
+
Vite
+
Tailwind
+
Manifest V3
+
Content Scripts
+
Canvas API
+
Chrome APIs
```

No:

-   database
-   authentication
-   cloud storage
-   Express server
-   image-upload server

This reduces deployment, security, CORS, and network failure risks
during the hackathon.

### Optional backend

Only add a backend if a feature genuinely needs server-side processing.

Possible future stack:

``` text
React / TypeScript
        ↓
Chrome Extension
        ↓
Node.js / Express
        ↓
Sharp
        ↓
AI API
```

------------------------------------------------------------------------

## 14. Suggested Folder Structure

``` text
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
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── styles/
│   │
│   ├── content/
│   │   ├── content.ts
│   │   └── picker.ts
│   │
│   ├── background/
│   │   └── service-worker.ts
│   │
│   ├── converter/
│   │   ├── converter.ts
│   │   └── formats.ts
│   │
│   └── utils/
│       ├── imageDetector.ts
│       ├── metadata.ts
│       └── downloader.ts
│
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

------------------------------------------------------------------------

## 15. Recommended Development Order

``` text
1. Create Vite + React + TypeScript project
2. Configure Manifest V3
3. Make popup open
4. Add content script
5. Extract <img> elements
6. Send image metadata to popup
7. Build image gallery
8. Add image selection
9. Implement JPG/PNG/WebP conversion
10. Implement download
11. Add error handling
12. Add direct page selection
13. Add srcset/picture/background-image support
14. Add batch conversion
15. Add optional AI
16. Polish UI
17. Test
18. Freeze final build
```

------------------------------------------------------------------------

## 16. MVP Technology Priority

### Must use

-   React
-   TypeScript
-   Vite
-   Manifest V3
-   Content Scripts
-   Canvas/Web APIs
-   Chrome Downloads API
-   Git

### Add if time permits

-   Tailwind CSS refinements
-   WebAssembly image library
-   JSZip
-   AI image categorization
-   Advanced filters

### Avoid initially

-   Next.js
-   MongoDB
-   Firebase
-   Authentication
-   Cloud storage
-   Complex backend
-   Custom AI model training

------------------------------------------------------------------------

## 17. Final Recommended Stack

``` text
PIXELSHIFT
│
├── UI
│   ├── React
│   ├── TypeScript
│   ├── Vite
│   └── Tailwind CSS
│
├── Browser Extension
│   ├── Manifest V3
│   ├── Content Scripts
│   ├── Service Worker
│   └── Chrome APIs
│
├── Image Processing
│   ├── Canvas API
│   ├── Blob/File APIs
│   └── Optional WebAssembly library
│
├── Storage
│   └── chrome.storage
│
├── Optional AI
│   └── Vision-capable AI API
│
└── Development
    ├── Git
    └── GitHub
```

### Core philosophy

**Build the browser-native solution first.**

The critical pipeline is:

> **Scan → Select → Convert → Download**

Everything else---including AI---is an enhancement that should only be
added after this pipeline is reliable.
