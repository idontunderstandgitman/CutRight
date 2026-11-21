# CutRight (DXF Nester)

Fill a workpiece with as many copies of your DXF or STL designs as possible.
Everything runs in the browser; no files are uploaded.

## Use

Open `index.html` in a browser, or publish the folder with GitHub Pages.

## Project layout

```
index.html        page markup
css/style.css     all styles
js/               plain scripts (no build step), loaded in the order listed in index.html
  dxf-reader.js, pattern.js, stl-reader.js, zip.js, nesting.js, exporters.js   core logic (no DOM)
  dom.js, i18n.js, settings.js, pattern-list.js, stl-viewer.js, proposals.js,
  export-log.js, main.js                                                       user interface
vendor/           three.js and OrbitControls (MIT, see three.LICENSE)
```

## Development

```
npm install
npm run format   # Prettier
npm run check    # formatting + HTML validation
```

Code style follows the Google HTML/CSS style guide and the MDN HTML guidelines.
