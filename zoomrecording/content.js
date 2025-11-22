let isInMeeting = false;
let recordingStarted = false;
let autoRecordEnabled = false;
let meetingStartTimeout = null;

// Check auto record permission on load
checkAutoRecordPermission();

async function checkAutoRecordPermission() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoRecordPermission'], (result) => {
      autoRecordEnabled = result.autoRecordPermission || false;
      console.log("🔐 Auto record enabled:", autoRecordEnabled);
      resolve(autoRecordEnabled);
    });
  });
}

// IMPROVED MEETING DETECTION
function startMeetingDetection() {
  console.log("🚀 Starting meeting detection...");
  
  let lastState = false;
  let detectionCount = 0;
  
  const detectionInterval = setInterval(() => {
    detectionCount++;
    
    // MULTIPLE DETECTION METHODS
    const meetingIndicators = [
      // Main meeting container
      document.querySelector('.main-body-layout_mainBody__YKEeP'),
      // Video container
      document.querySelector('.video-layout'),
      // Active speaker
      document.querySelector('.active-speaker'),
      // Gallery view
      document.querySelector('.gallery-view'),
      // Meeting container
      document.querySelector('[data-meeting="true"]'),
      // Video element with specific classes
      document.querySelector('.video-window')
    ].filter(el => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 300 && rect.height > 200;
    });

    const meetingDetected = meetingIndicators.length > 0;
    
    console.log("🔍 Meeting check:", {
      attempt: detectionCount,
      meetingDetected: meetingDetected,
      isInMeeting: isInMeeting,
      indicators: meetingIndicators.length
    });
    
    if (meetingDetected && !lastState && !isInMeeting) {
      console.log("🎯 MEETING STARTED DETECTED!");
      startMeetingWithDelay();
    } else if (!meetingDetected && lastState && isInMeeting) {
      console.log("🛑 MEETING ENDED DETECTED!");
      meetingEnded();
    }
    
    lastState = meetingDetected;
    
    // Stop detection after 30 attempts to prevent infinite loop
    if (detectionCount >= 30) {
      console.log("⏹️ Stopping meeting detection after 30 attempts");
      clearInterval(detectionInterval);
    }
  }, 3000);
}

// NUCLEAR OPTION - ABSOLUTELY CERTAIN END BUTTON DETECTION
function setupEndButtonDetection() {
  console.log("🖱️ NUCLEAR OPTION - Setting up ABSOLUTE End button detection...");

  // METHOD 1: INTERCEPT ALL BUTTON CLICKS ON THE ENTIRE PAGE
  document.addEventListener('click', function(event) {
    console.log("🖱️ NUCLEAR: Global click detected");
    
    const target = event.target;
    
    // Check if this is ANY button that could be leave/end related
    if (target.tagName === 'BUTTON') {
      const buttonText = (target.textContent || '').trim().toLowerCase();
      const buttonHtml = target.outerHTML.toLowerCase();
      
      console.log("🖱️ NUCLEAR: Button clicked - Text:", buttonText);
      
      // EXTREMELY BROAD DETECTION - catch ANY leave/end related button
      if (buttonText.includes('leave') || 
          buttonText.includes('end') ||
          buttonHtml.includes('leave') ||
          buttonHtml.includes('end') ||
          target.className.includes('leave') ||
          target.className.includes('end') ||
          target.id.includes('leave') ||
          target.id.includes('end')) {
        
        console.log("🎯 NUCLEAR: LEAVE/END BUTTON DETECTED!", buttonText);
        console.log("🔍 Button details:", {
          text: buttonText,
          className: target.className,
          id: target.id,
          html: target.outerHTML.substring(0, 200)
        });
        
        // STOP EVERYTHING IMMEDIATELY
        event.stopImmediatePropagation();
        event.preventDefault();
        
        // Force stop recording
        forceStopRecording();
        return;
      }
    }
    
    // Also check if click is inside a button
    const buttonParent = target.closest('button');
    if (buttonParent) {
      const buttonText = (buttonParent.textContent || '').trim().toLowerCase();
      console.log("🖱️ NUCLEAR: Click inside button - Text:", buttonText);
      
      if (buttonText.includes('leave') || buttonText.includes('end')) {
        console.log("🎯 NUCLEAR: LEAVE/END BUTTON (PARENT) DETECTED!", buttonText);
        event.stopImmediatePropagation();
        event.preventDefault();
        forceStopRecording();
        return;
      }
    }
  }, true); // CAPTURE PHASE - MOST AGGRESSIVE

  // METHOD 2: MONITOR URL CHANGES - WHEN MEETING ENDS, URL CHANGES
  let lastUrl = window.location.href;
  const urlChecker = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("🔗 NUCLEAR: URL changed from", lastUrl, "to", currentUrl);
      
      // If we were in a meeting and now we're not, stop recording
      if (isInMeeting && !currentUrl.includes('/wc/') && !currentUrl.includes('/meeting/')) {
        console.log("🛑 NUCLEAR: Meeting ended (URL change detected)");
        forceStopRecording();
      }
      
      lastUrl = currentUrl;
    }
  }, 1000);

  // METHOD 3: MONITOR PAGE VISIBILITY - WHEN USER LEAVES MEETING
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && isInMeeting && recordingStarted) {
      console.log("👻 NUCLEAR: Page hidden during meeting - stopping recording");
      setTimeout(() => {
        forceStopRecording();
      }, 2000);
    }
  });

  // METHOD 4: PERIODIC FORCE CHECK - EVERY 2 SECONDS CHECK IF WE SHOULD STOP
  const forceChecker = setInterval(() => {
    // Check if leave container is visible
    const leaveContainers = [
      '#wc-footer > div.footer__inner.leave-option-container',
      '.leave-option-container',
      '[class*="leave"]',
      '[class*="end"]'
    ];
    
    let leaveContainerVisible = false;
    leaveContainers.forEach(selector => {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) { // Check if visible
        console.log("🔍 NUCLEAR: Leave container visible:", selector);
        leaveContainerVisible = true;
      }
    });
    
    // If leave container is visible and we're recording, stop after delay
    if (leaveContainerVisible && recordingStarted) {
      console.log("🛑 NUCLEAR: Leave container detected - stopping recording in 3 seconds");
      setTimeout(() => {
        forceStopRecording();
      }, 3000);
    }
  }, 2000);

  console.log("✅ NUCLEAR OPTION: End button detection setup complete");
}

