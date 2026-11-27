/* J.A.R.V.I.S. Offline Knowledge Store — browser-only, no network requests. */
(() => {
  "use strict";
  const DB_NAME = "jarvisKnowledgeDB";
  const DB_VERSION = 1;
  const CHUNK_SIZE = 1100;
  const CHUNK_OVERLAP = 160;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  let dbPromise;

  const $ = (id) => document.getElementById(id);
  const status = (message) => { const el = $("knowledgeStatus"); if (el) el.textContent = message; };
  const openDB = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB is unavailable in this browser."));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("documents")) db.createObjectStore("documents", { keyPath: "id" });
        if (!db.objectStoreNames.contains("chunks")) {
          const store = db.createObjectStore("chunks", { keyPath: "id" });
          store.createIndex("docId", "docId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local knowledge storage."));
    });
    return dbPromise;
  };
  const transaction = async (stores, mode, action) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      try { result = action(tx); } catch (err) { reject(err); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Local storage operation failed."));
    });
  };
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const cleanText = (value) => String(value || "").replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const splitChunks = (text) => {
    const chunks = [];
    const value = cleanText(text);
    for (let start = 0; start < value.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
      const part = value.slice(start, start + CHUNK_SIZE).trim();
      if (part.length > 35) chunks.push(part);
    }
    return chunks;
  };
  async function addText(name, text, type = "note") {
    const value = cleanText(text);
    if (!value) throw new Error("This source contains no readable text.");
    const pieces = splitChunks(value);
    if (!pieces.length) throw new Error("Not enough readable text to index.");
    const id = makeId();
    const doc = { id, name: String(name || "Untitled note").slice(0, 180), type, chars: value.length, chunks: pieces.length, createdAt: Date.now() };
    await transaction(["documents", "chunks"], "readwrite", (tx) => {
      tx.objectStore("documents").put(doc);
      const store = tx.objectStore("chunks");
      pieces.forEach((text, index) => store.put({ id: `${id}:${index}`, docId: id, index, text }));
    });
    await refresh();
    return doc;
  }
  async function readFile(file) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than the 8 MB limit.`);
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "md", "markdown"].includes(ext)) {
      if (ext === "pdf") throw new Error("PDF extraction is not installed yet. This offline build currently accepts TXT and Markdown files.");
      throw new Error("Unsupported file. Please choose a TXT or Markdown file.");
    }
    const text = await file.text();
    return addText(file.name, text, "file");
  }
  async function listDocuments() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction("documents", "readonly").objectStore("documents").getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  }
  async function listChunks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction("chunks", "readonly").objectStore("chunks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  const tokens = (text) => cleanText(text).toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  const STOP = new Set(["the","and","for","with","that","this","what","when","where","which","who","how","are","was","were","from","into","your","you","about","does","did","can","could","would","should","have","has","had","tell","explain","please","jarvis"]);
  async function search(query, limit = 4) {
    const terms = [...new Set(tokens(query).filter((t) => !STOP.has(t)))];
    if (!terms.length) return [];
    const [chunks, docs] = await Promise.all([listChunks(), listDocuments()]);
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const scored = chunks.map((chunk) => {
      const text = chunk.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        const hits = text.split(term).length - 1;
        if (hits) score += Math.min(hits, 4) * (term.length > 5 ? 2 : 1);
      }
      if (text.includes(query.toLowerCase().trim())) score += 5;
      return { ...chunk, score, source: docMap.get(chunk.docId)?.name || "Unknown source" };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
    return scored;
  }
  async function answer(query) {
    const hits = await search(query, 3);
    if (!hits.length) return "";
    const excerpts = hits.slice(0, 2).map((hit) => `${hit.source}: ${hit.text.slice(0, 360)}`);
    return `I found this in your local knowledge base. ${excerpts.join(". ")}`.slice(0, 760);
  }
  async function removeDocument(id) {
    await transaction(["documents", "chunks"], "readwrite", (tx) => {
      tx.objectStore("documents").delete(id);
      const store = tx.objectStore("chunks");
      const req = store.index("docId").openCursor(IDBKeyRange.only(id));
      req.onsuccess = () => { const cursor = req.result; if (cursor) { cursor.delete(); cursor.continue(); } };
    });
    await refresh();
  }
  async function renderResults(query) {
    const host = $("knowledgeResults");
    if (!host) return;
    host.textContent = "Searching local sources...";
    try {
      const hits = await search(query, 5);
      host.replaceChildren();
      if (!hits.length) { host.textContent = "No matching passages found. Add a document or note containing this topic."; return; }
      hits.forEach((hit) => {
        const item = document.createElement("div"); item.className = "knowledge-result";
        const source = document.createElement("div"); source.className = "knowledge-source"; source.textContent = `${hit.source} · MATCH ${hit.score}`;
        const passage = document.createElement("div"); passage.textContent = hit.text;
        item.append(source, passage); host.appendChild(item);
      });
    } catch (err) { host.textContent = err.message; }
  }
  async function refresh() {
    const host = $("knowledgeDocuments");
    if (!host) return;
    try {
      const docs = await listDocuments();
      $("knowledgeCount").textContent = String(docs.length);
      host.replaceChildren();
      if (!docs.length) { host.textContent = "No sources stored yet."; return; }
      docs.forEach((doc) => {
        const row = document.createElement("div"); row.className = "knowledge-document";
        const name = document.createElement("span"); name.className = "knowledge-document-name";
        name.textContent = `${doc.name} · ${doc.chunks} chunks`;
        const del = document.createElement("button"); del.className = "knowledge-delete"; del.type = "button"; del.textContent = "DELETE";
        del.addEventListener("click", async () => { if (!confirm(`Delete ${doc.name} from local knowledge?`)) return; await removeDocument(doc.id); });
        row.append(name, del); host.appendChild(row);
      });
    } catch (err) { status("STORAGE ERROR"); host.textContent = err.message; }
  }
  async function init() {
    const files = $("knowledgeFiles");
    files?.addEventListener("change", async () => {
      const selected = [...(files.files || [])];
      if (!selected.length) return;
      status("IMPORTING");
      for (const file of selected) {
        try { await readFile(file); status("SAVED LOCALLY"); }
        catch (err) { const out = $("knowledgeResults"); if (out) out.textContent = `${file.name}: ${err.message}`; status("IMPORT ERROR"); }
      }
      files.value = "";
    });
    $("saveKnowledgeNote")?.addEventListener("click", async () => {
      const note = $("knowledgeNote").value.trim();
      if (!note) { status("ADD A NOTE"); return; }
      try { status("SAVING"); await addText(`Note ${new Date().toLocaleString()}`, note, "note"); $("knowledgeNote").value = ""; status("SAVED LOCALLY"); $("knowledgeResults").textContent = "Your note is stored on this device."; }
      catch (err) { status("SAVE ERROR"); $("knowledgeResults").textContent = err.message; }
    });
    const runSearch = () => { const query = $("knowledgeSearch")?.value.trim(); if (query) renderResults(query); };
    $("runKnowledgeSearch")?.addEventListener("click", runSearch);
    $("knowledgeSearch")?.addEventListener("keydown", (event) => { if (event.key === "Enter") runSearch(); });
    try { await openDB(); await refresh(); status("LOCAL READY"); }
    catch (err) { status("DB ERROR"); const out = $("knowledgeResults"); if (out) out.textContent = err.message; }
  }
  window.JarvisKnowledge = { addText, search, answer, refresh };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
