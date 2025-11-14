// let userPermissionGranted = false;
// let currentRecordingTab = null;

// // Load saved permission state
// chrome.storage.local.get(['autoRecordPermission'], (result) => {
//   userPermissionGranted = result.autoRecordPermission || false;
//   console.log("🔐 Auto record permission:", userPermissionGranted);
// });

// // Listen for tab updates to detect Zoom pages
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === "complete" && isZoomTab(tab.url)) {
//     console.log("✅ Zoom tab detected:", tabId, tab.url);
    
//     // Check if user has given permission for auto recording
//     chrome.storage.local.get(['autoRecordPermission'], (result) => {
//       if (result.autoRecordPermission) {
//         console.log("🎬 Auto recording enabled - Waiting for Join button click...");
        
//         // Wait for content script to initialize
//         setTimeout(() => {
//           chrome.tabs.sendMessage(tabId, { action: "checkMeetingStatus" }, (response) => {
//             if (chrome.runtime.lastError) {
//               console.log("⚠️ Content script not ready yet, will detect meeting when Join button is clicked");
//               return;
//             }
            
//             if (response && response.isInMeeting && !response.recording) {
//               console.log("✅ Meeting already in progress - starting auto recording");
//               startRecordingForTab(tabId);
//             }
//           });
//         }, 3000);
//       }
//     });
//   }
// });

// function isZoomTab(url) {
//   return url && (url.includes("zoom.us") || url.includes("zoom.com"));
// }

// // Handle permission messages
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log("📨 Background received:", message.action);
  
//   if (message.action === "grantAutoRecordPermission") {
//     console.log("✅ User granted auto recording permission");
//     userPermissionGranted = true;
//     chrome.storage.local.set({ autoRecordPermission: true }, () => {
//       // Notify all Zoom tabs about permission change
//       chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//         tabs.forEach(tab => {
//           chrome.tabs.sendMessage(tab.id, {
//             action: "updateAutoRecordPermission",
//             enabled: true
//           });
//         });
//       });
//     });
//     sendResponse({ success: true });
//   }
  
//   if (message.action === "revokeAutoRecordPermission") {
//     console.log("❌ User revoked auto recording permission");
//     userPermissionGranted = false;
//     chrome.storage.local.set({ autoRecordPermission: false }, () => {
//       // Notify all Zoom tabs about permission change
//       chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//         tabs.forEach(tab => {
//           chrome.tabs.sendMessage(tab.id, {
//             action: "updateAutoRecordPermission",
//             enabled: false
//           });
//         });
//       });
//     });
//     sendResponse({ success: true });
//   }
  
//   if (message.action === "getAutoRecordPermission") {
//     sendResponse({ permission: userPermissionGranted });
//   }

//   if (message.action === "autoStartRecording") {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`🎬 Auto starting recording - Join button clicked (+3s delay completed) at ${timestamp}`);
//     console.log("📍 Source tab:", sender.tab.id, sender.tab.url);
    
//     // Start recording immediately
//     startRecordingForTab(sender.tab.id);
    
//     sendResponse({ success: true });
//   }

//   if (message.action === "autoStopRecording") {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`🛑 Auto stopping recording - Leave button clicked (Meeting ended) at ${timestamp}`);
//     console.log("📍 Source tab:", sender.tab.id);
//     stopAllRecordings();
//     sendResponse({ success: true });
//   }

//   if (message.action === "checkMeetingStatus") {
//     chrome.tabs.sendMessage(sender.tab.id, { action: "checkMeetingStatus" }, (response) => {
//       if (chrome.runtime.lastError) {
//         console.log("❌ Cannot check meeting status:", chrome.runtime.lastError);
//         sendResponse({ error: "Content script not ready" });
//         return;
//       }
//       sendResponse(response);
//     });
//     return true;
//   }

//   if (message.action === "recordingStarted") {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`✅ Recording started successfully at ${timestamp}`);
//     console.log("📊 Recording tab:", sender.tab.id);
//     currentRecordingTab = sender.tab.id;
    
//     // Update storage
//     chrome.storage.local.set({ 
//       isRecording: true,
//       recordingStartTime: Date.now(),
//       recordingTabId: sender.tab.id
//     });
    
//     sendResponse({ success: true });
//   }

//   if (message.action === "recordingStopped") {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`✅ Recording stopped successfully at ${timestamp}`);
//     console.log("📊 Was recording tab:", sender.tab.id);
//     currentRecordingTab = null;
    
//     // Update storage
//     chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
    
//     sendResponse({ success: true });
//   }

//   if (message.action === "timerUpdate") {
//     // Update recording time in storage
//     chrome.storage.local.set({ recordingTime: message.time });
    
//     // Forward timer update to all Zoom tabs for the popup
//     chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//       tabs.forEach(tab => {
//         chrome.tabs.sendMessage(tab.id, {
//           action: "updateRecordingTimer",
//           time: message.time
//         });
//       });
//     });
    
//     sendResponse({ success: true });
//   }

//   if (message.action === "updateRecordingTimer") {
//     // Forward timer update to all Zoom tabs for the popup
//     chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//       tabs.forEach(tab => {
//         chrome.tabs.sendMessage(tab.id, {
//           action: "updateRecordingTimer",
//           time: message.time
//         });
//       });
//     });
//     sendResponse({ success: true });
//   }

//   if (message.action === "showRecordingPopup") {
//     // Show popup in all Zoom tabs
//     chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//       tabs.forEach(tab => {
//         chrome.tabs.sendMessage(tab.id, {
//           action: "showRecordingPopup"
//         });
//       });
//     });
//     sendResponse({ success: true });
//   }

//   if (message.action === "hideRecordingPopup") {
//     // Hide popup in all Zoom tabs
//     chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//       tabs.forEach(tab => {
//         chrome.tabs.sendMessage(tab.id, {
//           action: "hideRecordingPopup"
//         });
//       });
//     });
//     sendResponse({ success: true });
//   }
  
//   return true;
// });

// function startRecordingForTab(tabId) {
//   // Check if already recording in ANY tab (not just currentRecordingTab)
//   chrome.storage.local.get(['isRecording'], (result) => {
//     if (result.isRecording) {
//       console.log("⚠️ Already recording in another tab, ignoring auto-record request");
//       return;
//     }

//     console.log("🎬 Starting AUTO recording for Zoom tab:", tabId);
    
//     // Show recording popup in Zoom tab
//     chrome.tabs.sendMessage(tabId, {
//       action: "showRecordingPopup"
//     });
    
//     // Create a new tab for recording
//     chrome.tabs.create({
//       url: chrome.runtime.getURL("recorder.html"),
//       active: false
//     }, (recorderTab) => {
//       console.log("✅ Recorder tab opened for auto recording:", recorderTab.id);
      
//       const startRecording = (retryCount = 0) => {
//         chrome.tabs.sendMessage(recorderTab.id, { 
//           action: "startRecording", 
//           tabId: tabId,
//           autoRecord: true  // This flag is important
//         }, (response) => {
//           if (chrome.runtime.lastError) {
//             console.log(`❌ Recorder tab not ready (attempt ${retryCount + 1}/3), retrying...`);
//             if (retryCount < 2) {
//               setTimeout(() => startRecording(retryCount + 1), 1000);
//             } else {
//               console.error("❌ Failed to start auto recording after 3 attempts");
//               chrome.tabs.remove(recorderTab.id);
//               chrome.tabs.sendMessage(tabId, { action: "hideRecordingPopup" });
              
//               // Send failure response back to content script
//               chrome.tabs.sendMessage(tabId, {
//                 action: "autoRecordingFailed"
//               });
//             }
//           } else {
//             console.log("✅ Auto recording started successfully");
//             currentRecordingTab = tabId;
//           }
//         });
//       };
      
//       // Give recorder tab more time to load
//       setTimeout(() => startRecording(), 2000);
//     });
//   });
// }

// function stopAllRecordings() {
//   console.log("🛑 Stopping all recordings");
  
//   // Hide recording popup in all Zoom tabs
//   chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
//     tabs.forEach(tab => {
//       chrome.tabs.sendMessage(tab.id, {
//         action: "hideRecordingPopup"
//       });
//     });
//   });
  
//   // Find and stop all recorder tabs
//   chrome.tabs.query({ url: chrome.runtime.getURL("recorder.html") }, (tabs) => {
//     if (tabs.length > 0) {
//       console.log(`🛑 Stopping ${tabs.length} recorder tab(s)`);
//       tabs.forEach(tab => {
//         chrome.tabs.sendMessage(tab.id, { action: "stopRecording" });
//       });
//     } else {
//       console.log("⚠️ No recorder tabs found");
//     }
//   });
  
//   currentRecordingTab = null;
  
//   // Clear storage
//   chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
// }

// // Monitor tab closures
// chrome.tabs.onRemoved.addListener((tabId) => {
//   if (tabId === currentRecordingTab) {
//     console.log("🛑 Recording source tab closed - stopping recording");
//     stopAllRecordings();
//   }
  
//   // Also check if it's a recorder tab
//   chrome.tabs.get(tabId, (tab) => {
//     if (chrome.runtime.lastError) return;
    
//     if (tab.url && tab.url.includes("recorder.html")) {
//       console.log("🛑 Recorder tab closed - cleaning up");
//       chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
//       currentRecordingTab = null;
//     }
//   });
// });

// // Handle extension installation or update
// chrome.runtime.onInstalled.addListener((details) => {
//   console.log("🔧 Extension installed/updated:", details.reason);
  
//   if (details.reason === 'install') {
//     // Set default permissions
//     chrome.storage.local.set({ autoRecordPermission: false });
//     console.log("🔐 Auto recording disabled by default");
//   }
// });

// // Keep service worker alive during recordings
// setInterval(() => {
//   chrome.runtime.getPlatformInfo(() => {
//     if (currentRecordingTab) {
//       // Log keep-alive every 30 seconds during recording
//       if (Math.floor(Date.now() / 1000) % 30 === 0) {
//         console.log("💓 Service worker keep-alive (Recording active)");
//       }
//     }
//   });
// }, 10000);

// console.log("🔧 Background script loaded successfully");
// console.log("📋 Detection mode: Join button click (+3s delay) = Meeting Start, Leave button click = Meeting End");
















let userPermissionGranted = false;
let currentRecordingTab = null;
let recordingStartTime = null;

// Load saved permission state
chrome.storage.local.get(['autoRecordPermission'], (result) => {
  userPermissionGranted = result.autoRecordPermission || false;
  console.log("🔐 Auto record permission:", userPermissionGranted);
});

// Listen for tab updates to detect Zoom pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isZoomTab(tab.url)) {
    console.log("✅ Zoom tab detected:", tabId, tab.url);
    
    // Reset recording state when Zoom page loads
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: "hideRecordingPopup" }, () => {
        if (chrome.runtime.lastError) {
          // Content script not ready yet, ignore
        }
      });
    }, 1000);
    
    // Check if user has given permission for auto recording
    chrome.storage.local.get(['autoRecordPermission'], (result) => {
      if (result.autoRecordPermission) {
        console.log("🎬 Auto recording enabled - Waiting for meeting detection...");
        
        // Wait for content script to initialize
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: "checkMeetingStatus" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("⚠️ Content script not ready yet");
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
  
  // If tab URL changes from Zoom to non-Zoom, stop recording
  if (changeInfo.url) {
    const wasZoom = isZoomTab(changeInfo.url);
    const isZoom = isZoomTab(tab.url);
    
    if (wasZoom && !isZoom && currentRecordingTab === tabId) {
      console.log("🛑 Tab navigated away from Zoom - stopping recording");
      stopAllRecordings();
    }
  }
});

function isZoomTab(url) {
  return url && (url.includes("zoom.us") || url.includes("zoom.com"));
}

// Handle permission messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background received:", message.action);
  
  if (message.action === "grantAutoRecordPermission") {
    console.log("✅ User granted auto recording permission");
    userPermissionGranted = true;
    chrome.storage.local.set({ autoRecordPermission: true }, () => {
      // Notify all Zoom tabs about permission change
      chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateAutoRecordPermission",
            enabled: true
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
      // Notify all Zoom tabs about permission change
      chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateAutoRecordPermission",
            enabled: false
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
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎬 Auto starting recording at ${timestamp}`);
    console.log("📍 Source tab:", sender.tab.id, sender.tab.url);
    
    // Start recording immediately
    startRecordingForTab(sender.tab.id);
    
    sendResponse({ success: true });
  }

  if (message.action === "autoStopRecording") {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🛑 Auto stopping recording at ${timestamp}`);
    console.log("📍 Source tab:", sender.tab.id);
    
    // HIDE ALL UI IMMEDIATELY in all Zoom tabs
    chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "hideRecordingPopup"
        }, () => {
          // Ignore errors if content script isn't ready
        });
      });
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
    const timestamp = new Date().toLocaleTimeString();
    console.log(`✅ Recording started successfully at ${timestamp}`);
    console.log("📊 Recording tab:", sender.tab.id);
    currentRecordingTab = sender.tab.id;
    recordingStartTime = Date.now();
    
    // Update storage
    chrome.storage.local.set({ 
      isRecording: true,
      recordingStartTime: recordingStartTime,
      recordingTabId: sender.tab.id
    });
    
    sendResponse({ success: true });
  }

  if (message.action === "recordingStopped") {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`✅ Recording stopped successfully at ${timestamp}`);
    console.log("📊 Was recording tab:", sender.tab.id);
    
    // Calculate recording duration
    const duration = recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : 0;
    console.log(`⏱️ Recording duration: ${duration} seconds`);
    
    currentRecordingTab = null;
    recordingStartTime = null;
    
    // Update storage
    chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
    
    sendResponse({ success: true });
  }

  if (message.action === "timerUpdate") {
    // Update recording time in storage
    chrome.storage.local.set({ recordingTime: message.time });
    
    // Forward timer update to all Zoom tabs for the popup
    chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "updateRecordingTimer",
          time: message.time
        }, () => {
          // Ignore errors
        });
      });
    });
    
    sendResponse({ success: true });
  }

  if (message.action === "updateRecordingTimer") {
    // Forward timer update to all Zoom tabs for the popup
    chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "updateRecordingTimer",
          time: message.time
        }, () => {
          // Ignore errors
        });
      });
    });
    sendResponse({ success: true });
  }

  if (message.action === "showRecordingPopup") {
    // Show popup in all Zoom tabs
    chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "showRecordingPopup"
        }, () => {
          // Ignore errors
        });
      });
    });
    sendResponse({ success: true });
  }

  if (message.action === "hideRecordingPopup") {
    // Hide popup in all Zoom tabs
    chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "hideRecordingPopup"
        }, () => {
          // Ignore errors
        });
      });
    });
    sendResponse({ success: true });
  }
  
  return true;
});

