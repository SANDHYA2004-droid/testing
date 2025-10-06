/// This runs in a separate tab that stays open for recording
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let timerInterval;
let recordingStartTime;
let isAutoRecord = false;
let downloadCompleted = false;
let currentRecordingMode = 'audioVideo'; // Default mode

console.log("🎬 Recorder tab loaded");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Recorder received:", message.action);
  
  if (message.action === "startRecording") {
    isAutoRecord = message.autoRecord || false;
    currentRecordingMode = message.recordingMode || 'audioVideo'; // Get the mode
    console.log("🎯 Starting recording with mode:", currentRecordingMode);
    startRecording(message.tabId);
    sendResponse({ success: true });
  }
  
  if (message.action === "stopRecording") {
    stopRecording();
    sendResponse({ success: true });
  }
  
  return true;
});

async function startRecording(tabId) {
  console.log("🎬 Starting recording for tab:", tabId);
  console.log("🎯 Recording mode:", currentRecordingMode);
  
  if (isRecording) {
    console.log("⚠️ Already recording, ignoring start request");
    return;
  }

  try {
    document.getElementById("status").textContent = "🟡 Starting recording...";
    console.log("📋 Getting tab capture permission for tab:", tabId);

    let finalStream;
    
    // Different capture logic based on recording mode
    if (currentRecordingMode === 'audioOnly') {
      // Audio Only Mode
      console.log("🎤 Audio Only mode - capturing audio only");
      finalStream = await captureAudioOnly(tabId);
      
    } else if (currentRecordingMode === 'videoOnly') {
      // Video Only Mode  
      console.log("🎥 Video Only mode - capturing video only");
      finalStream = await captureVideoOnly(tabId);
      
    } else {
      // Audio + Video Mode (default)
      console.log("🎥🎤 Audio+Video mode - capturing both");
      finalStream = await captureAudioVideo(tabId);
    }

    // Setup MediaRecorder based on mode
    setupMediaRecorder(finalStream);

  } catch (error) {
    console.error("❌ Recording start failed:", error);
    document.getElementById("status").textContent = "❌ Recording failed: " + error.message;
    
    // Show retry button for auto recordings
    if (isAutoRecord) {
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry Recording';
      retryButton.style.cssText = `
        padding: 10px 20px;
        margin: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      `;
      retryButton.onclick = () => startRecording(tabId);
      document.body.appendChild(retryButton);
    }
  }
}

// Capture Audio Only
async function captureAudioOnly(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({
      audio: true,
      video: false, // No video
      audioConstraints: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: tabId,
          echoCancellation: true
        }
      }
    }, (stream) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Audio capture failed"));
        return;
      }
      if (!stream) {
        reject(new Error("Could not capture audio stream"));
        return;
      }
      console.log("✅ Audio stream captured successfully");
      resolve(stream);
    });
  });
}

// Capture Video Only  
async function captureVideoOnly(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({
      audio: false, // No audio
      video: true,
      videoConstraints: {
        mandatory: {
          chromeMediaSource: 'tab', 
          chromeMediaSourceId: tabId,
          minWidth: 1280,
          minHeight: 720,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    }, (stream) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Video capture failed"));
        return;
      }
      if (!stream) {
        reject(new Error("Could not capture video stream"));
        return;
      }
      console.log("✅ Video stream captured successfully");
      resolve(stream);
    });
  });
}

