(async () => {
  const whichToInsert = 'describe';
  const describePrompt = `Write a chill, deep-voiced song about Friday night lights. Tone: nostalgic, intimate, slightly melancholic. Structure: Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Chorus. Mention "Friday night lights", "city glow", "slow car", "neon". Keep it singable and ~150-220 words.`;
  const lyricsText = `Verse 1
Slow headlights glide under the Friday night lights,
We ride the quiet streets, neon humming through the night.
Your hand on mine, heartbeat keeping time,
City hums like a lullaby, everything feels right.

Pre-Chorus
And I can see the past in the glow,
Holding on to moments we already know.

Chorus
Friday night lights, pulling us close,
Soft shadows dancing where the moonlight goes.
Whispers on the radio, slow and low,
We let the world fade out and just let go.

Verse 2
Windows fog with secrets we don't need to say,
Slow songs and cigarette ash, let the hours sway.
Eyes meet in the mirror of the passing shops,
Time folds gently and nothing ever stops.

Bridge
We'll keep the map of this road in our chest,
A souvenir of nights that taught us how to rest.

(Chorus x2)`;

  const textToInsert = whichToInsert === 'lyrics' ? lyricsText : describePrompt;

  function findTextareaOrEditable() {
    const selectors = [
      'textarea[placeholder*="lyrics"]',
      'textarea[placeholder*="Add your own lyrics"]',
      'textarea[data-testid*="prompt-input-textarea"]',
      'textarea.custom-textarea',
      'textarea'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    if (window.$0 && (window.$0.tagName === 'TEXTAREA' || window.$0.isContentEditable)) return window.$0;
    const ce = document.querySelector('[contenteditable="true"]');
    if (ce) return ce;
    return null;
  }

  const ta = findTextareaOrEditable();
  if (!ta) {
    console.error('No textarea or contenteditable element found. Select it in Elements and try again.');
    return;
  }

  if (ta.tagName === 'TEXTAREA' || ta.tagName === 'INPUT') {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(ta, textToInsert);
    else ta.value = textToInsert;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Inserted text into textarea.');
  } else if (ta.isContentEditable) {
    ta.focus();
    ta.innerText = textToInsert;
    ta.dispatchEvent(new InputEvent('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Inserted text into contenteditable element.');
  } else {
    console.warn('Found element but it is not a textarea or contenteditable. Element:', ta);
  }

  function findCreateBtn() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
    return candidates.find(el => {
      const txt = (el.textContent || el.innerText || '').trim().toLowerCase();
      if (txt.includes('create')) return true;
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      if (aria.includes('create')) return true;
      if ((el.dataset && (el.dataset.testid || '').toLowerCase().includes('create'))) return true;
      return false;
    });
  }

  let btn = findCreateBtn();
  if (!btn) {
    console.warn('Create button not found automatically. Please inspect the Create button and store as $0, then run this script again.');
    return;
  }

  function isEnabled(el) {
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    const cls = (el.className || '').toString().toLowerCase();
    if (cls.includes('disabled') || cls.includes('opacity-')) {
      return !cls.includes('disabled');
    }
    return true;
  }

  if (!isEnabled(btn)) {
    await new Promise(resolve => {
      const obs = new MutationObserver(() => {
        if (isEnabled(btn)) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(btn, { attributes: true, attributeFilter: ['disabled', 'class', 'aria-disabled'] });
      setTimeout(() => { obs.disconnect(); resolve(); }, 5000);
    });
  }

  btn.click();
  console.log('Clicked Create button (or attempted to). If nothing happened, check for validation or credits.');
})();



/*/style options/*/
(() => {
  const stylesToAdd = ['vinyl samples', 'calm', 'lofi']; 
  const toggleAdvanced = true;  
  const toggleMore = true;      

  function setStyles(styles) {
    const input = document.querySelector('textarea[placeholder*="Enter style tags"], input[placeholder*="Enter style tags"]');
    if (!input) {
      console.error('Styles input not found.');
      return;
    }
    const nativeSetter = Object.getOwnPropertyDescriptor(input.__proto__, 'value')?.set;
    const value = styles.join(', ');
    if (nativeSetter) nativeSetter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Styles set:', value);
  }

  function clickIfFound(selector, label = '') {
    const el = document.querySelector(selector);
    if (el) {
      el.click();
      console.log(label || selector, 'clicked.');
    } else {
      console.warn(label || selector, 'not found.');
    }
  }

  setStyles(stylesToAdd);

  if (toggleAdvanced) clickIfFound('button:has(span:contains("Advanced Options"))', 'Advanced Options');
  if (toggleMore) clickIfFound('button:has(span:contains("More Options"))', 'More Options');

})();
/*/ song title/*/
(() => {
  const songTitle = 'Java Dreams';
  const stylesToAdd = ['vinyl samples', 'calm', 'lofi'];

  function setReactValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(el.__proto__, 'value')?.set;
    setter ? setter.call(el, value) : el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clickButtonByText(text) {
    const btn = Array.from(document.querySelectorAll('button, [role="button"]'))
      .find(e => (e.textContent || '').trim().toLowerCase() === text.toLowerCase());
    if (btn) {
      btn.click();
      return true;
    } else {
      return false;
    }
  }

  clickButtonByText('Advanced Options');
  clickButtonByText('More Options');

  setTimeout(() => {
    const titleInput = document.querySelector('input[placeholder="Enter song title"]');
    if (titleInput) {
      setReactValue(titleInput, songTitle);
    }

    const styleInput = document.querySelector('textarea[placeholder*="Enter style tags"], input[placeholder*="Enter style tags"]');
    if (styleInput) {
      setReactValue(styleInput, stylesToAdd.join(', '));
    }
  }, 500);
})();