function startRecordingForTab(tabId) {
  // Check if already recording
  chrome.storage.local.get(['isRecording'], (result) => {
    if (result.isRecording) {
      console.log("⚠️ Already recording in another tab, ignoring auto-record request");
      return;
    }

    console.log("🎬 Starting AUTO recording for Zoom tab:", tabId);
    
    // Show recording popup in Zoom tab immediately
    chrome.tabs.sendMessage(tabId, {
      action: "showRecordingPopup"
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("⚠️ Could not show recording popup (content script not ready)");
      }
    });
    
    // Create a new tab for recording
    chrome.tabs.create({
      url: chrome.runtime.getURL("recorder.html"),
      active: false
    }, (recorderTab) => {
      console.log("✅ Recorder tab opened for auto recording:", recorderTab.id);
      
      const startRecording = (retryCount = 0) => {
        chrome.tabs.sendMessage(recorderTab.id, { 
          action: "startRecording", 
          tabId: tabId,
          autoRecord: true
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`❌ Recorder tab not ready (attempt ${retryCount + 1}/3), retrying...`);
            if (retryCount < 2) {
              setTimeout(() => startRecording(retryCount + 1), 1000);
            } else {
              console.error("❌ Failed to start auto recording after 3 attempts");
              
              // Clean up - remove recorder tab and hide UI
              chrome.tabs.remove(recorderTab.id);
              chrome.tabs.sendMessage(tabId, { action: "hideRecordingPopup" });
              
              // Send failure response back to content script
              chrome.tabs.sendMessage(tabId, {
                action: "autoRecordingFailed"
              });
            }
          } else {
            console.log("✅ Auto recording started successfully");
            currentRecordingTab = tabId;
          }
        });
      };
      
      // Give recorder tab time to load
      setTimeout(() => startRecording(), 2000);
    });
  });
}