// Capture Audio + Video
async function captureAudioVideo(tabId) {
  const tabStream = await new Promise((resolve, reject) => {
    chrome.tabCapture.capture({
      audio: true,
      video: true,
      audioConstraints: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: tabId,
          echoCancellation: true
        }
      },
      videoConstraints: {
        mandatory: {
          chromeMediaSource: 'tab', 
          chromeMediaSourceId: tabId,
          minWidth: 1280,
          minHeight: 720,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    }, (stream) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Tab capture failed"));
        return;
      }
      if (!stream) {
        reject(new Error("Could not capture tab stream"));
        return;
      }
      console.log("✅ Tab stream captured successfully");
      resolve(stream);
    });
  });

  let finalStream = tabStream;

  // Try to add microphone audio for audio modes
  if (currentRecordingMode === 'audioVideo' || currentRecordingMode === 'audioOnly') {
    try {
      console.log("🎤 Attempting to capture microphone...");
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        },
        video: false
      });

      console.log("✅ Microphone captured");

      // Mix audio using AudioContext
      const audioContext = new AudioContext({ sampleRate: 44100 });
      const destination = audioContext.createMediaStreamDestination();

      const tabAudioSource = audioContext.createMediaStreamSource(
        new MediaStream(tabStream.getAudioTracks())
      );
      const micAudioSource = audioContext.createMediaStreamSource(micStream);

      tabAudioSource.connect(destination);
      micAudioSource.connect(destination);

      // Create final stream with mixed audio
      finalStream = new MediaStream([
        ...tabStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      console.log("✅ Audio mixed successfully");

    } catch (micError) {
      console.warn("⚠️ Microphone not available, using tab audio only:", micError);
      // Continue with tab audio only
      finalStream = tabStream;
    }
  }

  return finalStream;
}

function setupMediaRecorder(finalStream) {
  // Setup MediaRecorder
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus', 
    'video/webm;codecs=h264,opus',
    'video/webm'
  ];

  let supportedType = 'video/webm';
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      supportedType = type;
      break;
    }
  }
  
  console.log("🎥 Using MIME type:", supportedType);

  // Adjust bitrate based on mode
  let videoBitsPerSecond = 2500000; // Default for video
  let audioBitsPerSecond = 128000;  // Default for audio
  
  if (currentRecordingMode === 'audioOnly') {
    videoBitsPerSecond = 0; // No video
    audioBitsPerSecond = 192000; // Higher quality audio
  } else if (currentRecordingMode === 'videoOnly') {
    videoBitsPerSecond = 3000000; // Higher quality video
    audioBitsPerSecond = 0; // No audio
  }

  mediaRecorder = new MediaRecorder(finalStream, {
    mimeType: supportedType,
    videoBitsPerSecond: videoBitsPerSecond,
    audioBitsPerSecond: audioBitsPerSecond
  });

  recordedChunks = [];
  isRecording = true;
  recordingStartTime = Date.now();
  downloadCompleted = false;

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
      console.log("📦 Data chunk:", event.data.size, "bytes, total chunks:", recordedChunks.length);
    }
  };

  mediaRecorder.onstop = () => {
    console.log("🛑 Recording stopped, total chunks:", recordedChunks.length);
    stopTimer();
    downloadRecording();
  };

  mediaRecorder.onerror = (event) => {
    console.error("❌ MediaRecorder error:", event);
    document.getElementById("status").textContent = "❌ Recording error";
    cleanup();
  };

  // Start recording with 1-second chunks
  mediaRecorder.start(1000);
  console.log("✅ Recording started in background tab!");

  // Update UI based on mode
  let modeText = '';
  switch (currentRecordingMode) {
    case 'audioOnly': modeText = 'Audio Only'; break;
    case 'videoOnly': modeText = 'Video Only'; break;
    default: modeText = 'Audio+Video';
  }
  
  document.getElementById("status").textContent = isAutoRecord 
    ? `🟢 Auto Recording (${modeText}) in background...` 
    : `🟢 Recording (${modeText}) in background...`;
  startTimer();

  // Save recording state to storage
  chrome.storage.local.set({ 
    isRecording: true,
    recordingStartTime: recordingStartTime,
    recordingMode: currentRecordingMode
  });

  // Notify background
  chrome.runtime.sendMessage({ action: "recordingStarted" });
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    console.log("🛑 Stopping recording...");
    mediaRecorder.stop();
  } else {
    console.log("⚠️ No active recording to stop");
  }
}

