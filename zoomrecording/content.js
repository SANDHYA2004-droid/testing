






// let isInMeeting = false;
// let recordingStarted = false;
// let autoRecordEnabled = false;
// let meetingStartTimeout = null;
// let pageLoaded = false;

// // Check auto record permission on load
// checkAutoRecordPermission();

// async function checkAutoRecordPermission() {
//   return new Promise((resolve) => {
//     chrome.storage.local.get(['autoRecordPermission'], (result) => {
//       autoRecordEnabled = result.autoRecordPermission || false;
//       console.log("🔐 Auto record enabled:", autoRecordEnabled);
//       resolve(autoRecordEnabled);
//     });
//   });
// }

// // WAIT FOR PAGE TO FULLY LOAD
// function waitForPageLoad() {
//   console.log("⏳ Waiting for page to fully load...");
  
//   if (document.readyState === 'complete') {
//     console.log("✅ Page already loaded");
//     pageLoaded = true;
//     startVideoPlayerDetection();
//     return;
//   }
  
//   window.addEventListener('load', () => {
//     console.log("✅ Page fully loaded");
//     pageLoaded = true;
//     // Additional delay to ensure Zoom loads completely
//     setTimeout(() => {
//       startVideoPlayerDetection();
//     }, 3000);
//   });
  
//   // Fallback: Start detection after 10 seconds regardless
//   setTimeout(() => {
//     if (!pageLoaded) {
//       console.log("⏰ Fallback: Starting detection after 10s timeout");
//       pageLoaded = true;
//       startVideoPlayerDetection();
//     }
//   }, 10000);
// }

// // DETECT MEETING USING MAIN CONTAINER
// function startVideoPlayerDetection() {
//   console.log("🚀 Starting main container detection...");
  
//   let lastState = false;
//   let detectionCount = 0;
  
//   const detectionInterval = setInterval(() => {
//     detectionCount++;
    
//     // PRIMARY DETECTION: Main meeting container
//     const mainContainer = document.querySelector('.main-body-layout_mainBody__YKEeP');
//     const containerExists = !!mainContainer;
    
//     // SECONDARY DETECTION: Check if container is large (indicating active meeting)
//     let containerVisible = false;
//     if (mainContainer) {
//       const rect = mainContainer.getBoundingClientRect();
//       containerVisible = rect.width > 500 && rect.height > 300;
//     }
    
//     // TERTIARY DETECTION: Meeting buttons
//     const leaveButtons = document.querySelectorAll('button[aria-label*="Leave"], button[aria-label*="End"]');
    
//     // FINAL CHECK: We're in a meeting if container exists AND is large
//     const meetingDetected = containerExists && containerVisible;
    
//     console.log("🔍 Main container check:", {
//       attempt: detectionCount,
//       containerExists: containerExists,
//       containerVisible: containerVisible,
//       leaveButtons: leaveButtons.length,
//       meetingDetected: meetingDetected,
//       wasInMeeting: lastState,
//       isInMeetingNow: isInMeeting
//     });
    
//     // Debug details when container exists
//     if (mainContainer) {
//       const rect = mainContainer.getBoundingClientRect();
//       console.log("📦 Container details:", {
//         width: rect.width,
//         height: rect.height,
//         children: mainContainer.children.length
//       });
//     }
    
//     if (meetingDetected && !lastState && !isInMeeting) {
//       console.log("🎯 MAIN CONTAINER ACTIVE - MEETING STARTED!");
//       startMeetingWithDelay();
//     } else if (!meetingDetected && lastState && isInMeeting) {
//       console.log("🛑 MAIN CONTAINER INACTIVE - MEETING ENDED!");
//       meetingEnded();
//     }
    
//     // Stop detection after meeting is found or 50 attempts
//     if ((meetingDetected && isInMeeting) || detectionCount >= 50) {
//       console.log("⏹️ Stopping container detection");
//       clearInterval(detectionInterval);
//     }
    
//     lastState = meetingDetected;
//   }, 2000);
// }

// // COMPREHENSIVE LEAVE BUTTON DETECTION
// function setupLeaveButtonDetection() {
//   console.log("🖱️ Setting up comprehensive leave button detection...");
  
//   document.addEventListener('click', (event) => {
//     let target = event.target;
    
//     while (target && target !== document.body) {
//       const text = target.textContent || '';
//       const ariaLabel = target.getAttribute('aria-label') || '';
//       const className = target.className || '';
      
