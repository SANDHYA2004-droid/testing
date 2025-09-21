const timerEl = document.getElementById("timer");

chrome.runtime.onMessage.addListener(msg => {
  if(msg.type==="recording-timer"){
    const m = String(Math.floor(msg.seconds/60)).padStart(2,'0');
    const s = String(msg.seconds%60).padStart(2,'0');
    timerEl.textContent = `${m}:${s}`;
  }
});