function stopAllRecordings() {
  console.log("🛑 Stopping all recordings");
  
  // Hide recording popup in all Zoom tabs
  chrome.tabs.query({url: ["https://*.zoom.us/*", "https://zoom.us/*"]}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: "hideRecordingPopup"
      }, () => {
        // Ignore errors
      });
    });
  });
  
  // Find and stop all recorder tabs
  chrome.tabs.query({ url: chrome.runtime.getURL("recorder.html") }, (tabs) => {
    if (tabs.length > 0) {
      console.log(`🛑 Stopping ${tabs.length} recorder tab(s)`);
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "stopRecording" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("⚠️ Could not stop recorder tab:", chrome.runtime.lastError);
            // Force remove the tab if we can't communicate with it
            chrome.tabs.remove(tab.id);
          }
        });
      });
    } else {
      console.log("⚠️ No recorder tabs found");
    }
  });
  
  currentRecordingTab = null;
  recordingStartTime = null;
  
  // Clear storage
  chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
}

// Monitor tab closures
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentRecordingTab) {
    console.log("🛑 Recording source tab closed - stopping recording");
    stopAllRecordings();
  }
  
  // Also check if it's a recorder tab
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    if (tab.url && tab.url.includes("recorder.html")) {
      console.log("🛑 Recorder tab closed - cleaning up");
      chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime', 'recordingTabId']);
      currentRecordingTab = null;
      recordingStartTime = null;
    }
  });
});

