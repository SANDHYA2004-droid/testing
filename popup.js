let activeTabId;
let isRecording = false;
let autoRecordEnabled = false;
let currentRecordingMode = 'audioVideo'; // Default mode

// Check current tab on popup open
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔍 Popup opened - checking tab...");
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && isTeamsTab(tab.url)) {
      activeTabId = tab.id;
      console.log("✅ Teams tab detected:", activeTabId);
      
      // Check meeting status
      chrome.tabs.sendMessage(activeTabId, { action: "checkMeetingStatus" }, (response) => {
        if (response) {
          updateMeetingStatusUI(response.isInMeeting, response.recording);
        }
      });
    }

    // Check current recording status, permission, and mode
    await checkRecordingStatus();
    await checkAutoRecordPermission();
    await loadRecordingMode();
    
  } catch (error) {
    console.error("❌ Error checking tab:", error);
  }
});

function isTeamsTab(url) {
  return url && (url.includes("teams.microsoft.com") || url.includes("teams.live.com"));
}

function updateMeetingStatusUI(isInMeeting, isRecording) {
  const statusElement = document.getElementById("status");
  
  if (isInMeeting) {
    if (isRecording) {
      statusElement.textContent = "🟢 In Meeting - Recording...";
      statusElement.style.color = "#4CAF50";
    } else {
      statusElement.textContent = "🟡 In Meeting - Ready to Record";
      statusElement.style.color = "#FF9800";
    }
  } else {
    statusElement.textContent = "⚪ Not in Meeting";
    statusElement.style.color = "#9E9E9E";
  }
}

// Load saved recording mode
async function loadRecordingMode() {
  try {
    const result = await chrome.storage.local.get(['recordingMode']);
    if (result.recordingMode) {
      currentRecordingMode = result.recordingMode;
      console.log("🎯 Loaded recording mode:", currentRecordingMode);
    }
    
    // Update UI to show current mode
    updateModeUI();
    
  } catch (error) {
    console.error("❌ Error loading recording mode:", error);
  }
}

// Update mode selection UI
function updateModeUI() {
  // Uncheck all options
  document.querySelectorAll('input[name="recordingMode"]').forEach(radio => {
    radio.checked = false;
  });
  
  // Check the current mode
  document.querySelector(`input[value="${currentRecordingMode}"]`).checked = true;
  
  // Update visual selection
  document.querySelectorAll('.mode-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.getElementById(`${currentRecordingMode}Option`).classList.add('selected');
  
  // Update mode note text
  updateModeNote();
}

// Update the mode note text
function updateModeNote() {
  const modeNote = document.getElementById('currentModeNote');
  let modeText = '';
  let emoji = '';
  
  switch (currentRecordingMode) {
    case 'audioVideo':
      modeText = 'Audio + Video';
      emoji = '🔊🎥';
      break;
    case 'audioOnly':
      modeText = 'Audio Only';
      emoji = '🔊';
      break;
    case 'videoOnly':
      modeText = 'Video Only';
      emoji = '🎥';
      break;
  }
  
  modeNote.textContent = `${emoji} Currently: ${modeText} Mode`;
}

// Handle mode selection changes
document.querySelectorAll('input[name="recordingMode"]').forEach(radio => {
  radio.addEventListener('change', async (e) => {
    if (e.target.checked) {
      currentRecordingMode = e.target.value;
      console.log("🎯 Recording mode changed to:", currentRecordingMode);
      
      // Save to storage
      await chrome.storage.local.set({ recordingMode: currentRecordingMode });
      
      // Update UI
      updateModeUI();
      
      // Show confirmation message
      showPopupMessage(`Mode set to: ${currentRecordingMode}`, "success");
    }
  });
});

// Also handle click on the entire mode option for better UX
document.querySelectorAll('.mode-option').forEach(option => {
  option.addEventListener('click', (e) => {
    const radio = option.querySelector('input[type="radio"]');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }
  });
});