//       // Check for End/Leave buttons in multiple ways
//       if ((text.includes('End') || 
//            text.includes('Leave') || 
//            ariaLabel.includes('End') || 
//            ariaLabel.includes('Leave') ||
//            className.includes('leave') ||
//            className.includes('end')) && 
//           target.tagName === 'BUTTON') {
        
//         console.log("🎯 LEAVE/END BUTTON CLICKED - STOPPING RECORDING");
        
//         if (meetingStartTimeout) {
//           clearTimeout(meetingStartTimeout);
//           meetingStartTimeout = null;
//         }
        
//         meetingEnded();
//         break;
//       }
//       target = target.parentElement;
//     }
//   }, true);
// }

// function startMeetingWithDelay() {
//   if (isInMeeting) {
//     console.log("⚠️ Already in meeting, ignoring");
//     return;
//   }

//   if (meetingStartTimeout) {
//     clearTimeout(meetingStartTimeout);
//   }
  
//   console.log("⏰ Starting 3-second delay before recording...");
  
//   meetingStartTimeout = setTimeout(() => {
//     console.log("⏰ 3-second delay completed - starting meeting");
//     meetingStarted();
//   }, 3000);
// }

// function meetingStarted() {
//   if (isInMeeting) return;
  
//   const startTime = new Date().toLocaleTimeString();
//   console.log(`🎯 MEETING STARTED at ${startTime}`);
//   console.log(`🔐 Auto record: ${autoRecordEnabled}`);
  
//   isInMeeting = true;
//   recordingStarted = false;
  
//   if (autoRecordEnabled && !recordingStarted) {
//     console.log("🎬 AUTO RECORDING STARTING");
//     startAutoRecording();
//   }
  
//   showMeetingNotification("started");
//   chrome.storage.local.set({ isInMeeting: isInMeeting });
// }

// function meetingEnded() {
//   if (!isInMeeting) return;
  
//   const endTime = new Date().toLocaleTimeString();
//   console.log(`🎯 MEETING ENDED at ${endTime}`);
//   isInMeeting = false;
  
//   if (recordingStarted) {
//     console.log("⏹️ STOPPING RECORDING");
//     stopAutoRecording();
//   }
  
//   recordingStarted = false;
//   showMeetingNotification("ended");
//   chrome.storage.local.set({ isInMeeting: isInMeeting });
// }

// function startAutoRecording() {
//   if (recordingStarted) return;
  
//   console.log("🎬 Starting auto recording...");
//   recordingStarted = true;
  
//   showRecordingPopup();
  
//   chrome.runtime.sendMessage({ 
//     action: "autoStartRecording"
//   }, (response) => {
//     if (response && response.success) {
//       console.log("✅ Recording started successfully");
//       showRecordingNotification("started");
//     } else {
//       console.log("❌ Recording failed to start");
//       recordingStarted = false;
//       hideRecordingPopup();
//     }
//   });
// }

// function stopAutoRecording() {
//   if (!recordingStarted) return;
  
//   console.log("🛑 Stopping recording...");
  
//   hideRecordingPopup();
  
//   chrome.runtime.sendMessage({ action: "autoStopRecording" }, (response) => {
//     if (response && response.success) {
//       console.log("✅ Recording stopped successfully");
//       recordingStarted = false;
//       showRecordingNotification("stopped");
//     } else {
//       console.log("❌ Recording failed to stop");
//     }
//   });
// }

// function resetRecordingState() {
//   recordingStarted = false;
//   isInMeeting = false;
//   if (meetingStartTimeout) {
//     clearTimeout(meetingStartTimeout);
//     meetingStartTimeout = null;
//   }
//   hideRecordingPopup();
//   console.log("🔄 Recording state reset");
// }

// function showMeetingNotification(type) {
//   const existingNotification = document.getElementById('meeting-status-notification');
//   if (existingNotification) existingNotification.remove();

//   const notification = document.createElement('div');
//   notification.id = 'meeting-status-notification';
  
//   const currentTime = new Date().toLocaleTimeString();
  
//   if (type === "started") {
//     notification.style.cssText = `
//       position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
//       background: #4CAF50; color: white; padding: 12px 18px; border-radius: 8px;
//       z-index: 10000; font-family: Arial; font-size: 14px; font-weight: bold;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #45a049;
//     `;
//     notification.textContent = `🔴 Meeting Started - ${currentTime}`;
//   } else {
//     notification.style.cssText = `
//       position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
//       background: #f44336; color: white; padding: 12px 18px; border-radius: 8px;
//       z-index: 10000; font-family: Arial; font-size: 14px; font-weight: bold;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #d32f2f;
//     `;
//     notification.textContent = `⏹️ Meeting Ended - ${currentTime}`;
//   }
  
