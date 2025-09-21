










// document.addEventListener("DOMContentLoaded", () => {
//   console.log("🎛️ Popup loaded");
  
//   const saveBtn = document.getElementById("save");
//   const status = document.getElementById("status");
//   const manualControls = document.getElementById("manualControls");
//   const manualStart = document.getElementById("manualStart");
//   const manualStop = document.getElementById("manualStop");

//   let timerInterval = null;
//   let seconds = 0;
//   let isRecording = false;

//   // Load saved mode from storage
//   chrome.storage.local.get("recordMode", (data) => {
//     const mode = data.recordMode || "screenaudio";
//     console.log("📂 Loaded mode:", mode);
    
//     const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
//     if (radio) {
//       radio.checked = true;
//       updateStatus(mode);
//     }
//   });

//   // Save mode handler
//   saveBtn.addEventListener("click", () => {
//     const mode = document.querySelector('input[name="mode"]:checked')?.value;
//     if (!mode) {
//       alert("⚠️ Please select a mode!");
//       return;
//     }

//     console.log("💾 Saving mode:", mode);
//     chrome.storage.local.set({ recordMode: mode }, () => {
//       console.log("✅ Mode saved:", mode);
//       updateStatus(mode);
      
//       // Show success feedback
//       saveBtn.textContent = "✅ Saved!";
//       setTimeout(() => {
//         saveBtn.textContent = "💾 Save Mode";
//       }, 1500);
//     });
//   });

//   // Update status display
//   function updateStatus(mode) {
//     clearInterval(timerInterval);
//     seconds = 0;

//     if (mode === "none") {
//       status.innerHTML = "🚫 Auto-recording disabled.<br>Use Start/Stop buttons below.";
//       status.className = "status inactive";
//       manualControls.style.display = "flex";
//       manualStart.disabled = false;
//       manualStop.disabled = true;
//     } else {
//       const modeNames = {
//         'audio': 'AUDIO ONLY',
//         'screen': 'SCREEN ONLY', 
//         'screenaudio': 'SCREEN + AUDIO'
//       };
//       status.innerHTML = `✅ Mode set to "${modeNames[mode] || mode.toUpperCase()}".<br>Recording starts automatically when meeting joins.`;
//       status.className = "status active";
//       manualControls.style.display = "none";
//     }
//   }

//   // Timer functions
//   function startTimer() {
//     clearInterval(timerInterval);
//     seconds = 0;
//     isRecording = true;
    
//     timerInterval = setInterval(() => {
//       seconds++;
//       const m = String(Math.floor(seconds / 60)).padStart(2, "0");
//       const s = String(seconds % 60).padStart(2, "0");
//       status.innerHTML = `🔴 Recording... ${m}:${s}<br>Click Stop to end recording.`;
//       status.className = "status active";
//     }, 1000);
//   }

//   function stopTimer() {
//     clearInterval(timerInterval);
//     isRecording = false;
//     status.innerHTML = "⏹️ Recording stopped.<br>File saved to Downloads folder.";
//     status.className = "status neutral";
    
//     // Reset buttons
//     manualStart.disabled = false;
//     manualStop.disabled = true;
    
//     // Auto-revert status after 3 seconds
//     setTimeout(() => {
//       const currentMode = document.querySelector('input[name="mode"]:checked')?.value || "none";
//       updateStatus(currentMode);
//     }, 3000);
//   }

//   // Manual Start Recording
//   manualStart.addEventListener("click", () => {
//     console.log("▶️ Manual start clicked");
    