// FORCE STOP RECORDING - ABSOLUTELY CERTAIN STOP
function forceStopRecording() {
  console.log("🛑🛑🛑 NUCLEAR: FORCE STOP RECORDING 🛑🛑🛑");
  
  // Clear any timeouts
  if (meetingStartTimeout) {
    clearTimeout(meetingStartTimeout);
    meetingStartTimeout = null;
  }
  
  // Update states
  isInMeeting = false;
  
  if (recordingStarted) {
    console.log("🚨 NUCLEAR: Stopping active recording");
    recordingStarted = false;
    
    // Hide UI immediately
    hideRecordingPopup();
    hideRecordingTimer();
    
    // Send stop message to background
    chrome.runtime.sendMessage({ action: "autoStopRecording" }, (response) => {
      if (response && response.success) {
        console.log("✅ NUCLEAR: Recording stopped successfully");
        showRecordingNotification("stopped");
      } else {
        console.log("❌ NUCLEAR: Failed to stop via message, trying emergency stop");
        emergencyStop();
      }
    });
  } else {
    console.log("⚠️ NUCLEAR: No recording active, but cleaning up");
    hideRecordingPopup();
    hideRecordingTimer();
  }
  
  // Update storage
  chrome.storage.local.set({ isInMeeting: false });
}

// EMERGENCY STOP - WHEN NORMAL STOP FAILS
function emergencyStop() {
  console.log("🚨🚨🚨 EMERGENCY STOP 🚨🚨🚨");
  
  try {
    // Send multiple stop commands
    chrome.runtime.sendMessage({ action: "autoStopRecording" });
    chrome.runtime.sendMessage({ action: "stopAllRecordings" });
    chrome.runtime.sendMessage({ action: "emergencyStop" });
    
    // Force cleanup
    isInMeeting = false;
    recordingStarted = false;
    
    // Clear storage
    chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime']);
    
    // Hide all UI
    hideRecordingPopup();
    hideRecordingTimer();
    
    console.log("✅ EMERGENCY STOP: Completed");
  } catch (error) {
    console.error("❌ EMERGENCY STOP: Error:", error);
  }
}

function startMeetingWithDelay() {
  if (isInMeeting) {
    console.log("⚠️ Already in meeting, ignoring");
    return;
  }
  
  if (meetingStartTimeout) {
    clearTimeout(meetingStartTimeout);
  }
  
  console.log("⏰ Starting 3-second delay before recording...");
  
  meetingStartTimeout = setTimeout(() => {
    console.log("⏰ 3-second delay completed - starting meeting");
    meetingStarted();
  }, 3000);
}

function meetingStarted() {
  if (isInMeeting) return;
  
  console.log("🎯 MEETING STARTED");
  isInMeeting = true;
  
  if (autoRecordEnabled && !recordingStarted) {
    console.log("🎬 AUTO RECORDING STARTING");
    startAutoRecording();
  }
  
  showMeetingNotification("started");
  chrome.storage.local.set({ isInMeeting: isInMeeting });
}

function startAutoRecording() {
  if (recordingStarted) {
    console.log("⚠️ Already recording, ignoring start request");
    return;
  }
  
  console.log("🎬 Starting auto recording...");
  recordingStarted = true;
  
  showRecordingPopup();
  
  chrome.runtime.sendMessage({ 
    action: "autoStartRecording"
  }, (response) => {
    if (response && response.success) {
      console.log("✅ Recording started successfully");
      showRecordingNotification("started");
    } else {
      console.log("❌ Recording failed to start");
      recordingStarted = false;
      hideRecordingPopup();
    }
  });
}

