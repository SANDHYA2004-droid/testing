let userPermissionGranted = false;
let currentRecordingTab = null;
let meetingStartTime = null;

// Load saved permission state
chrome.storage.local.get(['autoRecordPermission'], (result) => {
  userPermissionGranted = result.autoRecordPermission || false;
  console.log("🔐 Auto record permission:", userPermissionGranted);
});

// Listen for tab updates to detect Teams pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isTeamsTab(tab.url)) {
    console.log("✅ Teams tab detected:", tabId, tab.url);
    
    // Check if user has given permission for auto recording
    chrome.storage.local.get(['autoRecordPermission'], (result) => {
      if (result.autoRecordPermission) {
        console.log("🎬 Auto recording enabled - Waiting for Join button click...");
        
        // Wait for content script to initialize
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: "checkMeetingStatus" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("⚠️ Content script not ready yet, will detect meeting when Join button is clicked");
              return;
            }
            
            if (response && response.isInMeeting && !response.recording) {
              console.log("✅ Meeting already in progress - starting auto recording");
              startRecordingForTab(tabId);
            }
          });
        }, 3000);
      }
    });
  }
});

function isTeamsTab(url) {
  return url && (url.includes("teams.microsoft.com") || url.includes("teams.live.com"));
}

// Handle permission messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background received:", message.action);
  
  if (message.action === "grantAutoRecordPermission") {
    console.log("✅ User granted auto recording permission");
    userPermissionGranted = true;
    chrome.storage.local.set({ autoRecordPermission: true }, () => {
      // Notify all Teams tabs about permission change
      chrome.tabs.query({url: ["https://*.teams.microsoft.com/*", "https://*.teams.live.com/*"]}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateAutoRecordPermission",
            enabled: true
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("⚠️ Tab not ready for permission update:", tab.id);
            } else {
              console.log("✅ Permission update sent to tab:", tab.id);
            }
          });
        });
      });
    });
    sendResponse({ success: true });
  }
  
  if (message.action === "revokeAutoRecordPermission") {
    console.log("❌ User revoked auto recording permission");
    userPermissionGranted = false;
    chrome.storage.local.set({ autoRecordPermission: false }, () => {
      // Notify all Teams tabs about permission change
      chrome.tabs.query({url: ["https://*.teams.microsoft.com/*", "https://*.teams.live.com/*"]}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateAutoRecordPermission",
            enabled: false
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("⚠️ Tab not ready for permission update:", tab.id);
            } else {
              console.log("✅ Permission update sent to tab:", tab.id);
            }
          });
        });
      });
    });
    sendResponse({ success: true });
  }
  
  if (message.action === "getAutoRecordPermission") {
    sendResponse({ permission: userPermissionGranted });
  }

  if (message.action === "autoStartRecording") {
    console.log("🎬 Auto starting recording - Join button clicked (+3s delay completed)");
    console.log("📍 Source tab:", sender.tab.id, sender.tab.url);
    meetingStartTime = Date.now();
    
    // Get the saved recording mode
    chrome.storage.local.get(['recordingMode'], (result) => {
      const recordingMode = result.recordingMode || 'audioVideo';
      console.log("🎯 Auto recording with mode:", recordingMode);
      
      // Show desktop notification with mode info
      showDesktopNotification({
        type: "meetingStarted",
        timestamp: new Date().toLocaleTimeString(),
        mode: recordingMode
      });
      
      startRecordingForTab(sender.tab.id, recordingMode);
    });
    sendResponse({ success: true });
  }

  if (message.action === "autoStopRecording") {
    console.log("🛑 Auto stopping recording - Leave button clicked (Meeting ended)");
    console.log("📍 Source tab:", sender.tab.id);
    
    // Calculate meeting duration for notification
    let durationText = "";
    if (meetingStartTime) {
      const duration = Date.now() - meetingStartTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      durationText = `${minutes} minutes ${seconds} seconds`;
      console.log(`⏱️ Total meeting duration: ${durationText}`);
    }
    
    // Send meeting ended notification with duration
    showDesktopNotification({
      type: "meetingEnded",
      timestamp: new Date().toLocaleTimeString(),
      duration: durationText
    });
    
    stopAllRecordings();
    sendResponse({ success: true });
  }

  if (message.action === "checkMeetingStatus") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "checkMeetingStatus" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("❌ Cannot check meeting status:", chrome.runtime.lastError);
        sendResponse({ error: "Content script not ready" });
        return;
      }
      sendResponse(response);
    });
    return true;
  }

  if (message.action === "recordingStarted") {
    console.log("✅ Recording started successfully");
    console.log("📊 Recording tab:", sender.tab.id);
    console.log("⏰ Recording start time:", new Date().toISOString());
    currentRecordingTab = sender.tab.id;
    
    // Update storage
    chrome.storage.local.set({ 
      isRecording: true,
      recordingStartTime: Date.now(),
      recordingTabId: sender.tab.id
    });
    
    sendResponse({ success: true });
  }

  if (message.action === "recordingStopped") {
    console.log("✅ Recording stopped successfully");
    console.log("📊 Was recording tab:", sender.tab.id);
    console.log("⏰ Recording stop time:", new Date().toISOString());
    currentRecordingTab = null;
    
    // Update storage
    chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
    
    sendResponse({ success: true });
  }

  if (message.action === "timerUpdate") {
    // Update recording time in storage
    chrome.storage.local.set({ recordingTime: message.time });
    
    // Log recording duration every minute for debugging
    const timeParts = message.time.split(':');
    const minutes = parseInt(timeParts[0]);
    const seconds = parseInt(timeParts[1]);
    
    if (seconds === 0 && minutes > 0) {
      console.log(`⏱️ Recording duration: ${message.time}`);
    }
    
    sendResponse({ success: true });
  }
  
  // Handle manual recording requests from popup
  if (message.action === "startManualRecording") {
    console.log("🎬 Manual recording requested for tab:", sender.tab.id);
    
    // Get the saved recording mode for manual recording
    chrome.storage.local.get(['recordingMode'], (result) => {
      const recordingMode = result.recordingMode || 'audioVideo';
      console.log("🎯 Manual recording with mode:", recordingMode);
      startRecordingForTab(sender.tab.id, recordingMode);
    });
    sendResponse({ success: true });
  }
  
  if (message.action === "stopManualRecording") {
    console.log("🛑 Manual recording stop requested");
    stopAllRecordings();
    sendResponse({ success: true });
  }

  // ✅ Handle desktop notifications from content script
  if (message.action === "showDesktopNotification") {
    console.log("🔔 Showing desktop notification:", message.type);
    showDesktopNotification(message);
    sendResponse({ success: true });
  }
  
  // ✅ Handle recording mode changes
  if (message.action === "updateRecordingMode") {
    console.log("🎯 Recording mode updated:", message.mode);
    chrome.storage.local.set({ recordingMode: message.mode }, () => {
      console.log("💾 Recording mode saved to storage");
    });
    sendResponse({ success: true });
  }
  
  // ✅ Get current recording mode
  if (message.action === "getRecordingMode") {
    chrome.storage.local.get(['recordingMode'], (result) => {
      const mode = result.recordingMode || 'audioVideo';
      sendResponse({ mode: mode });
    });
    return true;
  }
  
  return true;
});