//     // Get current active tab
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs[0]) {
//         chrome.tabs.sendMessage(tabs[0].id, { type: "manual-start" }, (response) => {
//           if (chrome.runtime.lastError) {
//             console.error("❌ Failed to send manual-start:", chrome.runtime.lastError);
//             status.innerHTML = "❌ Failed to start recording.<br>Make sure you're on Teams page.";
//             status.className = "status inactive";
//             return;
//           }
          
//           console.log("✅ Manual start response:", response);
//           manualStart.disabled = true;
//           manualStop.disabled = false;
//           startTimer();
//         });
//       } else {
//         status.innerHTML = "❌ No active tab found.<br>Open Teams meeting first.";
//         status.className = "status inactive";
//       }
//     });
//   });

//   // Manual Stop Recording
//   manualStop.addEventListener("click", () => {
//     console.log("⏹️ Manual stop clicked");
    
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs[0]) {
//         chrome.tabs.sendMessage(tabs[0].id, { type: "manual-stop" }, (response) => {
//           if (chrome.runtime.lastError) {
//             console.error("❌ Failed to send manual-stop:", chrome.runtime.lastError);
//           }
          
//           console.log("✅ Manual stop response:", response);
//           stopTimer();
//         });
//       }
//     });
//   });

//   // Listen for recording updates from background/content
//   chrome.runtime.onMessage.addListener((msg) => {
//     console.log("📨 Popup received message:", msg.type);
    
//     if (msg.type === "recording-timer") {
//       if (isRecording) {
//         const m = String(Math.floor(msg.seconds / 60)).padStart(2, "0");
//         const s = String(msg.seconds % 60).padStart(2, "0");
//         status.innerHTML = `🔴 Recording... ${m}:${s}<br>Click Stop to end recording.`;
//         status.className = "status active";
//       }
//     }
    
//     if (msg.type === "recording-started") {
//       console.log("🎬 Recording started notification");
//       if (document.querySelector('input[name="mode"]:checked')?.value === "none") {
//         // Manual mode
//         manualStart.disabled = true;
//         manualStop.disabled = false;
//         startTimer();
//       }
//     }
    
//     if (msg.type === "recording-stopped") {
//       console.log("⏹️ Recording stopped notification");
//       stopTimer();
//     }
//   });

//   // Check if currently recording on popup open
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     if (tabs[0]) {
//       chrome.tabs.sendMessage(tabs[0].id, { type: "check-recording-status" }, (response) => {
//         if (!chrome.runtime.lastError && response?.isRecording) {
//           console.log("🔍 Found active recording on popup open");
//           manualStart.disabled = true;
//           manualStop.disabled = false;
//           startTimer();
//         }
//       });
//     }
//   });

//   console.log("✅ Popup initialized");
// });








document.addEventListener("DOMContentLoaded", () => {
  console.log("🎛️ Popup loaded");
  
  const saveBtn = document.getElementById("save");
  const status = document.getElementById("status");
  const manualControls = document.getElementById("manualControls");
  const manualStart = document.getElementById("manualStart");
  const manualStop = document.getElementById("manualStop");

  let timerInterval = null;
  let seconds = 0;
  let isRecording = false;

  // Load saved mode from storage
  chrome.storage.local.get("recordMode", (data) => {
    const mode = data.recordMode || "screenaudio";
    console.log("📂 Loaded mode:", mode);
    
    const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
    if (radio) {
      radio.checked = true;
      updateStatus(mode);
    }
  });

  // Save mode handler
  saveBtn.addEventListener("click", () => {
    const mode = document.querySelector('input[name="mode"]:checked')?.value;
    if (!mode) {
      alert("⚠️ Please select a mode!");
      return;
    }

    console.log("💾 Saving mode:", mode);
    chrome.storage.local.set({ recordMode: mode }, () => {
      console.log("✅ Mode saved:", mode);
      updateStatus(mode);
      
      // Show success feedback
      saveBtn.textContent = "✅ Saved!";
      setTimeout(() => {
        saveBtn.textContent = "💾 Save Mode";
      }, 1500);
    });
  });

  // Update status display
  function updateStatus(mode) {
    clearInterval(timerInterval);
    seconds = 0;

    if (mode === "none") {
      status.innerHTML = "🚫 Auto-recording disabled.<br>Use Start/Stop buttons below.";
      status.className = "status inactive";
      manualControls.style.display = "flex";
      manualStart.disabled = false;
      manualStop.disabled = true;
    } else {
      const modeNames = {
        'audio': 'AUDIO ONLY',
        'screen': 'SCREEN ONLY', 
        'screenaudio': 'SCREEN + AUDIO'
      };
      status.innerHTML = `✅ Mode set to "${modeNames[mode] || mode.toUpperCase()}".<br>Recording starts automatically when meeting joins.`;
      status.className = "status active";
      manualControls.style.display = "none";
    }
  }

  // Timer functions
  function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    isRecording = true;
    
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      status.innerHTML = `🔴 Recording... ${m}:${s}<br>Click Stop to end recording.`;
      status.className = "status active";
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    isRecording = false;
    status.innerHTML = "⏹️ Recording stopped.<br>File saved to Downloads folder.";
    status.className = "status neutral";
    
    manualStart.disabled = false;
    manualStop.disabled = true;
    
    setTimeout(() => {
      const currentMode = document.querySelector('input[name="mode"]:checked')?.value || "none";
      updateStatus(currentMode);
    }, 3000);
  }

  // Manual Start Recording
  manualStart.addEventListener("click", () => {
    console.log("▶️ Manual start clicked");

    const mode = document.querySelector('input[name="mode"]:checked')?.value || "screenaudio";

    chrome.runtime.sendMessage({ type: "start-recording", mode }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        console.error("❌ Failed to start recording:", chrome.runtime.lastError || response?.error);
        status.innerHTML = "❌ Failed to start recording.<br>Make sure you're on a valid page.";
        status.className = "status inactive";
        return;
      }
      
      console.log("✅ Recording started:", response);
      manualStart.disabled = true;
      manualStop.disabled = false;
      startTimer();
    });
  });

  // Manual Stop Recording
  manualStop.addEventListener("click", () => {
    console.log("⏹️ Manual stop clicked");
    
    chrome.runtime.sendMessage({ type: "stop-recording" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        console.error("❌ Failed to stop recording:", chrome.runtime.lastError || response?.error);
      }
      
      console.log("✅ Recording stopped:", response);
      stopTimer();
    });
  });

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    console.log("📨 Popup received message:", msg.type);
    
    if (msg.type === "recording-timer" && isRecording) {
      const m = String(Math.floor(msg.seconds / 60)).padStart(2, "0");
      const s = String(msg.seconds % 60).padStart(2, "0");
      status.innerHTML = `🔴 Recording... ${m}:${s}<br>Click Stop to end recording.`;
      status.className = "status active";
    }
    
    if (msg.type === "recording-started") {
      console.log("🎬 Recording started notification");
      manualStart.disabled = true;
      manualStop.disabled = false;
      startTimer();
    }
    
    if (msg.type === "recording-stopped") {
      console.log("⏹️ Recording stopped notification");
      stopTimer();
    }
  });

  console.log("✅ Popup initialized");
});
