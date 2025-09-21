
















console.log("✅ Background script loaded!");

let recorder;
let chunks = [];
let timerInterval;
let secondsElapsed = 0;

// Stop media tracks safely
function stopTracks(stream) {
  if (stream) {
    stream.getTracks().forEach(track => {
      if (track.readyState === "live") track.stop();
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📩 Background received:", msg);

  // ----------------- Meeting notifications -----------------
  if (msg.type === "meeting-start") {
    chrome.notifications.create("meeting-start-" + Date.now(), {
      type: "basic",
      iconUrl: "icon.png",
      title: "Teams Meeting Started",
      message: `Started at ${msg.time}`
    });

    chrome.storage.local.get("recordMode", (data) => {
      sendResponse({ recordMode: data.recordMode || "screenaudio" });
    });
    return true;
  }

  if (msg.type === "meeting-end") {
    chrome.notifications.create("meeting-end-" + Date.now(), {
      type: "basic",
      iconUrl: "icon.png",
      title: "Teams Meeting Ended",
      message: `Duration: ${msg.duration}`
    });

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    return true;
  }

  // ----------------- Audio-only recording -----------------
  if (msg.type === "start-audio-recording") {
    console.log("🎤 Starting audio recording...");
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        console.error("❌ No active tab to capture audio.");
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      chrome.tabs.update(tabId, { active: true }, () => {
        setTimeout(() => {
          chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
            if (chrome.runtime.lastError || !stream) {
              console.error("❌ Audio capture failed:", chrome.runtime.lastError);
              sendResponse({ ok: false, error: chrome.runtime.lastError?.message });
              return;
            }

            console.log("✅ Audio stream captured");
            chunks = [];
            
            try {
              recorder = new MediaRecorder(stream);

              recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                  chunks.push(e.data);
                }
              };

              recorder.onstop = () => {
                console.log("🛑 Audio recording stopped");
                stopTracks(stream);
                clearInterval(timerInterval);

                if (chunks.length) {
                  const blob = new Blob(chunks, { type: "audio/webm" });
                  const url = URL.createObjectURL(blob);
                  chrome.downloads.download({
                    url: url,
                    filename: `meeting_audio_${Date.now()}.webm`,
                    saveAs: false
                  }, (downloadId) => {
                    URL.revokeObjectURL(url);
                    console.log("💾 Audio file saved");
                  });
                }

                chrome.runtime.sendMessage({ type: "recording-stopped" });
              };

              recorder.start(1000);
              console.log("🎬 Audio recording started");

              secondsElapsed = 0;
              timerInterval = setInterval(() => {
                secondsElapsed++;
                chrome.runtime.sendMessage({ type: "recording-timer", seconds: secondsElapsed });
              }, 1000);

              chrome.runtime.sendMessage({ type: "recording-started" });
              sendResponse({ ok: true });
              
            } catch (error) {
              console.error("❌ Audio MediaRecorder failed:", error);
              sendResponse({ ok: false, error: error.message });
            }
          });
        }, 300);
      });
    });
    return true;
  }

  if (msg.type === "stop-audio-recording") {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    sendResponse({ ok: true });
    return true;
  }

  // ----------------- Screen recording -----------------
  if (msg.type === "start-screen-recording") {
    console.log("🖥️ Starting screen recording...");
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        console.error("❌ No active tab");
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      chrome.tabs.update(tabId, { active: true }, () => {
        setTimeout(() => {
          chrome.tabCapture.capture({ audio: false, video: true }, (stream) => {
            if (chrome.runtime.lastError || !stream) {
              console.error("❌ Screen capture error:", chrome.runtime.lastError);
              sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "Capture failed" });
              return;
            }

            console.log("✅ Screen stream captured");
            chunks = [];
            
            try {
              recorder = new MediaRecorder(stream);

              recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                  chunks.push(e.data);
                }
              };

              recorder.onstop = () => {
                console.log("🛑 Screen recording stopped");
                stopTracks(stream);
                clearInterval(timerInterval);

                if (chunks.length) {
                  const blob = new Blob(chunks, { type: "video/webm" });
                  const url = URL.createObjectURL(blob);
                  chrome.downloads.download({
                    url: url,
                    filename: `meeting_screen_${Date.now()}.webm`,
                    saveAs: false
                  }, (downloadId) => {
                    URL.revokeObjectURL(url);
                    console.log("💾 Screen file saved");
                  });
                }

                chrome.runtime.sendMessage({ type: "recording-stopped" });
              };

              recorder.start(1000);
              console.log("🎬 Screen recording started");

              secondsElapsed = 0;
              timerInterval = setInterval(() => {
                secondsElapsed++;
                chrome.runtime.sendMessage({ type: "recording-timer", seconds: secondsElapsed });
              }, 1000);

              chrome.runtime.sendMessage({ type: "recording-started" });
              sendResponse({ ok: true });
              
            } catch (error) {
              console.error("❌ Screen MediaRecorder failed:", error);
              sendResponse({ ok: false, error: error.message });
            }
          });
        }, 300);
      });
    });
    return true;
  }

  // ----------------- Screen + Audio recording -----------------
  if (msg.type === "start-screenaudio-recording") {
    console.log("🎥 Starting screenaudio recording...");
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        console.error("❌ No active tab");
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      chrome.tabs.update(tabId, { active: true }, () => {
        setTimeout(() => {
          chrome.tabCapture.capture({ audio: true, video: true }, (stream) => {
            if (chrome.runtime.lastError || !stream) {
              console.error("❌ Screen+Audio capture error:", chrome.runtime.lastError);
              sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "Capture failed" });
              return;
            }

            console.log("✅ Screen+Audio stream captured");
            chunks = [];
            
            try {
              recorder = new MediaRecorder(stream);

              recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                  chunks.push(e.data);
                  console.log("📦 Data chunk:", e.data.size, "bytes");
                }
              };

              recorder.onstop = () => {
                console.log("🛑 Recording stopped, saving file...");
                stopTracks(stream);
                clearInterval(timerInterval);

                if (chunks.length) {
                  const blob = new Blob(chunks, { type: "video/webm" });
                  const url = URL.createObjectURL(blob);
                  chrome.downloads.download({
                    url: url,
                    filename: `meeting_screenaudio_${Date.now()}.webm`,
                    saveAs: false
                  }, (downloadId) => {
                    URL.revokeObjectURL(url);
                    console.log("💾 File saved successfully");
                  });
                }

                chrome.runtime.sendMessage({ type: "recording-stopped" });
              };

              recorder.onerror = (e) => {
                console.error("❌ MediaRecorder error:", e.error);
              };

              recorder.start(1000); // Collect data every second
              console.log("🎬 MediaRecorder started");

              secondsElapsed = 0;
              timerInterval = setInterval(() => {
                secondsElapsed++;
                chrome.runtime.sendMessage({ type: "recording-timer", seconds: secondsElapsed });
              }, 1000);

              chrome.runtime.sendMessage({ type: "recording-started" });
              sendResponse({ ok: true });
              
            } catch (error) {
              console.error("❌ MediaRecorder creation failed:", error);
              sendResponse({ ok: false, error: error.message });
            }
          });
        }, 300);
      });
    });
    return true;
  }

  // Stop all recordings
  if (msg.type === "stop-recording") {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    sendResponse({ ok: true });
    return true;
  }
});




