# 006 - Multi-Asset Game Standard

## Overview

The YoeltheG platform supports two game upload formats: single HTML files and multi-asset ZIP archives. This document defines the requirements and constraints for each.

---

## Single HTML Games

| Property | Value |
|----------|-------|
| File extension | `.html` or `.htm` |
| Max size | 5 MB |
| Structure | Self-contained HTML with inline CSS/JS |

Single HTML games are the simplest format. Everything (code, styles, assets as data URIs) is contained in one file.

---

## ZIP Archive Games

| Property | Value |
|----------|-------|
| File extension | `.zip` |
| Max size | 25 MB |
| Required entry | `index.html` at root level |
| Allowed contents | HTML, CSS, JS, images, audio, fonts |

### Directory Structure

A valid ZIP archive should follow this structure:

```
game.zip
  index.html          (required, root level)
  style.css           (optional)
  game.js             (optional)
  assets/
    player.png
    background.jpg
    jump.mp3
  lib/
    phaser.min.js
```

### Requirements

1. **`index.html` must be at the root level** - not inside a subfolder
2. All asset references in HTML/JS must use **relative paths** (e.g., `./assets/player.png`)
3. No absolute paths or external CDN references

---

## Security Constraints

### Blocked File Types

The following file extensions are rejected during ZIP validation:

| Extension | Type |
|-----------|------|
| `.exe`, `.com`, `.scr`, `.pif` | Windows executables |
| `.bat`, `.cmd`, `.ps1` | Windows scripts |
| `.sh` | Shell scripts |
| `.msi` | Installers |
| `.dll` | Dynamic libraries |
| `.vbs`, `.vbe`, `.wsf`, `.wsh` | Visual Basic / Windows scripts |

### Content Security Rules

HTML and JavaScript files inside ZIP archives are scanned for dangerous patterns:

| Pattern | Reason |
|---------|--------|
| `eval()` | Arbitrary code execution |
| `new Function()` | Dynamic code generation |
| `document.cookie` | Cookie theft |
| `fetch("https://...")` | External data exfiltration |
| `XMLHttpRequest` | External network requests |
| `import("https://...")` | Dynamic external module loading |
| `navigator.sendBeacon("https://...")` | Background data exfiltration |

### Additional Protections

- **No path traversal**: Entries containing `..` are rejected
- **No symlinks**: Symbolic links in ZIP archives are skipped during extraction

---

## Validation Process

1. File type check (`.html`/`.htm` or `.zip`)
2. File size check (5 MB or 25 MB limit)
3. For ZIP files:
   a. Parse and validate ZIP structure
   b. Verify `index.html` exists at root
   c. Check all entries for path traversal
   d. Check all entries for blocked file extensions
   e. Scan HTML/JS file contents for dangerous patterns
4. Extract to `/public/games/[slug]/`
5. Register in database as draft (unpublished)

If any validation step fails, the upload is rejected with a detailed error message listing all violations found.

---

## Size Limits Summary

| Format | Max Size | Notes |
|--------|----------|-------|
| Single HTML | 5 MB | Self-contained file |
| ZIP Archive | 25 MB | Includes all assets |