// Desktop notification handler - FIXED VERSION
function showDesktopNotification(message) {
  const { type, timestamp, duration, error, mode } = message;
  
  let title, messageText;

  switch (type) {
    case "meetingJoining":
      title = "🎯 Joining Teams Meeting";
      messageText = `Joining meeting at ${timestamp}\nRecording will start in 3 seconds...`;
      break;
      
    case "meetingStarted":
      title = "🔴 Meeting Started";
      let modeText = "Audio+Video";
      if (mode === 'audioOnly') modeText = "Audio Only";
      if (mode === 'videoOnly') modeText = "Video Only";
      messageText = `Meeting started at ${timestamp}\nAuto recording (${modeText}) is active`;
      break;
      
    case "meetingEnded":
      title = "⏹️ Meeting Ended";
      messageText = `Meeting ended at ${timestamp}\nDuration: ${duration || 'Calculating...'}`;
      break;
      
    case "recordingStarted":
      title = "🎬 Recording Started";
      let recordingModeText = "Audio+Video";
      if (mode === 'audioOnly') recordingModeText = "Audio Only";
      if (mode === 'videoOnly') recordingModeText = "Video Only";
      messageText = `Recording started at ${timestamp}\nMode: ${recordingModeText}\nRecording in background...`;
      break;
      
    case "recordingStopped":
      title = "💾 Recording Stopped";
      messageText = `Recording stopped at ${timestamp}\nDownloading file...`;
      break;

    case "recordingDownloaded":
      title = "✅ Recording Saved";
      messageText = `Recording saved to Downloads\nFile: ${message.filename || 'teams-recording.webm'}`;
      break;
      
    case "recordingError":
      title = "❌ Recording Error";
      messageText = `Error: ${error || 'Unknown error occurred'}`;
      break;

    case "modeChanged":
      title = "⚙️ Recording Mode Updated";
      let newModeText = "Audio+Video";
      if (mode === 'audioOnly') newModeText = "Audio Only";
      if (mode === 'videoOnly') newModeText = "Video Only";
      messageText = `Recording mode set to: ${newModeText}`;
      break;
      
    default:
      console.log("⚠️ Unknown notification type:", type);
      return;
  }

  // Create notification with absolute path for icon
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: title,
    message: messageText,
    priority: 1
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error("❌ Notification error:", chrome.runtime.lastError);
      
      // Fallback: Try without icon
      chrome.notifications.create({
        type: 'basic',
        title: title,
        message: messageText
      }, (fallbackId) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Fallback notification also failed:", chrome.runtime.lastError);
        } else {
          console.log("✅ Fallback notification shown:", fallbackId);
        }
      });
    } else {
      console.log("✅ Desktop notification shown:", notificationId);
    }
  });
}

