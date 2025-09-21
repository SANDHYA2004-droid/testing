


console.log("✅ Teams Monitor content.js loaded!");

let meetingStarted = false;
let startTime = null;
let justEnded = false;
let recordingBar;
let timerInterval;
let secondsElapsed = 0;

function log(msg) {
  console.log(`[Teams Monitor] ${msg}`);
}

// 🔴 Simple Recording bar UI with live timer
function showRecordingBar() {
  if (recordingBar) return;

  recordingBar = document.createElement("div");
  recordingBar.style.position = "fixed";
  recordingBar.style.bottom = "20px";
  recordingBar.style.right = "20px";
  recordingBar.style.padding = "14px 18px";
  recordingBar.style.borderRadius = "16px";
  recordingBar.style.fontSize = "15px";
  recordingBar.style.fontWeight = "600";
  recordingBar.style.display = "flex";
  recordingBar.style.alignItems = "center";
  recordingBar.style.gap = "12px";
  recordingBar.style.color = "#fff";
  recordingBar.style.background = "rgba(255, 51, 102, 0.9)";
  recordingBar.style.backdropFilter = "blur(12px)";
  recordingBar.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)";
  recordingBar.style.zIndex = "999999";
  recordingBar.style.border = "1px solid rgba(255,255,255,0.3)";

  const dot = document.createElement("div");
  dot.style.width = "12px";
  dot.style.height = "12px";
  dot.style.borderRadius = "50%";
  dot.style.background = "#ff1744";
  dot.style.animation = "pulse 1.5s infinite";

  const timerText = document.createElement("span");
  timerText.textContent = "Recording... 00:00";
  timerText.id = "recording-timer-text";

  recordingBar.appendChild(dot);
  recordingBar.appendChild(timerText);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { 
        transform: scale(0.95); 
        box-shadow: 0 0 0 0 rgba(255,23,68,0.7); 
      }
      70% { 
        transform: scale(1.2); 
        box-shadow: 0 0 0 15px rgba(255,23,68,0); 
      }
      100% { 
        transform: scale(0.95); 
        box-shadow: 0 0 0 0 rgba(255,23,68,0); 
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(recordingBar);
  log("📺 Recording bar shown");
}

function hideRecordingBar() {
  if (recordingBar) {
    recordingBar.remove();
    recordingBar = null;
  }
  log("📺 Recording bar hidden");
}

function startRecording(mode) {
  log(`▶️ Starting ${mode} recording...`);
  
  chrome.runtime.sendMessage({ type: `start-${mode}-recording` }, (res) => {
    if (chrome.runtime.lastError) {
      log(`❌ Runtime error: ${chrome.runtime.lastError.message}`);
      return;
    }
    
    log(`📨 Recording response:`, res);
    
    if (res?.ok) {
      log(`✅ ${mode} recording started successfully`);
      // Don't show bar here, wait for recording-started message
    } else {
      log(`❌ Failed to start ${mode} recording:`, res?.error || "Unknown error");
    }
  });
}

function stopRecording() {
  log("⏹️ Stopping recording...");
  chrome.runtime.sendMessage({ type: "stop-recording" });
  hideRecordingBar();
}

// ----------------- Meeting detection (EXACTLY like your original) -----------------
function logMeetingStart() {
  if (meetingStarted || justEnded) return;
  startTime = new Date();
  meetingStarted = true;
  log(`✅ Meeting started at: ${startTime.toLocaleString()}`);

  // Send notification to background
  chrome.runtime.sendMessage({
    type: "meeting-start",
    time: startTime.toLocaleTimeString()
  });

  // Get recording mode and start recording
  chrome.storage.local.get("recordMode", (data) => {
    const mode = data.recordMode || "screenaudio";
    if (mode !== "none") {
      log(`🎬 Auto-starting recording in ${mode} mode`);
      startRecording(mode);
    }
  });
}

function logMeetingEnd() {
  if (!meetingStarted) return;
  const endTime = new Date();
  const durationSec = Math.round((endTime - startTime) / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const remainingSec = durationSec % 60;

  log(`🛑 Meeting ended at: ${endTime.toLocaleString()}`);
  log(`⏱ Duration: ${durationMin} min ${remainingSec} sec`);

  stopRecording();

  meetingStarted = false;
  justEnded = true;

  chrome.runtime.sendMessage({
    type: "meeting-end",
    time: endTime.toLocaleTimeString(),
    duration: `${durationMin} min ${remainingSec} sec`
  });

  setTimeout(() => { justEnded = false; }, 5000);
}

// DOM observer (EXACTLY like your original)
const observer = new MutationObserver(() => {
  // Detect Leave button and attach listener
  const leaveButton = document.querySelector('button[aria-label="Leave"]');
  if (leaveButton && !leaveButton.dataset.listenerAdded) {
    log("🔘 Leave button found, attaching listener...");
    leaveButton.addEventListener("click", () => {
      log("🔘 Leave button clicked");
      logMeetingEnd();
    });
    leaveButton.dataset.listenerAdded = true;
  }

  // Detect toolbar → mark meeting start
  const toolbar = document.querySelector('div[role="toolbar"][aria-label="Meeting controls"]');
  if (toolbar && !meetingStarted) {
    log("🎯 Meeting toolbar detected");
    logMeetingStart();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Handle messages from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log(`📨 Content received: ${msg.type}`);
  
  if (msg.type === "manual-start") {
    chrome.storage.local.get("recordMode", (data) => {
      let mode = data.recordMode || "screenaudio";
      if (mode === "none") mode = "screenaudio";
      log(`🎬 Manual start: ${mode}`);
      startRecording(mode);
    });
    sendResponse({ ok: true });
  }
  
  if (msg.type === "manual-stop") {
    log("🛑 Manual stop");
    stopRecording();
    sendResponse({ ok: true });
  }

  // Show recording bar when recording actually starts
  if (msg.type === "recording-started") {
    log("🎬 Recording started - showing bar");
    showRecordingBar();
  }

  // Live timer updates from background
  if (msg.type === "recording-timer") {
    const timerText = document.getElementById("recording-timer-text");
    if (timerText) {
      const m = String(Math.floor(msg.seconds / 60)).padStart(2, "0");
      const s = String(msg.seconds % 60).padStart(2, "0");
      timerText.textContent = `Recording... ${m}:${s}`;
    }
  }

  if (msg.type === "recording-stopped") {
    log("🛑 Recording stopped - hiding bar");
    hideRecordingBar();
  }
});

log("✅ Teams Meeting Monitor is running...");







