// SUNO — End‑to‑end “Create → Observe → Download” with full dynamic‑DOM resilience.
// Works on the page that shows the left Create panel and the right “My Workspace” list.
// Paste once in DevTools Console, press Enter, keep the tab focused.
// Requirements: allow automatic downloads for suno.com; disable “Ask where to save each file”.

(() => {
  // ====================== CONFIG ======================
  const CFG = {
    // Creation inputs
    songTitle: 'My New Song',
    stylesToAdd: ['Pop', 'Upbeat', 'Inspirational'],
    lyricsText: `Write a song about following your dreams and never giving up.
Make it uplifting and motivational with verses and a catchy chorus.`,

    // Timing (tuned for dynamic UI/mutation bursts)
    waitBetweenStyleMs: 220,
    createRetries: 60,
    createRetryDelay: 250,
    observeMs: 12 * 60 * 1000,
    retryWait: 250,
    maxRetries: 120,
    waitAfterMenu: 500,
    waitAfterClick: 600,

    // Behavior
    SKIP_PREVIEW_ROWS: false,     // attempt Preview/Upgrade rows too (set true to skip)
    saveLyricsTxt: false,         // also save lyrics if visible
    maxDownloadsPerRun: 9999      // optional cap per session
  };

  // ====================== HELPERS (robust to dynamic nodes) ======================
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isElem = n => n && n.nodeType === 1;
  const visible = el => !!(el && el.offsetParent);
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  async function waitFor(fn, tries=CFG.maxRetries, delay=CFG.retryWait) {
    for (let i=0; i<tries; i++) {
      try {
        const v = fn();
        if (v) return v;
      } catch {}
      await sleep(delay);
    }
    return null;
  }

  function safeScrollIntoView(el) {
    if (isElem(el) && typeof el.scrollIntoView === 'function') {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    }
  }

  function safeClick(el) {
    if (!isElem(el)) return false;
    try { el.click(); return true; } catch { return false; }
  }

  function setReactValue(el, value) {
    if (!isElem(el)) return;
    try {
      const tag = el.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value');
        if (setter && setter.set) setter.set.call(el, value);
        else el.value = value;
      } else {
        el.innerText = value;
      }
    } catch { el.value = value; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function downloadTextFile(text, filename) {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch { return false; }
  }

  // ====================== CREATION (left panel; tolerant selectors) ======================
  function findCreatePanel() {
    // Any container subtree that contains a visible “Create” button
    return qsa('aside,div,section').find(p =>
      qsa('button,[role="button"]', p).some(b => visible(b) && (b.textContent||'').trim().toLowerCase()==='create')
    ) || document.body;
  }
  function findCreateButton(panel) {
    return qsa('button,[role="button"]', panel).find(b => visible(b) && (b.textContent||'').trim().toLowerCase()==='create');
  }
  function findTitleInput(panel) {
    return qs('input[placeholder*="song title" i], input[aria-label*="song title" i]', panel)
        || qs('input[type="text"]', panel);
  }
  function findStylesInput(panel) {
    return qs('input[placeholder*="style" i], textarea[placeholder*="style" i]', panel)
        || qs('input[aria-label*="style" i], textarea[aria-label*="style" i]', panel);
  }
  function findLyricsInput(panel) {
    return qs('textarea[placeholder*="write your lyrics" i], textarea[placeholder*="add your own lyrics" i], textarea[data-testid*="lyrics" i]', panel)
        || qs('textarea', panel);
  }

  async function addStylesAsChips(inputEl, styles) {
    if (!isElem(inputEl)) return;
    inputEl.focus();
    for (const s of styles) {
      setReactValue(inputEl, s);
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true }));
      await sleep(CFG.waitBetweenStyleMs);
    }
  }

  async function createSong() {
    const panel = findCreatePanel();

    const title = findTitleInput(panel);
    if (title) setReactValue(title, CFG.songTitle);

    const styles = findStylesInput(panel);
    if (styles) await addStylesAsChips(styles, CFG.stylesToAdd);

    const lyr = findLyricsInput(panel);
    if (lyr) setReactValue(lyr, CFG.lyricsText);

    for (let i=0; i<CFG.createRetries; i++) {
      const btn = findCreateButton(panel);
      if (btn) {
        safeScrollIntoView(btn);
        await sleep(120);
        if (safeClick(btn)) {
          console.log('Create clicked.');
          return true;
        }
      }
      await sleep(CFG.createRetryDelay);
    }
    console.warn('Create button not found/visible.');
    return false;
  }

  // ====================== WORKSPACE (right list; dynamic) ======================
  function findSongListContainer() {
    // Most robust chain from your screenshots
    return qs('div.custom-scrollbar-transparent.overflow-y-auto')
        || qs('div[class*="custom-scrollbar-transparent"][class*="overflow-y-auto"]')
        || qs('main div[class*="overflow-y-auto"]');
  }
  function getSongRows(container) {
    // Both variants observed in your DOM
    return qsa('div.react-aria-GridListItem[role="row"], div.react-aria-GridItem[role="row"]', container);
  }
  function rowTitleText(row) {
    const lines = (row.innerText||'').split('\n').map(s=>s.trim()).filter(Boolean);
    return lines[0] || 'Song';
  }
  function rowIsExplicitPreview(row) {
    const t = (row.innerText||'').toLowerCase();
    return t.includes('preview') || t.includes('upgrade for full song') || t.includes('v4.5+');
  }

  // Robust “three-dot” finder: resolves to actual clickable button even if inner SVG is hit.
  function findThreeDotMenu(row) {
    // Collect everything that can act like a menu trigger in dynamic UIs
    const raw = qsa('button,[role="button"],[aria-haspopup="menu"]', row);
    const visibleRightmost = raw.filter(visible).reverse(); // prefer right edge

    // Score candidates; tolerate text/icon/aria variance
    const scored = visibleRightmost.map(el => {
      const txt  = (el.textContent || '').trim().toLowerCase();
      const aria = ((el.getAttribute('aria-label') || el.getAttribute('title')) || '').toLowerCase();
      let s = 0;
      if (el.tagName === 'BUTTON') s += 4;
      if (!txt) s += 3;                          // icon-only; often kebab
      if (txt.includes('⋯') || txt.includes('...')) s += 2;
      if (aria.includes('more') || aria.includes('menu') || aria.includes('options')) s += 2;
      s += 1;                                    // slight rightmost bias
      return { el, s };
    }).sort((a,b) => b.s - a.s);

    let best = scored[0]?.el || null;
    if (best && best.tagName !== 'BUTTON') {
      const ancestor = best.closest('button,[role="button"],[aria-haspopup="menu"]');
      if (ancestor) best = ancestor;
    }
    return best;
  }

  // ====================== LYRICS (optional) ======================
  function tryExtractLyrics() {
    const sels = [
      'span.whitespace-pre-wrap',
      '[data-testid*="lyrics" i]',
      '.lyrics-container',
      '.song-lyrics',
      'div[class*="lyrics"]',
      'span[class*="lyrics"]'
    ];
    for (const sel of sels) {
      const el = qs(sel);
      if (el && visible(el)) {
        const t = (el.innerText||'').trim();
        if (t && t.length>50) return t;
      }
    }
    return null;
  }

  // ====================== DOWNLOAD FLOW (self-healing, dynamic) ======================
  async function clickRowMenu(row) {
    // some UIs reveal actions only on hover
    try { row.dispatchEvent(new MouseEvent('mouseover', { bubbles:true })); } catch {}
    const btn = findThreeDotMenu(row);
    if (!btn) return false;

    safeScrollIntoView(btn);
    await sleep(120);

    // Try the button; if menu not opened, try inner SVG/span
    safeClick(btn);
    await sleep(CFG.waitAfterMenu);

    const menuOpen = document.querySelector('[role="menu"],[data-radix-menu-content],[data-state="open"]');
    if (!menuOpen) {
      const inner = btn.querySelector('svg, path, span, div');
      if (inner) safeClick(inner);
      await sleep(CFG.waitAfterMenu);
    }
    return true;
  }

  async function clickDownloadInMenu() {
    const item = await waitFor(() =>
      qsa('button,[role="menuitem"],[role="option"],div,span,li').find(el =>
        visible(el) && (el.textContent||'').trim().toLowerCase()==='download'
      )
    );
    if (!item) return false;
    safeScrollIntoView(item);
    safeClick(item);
    await sleep(CFG.waitAfterClick);
    return true;
  }

  async function clickFormatMP3() {
    const mp3 = await waitFor(() =>
      qsa('div[role="menuitem"],button,[role="option"],li').find(el =>
        visible(el) && (el.textContent||'').trim().toLowerCase()==='mp3 audio'
      )
    );
    if (!mp3) return false;
    safeScrollIntoView(mp3);
    safeClick(mp3);
    await sleep(500); // allow modal/anchor to appear in async UIs
    return true;
  }

  async function clickDownloadAnywayIfPresent() {
    const btn = await waitFor(() =>
      qsa('button,[role="button"],div,a').find(el =>
        visible(el) && (el.textContent||'').trim().toLowerCase()==='download anyway'
      ),
      60, 200
    );
    if (!btn) return false;
    safeScrollIntoView(btn);
    safeClick(btn);
    await sleep(150);
    return true;
  }

  async function finalizeDownload() {
    // aggressively look for any real download trigger that appears dynamically
    const tryNow = async () => {
      // 1) a[download]
      let a = qsa('a[download]').find(visible);
      if (a) { safeClick(a); return true; }
      // 2) Buttons named Download/Save
      const btn = qsa('button,[role="button"],a').find(el =>
        visible(el) && /^(download|save)\b/i.test((el.textContent||'').trim())
      );
      if (btn) { safeClick(btn); return true; }
      // 3) visible blob/data anchor
      a = qsa('a[href^="blob:"],a[href^="data:audio"]').find(visible);
      if (a) { safeClick(a); return true; }
      return false;
    };

    if (await tryNow()) return true;

    // 3s tight polling window; covers late insertion & React reflows
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline) {
      if (await tryNow()) return true;
      await sleep(90);
    }

    // 4) last resort: any blob/data anchor even if hidden
    const any = qsa('a[href^="blob:"],a[href^="data:audio"]')[0];
    if (any) {
      const tmp = document.createElement('a');
      tmp.href = any.href;
      tmp.download = 'suno_track.mp3';
      document.body.appendChild(tmp);
      safeClick(tmp);
      document.body.removeChild(tmp);
      return true;
    }
    return false;
  }

  async function downloadRowMP3(row) {
    const title = rowTitleText(row);

    if (!(await clickRowMenu(row))) { console.log('Menu not found:', title); return false; }
    if (!(await clickDownloadInMenu())) { document.body.click(); return false; }
    if (!(await clickFormatMP3())) { document.body.click(); return false; }

    await clickDownloadAnywayIfPresent();

    const done = await finalizeDownload();
    console.log(done
      ? `MP3 download triggered for: ${title}`
      : `Attempted MP3 for: ${title} — no final anchor/button detected (check browser download permissions)`);

    await sleep(180);
    document.body.click();
    return done;
  }

  // ====================== DEDUP, IDENTITY & OBSERVER (dynamic/async) ======================
  const PROCESSED_IDS = new Set();
  const SEEN_ROWS = new WeakSet();
  let downloadsCount = 0;

  function rowStableId(row) {
    // Prefer react-aria label for true identity across re-renders
    const aria = row.getAttribute('aria-label');
    if (aria && aria.trim()) return `aria:${aria.trim()}`;
    // Fallback: title + optional duration (ok with dynamic positions)
    const txt = (row.innerText || '').trim();
    const dur = (txt.match(/\b\d+:\d{2}\b/) || [''])[0] || '';
    const title = (txt.split('\n')[0] || '').slice(0, 160);
    return `txt:${title}|dur:${dur}`;
  }

  function okToProcess(row) {
    if (CFG.SKIP_PREVIEW_ROWS && rowIsExplicitPreview(row)) return false;
    return true; // no duration requirement
  }

  async function processRow(row) {
    if (!isElem(row) || SEEN_ROWS.has(row)) return;
    SEEN_ROWS.add(row);

    if (!okToProcess(row)) return;
    const id = rowStableId(row);
    if (PROCESSED_IDS.has(id)) return;

    PROCESSED_IDS.add(id);
    row.dataset.processed = 'true';

    if (downloadsCount >= CFG.maxDownloadsPerRun) return;

    try {
      const ok = await downloadRowMP3(row);
      if (ok) downloadsCount++;

      if (CFG.saveLyricsTxt) {
        const lyrics = tryExtractLyrics();
        if (lyrics) {
          const safe = rowTitleText(row).replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
          downloadTextFile(lyrics, `${safe || 'Song'}_lyrics.txt`);
        }
      }
    } catch (e) {
      console.warn('Download error for', id, e);
    }
  }

  function setupObserver(container, onRow) {
    // Observe only additions; ignore attribute/text churn to avoid noise
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type !== 'childList' || !m.addedNodes.length) continue;

        // Debounce bursts: group new rows this tick
        const batch = [];
        for (const node of m.addedNodes) {
          if (!isElem(node)) continue;

          if (node.matches?.('div.react-aria-GridListItem[role="row"], div.react-aria-GridItem[role="row"]')) {
            batch.push(node);
          }
          const nested = node.querySelectorAll?.('div.react-aria-GridListItem[role="row"], div.react-aria-GridItem[role="row"]');
          if (nested && nested.length) batch.push(...nested);
        }

        if (batch.length) {
          // Process in microtask to let layout stabilize
          queueMicrotask(() => batch.forEach(onRow));
        }
      }
    });
    obs.observe(container, { childList:true, subtree:true });
    return obs;
  }

  // ====================== MAIN ======================
  (async () => {
    console.log('Suno: Create → Observe → Download (dynamic‑robust) starting…');

    // 1) Create once via left panel
    await createSong();

    // 2) Find the right list container and set up an observer tolerant to dynamic DOM
    const container = await waitFor(() => findSongListContainer(), 80, 200);
    if (!container) { console.error('Song list container not found. Ensure the right-hand list is visible.'); return; }

    const observer = setupObserver(container, processRow);

    // 3) Initial pass on already visible rows
    getSongRows(container).forEach(processRow);

    // 4) Run long enough to catch the new song + subsequent appends
    await sleep(CFG.observeMs);

    observer.disconnect();
    console.log('Automation complete / observer disconnected. Downloads:', downloadsCount);
  })();
})();