function startRecordingForTab(tabId, recordingMode = 'audioVideo') {
  if (currentRecordingTab) {
    console.log("⚠️ Already recording in tab:", currentRecordingTab);
    
    // Show notification
    showDesktopNotification({
      type: "recordingError",
      error: "Already recording another meeting"
    });
    
    // Notify the popup that recording is already in progress
    chrome.runtime.sendMessage({ 
      action: "recordingAlreadyActive",
      tabId: currentRecordingTab
    });
    
    return;
  }

  console.log("🎬 Starting recording for Teams tab:", tabId);
  console.log("🎯 Recording mode:", recordingMode);
  
  // Show recording starting notification with mode
  showDesktopNotification({
    type: "recordingStarted",
    timestamp: new Date().toLocaleTimeString(),
    mode: recordingMode
  });
  
  // Create a new tab for recording
  chrome.tabs.create({
    url: chrome.runtime.getURL("recorder.html"),
    active: false
  }, (recorderTab) => {
    console.log("✅ Recorder tab opened:", recorderTab.id);
    
    // Send tab ID and recording mode to recorder after a delay
    const startRecording = (retryCount = 0) => {
      chrome.tabs.sendMessage(recorderTab.id, { 
        action: "startRecording", 
        tabId: tabId,
        autoRecord: true,
        recordingMode: recordingMode // Send the selected mode
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log(`❌ Recorder tab not ready (attempt ${retryCount + 1}/3), retrying...`);
          if (retryCount < 2) {
            setTimeout(() => startRecording(retryCount + 1), 1000);
          } else {
            console.error("❌ Failed to start recording after 3 attempts");
            // Clean up the recorder tab if failed
            chrome.tabs.remove(recorderTab.id);
            
            // Show error notification
            showDesktopNotification({
              type: "recordingError",
              error: "Failed to start recording"
            });
            
            // Notify about failure
            chrome.runtime.sendMessage({
              action: "recordingStartFailed",
              error: "Recorder tab not responding"
            });
          }
        } else {
          console.log("✅ Recording started successfully");
          currentRecordingTab = tabId;
          
          // Notify about successful start
          chrome.runtime.sendMessage({
            action: "recordingStartSuccess",
            tabId: tabId,
            mode: recordingMode
          });
        }
      });
    };
    
    setTimeout(() => startRecording(), 1500);
  });
}

