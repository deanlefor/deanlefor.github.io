# Margin Maker landing page

Static HTML, CSS, and a small standalone script, served at `/margin-maker/` by
the existing GitHub Pages setup. No build step or added dependencies are needed.
The homepage integration is one Side Projects card; styles are scoped to this
directory. System fonts avoid third-party requests.

## Local preview and checks

From the website repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/margin-maker/`. Run the site's `npm test` suite,
including `tests/margin-maker.test.js`. The existing repository-wide retirement
check is `npm run check --prefix apps/fers-retirement`.

The comparison has native Before/After buttons and a labeled native range.
Arrow keys adjust it; Home and End select the endpoints. The source article is
one SVG group: it scales uniformly from 100% to 75% and moves to middle-left
on a portrait Letter page. Its text, wrapping, order, and aspect ratio stay
unchanged. There is no automatic animation. Reduced-motion preferences disable
smooth anchor scrolling and cosmetic transitions. With JavaScript disabled,
the After illustration remains visible with an explanatory note.

All article content and example annotations are synthetic. Notes illustrate
what someone could add in a separate annotation application after exporting;
Margin Maker does not create those notes. There are no file inputs, PDF
processing libraries, uploads, trackers, or storage APIs on this page.

## Approved artwork

The four icon PNGs under `assets/` are proportional, transparent downsamples of the
approved Concept C master, retrieved from the application repository at commit
`45417d189695dfedb35038d15e225530a441af1e`:

[Packaging/AppIcon/MarginMakerIcon-ConceptC-transparent.png](https://github.com/deanlefor/margin-maker/blob/45417d189695dfedb35038d15e225530a441af1e/Packaging/AppIcon/MarginMakerIcon-ConceptC-transparent.png)

The unchanged 1254 × 1254 master has SHA-256
`bdffb749f9b61757b52e0b4fc71a6ca1899263ac4774e6f7c0f708051da0a4e7`,
verified before resizing with macOS `sips`. There is no cropping, flattening,
redrawing, or color adjustment. `app-icon.png` is 256 px, `favicon.png` is
32 px, `apple-touch-icon.png` is 180 px, and `share-icon.png` is 512 px.
The social icon is metadata only and is not fetched during a normal page load.

`assets/app-screenshot.png` is the unchanged application screenshot supplied by
the project owner on November 4, 2026. It shows a demonstration PDF and the
actual macOS interface. `assets/app-screenshot.webp` is a lossless optimization
made with `cwebp -lossless -z 9 -exact -metadata icc`. Its decoded RGBA pixels and
ICC color profile were verified to match the original exactly. It reduces the
normal screenshot request from 359,227 to 112,216 bytes (68.8% smaller), with the
original PNG retained as the fallback and full-resolution link. No resizing,
recoloring, cropping, or recreation is involved.

The screenshot has its own prominent Paper & Ink section, separate from the
interactive comparison. It is lazy-loaded inside a linked `picture` element.
`screenshot.js` enhances that link with a native modal dialog, Close and Escape
support, focus restoration, and an actual-size view that scrolls independently
on small screens. Without JavaScript or native dialog support, the link opens
the original PNG normally.

## Demonstration PDF

`assets/Margin_Maker_Demonstration_Article.pdf` is the unchanged two-page Letter
PDF supplied by the project owner, titled *The Architecture of Attention*.
Its SHA-256 is `a23766ecef38d55d06be5b1e4db1aa3ed59e918f62ec27b3e8c14d3c21dca790`.
The download is a plain local link with a `download` attribute. The walkthrough
reproduces the actual application screenshot with Portrait orientation, All
pages, 75% scale, and the upper-left position. The separate SVG comparison
continues to illustrate middle-left positioning with fictional article text.
No website PDF processing or upload functionality has been added.

## Content sources

Product and installation copy was checked against the application repository's
[README](https://github.com/deanlefor/margin-maker/blob/main/README.md),
[INSTALL.md](https://github.com/deanlefor/margin-maker/blob/main/INSTALL.md), and
[v0.3.0 release notes](https://github.com/deanlefor/margin-maker/releases/tag/v0.3.0).
The download buttons use the release's exact Apple Silicon ZIP URL, not a
source archive. Keep the version, ZIP URL, compatibility disclosures, and these
references in sync when updating the page. No application or release artifacts
are maintained in this website repository.