//   document.body.appendChild(notification);
//   setTimeout(() => notification.remove(), 5000);
// }

// function showRecordingNotification(type) {
//   const notification = document.createElement('div');
//   notification.id = 'recording-status-notification';
//   notification.style.cssText = `
//     position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
//     background: ${type === 'started' ? '#2196F3' : '#FF9800'}; color: white;
//     padding: 8px 12px; border-radius: 5px; z-index: 9999; font-family: Arial;
//     font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
//   `;
//   notification.textContent = type === 'started' 
//     ? '🔴 Recording Started' 
//     : '⏹️ Recording Stopped - Downloading...';
  
//   document.body.appendChild(notification);
//   setTimeout(() => notification.remove(), 4000);
// }

// function showRecordingPopup() {
//   const existingPopup = document.getElementById('recording-live-popup');
//   if (existingPopup) existingPopup.remove();

//   const popup = document.createElement('div');
//   popup.id = 'recording-live-popup';
//   popup.style.cssText = `
//     position: fixed; bottom: 20px; right: 20px; background: #d32f2f; color: white;
//     padding: 12px 16px; border-radius: 8px; z-index: 10000; font-family: Arial;
//     font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
//     border: 2px solid #b71c1c; display: flex; align-items: center; gap: 8px;
//     min-width: 180px;
//   `;

//   const redDot = document.createElement('div');
//   redDot.style.cssText = `
//     width: 12px; height: 12px; background: #ff4444; border-radius: 50%;
//     animation: pulse 1.5s infinite;
//   `;

//   const text = document.createElement('span');
//   text.id = 'recording-timer';
//   text.textContent = '00:00';

//   const recordingText = document.createElement('span');
//   recordingText.textContent = 'Recording';

//   popup.appendChild(redDot);
//   popup.appendChild(text);
//   popup.appendChild(recordingText);

//   const style = document.createElement('style');
//   style.textContent = `@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`;
//   document.head.appendChild(style);

//   document.body.appendChild(popup);
// }

// function updateRecordingTimer(time) {
//   const timerElement = document.getElementById('recording-timer');
//   if (timerElement) timerElement.textContent = time;
// }

// function hideRecordingPopup() {
//   const popup = document.getElementById('recording-live-popup');
//   if (popup) popup.remove();
// }

// // Listen for messages
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log("📨 Content script received:", message.action);
  
//   if (message.action === "updateAutoRecordPermission") {
//     autoRecordEnabled = message.enabled;
//     console.log("🔐 Auto record permission updated:", autoRecordEnabled);
//     sendResponse({ success: true });
//   }

//   if (message.action === "checkMeetingStatus") {
//     sendResponse({ 
//       isInMeeting: isInMeeting, 
//       recording: recordingStarted,
//       autoRecordEnabled: autoRecordEnabled
//     });
//   }

//   if (message.action === "updateRecordingTimer") {
//     updateRecordingTimer(message.time);
//     sendResponse({ success: true });
//   }

//   if (message.action === "showRecordingPopup") {
//     showRecordingPopup();
//     sendResponse({ success: true });
//   }

//   if (message.action === "hideRecordingPopup") {
//     hideRecordingPopup();
//     sendResponse({ success: true });
//   }
  
//   return true;
// });

// // Page load detection
// window.addEventListener('load', () => {
//   console.log("🔄 Page loaded - resetting recording states");
//   resetRecordingState();
//   checkAutoRecordPermission().then(() => {
//     console.log("🔄 Auto record permission rechecked:", autoRecordEnabled);
//   });
// });

// // Initial setup
// setTimeout(() => {
//   console.log("🔧 Starting Auto Recorder...");
//   waitForPageLoad();
//   setupLeaveButtonDetection();
//   console.log("✅ Auto Recorder initialized");
//   console.log("📋 Detection: Main container active = Start, Leave button click = Stop");
// }, 1000);