function stopAllRecordings() {
  console.log("🛑 Stopping all recordings");
  
  // Show recording stopped notification
  showDesktopNotification({
    type: "recordingStopped",
    timestamp: new Date().toLocaleTimeString()
  });
  
  // Find and stop all recorder tabs
  chrome.tabs.query({ url: chrome.runtime.getURL("recorder.html") }, (tabs) => {
    if (tabs.length > 0) {
      console.log(`🛑 Stopping ${tabs.length} recorder tab(s)`);
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "stopRecording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("⚠️ Recorder tab not responding, removing tab:", tab.id);
            chrome.tabs.remove(tab.id);
          } else {
            console.log("✅ Stop command sent to recorder tab:", tab.id);
          }
        });
      });
    } else {
      console.log("⚠️ No recorder tabs found");
    }
  });
  
  currentRecordingTab = null;
  
  // Clear storage
  chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
  
  // Notify about stop
  chrome.runtime.sendMessage({
    action: "recordingStoppedManually"
  });
}

// Monitor tab closures
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentRecordingTab) {
    console.log("🛑 Recording source tab closed - stopping recording");
    
    // Show notification about source tab closure
    showDesktopNotification({
      type: "recordingError",
      error: "Teams tab closed - recording stopped"
    });
    
    stopAllRecordings();
  }
  
  // Also check if it's a recorder tab
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    if (tab.url && tab.url.includes("recorder.html")) {
      console.log("🛑 Recorder tab closed - cleaning up");
      chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
      currentRecordingTab = null;
      
      // Notify about recorder tab closure
      chrome.runtime.sendMessage({
        action: "recorderTabClosed"
      });
    }
  });
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("🔧 Extension installed/updated:", details.reason);
  
  if (details.reason === 'install') {
    // Set default permissions and mode
    chrome.storage.local.set({ 
      autoRecordPermission: false,
      recordingMode: 'audioVideo' // Default mode
    });
    console.log("🔐 Auto recording disabled by default");
    console.log("🎯 Default recording mode: Audio+Video");
    
    // Show welcome notification
    showDesktopNotification({
      type: "recordingStarted", // Reuse type
      timestamp: new Date().toLocaleTimeString()
    });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Teams Recorder Installed 🎬',
      message: 'Click the extension icon to configure recording modes and auto recording.'
    });
  } else if (details.reason === 'update') {
    console.log("🔄 Extension updated to new version");
    
    // Show update notification
    showDesktopNotification({
      type: "recordingDownloaded",
      timestamp: new Date().toLocaleTimeString(),
      filename: "New version with recording modes!"
    });
  }
});

// Handle tab activation to update popup status
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (isTeamsTab(tab.url)) {
      console.log("🔍 Active tab is Teams - popup can check status");
      // The popup will check status when opened
    }
  });
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log("💻 No window focused");
  } else {
    chrome.windows.get(windowId, { populate: true }, (window) => {
      if (window) {
        console.log("💻 Window focused:", windowId);
      }
    });
  }
});