function stopAutoRecording() {
  if (!recordingStarted) {
    console.log("⚠️ stopAutoRecording called but not recording");
    return;
  }
  
  console.log("🛑 Stopping recording and downloading...");
  
  // CLEAN UP ALL UI ELEMENTS
  hideRecordingPopup();
  hideRecordingTimer();
  
  chrome.runtime.sendMessage({ action: "autoStopRecording" }, (response) => {
    if (response && response.success) {
      console.log("✅ Recording stopped and download started successfully");
      recordingStarted = false;
      showRecordingNotification("stopped");
    } else {
      console.log("❌ Recording failed to stop");
      recordingStarted = false;
    }
  });
}

// UI FUNCTIONS
function showMeetingNotification(type) {
  const existingNotification = document.getElementById('meeting-status-notification');
  if (existingNotification) existingNotification.remove();

  const notification = document.createElement('div');
  notification.id = 'meeting-status-notification';
  
  const currentTime = new Date().toLocaleTimeString();
  
  if (type === "started") {
    notification.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: #4CAF50; color: white; padding: 12px 18px; border-radius: 8px;
      z-index: 10000; font-family: Arial; font-size: 14px; font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #45a049;
    `;
    notification.textContent = `🔴 Meeting Started - ${currentTime}`;
  } else {
    notification.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: #f44336; color: white; padding: 12px 18px; border-radius: 8px;
      z-index: 10000; font-family: Arial; font-size: 14px; font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #d32f2f;
    `;
    notification.textContent = `⏹️ Meeting Ended - ${currentTime}`;
  }
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function showRecordingNotification(type) {
  const notification = document.createElement('div');
  notification.id = 'recording-status-notification';
  notification.style.cssText = `
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    background: ${type === 'started' ? '#2196F3' : '#FF9800'}; color: white;
    padding: 8px 12px; border-radius: 5px; z-index: 9999; font-family: Arial;
    font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  notification.textContent = type === 'started' 
    ? '🔴 Recording Started' 
    : '⏹️ Recording Stopped - Downloading...';
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

function showRecordingPopup() {
  const existingPopup = document.getElementById('recording-live-popup');
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement('div');
  popup.id = 'recording-live-popup';
  popup.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; background: #d32f2f; color: white;
    padding: 12px 16px; border-radius: 8px; z-index: 10000; font-family: Arial;
    font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 2px solid #b71c1c; display: flex; align-items: center; gap: 8px;
    min-width: 180px;
  `;

  const redDot = document.createElement('div');
  redDot.style.cssText = `
    width: 12px; height: 12px; background: #ff4444; border-radius: 50%;
    animation: pulse 1.5s infinite;
  `;

  const text = document.createElement('span');
  text.id = 'recording-timer';
  text.textContent = '00:00';

  const recordingText = document.createElement('span');
  recordingText.textContent = 'Recording';

  popup.appendChild(redDot);
  popup.appendChild(text);
  popup.appendChild(recordingText);

  const style = document.createElement('style');
  style.textContent = `@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`;
  document.head.appendChild(style);

  document.body.appendChild(popup);
}

function updateRecordingTimer(time) {
  const timerElement = document.getElementById('recording-timer');
  if (timerElement) timerElement.textContent = time;
}

function hideRecordingPopup() {
  const popup = document.getElementById('recording-live-popup');
  if (popup) {
    console.log("🗑️ Removing recording popup");
    popup.remove();
  }
}

function hideRecordingTimer() {
  const timer = document.getElementById('recording-timer');
  if (timer) {
    console.log("🗑️ Removing recording timer");
    timer.remove();
  }
}

function resetRecordingState() {
  recordingStarted = false;
  isInMeeting = false;
  if (meetingStartTimeout) {
    clearTimeout(meetingStartTimeout);
    meetingStartTimeout = null;
  }
  hideRecordingPopup();
  hideRecordingTimer();
  console.log("🔄 Recording state reset");
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Content script received:", message.action);
  
  if (message.action === "updateAutoRecordPermission") {
    autoRecordEnabled = message.enabled;
    console.log("🔐 Auto record permission updated:", autoRecordEnabled);
    sendResponse({ success: true });
  }

  if (message.action === "checkMeetingStatus") {
    sendResponse({ 
      isInMeeting: isInMeeting, 
      recording: recordingStarted,
      autoRecordEnabled: autoRecordEnabled
    });
  }

  if (message.action === "updateRecordingTimer") {
    updateRecordingTimer(message.time);
    sendResponse({ success: true });
  }

  if (message.action === "showRecordingPopup") {
    showRecordingPopup();
    sendResponse({ success: true });
  }

  if (message.action === "hideRecordingPopup") {
    hideRecordingPopup();
    sendResponse({ success: true });
  }
  
  return true;
});

// Page load detection
window.addEventListener('load', () => {
  console.log("🔄 Page loaded - resetting recording states");
  resetRecordingState();
  checkAutoRecordPermission().then(() => {
    console.log("🔄 Auto record permission rechecked:", autoRecordEnabled);
  });
});

// Initial setup
setTimeout(() => {
  console.log("🔧 Starting Auto Recorder...");
  startMeetingDetection();
  setupEndButtonDetection();
  console.log("✅ Auto Recorder initialized");
}, 1000);

console.log("🔍 Auto Recorder content script loaded");













