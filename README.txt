J.A.R.V.I.S. OFFLINE KNOWLEDGE CENTER — STAGE 1

FILES
- index.html: updated interface with the Knowledge Center panel
- style.css: styles for the new panel
- script.js: existing command router updated to search local knowledge first
- knowledge.js: IndexedDB document/note storage and offline keyword search

INSTALL
1. Make a backup of your current J.A.R.V.I.S. project folder.
2. Copy these four files into the same folder as your existing project, replacing index.html, style.css and script.js, and adding knowledge.js.
3. Keep your existing manifest.json, icon.svg, service worker, and any other project assets.
4. Open the project through the same local web server / Acode preview method you currently use. IndexedDB needs a browser origin; file:// mode may not persist consistently.
5. Open KNOWLEDGE CENTER, upload TXT or Markdown files, or save notes.
6. Search from the panel, or use commands such as:
   - search knowledge for photosynthesis
   - ask my documents explain Python lists
   - what is machine learning (local sources are checked first)

CURRENT LIMITS
- This is Stage 1: offline document storage and keyword retrieval. It does not yet generate new answers with a local language model.
- This build accepts TXT and Markdown files. PDF extraction is not included yet because the PDF.js library and worker have not been bundled locally.
- If no matching local information is found and the device is online, existing Wikipedia/Gemini behavior may still run. When offline, J.A.R.V.I.S. reports that the local knowledge base has no matching passage.
- Google features, weather, Wikipedia, and Gemini remain online-dependent features in the existing app.
- Knowledge data is stored in this browser's IndexedDB on this device. Clearing site data can erase it. Export/backup is a later feature.

NEXT STAGE
Add a local PDF.js library for offline PDF extraction, then connect a small quantized local language model through an Android local runtime. The 8 GB RAM device should start with a 1B–3B 4-bit model and be benchmarked before attempting larger models.