// Keep service worker alive during recordings
let keepAliveInterval = setInterval(() => {
  chrome.runtime.getPlatformInfo(() => {
    if (currentRecordingTab) {
      // Log keep-alive every 30 seconds during recording
      if (Math.floor(Date.now() / 1000) % 30 === 0) {
        console.log("💓 Service worker keep-alive (Recording active)");
      }
    }
  });
}, 10000); // Check every 10 seconds

// Clean up on extension shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log("🔌 Extension suspending - cleaning up");
  clearInterval(keepAliveInterval);
  
  if (currentRecordingTab) {
    console.log("⚠️ Recording was active during shutdown - may be incomplete");
    
    // Show error notification
    showDesktopNotification({
      type: "recordingError",
      error: "Browser closed - recording interrupted"
    });
    
    // Try to stop recording gracefully
    stopAllRecordings();
  }
});

// Handle system suspend/resume
chrome.runtime.onStartup.addListener(() => {
  console.log("▶️ Extension started after browser restart");
  
  // Reload permission state on startup
  chrome.storage.local.get(['autoRecordPermission', 'isRecording', 'recordingMode'], (result) => {
    userPermissionGranted = result.autoRecordPermission || false;
    const recordingMode = result.recordingMode || 'audioVideo';
    console.log("🔐 Auto record permission on startup:", userPermissionGranted);
    console.log("🎯 Recording mode on startup:", recordingMode);
    
    // Check if there was an active recording that didn't properly stop
    if (result.isRecording) {
      console.log("⚠️ Found incomplete recording from previous session - cleaning up");
      chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
      
      // Show notification about interrupted recording
      showDesktopNotification({
        type: "recordingError",
        error: "Previous recording was interrupted"
      });
    }
  });
});

// Handle storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(`💾 Storage changed: ${key} = ${oldValue} -> ${newValue}`);
      
      // Notify when recording mode changes
      if (key === 'recordingMode') {
        console.log("🎯 Recording mode changed:", oldValue, "->", newValue);
        showDesktopNotification({
          type: "modeChanged",
          mode: newValue
        });
      }
    }
  }
});

// Handle download events for recording files
chrome.downloads.onCreated.addListener((downloadItem) => {
  if (downloadItem.filename && downloadItem.filename.includes('teams-recording')) {
    console.log("💾 Recording download started:", downloadItem.filename);
    console.log("📁 Download ID:", downloadItem.id);
  }
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    chrome.downloads.search({id: delta.id}, (downloads) => {
      if (downloads[0] && downloads[0].filename.includes('teams-recording')) {
        console.log("✅ Recording download completed:", downloads[0].filename);
        console.log("📊 File size:", downloads[0].fileSize, "bytes");
        
        // Show download completed notification
        showDesktopNotification({
          type: "recordingDownloaded",
          timestamp: new Date().toLocaleTimeString(),
          filename: downloads[0].filename.split('/').pop() // Get just the filename
        });
      }
    });
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log("🔔 Notification clicked:", notificationId);
  // You can add specific actions when notifications are clicked
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log("🔔 Notification closed:", notificationId, "byUser:", byUser);
});

// Test notification function (for debugging)
function testNotification() {
  console.log("🧪 Testing Chrome notification...");
  
  chrome.notifications.create('test-notification-' + Date.now(), {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: '🎯 Test Notification',
    message: 'If you see this, Chrome notifications are working! Timestamp: ' + new Date().toLocaleTimeString()
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Notification failed:', chrome.runtime.lastError);
    } else {
      console.log('✅ Notification shown successfully:', notificationId);
    }
  });
}

// Uncomment to test notifications on startup
// setTimeout(testNotification, 2000);

console.log("🔧 Background script loaded successfully");
console.log("📋 Detection mode: Join button click (+3s delay) = Meeting Start, Leave button click = Meeting End");
console.log("🎯 Recording modes: Audio+Video, Audio Only, Video Only");
console.log("🔔 Desktop notifications: ENABLED with mode information");
console.log("⏰ Recording delay: 3 seconds after join button click");