// Handle window focus changes - if user switches away from Zoom, consider meeting ended
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // No window focused, ignore
    return;
  }
  
  chrome.windows.get(windowId, { populate: true }, (window) => {
    if (chrome.runtime.lastError) return;
    
    // Check if the focused window has our recording tab
    if (currentRecordingTab && window.tabs) {
      const hasRecordingTab = window.tabs.some(tab => tab.id === currentRecordingTab);
      if (!hasRecordingTab) {
        console.log("🛑 User switched away from recording tab - stopping recording");
        stopAllRecordings();
      }
    }
  });
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("🔧 Extension installed/updated:", details.reason);
  
  if (details.reason === 'install') {
    // Set default permissions
    chrome.storage.local.set({ autoRecordPermission: false });
    console.log("🔐 Auto recording disabled by default");
    
    // Show welcome page or instructions
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
  }
  
  if (details.reason === 'update') {
    console.log("🔄 Extension updated - resetting states");
    stopAllRecordings();
  }
});

// Clean up when browser starts (in case recording was active when browser closed)
chrome.runtime.onStartup.addListener(() => {
  console.log("🔧 Browser started - cleaning up any leftover recording states");
  stopAllRecordings();
});

// Keep service worker alive during recordings
let keepAliveInterval;
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    if (currentRecordingTab) {
      // Log keep-alive every 25 seconds during recording
      if (Math.floor(Date.now() / 1000) % 25 === 0) {
        console.log("💓 Service worker keep-alive (Recording active)");
      }
    } else {
      // No recording active, clear interval
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }, 1000);
}

// Start keep-alive when recording starts
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "recordingStarted") {
    startKeepAlive();
  }
  if (message.action === "recordingStopped") {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }
});

console.log("🔧 Background script loaded successfully");
console.log("📋 Auto recording ready - will start/stop based on meeting detection");