// console.log("🔍 Auto Recorder content script loaded");












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
  
  const detectionInterval = setInterval(() => {
    // MULTIPLE DETECTION METHODS
    const meetingIndicators = [
      // Main meeting container
      document.querySelector('.main-body-layout_mainBody__YKEeP'),
      // Video container
      document.querySelector('.video-layout'),
      // Active speaker
      document.querySelector('.active-speaker'),
      // Gallery view
      document.querySelector('.gallery-view')
    ].filter(el => el && el.getBoundingClientRect().width > 300);

    const meetingDetected = meetingIndicators.length > 0;
    
    console.log("🔍 Meeting check:", {
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
  }, 3000);
}

// IMPROVED END BUTTON DETECTION
function setupEndButtonDetection() {
  console.log("🖱️ Setting up improved End button detection...");
  
  function checkAndSetupEndButtons() {
    // METHOD 1: Check for leave option container
    const leaveContainer = document.querySelector('#wc-footer > div.footer__inner.leave-option-container');
    
    if (leaveContainer && leaveContainer.style.display !== 'none') {
      console.log("✅ Leave options container is visible");
      
      // Wait a bit for buttons to render
      setTimeout(() => {
        // METHOD 2: Direct button text search in the container
        const buttons = leaveContainer.querySelectorAll('button');
        console.log(`🔍 Found ${buttons.length} buttons in leave container`);
        
        buttons.forEach((button, index) => {
          const buttonText = (button.textContent || '').trim();
          console.log(`Button ${index}: "${buttonText}"`);
          
          if ((buttonText.includes('Leave') || buttonText.includes('End')) && 
              !button.hasAttribute('data-recorder-listener')) {
            
            console.log(`✅ Setting up listener for: "${buttonText}"`);
            button.setAttribute('data-recorder-listener', 'true');
            
            button.addEventListener('click', function() {
              console.log(`🎯 "${buttonText}" BUTTON CLICKED - STOPPING RECORDING!`);
              stopRecording();
            });
          }
        });
      }, 100);
    }
  }

  // METHOD 3: Global click listener - MOST RELIABLE
  document.addEventListener('click', function(event) {
    const target = event.target;
    const button = target.closest('button');
    
    if (button) {
      const buttonText = (button.textContent || '').trim();
      
      // Check if this is a leave/end button
      if (buttonText.includes('Leave meeting') || 
          buttonText.includes('End meeting for all') ||
          buttonText === 'Leave' || 
          buttonText === 'End') {
        
        console.log(`🎯 GLOBAL CLICK DETECTED: "${buttonText}" - STOPPING RECORDING!`);
        stopRecording();
      }
    }
  }, true);

  // METHOD 4: Observer for leave container appearance
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // Check if leave container appeared
            if (node.matches && node.matches('#wc-footer > div.footer__inner.leave-option-container')) {
              console.log("🔄 Leave container appeared - setting up listeners");
              checkAndSetupEndButtons();
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // METHOD 5: Also check URL changes (when meeting truly ends)
  let lastUrl = location.href;
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log("🔗 URL changed:", currentUrl);
      lastUrl = currentUrl;
      
      // If URL changes from meeting to non-meeting page, stop recording
      if (isInMeeting && !currentUrl.includes('/wc/') && !currentUrl.includes('/meeting/')) {
        console.log("🛑 Meeting ended (URL change detected)");
        stopRecording();
      }
    }
  }, 2000);

  // Initial check
  checkAndSetupEndButtons();
  setInterval(checkAndSetupEndButtons, 2000);
}

function startMeetingWithDelay() {
  if (isInMeeting) return;
  
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

function stopRecording() {
  console.log("🛑 STOP RECORDING CALLED");
  
  if (meetingStartTimeout) {
    clearTimeout(meetingStartTimeout);
    meetingStartTimeout = null;
  }
  
  if (isInMeeting) {
    meetingEnded();
  } else {
    console.log("⚠️ Not in meeting, but stopping recording anyway");
    // Force stop recording even if meeting state is wrong
    if (recordingStarted) {
      stopAutoRecording();
    }
  }
}

function meetingEnded() {
  if (!isInMeeting) return;
  
  console.log("🎯 MEETING ENDED");
  isInMeeting = false;
  
  if (recordingStarted) {
    console.log("⏹️ STOPPING RECORDING AND DOWNLOADING");
    stopAutoRecording();
  }
  
  recordingStarted = false;
  showMeetingNotification("ended");
  
  // CLEAN UP UI IMMEDIATELY
  hideRecordingPopup();
  hideRecordingTimer();
  
  chrome.storage.local.set({ isInMeeting: isInMeeting });
}

function startAutoRecording() {
  if (recordingStarted) return;
  
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
  if (!recordingStarted) return;
  
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

// Initial setup
setTimeout(() => {
  console.log("🔧 Starting Auto Recorder...");
  startMeetingDetection();
  setupEndButtonDetection();
  console.log("✅ Auto Recorder initialized");
}, 1000);

console.log("🔍 Auto Recorder content script loaded");