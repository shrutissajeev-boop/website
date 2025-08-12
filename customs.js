(async () => {
  const cfg = {
    songTitle: 'Java Dreams',
    whichToInsert: 'describe', // 'describe' or 'lyrics'
    describePrompt: `Write a chill, deep-voiced song about Friday night lights. Tone: nostalgic, intimate, slightly melancholic. Structure: Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Chorus. Mention "Friday night lights", "city glow", "slow car", "neon". Keep it singable and ~150-220 words.`,
    lyricsText: `Verse 1
Slow headlights glide under the Friday night lights,
We ride the quiet streets, neon humming through the night.
Your hand on mine, heartbeat keeping time,
City hums like a lullaby, everything feels right.

Chorus
Friday night lights, pulling us close,
Soft shadows dancing where the moonlight goes.` ,
    stylesToAdd: ['vinyl samples', 'calm', 'lofi'],
    waitBetweenStyleMs: 250,
    openAdvanced: true,
    openMore: true,
    observerTimeoutMs: 60000
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function setReactValue(el, value) {
    if (!el) return;
    const tag = el.tagName;
    try {
      if (tag === 'TEXTAREA') {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter ? setter.call(el, value) : (el.value = value);
      } else if (tag === 'INPUT') {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter ? setter.call(el, value) : (el.value = value);
      } else {
        el.innerText = value;
      }
    } catch (e) {
      try { el.value = value; } catch(e){}
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clickByPartialText(text) {
    const list = Array.from(document.querySelectorAll('button, [role="button"], a'));
    const found = list.find(el => ((el.textContent || el.innerText || '').toLowerCase().includes(text.toLowerCase())));
    if (found) { found.click(); return true; }
    return false;
  }

  function findCreateBtn() {
    const list = Array.from(document.querySelectorAll('button, [role="button"], a'));
    return list.find(el => ((el.textContent || el.innerText || '').toLowerCase().includes('create'))
      || ((el.getAttribute && (el.getAttribute('aria-label') || '').toLowerCase().includes('create'))));
  }

  async function addStylesAsChips(styleEl, styles) {
    styleEl.focus();
    for (const s of styles) {
      setReactValue(styleEl, s);
      styleEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      styleEl.dispatchEvent(new Event('change', { bubbles: true }));
      styleEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      styleEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      await sleep(cfg.waitBetweenStyleMs);
    }
  }

  function findTextareaOrEditable() {
    const selectors = [
      'textarea[data-testid*="prompt-input-textarea"]',
      'textarea[placeholder*="Describe your song"]',
      'textarea[placeholder*="Add your own lyrics"]',
      'textarea.custom-textarea',
      'textarea',
      '[contenteditable="true"]'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  const observer = new MutationObserver((mutations) => {
    try {
      if (!cfg.songTitle) return;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if ((n.innerText || '').includes(cfg.songTitle)) {
            console.log('Published song element detected (added node):', n);
            observer.disconnect();
            return;
          }
        }
      }
      const scan = Array.from(document.querySelectorAll('a, div, span, button'))
        .find(e => (e.innerText || '').includes(cfg.songTitle)
                   && !e.closest('form') && !e.matches('input, textarea'));
      if (scan) {
        console.log('Published song element detected (scan):', scan);
        observer.disconnect();
      }
    } catch (e) {}
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window._sunoObserver = observer;

  try {
    if (cfg.openAdvanced) clickByPartialText('Advanced Options');
    if (cfg.openMore) clickByPartialText('More Options');
    await sleep(500);

    const ta = findTextareaOrEditable();
    if (!ta) console.warn('No lyrics/describe textarea or contenteditable found.');
    else {
      const textToInsert = cfg.whichToInsert === 'lyrics' ? cfg.lyricsText : cfg.describePrompt;
      if (ta.tagName === 'TEXTAREA' || ta.tagName === 'INPUT') {
        setReactValue(ta, textToInsert);
      } else {
        ta.focus();
        ta.innerText = textToInsert;
        ta.dispatchEvent(new InputEvent('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      console.log('Inserted prompt/lyrics.');
    }

    const styleSelector = 'textarea[placeholder*="Enter style tags"], input[placeholder*="Enter style tags"], input[aria-label*="style"]';
    const styleEl = document.querySelector(styleSelector);
    if (styleEl) {
      await addStylesAsChips(styleEl, cfg.stylesToAdd);
      console.log('Styles added as chips.');
    } else {
      console.warn('Styles input not found; attempting to set any style input value directly.');
      const fallback = document.querySelector('textarea, input');
      if (fallback) setReactValue(fallback, cfg.stylesToAdd.join(', '));
    }

    await sleep(200);
    const titleInput = document.querySelector('input[placeholder*="song title"], input[placeholder*="Enter song title"], input[aria-label*="Song Title"]');
    if (titleInput) {
      setReactValue(titleInput, cfg.songTitle);
      console.log('Song title set.');
    } else {
      console.warn('Song title input not found.');
    }

    await sleep(200);
    const createBtn = findCreateBtn();
    if (createBtn) {
      createBtn.click();
      console.log('Clicked Create button.');
    } else {
      console.warn('Create button not found automatically.');
    }

    if (cfg.observerTimeoutMs) {
      setTimeout(() => {
        if (window._sunoObserver) {
          try { window._sunoObserver.disconnect(); console.log('Observer disconnected after timeout.'); } catch(e){}
        }
      }, cfg.observerTimeoutMs);
    }
  } catch (err) {
    console.error('Automation error:', err);
  }
})();
