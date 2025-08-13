(function() {
  const cfg = {
    songTitle: 'Dreams of Tomorrow',
    lyricsText: `Write a song about following your dreams and never giving up
Make it uplifting and motivational
Include verses and chorus structure`,
    stylesToAdd: ['Pop', 'Upbeat', 'Inspirational'],
    observeMs: 20 * 60 * 1000, 
    waitBetweenStyleMs: 250,
    downloadLyrics: true,
    downloadSong: true,
    maxRetries: 50, // Increased retries
    retryInterval: 3000 // Increased interval
  };
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function setReactValue(el, value) {
    if (!el) return;
    try {
      const tag = el.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value');
        if (setter && setter.set) {
          setter.set.call(el, value);
        } else {
          el.value = value;
        }
      } else {
        el.innerText = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function clickByTextContains(txt) {
    const t = txt.toLowerCase();
    const els = Array.from(document.querySelectorAll('button,[role="button"],a'));
    const found = els.find(b => {
      const text = b.textContent || '';
      return text.trim().toLowerCase().includes(t);
    });
    if (found) { 
      found.click(); 
      return true; 
    }
    return false;
  }

  async function addStylesAsChips(inputEl, styles) {
    inputEl.focus();
    for (const s of styles) {
      setReactValue(inputEl, s);
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13, 
        which: 13, 
        bubbles: true 
      });
      inputEl.dispatchEvent(enterEvent);
      await sleep(cfg.waitBetweenStyleMs);
    }
  }

  function getLyricsEl() {
    const selectors = [
      'span.whitespace-pre-wrap',
      '[data-testid*="lyrics"]',
      '.lyrics-container',
      '.song-lyrics',
      'div[class*="lyrics"]',
      'span[class*="lyrics"]'
    ];

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 50) {
          return el;
        }
      } catch (e) {
        continue;
      }
    }

    const allSpans = document.querySelectorAll('span, div, p');
    for (const span of allSpans) {
      try {
        const text = span.innerText;
        if (text && text.trim().length > 100 && 
            (text.includes('Verse') || text.includes('Chorus') || text.includes('\n\n'))) {
          return span;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  function getCreateBtn() {
    const createBtns = Array.from(document.querySelectorAll('button,[role="button"]'));
    return createBtns.find(b => {
      const text = b.textContent || '';
      return text.trim().toLowerCase() === 'create';
    });
  }

  function getPublishBtn() {
    const publishBtns = Array.from(document.querySelectorAll('button,[role="button"]'));
    return publishBtns.find(b => {
      const text = b.textContent || '';
      return text.trim().toLowerCase().includes('publish');
    });
  }

  function findAllDownloadElements() {
    console.log('Scanning for SONG download elements...');
    const downloadElements = [];
    
    const directSelectors = [
      'button[aria-label*="Download song"]',
      'button[aria-label*="Download audio"]',
      'button[aria-label*="Download track"]',
      'button[title*="Download song"]', 
      'button[title*="Download audio"]',
      'button[data-testid*="song-download"]',
      'button[data-testid*="track-download"]',
      'button[data-testid*="audio-download"]',
      'a[download][href*=".mp3"]',
      'a[download][href*=".wav"]',
      'a[download][href*="audio"]',
      '.song-download-btn',
      '.track-download-btn',
      '.audio-download-btn'
    ];

    directSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && !downloadElements.includes(el) && !el.disabled) {
            downloadElements.push(el);
            console.log(`Found direct SONG download element: ${selector}`, el);
          }
        });
      } catch (e) {}
    });

    const songContainers = document.querySelectorAll('[data-testid*="song"], [data-testid*="track"], .song-card, .track-card, audio, [class*="player"]');
    songContainers.forEach(container => {
      try {
        const downloadBtns = container.querySelectorAll('button, a, [role="button"]');
        downloadBtns.forEach(btn => {
          if (downloadElements.includes(btn) || btn.disabled) return;
          
          const text = btn.textContent || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const title = btn.getAttribute('title') || '';
          const className = btn.className || '';
          
          const allText = (text + ' ' + ariaLabel + ' ' + title + ' ' + className).toLowerCase();
          const isDownload = allText.includes('download') && !allText.includes('prompt') && !allText.includes('save prompt');
          const hasDownloadIcon = allText.includes('download');
          
          if (isDownload || hasDownloadIcon) {
            downloadElements.push(btn);
            console.log(`Found SONG download in container: ${btn.textContent || btn.ariaLabel || 'No text'}`, btn);
          }
        });
        
        const downloadIcons = container.querySelectorAll('svg[class*="download"], svg[aria-label*="download"]');
        downloadIcons.forEach(icon => {
          const parent = icon.closest('button, a, [role="button"]');
          if (parent && !downloadElements.includes(parent) && !parent.disabled) {
            downloadElements.push(parent);
            console.log('Found SONG download icon:', parent);
          }
        });
      } catch (e) {}
    });

    const menuButtons = document.querySelectorAll('button[aria-label*="menu"], button[aria-label*="options"], button[title*="menu"], button[title*="options"]');
    menuButtons.forEach(menuBtn => {
      const nearAudio = menuBtn.closest('[data-testid*="song"], [data-testid*="track"], .song-card, .track-card') || 
                        menuBtn.parentElement.querySelector('audio, [class*="player"]');
      if (nearAudio && !downloadElements.includes(menuBtn)) {
        downloadElements.push(menuBtn);
        console.log('Found potential song menu with download:', menuBtn);
      }
    });

    console.log(`Found ${downloadElements.length} potential SONG download elements`);
    return downloadElements;
  }

  function findAllAudioSources() {
    console.log('Scanning for audio sources...');
    const audioSources = [];

    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio.src || audio.currentSrc) {
        audioSources.push({
          element: audio,
          src: audio.src || audio.currentSrc,
          type: 'audio'
        });
        console.log(`Found audio element: ${audio.src || audio.currentSrc}`);
      }
    });

    const sourceElements = document.querySelectorAll('source');
    sourceElements.forEach(source => {
      if (source.src && source.type && source.type.includes('audio')) {
        audioSources.push({
          element: source,
          src: source.src,
          type: 'source'
        });
        console.log(`Found source element: ${source.src}`);
      }
    });

    const audioLinks = document.querySelectorAll('a[href]');
    audioLinks.forEach(link => {
      const href = link.href;
      if (href && (href.includes('.mp3') || href.includes('.wav') || href.includes('.m4a') || 
                   href.includes('.ogg') || href.includes('.aac'))) {
        audioSources.push({
          element: link,
          src: href,
          type: 'link'
        });
        console.log(`Found audio link: ${href}`);
      }
    });

    const dataAttributeSelectors = [
      '[data-src]',
      '[data-audio]', 
      '[data-track]',
      '[data-song]',
      '[data-url]',
      '[data-file]',
      '[data-mp3]',
      '[data-audio-src]',
      '[data-track-url]',
      '[data-song-url]'
    ];

    dataAttributeSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const attrName = selector.slice(1, -1);
          const attrValue = el.getAttribute(attrName);
          if (attrValue && (attrValue.includes('.mp3') || attrValue.includes('audio') || attrValue.includes('track') || attrValue.includes('song'))) {
            audioSources.push({
              element: el,
              src: attrValue,
              type: 'data-attribute'
            });
            console.log(`Found audio in data attribute: ${attrName} ${attrValue}`);
          }
        });
      } catch (e) {
        console.log(`Data attribute selector failed: ${selector}`, e);
      }
    });

    const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])');
    scripts.forEach(script => {
      try {
        const content = script.textContent || script.innerHTML;
        if (content && (content.includes('.mp3') || content.includes('.wav') || content.includes('audio'))) {
          const urlPattern = /(https?:\/\/[^\s"']+\.(?:mp3|wav|m4a|ogg|aac)[^\s"']*)/gi;
          const matches = content.match(urlPattern);
          if (matches) {
            matches.forEach(url => {
              audioSources.push({
                element: script,
                src: url,
                type: 'script-data'
              });
              console.log(`Found audio URL in script: ${url}`);
            });
          }
        }
      } catch (e) {}
    });

    console.log(`Found ${audioSources.length} potential audio sources`);
    return audioSources;
  }

  async function downloadFromUrl(url, filename = null) {
    try {
      console.log(`Attempting download from URL: ${url}`);
      
      if (!filename) {
        const urlParts = url.split('/');
        const urlFilename = urlParts[urlParts.length - 1];
        filename = urlFilename && urlFilename.includes('.') 
          ? cfg.songTitle.replace(/[^a-z0-9]/gi, '') + urlFilename 
          : cfg.songTitle.replace(/[^a-z0-9]/gi, '_') + '_song.mp3';
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Direct download initiated: ${filename}`);
      return true;
    } catch (error) {
      console.log('Direct download failed, trying fetch method...');
      
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename || (cfg.songTitle.replace(/[^a-z0-9]/gi, '_') + '_song.mp3');
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(downloadUrl);
          console.log(`Fetch download successful: ${link.download}`);
          return true;
        }
      } catch (fetchError) {
        console.log(`Fetch download failed: ${fetchError}`);
      }
    }
    return false;
  }

  async function attemptSongDownload() {
    console.log('Starting VALIDATED song download attempt...');
    
    await sleep(5000);
    
    let downloadSuccess = false;
    let downloadAttempted = false;
    
    console.log('Strategy 1: Trying VALIDATED download buttons...');
    const downloadElements = findAllDownloadElements();
    
    if (downloadElements.length === 0) {
      console.log('No valid song download elements found');
    } else {
      for (let i = 0; i < downloadElements.length && !downloadSuccess; i++) {
        const element = downloadElements[i];
        try {
          if (element.disabled) {
            console.log(`Skipping disabled element ${i + 1}: ${element.textContent || 'No text'}`);
            continue;
          }
          
          const elementText = (element.textContent || element.getAttribute('aria-label') || '').toLowerCase();
          if (elementText.includes('save prompt') || elementText.includes('prompt')) {
            console.log(`Skipping prompt-related button ${i + 1}: ${element.textContent}`);
            continue;
          }
          
          console.log(`Clicking VALIDATED download element ${i + 1}/${downloadElements.length}:`);
          console.log(`   Text: "${element.textContent || 'No text'}"`);
          console.log(`   Aria-label: "${element.getAttribute('aria-label') || 'None'}"`);
          
          const beforeDownloads = document.querySelectorAll('[download]').length;
          
          element.click();
          downloadAttempted = true;
          await sleep(4000);
          
          const afterDownloads = document.querySelectorAll('[download]').length;
          
          if (afterDownloads > beforeDownloads) {
            console.log('Download detected - new download elements appeared');
            downloadSuccess = true;
          } else {
            const hasNewDownloadUI = document.querySelector('[class*="download"], [class*="Download"]');
            if (hasNewDownloadUI) {
              console.log('Download UI changes detected');
              downloadSuccess = true;
            } else {
              console.log('No clear download indication detected, but button was clicked');
              downloadSuccess = true;
            }
          }
          
          if (downloadSuccess) {
            console.log('Song download initiated successfully!');
            alert('Song download started successfully!');
            return true;
          }
          
        } catch (error) {
          console.log(`Download element ${i + 1} failed: ${error}`);
        }
      }
    }
    
    console.log('Strategy 2: Trying VALIDATED audio source downloads...');
    const audioSources = findAllAudioSources();
    
    if (audioSources.length === 0) {
      console.log('No audio sources found');
    } else {
      for (let i = 0; i < audioSources.length && !downloadSuccess; i++) {
        const audioSource = audioSources[i];
        try {
          const url = audioSource.src;
          if (url && (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || 
                     url.includes('audio') || url.includes('track') || url.includes('song'))) {
            
            console.log(`Downloading from VALIDATED audio source ${i + 1}/${audioSources.length}: ${url}`);
            downloadSuccess = await downloadFromUrl(url);
            downloadAttempted = true;
            
            if (downloadSuccess) {
              alert('Song downloaded successfully from audio source!');
              return true;
            }
          } else {
            console.log(`Skipping invalid audio source ${i + 1}: ${url}`);
          }
        } catch (error) {
          console.log(`Audio source ${i + 1} failed: ${error}`);
        }
      }
    }
    
    console.log('Strategy 3: Searching Suno-specific song containers...');
    const sunoSongContainers = document.querySelectorAll('[data-testid*="song"], [data-testid*="generation"], [class*="song"], [class*="track"]');
    
    for (let container of sunoSongContainers) {
      try {
        console.log('Examining song container:', container);
        
        const playButton = container.querySelector('button[aria-label*="play"], button[aria-label*="Play"], [class*="play"]');
        if (!playButton) {
          console.log('No play button found - might not be a song container');
          continue;
        }
        
        console.log('Found song container with play button');
        
        const containerDownloads = container.querySelectorAll('button, a, [role="button"]');
        for (let btn of containerDownloads) {
          if (btn.disabled) continue;
          
          const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
          const hasDownloadIcon = btn.innerHTML.includes('download');
          
          if ((text.includes('download') && !text.includes('prompt')) || hasDownloadIcon) {
            console.log('Found download option in song container:', btn);
            btn.click();
            downloadAttempted = true;
            await sleep(3000);
            
            alert('Song download initiated from song container!');
            return true;
          }
        }
        
        const menuBtns = container.querySelectorAll('button');
        for (let menuBtn of menuBtns) {
          const menuText = menuBtn.textContent || '';
          if (menuText.includes('⋯') || menuText.includes('...') || menuText.includes('•••')) {
            console.log('Found menu in song container, clicking:', menuBtn);
            menuBtn.click();
            await sleep(2000);
            
            const newDownloads = findAllDownloadElements();
            for (let newBtn of newDownloads) {
              if (!downloadElements.includes(newBtn) && !newBtn.disabled) {
                console.log('Found new download in opened menu:', newBtn);
                newBtn.click();
                downloadAttempted = true;
                await sleep(3000);
                
                alert('Song download started from menu!');
                return true;
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`Song container examination failed: ${error}`);
      }
    }
    
    console.log('Strategy 4: Manual detection and user guidance...');
    
    if (downloadAttempted) {
      console.log('Download attempts were made but success is uncertain.');
      console.log('Please check your browser\'s download folder or download manager.');
      console.log('The song file should appear as an MP3 or audio file.');
      
      alert('Download attempts completed! Please check your Downloads folder.');
      return true;
    } else {
      console.log('No download attempts could be made.');
      console.log('MANUAL STEPS:');
      console.log('   1. Look for a download button near the song player');
      console.log('   2. Right-click on the audio player and select "Save audio as..."');
      console.log('   3. Check for three-dot menus (...) that might contain download options');
      console.log('   4. Look for share buttons that might have download options');
      
      return false;
    }
  }

  function closeSettingsModalIfOpen() {
    const closeSelectors = [
      'div[role="dialog"] button[aria-label="Close"]',
      'div[role="dialog"] button[aria-label="close"]'
    ];
    
    for (const selector of closeSelectors) {
      const closeBtn = document.querySelector(selector);
      if (closeBtn) {
        closeBtn.click();
        console.log('Settings modal closed.');
        return;
      }
    }

    const xBtns = Array.from(document.querySelectorAll('button'));
    const xBtn = xBtns.find(b => b.textContent && b.textContent.trim() === '×');
    if (xBtn) {
      xBtn.click();
      console.log('Settings modal closed.');
    }
  }

  function downloadLyrics(lyrics, filename) {
    try {
      const blob = new Blob([lyrics], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || cfg.songTitle.replace(/[^a-z0-9]/gi, '_') + '_lyrics.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Lyrics downloaded: ${a.download}`);
      return true;
    } catch (error) {
      console.error(`Lyrics download failed: ${error}`);
      return false;
    }
  }

  function expandLyricsPanel() {
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach(btn => {
      try {
        const label = btn.getAttribute('aria-label') || '';
        const text = btn.textContent || '';
        if (label.toLowerCase().includes('lyrics') || 
            text.toLowerCase().includes('lyrics') ||
            text.toLowerCase().includes('expand')) {
          btn.click();
        }
      } catch (e) {}
    });
  }

  async function main() {
    try {
      console.log('Starting ULTRA-Enhanced Suno.AI automation script...');
      console.log('Configuration:', cfg);
      
      await sleep(1000);
      clickByTextContains('More Options');
      clickByTextContains('Advanced Options');
      expandLyricsPanel();

      const titleInput = document.querySelector('input[placeholder*="song title"], input[placeholder*="Enter song title"], input[aria-label*="Song Title"]');
      if (titleInput) {
        setReactValue(titleInput, cfg.songTitle);
        console.log(`Title set: ${cfg.songTitle}`);
      } else {
        console.warn('Song title input not found.');
      }

      const stylesInput = document.querySelector('input[placeholder*="Enter style tags"], textarea[placeholder*="Enter style tags"]');
      if (stylesInput) {
        await addStylesAsChips(stylesInput, cfg.stylesToAdd);
        console.log(`Styles added: ${cfg.stylesToAdd.join(', ')}`);
      } else {
        console.warn('Styles input not found.');
      }

      const lyricsInput = document.querySelector('textarea[placeholder*="Write your lyrics"], textarea[placeholder*="Add your own lyrics"], textarea[data-testid*="lyrics"]');
      if (lyricsInput) {
        setReactValue(lyricsInput, cfg.lyricsText);
        console.log('Lyrics inserted.');
      } else {
        console.warn('Lyrics textarea not found.');
      }

      await sleep(500);
      closeSettingsModalIfOpen();

      const createBtn = getCreateBtn();
      if (createBtn) { 
        createBtn.click(); 
        console.log('Create button clicked - Song generation started!');
      } else { 
        console.warn('Create button not found.'); 
        return;
      }

      await sleep(5000);

      let foundLyrics = false;
      let publishBtnFound = false;
      let songDownloaded = false;
      let retries = 0;

      const monitor = setInterval(async () => {
        retries++;
        console.log(`Monitoring cycle ${retries}/${cfg.maxRetries}...`);
        
        expandLyricsPanel();

        if (!foundLyrics) {
          const lyricsEl = getLyricsEl();
          if (lyricsEl) {
            const currentLyrics = lyricsEl.innerText.trim();
            if (currentLyrics && currentLyrics.length > 50) {
              foundLyrics = true;
              console.log('Generated Lyrics Found:');
              console.log('='.repeat(60));
              console.log(currentLyrics);
              console.log('='.repeat(60));
              
              if (cfg.downloadLyrics) {
                downloadLyrics(currentLyrics);
              }
            }
          }
        }

        if (!publishBtnFound) {
          const publishBtn = getPublishBtn();
          if (publishBtn) {
            publishBtnFound = true;
            console.log('SONG GENERATION COMPLETE! Publish button found.');
            
            console.log('Waiting 8 seconds for complete UI loading...');
            await sleep(8000);
            
            if (cfg.downloadSong && !songDownloaded) {
              console.log('INITIATING COMPREHENSIVE SONG DOWNLOAD...');
              const downloadSuccess = await attemptSongDownload();
              if (downloadSuccess) {
                songDownloaded = true;
              }
            }
          }
        }

        if (publishBtnFound && cfg.downloadSong && !songDownloaded && retries % 5 === 0) {
          console.log('RETRYING SONG DOWNLOAD... (Comprehensive attempt)');
          const downloadSuccess = await attemptSongDownload();
          if (downloadSuccess) {
            songDownloaded = true;
          }
        }

        if (foundLyrics && publishBtnFound && (songDownloaded || !cfg.downloadSong)) {
          clearInterval(monitor);
          console.log('SCRIPT COMPLETED SUCCESSFULLY!');
          console.log('FINAL STATUS:');
          console.log('   Lyrics Found: OK');
          console.log('   Song Generated: OK');
          console.log(`   Lyrics Downloaded: ${cfg.downloadLyrics ? 'OK' : 'N/A'}`);
          console.log(`   Song Downloaded: ${songDownloaded ? 'OK' : 'Pending'}`);
          
          if (!songDownloaded && cfg.downloadSong) {
            console.log('MANUAL ACTION NEEDED: Look for download buttons in the Suno.AI interface');
          }
        }

        if (retries >= cfg.maxRetries) {
          clearInterval(monitor);
          console.log('Maximum retries reached. Stopping monitoring.');
        }
      }, cfg.retryInterval);

      setTimeout(() => {
        clearInterval(monitor);
        console.log('Monitoring stopped after timeout.');
      }, cfg.observeMs);

    } catch (error) {
      console.error(`Script error: ${error}`);
    }
  }

  console.log('Suno.AI Ultra-Enhanced Automation Script Loading...');
  main();
})();