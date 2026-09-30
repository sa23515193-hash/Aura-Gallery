# AuraGallery — CodeAlpha Task 1 (Enhanced)

A premium, phone-gallery-inspired frontend project built with **HTML, CSS and vanilla JavaScript**.

## Features
- Premium responsive navbar
- Search photos
- Sidebar library navigation
- All Photos / Favorites / Recently Added / Screenshots / Recycle Bin
- Create new albums
- Add selected photos to albums
- Select multiple photos
- Favorite/unfavorite photos
- Move photos to Recycle Bin
- Restore photos
- Permanently delete photos
- Full-screen lightbox
- Previous/Next image navigation
- Download button
- Keyboard navigation
- Grid/List view
- Dark mode
- Mobile sidebar
- Local image upload
- Responsive mobile/desktop layout
- No npm, no framework, no backend

## IMPORTANT: Real PNG/JPG photo path

The project has this folder structure:

```text
assets/
└── photos/
    ├── nature/
    ├── city/
    ├── travel/
    ├── architecture/
    └── flowers/
```

Put your real images inside these folders, for example:

```text
assets/photos/nature/mountain-morning.png
assets/photos/nature/forest-trail.png
assets/photos/city/city-lights.png
assets/photos/travel/ocean-escape.png
assets/photos/travel/sunset-beach.png
assets/photos/architecture/modern-lines.png
assets/photos/flowers/color-garden.png
```

Then open `gallery.json` and update the `path` for each image. **Use PNG/JPG/WebP; PNG is recommended for your assignment.**

### Why is there also a `remote` field?
The starter gallery uses real Unsplash photographs as online previews, so the project looks complete immediately. When you add your own local PNG files, the app's `path` is preferred automatically.

## Run
Just double-click `index.html`.

For best results with `fetch("gallery.json")`, use VS Code Live Server. GitHub Pages works directly after upload.

## GitHub Pages
Because this is a plain static website:
1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, `gallery.json`, and `assets`.
3. Settings → Pages.
4. Deploy from `main` branch and `/ (root)` folder.

## CodeAlpha submission
Suggested repository:
`CodeAlpha_Task1_Image_Gallery`

Suggested live project name:
**AuraGallery — Smart Photo Library**

## Photo credits
The starter remote previews use photographs from Unsplash. Their source/author information is recorded in `gallery.json`. Replace them with your own PNGs if you want the final submission to contain only your own images.