// Check auto record permission
async function checkAutoRecordPermission() {
  try {
    const result = await chrome.storage.local.get(['autoRecordPermission']);
    autoRecordEnabled = result.autoRecordPermission || false;
    
    // Update toggle UI
    document.getElementById('autoRecordToggle').checked = autoRecordEnabled;
    document.getElementById('toggleLabel').textContent = autoRecordEnabled ? 'ON' : 'OFF';
    document.getElementById('permissionText').textContent = autoRecordEnabled 
      ? 'Auto recording enabled ✅' 
      : 'Automatically record when joining meetings';
    
    // Update button states based on auto mode
    updateButtonStates();
      
    console.log("🔐 Auto record permission:", autoRecordEnabled);
  } catch (error) {
    console.error("❌ Error checking permission:", error);
  }
}

// Update button states based on auto mode
function updateButtonStates() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  
  if (autoRecordEnabled) {
    // Auto mode ON - disable manual buttons
    startBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.style.backgroundColor = "#666";
    stopBtn.style.backgroundColor = "#666";
    startBtn.title = "Manual recording disabled (Auto mode ON)";
    stopBtn.title = "Manual stop disabled (Auto mode ON)";
  } else {
    // Auto mode OFF - enable manual buttons based on recording status
    if (isRecording) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      startBtn.style.backgroundColor = "#666";
      stopBtn.style.backgroundColor = "#f44336";
    } else {
      startBtn.disabled = !activeTabId;
      stopBtn.disabled = true;
      startBtn.style.backgroundColor = activeTabId ? "#4CAF50" : "#666";
      stopBtn.style.backgroundColor = "#666";
    }
    startBtn.title = "Manually start recording";
    stopBtn.title = "Stop recording and download";
  }
}

// Auto record toggle handler
document.getElementById('autoRecordToggle').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  
  if (enabled) {
    // Ask for user confirmation
    const confirmed = confirm(`Enable Auto Recording?\n\nThis will automatically start recording when you join meetings and stop when you leave.\n\nManual recording buttons will be disabled.\n\nRecording Mode: ${currentRecordingMode}\n\nYou can disable this anytime in the extension.`);
    
    if (confirmed) {
      try {
        await chrome.runtime.sendMessage({ action: "grantAutoRecordPermission" });
        autoRecordEnabled = true;
        document.getElementById('toggleLabel').textContent = 'ON';
        document.getElementById('permissionText').textContent = 'Auto recording enabled ✅';
        
        // Update button states
        updateButtonStates();
        
        console.log("✅ Auto recording enabled");
        
        // Show success message
        showPopupMessage(`Auto recording enabled! 🎬\nMode: ${currentRecordingMode}`, "success");
      } catch (error) {
        console.error("❌ Failed to enable auto recording:", error);
        e.target.checked = false;
        showPopupMessage("Failed to enable auto recording", "error");
      }
    } else {
      e.target.checked = false;
    }
  } else {
    try {
      await chrome.runtime.sendMessage({ action: "revokeAutoRecordPermission" });
      autoRecordEnabled = false;
      document.getElementById('toggleLabel').textContent = 'OFF';
      document.getElementById('permissionText').textContent = 'Automatically record when joining meetings';
      
      // Update button states
      updateButtonStates();
      
      console.log("❌ Auto recording disabled");
      
      // Show disabled message
      showPopupMessage("Auto recording disabled\nManual buttons enabled", "info");
    } catch (error) {
      console.error("❌ Failed to disable auto recording:", error);
      e.target.checked = true;
      showPopupMessage("Failed to disable auto recording", "error");
    }
  }
});

// Check recording status
async function checkRecordingStatus() {
  try {
    const result = await chrome.storage.local.get(['isRecording', 'recordingTime']);
    isRecording = result.isRecording || false;
    
    if (isRecording) {
      updateUIForRecording(result.recordingTime || "00:00");
      console.log("✅ Recording active in background");
    } else {
      updateUIForReady();
      console.log("✅ Ready to record");
    }
  } catch (error) {
    console.error("❌ Error checking recording status:", error);
    updateUIForReady();
  }
}

function updateUIForRecording(recordingTime) {
  document.getElementById("timer").textContent = recordingTime;
  document.getElementById("status").textContent = "🟢 Recording in background...";
  document.getElementById("startBtn").textContent = "Recording...";
  document.getElementById("warning").style.display = "block";
  
  // Update button states
  updateButtonStates();
}

