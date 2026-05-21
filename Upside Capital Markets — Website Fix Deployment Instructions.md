# Upside Capital Markets — Website Fix Deployment Instructions

## What Was Wrong
The website's `index.html` was pointing to a broken/expired temporary URL (`http://kmdxdkua.manus.space`), causing a completely blank white page for all visitors.

## What's in This Package
This ZIP contains the complete, self-contained website:

```
ucm_fix_deploy.zip
├── index.html          ← Main page (replaces the broken one)
├── favicon.ico         ← Site icon
└── assets/
    ├── index.css       ← All styles
    └── index.js        ← All site functionality
```

## How to Deploy via GoDaddy File Manager

### Step 1 — Log in to GoDaddy
1. Go to https://www.godaddy.com and sign in
2. Click **My Products** in the top menu

### Step 2 — Open File Manager
1. Find your **Web Hosting** plan for `upsidecapitalmarkets.com`
2. Click **Manage** → then open **cPanel**
3. In cPanel, click **File Manager**
4. Navigate to the `public_html` folder

### Step 3 — Upload the Files
1. **Delete** (or rename as backup) the existing `index.html` in `public_html`
2. Upload `index.html` from this package to `public_html`
3. Create a folder called `assets` inside `public_html` (if it doesn't exist)
4. Upload `assets/index.css` and `assets/index.js` into the `assets` folder
5. Upload `favicon.ico` to `public_html`

### Final Folder Structure in public_html
```
public_html/
├── index.html
├── favicon.ico
└── assets/
    ├── index.css
    └── index.js
```

### Step 4 — Verify
Visit https://www.upsidecapitalmarkets.com — the full website should now load correctly.

---
*Fix prepared by Manus on May 13, 2026*
