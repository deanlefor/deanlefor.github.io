# SheetJS Community Edition

The Excel export uses the locally hosted **0.20.3 mini build**, downloaded from
the publisher's [official distribution](https://cdn.sheetjs.com/).
It runs on the device and is included in the app's offline cache.

- Source: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js
- SHA-256: `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`
- License: [Apache 2.0](SheetJS-LICENSE.txt), included from the official package.
- Integration: [standalone browser scripts](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)

## PDF reports

PDF reports use the official **pdfmake 0.3.11** browser build and its bundled
Roboto fonts. Both are hosted locally and cached for offline use. They do not
send sales data to the publisher or a PDF service.

- Package: https://registry.npmjs.org/pdfmake/-/pdfmake-0.3.11.tgz
- Verified package integrity: `sha512-Uc49J9hUMyuqJk+U+PxlpBpPr96A4HOOfesGx609EPr2ue82+5/Smq/KTAkEqh0/jUGSi1fumvqZ5yAWijJTJg==`
- `pdfmake.min.js` SHA-256: `faaee53f8dcf48b0934553665809d8180e20e435b654f633df2f18f9dbdeaa88`
- `vfs_fonts.js` SHA-256: `1483ed267fe00ad90a3834441b019d856dd41ed079b2614404b2fcef425db6fc`
- pdfmake license: [MIT](pdfmake-LICENSE.txt), from the official package.
- Roboto license: [Apache 2.0](Roboto-LICENSE.txt), from https://github.com/googlefonts/roboto/blob/main/LICENSE
- Integration: https://pdfmake.github.io/docs/0.3/getting-started/client-side/

Keep the downloaded files unchanged. No personal exports or backups belong here.