function updateUIForReady() {
  document.getElementById("timer").textContent = "00:00";
  
  if (activeTabId) {
    document.getElementById("status").textContent = "✅ Ready to record";
  } else {
    document.getElementById("status").textContent = "❌ Please open Microsoft Teams";
  }
  
  document.getElementById("startBtn").textContent = "Start Recording";
  document.getElementById("warning").style.display = activeTabId ? "block" : "none";
  
  // Update button states
  updateButtonStates();
}

// Start Recording - Open new tab for recording
document.getElementById("startBtn").addEventListener("click", async () => {
  console.log("🎬 Start recording clicked");
  console.log("🎯 Selected mode:", currentRecordingMode);
  
  if (!activeTabId) {
    alert("❌ Please open Microsoft Teams first");
    return;
  }

  // Check if auto mode is enabled
  if (autoRecordEnabled) {
    alert("❌ Manual recording disabled while Auto Mode is ON\nPlease turn off Auto Mode to use manual recording");
    return;
  }

  try {
    document.getElementById("startBtn").disabled = true;
    document.getElementById("startBtn").textContent = "Starting...";
    document.getElementById("status").textContent = "🟡 Starting recording...";

    // Create a new tab for recording
    chrome.tabs.create({
      url: chrome.runtime.getURL("recorder.html"),
      active: false
    }, (tab) => {
      console.log("✅ Recorder tab opened:", tab.id);
      
      // Send tab ID and recording mode to recorder after a delay
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { 
          action: "startRecording", 
          tabId: activeTabId,
          recordingMode: currentRecordingMode // Send the selected mode
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Failed to start recording:", chrome.runtime.lastError);
            document.getElementById("status").textContent = "❌ Failed to start recording";
            updateUIForReady();
            showPopupMessage("Failed to start recording", "error");
          }
        });
      }, 1000);
    });

  } catch (error) {
    console.error("❌ Start recording failed:", error);
    document.getElementById("status").textContent = "❌ Failed to start";
    alert("Failed to start recording: " + error.message);
    updateUIForReady();
    showPopupMessage("Failed to start recording", "error");
  }
});

// Stop Recording
document.getElementById("stopBtn").addEventListener("click", async () => {
  console.log("🛑 Stop recording clicked");
  
  // Check if auto mode is enabled
  if (autoRecordEnabled) {
    alert("❌ Manual stop disabled while Auto Mode is ON\nRecording will stop automatically when you leave the meeting");
    return;
  }

  try {
    document.getElementById("stopBtn").disabled = true;
    document.getElementById("stopBtn").textContent = "Stopping...";
    document.getElementById("status").textContent = "🟡 Stopping recording...";

    // Find and stop the recorder tab
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("recorder.html") });
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopRecording" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Failed to stop recording:", chrome.runtime.lastError);
          document.getElementById("status").textContent = "❌ Stop failed";
          showPopupMessage("Failed to stop recording", "error");
        }
      });
    } else {
      // If recorder tab not found, clear storage
      await chrome.storage.local.remove(['isRecording', 'recordingTime']);
      updateUIForReady();
      console.log("⚠️ No recorder tab found");
    }
    
  } catch (error) {
    console.error("❌ Stop recording failed:", error);
    document.getElementById("status").textContent = "❌ Stop failed";
    alert("Failed to stop recording: " + error.message);
    updateUIForReady();
    showPopupMessage("Failed to stop recording", "error");
  }
});

// Show popup message
function showPopupMessage(message, type = "info") {
  // Remove existing message
  const existingMessage = document.getElementById('popup-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.id = 'popup-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 15px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: bold;
    z-index: 1000;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

// Listen for updates from recorder tab
chrome.runtime.onMessage.addListener((message) => {
  console.log("📨 Popup received:", message.action);
  
  if (message.action === "timerUpdate") {
    document.getElementById("timer").textContent = message.time;
  }
  
  if (message.action === "recordingStarted") {
    isRecording = true;
    updateUIForRecording("00:00");
    showPopupMessage("Recording started! 🎬", "success");
  }
  
  if (message.action === "recordingStopped") {
    isRecording = false;
    updateUIForReady();
    showPopupMessage("Recording completed! ✅ Downloaded automatically", "success");
  }
});

// Refresh meeting status when popup is focused
document.addEventListener('focus', () => {
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { action: "checkMeetingStatus" }, (response) => {
      if (response) {
        updateMeetingStatusUI(response.isInMeeting, response.recording);
      }
    });
  }
});
