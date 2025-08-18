async function autoSongMaker() {
  console.log("Launching song automation...");

  // Utility functions
  const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const findElement = async (selector, timeLimit = 10000, scope = document) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeLimit) {
      const found = scope.querySelector(selector);
      if (found) return found;
      await pause(200);
    }
    return null;
  };

  const triggerClick = (el) => {
    ["pointerdown", "mousedown", "mouseup", "click"].forEach(evt => {
      el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
    });
  };

  const updateReactInput = (el, newVal) => {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

    const setValue = Object.getOwnPropertyDescriptor(proto, "value").set;
    setValue.call(el, newVal);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Step 1: Autofill form
  const songTitle = "Echoes of Dawn";
  const songLyrics = `Morning glows, the light is near,  
Dreams fade out, the sky feels clear,  
Hope awakens, voices we hear.`;
  const songTags = "ambient, sunrise, uplifting";

  const titleInput = await findElement('input[placeholder="Enter song title"]');
  if (titleInput) updateReactInput(titleInput, songTitle);

  const lyricsInput = await findElement('textarea[data-testid="lyrics-input-textarea"]');
  if (lyricsInput) updateReactInput(lyricsInput, songLyrics);

  const tagsInput = await findElement('textarea[data-testid="tag-input-textarea"]');
  if (tagsInput) updateReactInput(tagsInput, songTags);

  const generateBtn = await findElement('button[data-testid="create-button"]');
  if (generateBtn && !generateBtn.disabled) {
    triggerClick(generateBtn);
    console.log("Song creation started!");
  } else {
    console.error("Create button not found or inactive.");
    return;
  }

  // Step 2: Monitor workspace for new row
  const songPanel = await findElement('.custom-scrollbar-transparent.flex-1.overflow-y-auto');
  if (!songPanel) {
    console.error("Workspace missing!");
    return;
  }

  const rowWatcher = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && node.matches('[role="row"]')) {
          const label = node.getAttribute("aria-label");
          if (label === songTitle) {
            console.log(`🎶 New track "${songTitle}" spotted!`);

            // Step 3: Watch for publish button
            const publishWatcher = new MutationObserver((mutations2) => {
              for (const mm of mutations2) {
                for (const added of mm.addedNodes) {
                  if (added.nodeType === 1) {
                    const buttons = added.querySelectorAll("button span");
                    for (const span of buttons) {
                      if (span.textContent.trim() === "Publish") {
                        console.log(`✨ "${songTitle}" is fully processed!`);
                        publishWatcher.disconnect();

                        (async () => {
                          // Step 4: Grab filled details
                          const finalTitle = titleInput?.value || songTitle;
                          const finalLyrics = lyricsInput?.value || songLyrics;
                          const finalTags = tagsInput?.value || songTags;

                          console.log("🎼 Final Song Data:");
                          console.log(" Title:", finalTitle);
                          console.log(" Tags:", finalTags);
                          console.log(" Lyrics:", finalLyrics);

                          // Step 5: Download flow
                          const optionsBtn = node.querySelector('button[aria-label="More Options"]');
                          if (!optionsBtn) {
                            console.error("Options menu not found.");
                            return;
                          }
                          triggerClick(optionsBtn);
                          await pause(600);

                          const downloadMenu = await findElement('[data-testid="download-sub-trigger"]', 5000)
                            || Array.from(document.querySelectorAll('span, button'))
                              .find(el => el.textContent.trim().toLowerCase() === "download");

                          if (!downloadMenu) {
                            console.error("Download option missing.");
                            return;
                          }
                          triggerClick(downloadMenu);
                          await pause(600);

                          const mp3Choice = Array.from(document.querySelectorAll("button, [role='menuitem'], span"))
                            .find(el => el.textContent.toLowerCase().includes("mp3 audio"));
                          if (!mp3Choice) {
                            console.error(" MP3 option unavailable.");
                            return;
                          }
                          triggerClick(mp3Choice);
                          await pause(600);

                          const confirmBtn = Array.from(document.querySelectorAll("button"))
                            .find(el => el.textContent.toLowerCase().includes("download anyway"));
                          if (confirmBtn) triggerClick(confirmBtn);

                          console.log("Song downloaded automatically!");
                        })();
                        return;
                      }
                    }
                  }
                }
              }
            });

            publishWatcher.observe(node, { childList: true, subtree: true });
            rowWatcher.disconnect();
          }
        }
      }
    }
  });

  rowWatcher.observe(songPanel, { childList: true, subtree: true });
}
autoSongMaker();