function startTimer() {
  let seconds = 0;
  const timerEl = document.getElementById("timer");
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    seconds++;
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    const timeString = `${minutes}:${secs}`;
    
    timerEl.textContent = timeString;
    
    // Save time to storage
    chrome.storage.local.set({ recordingTime: timeString });
    
    // Send timer update
    chrome.runtime.sendMessage({ action: "timerUpdate", time: timeString });
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function downloadRecording() {
  if (recordedChunks.length === 0) {
    console.warn("⚠️ No recorded data");
    document.getElementById("status").textContent = "❌ No recording data";
    cleanup();
    return;
  }

  try {
    console.log("💾 Preparing download, chunks:", recordedChunks.length);
    
    // Determine file type based on mode
    const fileType = currentRecordingMode === 'audioOnly' ? 'audio/webm' : 'video/webm';
    const fileExtension = currentRecordingMode === 'audioOnly' ? 'webm' : 'webm';
    
    const blob = new Blob(recordedChunks, { type: fileType });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('Z')[0];
    
    // Create filename based on mode
    let modePrefix = '';
    switch (currentRecordingMode) {
      case 'audioOnly': modePrefix = 'audio'; break;
      case 'videoOnly': modePrefix = 'video'; break;
      default: modePrefix = 'recording';
    }
    
    const filename = `teams-${modePrefix}-${timestamp}.${fileExtension}`;

    console.log("💾 Downloading:", filename);

    // Download automatically
    chrome.downloads.download({
      url: url,
      filename: filename
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Download error:", chrome.runtime.lastError);
        fallbackDownload(blob, filename);
      } else {
        console.log("✅ Download started with ID:", downloadId);
        document.getElementById("status").textContent = "✅ Recording saved to Downloads!";
        downloadCompleted = true;
        
        // Cleanup after successful download
        setTimeout(() => {
          cleanup();
        }, 2000);
      }
    });

  } catch (error) {
    console.error("❌ Download failed:", error);
    document.getElementById("status").textContent = "❌ Download failed";
    cleanup();
  }
}

function fallbackDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  document.getElementById("status").textContent = "✅ Recording saved to Downloads!";
  downloadCompleted = true;
  
  // Cleanup after successful download
  setTimeout(() => {
    cleanup();
  }, 2000);
}

function cleanup() {
  isRecording = false;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (mediaRecorder && mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(track => {
      track.stop();
      console.log("🛑 Stopped track:", track.kind);
    });
  }
  
  recordedChunks = [];
  
  // Clear storage
  chrome.storage.local.remove(['isRecording', 'recordingTime', 'recordingStartTime']);
  
  // Notify background
  chrome.runtime.sendMessage({ action: "recordingStopped" });
  
  document.getElementById("status").textContent = "✅ Recording completed and downloaded";
  
  // Only close tab if download completed and it's auto record
  if (isAutoRecord && downloadCompleted) {
    setTimeout(() => {
      console.log("🔒 Closing recorder tab after successful download");
      window.close();
    }, 2000);
  }
}

// Handle tab close - ensure download completes
window.addEventListener('beforeunload', (event) => {
  if (isRecording && !downloadCompleted) {
    console.log("⚠️ Tab closing during recording - forcing download");
    
    // Stop recording and force download
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    // Prevent immediate close to allow download to complete
    event.preventDefault();
    event.returnValue = '';
    
    // Show message to user
    document.getElementById("status").textContent = "🔄 Finishing download before closing...";
    
    // Wait for download to complete then close
    const checkDownload = setInterval(() => {
      if (downloadCompleted) {
        clearInterval(checkDownload);
        window.close();
      }
    }, 500);
    
    return "Recording is being saved. Please wait...";
  }
});

// Keep this tab alive
setInterval(() => {
  if (isRecording) {
    console.log("💓 Recorder tab keep-alive");
  }
}, 30000);
