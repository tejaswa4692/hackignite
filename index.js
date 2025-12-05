
const ISSUES_KEY = "civicfix_issues_v1_demo";
const DEFAULT_CENTER = [26.2183, 78.1828]; // Gwalior
let map;
let markersLayer;


async function init() {
    const res = await fetch('http://127.0.0.1:5000/');
    const data = await res.json();

    console.log(data)
  
}







// Init map
function initMap() {
  map = L.map('mapid').setView(DEFAULT_CENTER, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  loadIssuesToMap();
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderIssuesList();
});

// Utilities
function loadIssues() {
  try {
    return JSON.parse(localStorage.getItem(ISSUES_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveIssues(arr) {
  localStorage.setItem(ISSUES_KEY, JSON.stringify(arr));
}

// Add marker & save
function submitIssue() {
  const type = document.getElementById('issueType').value;
  const desc = document.getElementById('desc').value.trim();
  const fileInput = document.getElementById('imgfile');

  if(!desc) { alert('Please enter a description'); return; }

  // Use map center as default location
  const center = map.getCenter();
  const coords = { lat: center.lat, lng: center.lng };

  const issue = {
    type,
    desc,
    coordx,
    corrdy,
    status: "1",
    imgName: fileInput.files && fileInput.files[0] ? fileInput.files[0].name : null
  };

  const arr = loadIssues();
  arr.push(issue);
  saveIssues(arr);

  addMarkerForIssue(issue);
  renderIssuesList();
  document.getElementById('desc').value = '';
  if(fileInput) fileInput.value = '';
  alert('Issue submitted (demo). Marker placed at current map center.');
}

// quick hero form submit
function submitIssueFromHero() {
  const type = document.getElementById('hero-issue-type').value;
  const desc = document.getElementById('hero-desc').value.trim();
  if(!desc){ alert('Please add a short description'); return; }

  // use map center
  const center = map.getCenter();
  const issue = {
    id: 'i_' + Date.now(),
    type, desc,
    coords: { lat: center.lat, lng: center.lng },
    ts: Date.now(),
    status: "pending"
  };
  const arr = loadIssues(); arr.push(issue); saveIssues(arr);
  addMarkerForIssue(issue); renderIssuesList();
  document.getElementById('hero-desc').value = '';
  alert('Submitted from quick report.');
}

// Add marker on the map
function addMarkerForIssue(issue) {
  const color = issue.status === 'resolved' ? 'green' : 'red';
  const icon = L.circleMarker([issue.coords.lat, issue.coords.lng], {
    radius: 8, color: color, fillColor: color, fillOpacity: 0.9
  }).addTo(markersLayer);

  icon.bindPopup(`<b>${escapeHtml(issue.type)}</b><br>${escapeHtml(issue.desc)}<br><small>${new Date(issue.ts).toLocaleString()}</small><br><br>
    <button onclick="focusAndOpenPopup('${issue.id}')">View</button> <button onclick="toggleResolve('${issue.id}')">${issue.status==='resolved'?'Reopen':'Mark Resolved'}</button>`);

  // store marker id reference
  issue._markerId = issue.id;
}

// load existing issues
function loadIssuesToMap() {
  markersLayer.clearLayers();
  const arr = loadIssues();
  arr.forEach(i => addMarkerForIssue(i));
  
}

// list rendering
function renderIssuesList() {
  const list = loadIssues();
  const container = document.getElementById('issues-list');
  container.innerHTML = '';

  if(list.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;padding:8px">No reports yet.</div>';
    return;
  }

  // show newest first
  list.slice().reverse().forEach(issue => {
    const el = document.createElement('div');
    el.className = 'issue-item';
    el.innerHTML = `
      <div class="dot" style="background:${issue.status==='resolved'?'#2e7d32':'#e53935'}"></div>
      <div class="meta">
        <strong>${escapeHtml(issue.type)}</strong>
        <div style="color:#6b7280;font-size:13px">${escapeHtml(issue.desc)}</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:6px">${new Date(issue.ts).toLocaleString()}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="panToIssue('${issue.id}')">View</button>
        <button class="btn" onclick="toggleResolve('${issue.id}')">${issue.status==='resolved'?'Reopen':'Resolve'}</button>
      </div>
    `;
    container.appendChild(el);
  });
}

// pan to issue
function panToIssue(id) {
  const arr = loadIssues();
  const issue = arr.find(i=>i.id===id);
  if(!issue) return;
  map.setView([issue.coords.lat, issue.coords.lng], 17, {animate:true});
  // open popup by searching layer
  // we will recreate markers layer then open popup for last added matching coords
  markersLayer.eachLayer(layer => {
    if(layer.getLatLng && layer.getLatLng().lat.toFixed(5) === issue.coords.lat.toFixed(5) &&
       layer.getLatLng().lng.toFixed(5) === issue.coords.lng.toFixed(5)) {
      layer.openPopup();
    }
  });
}

function focusAndOpenPopup(id){
  panToIssue(id);
}

// toggle resolved
function toggleResolve(id) {
  const arr = loadIssues();
  const idx = arr.findIndex(i=>i.id===id);
  if(idx === -1) return;
  arr[idx].status = arr[idx].status === 'resolved' ? 'pending' : 'resolved';
  saveIssues(arr);
  loadIssuesToMap();
  renderIssuesList();
}
// use browser geolocation to move map and place marker at that pos
function useMyLocation() {
  if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 17);
  }, err => {
    alert('Unable to get location or permission denied');
  });
}

// helpers
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];
  });
}

// center helper
function centerToGwalior(){ map.setView(DEFAULT_CENTER,13); }
// -------------------- REWARD SYSTEM -------------------------
function checkReward() {
  const credits = getCredits();
  const rewardBox = document.getElementById('rewardBox');

  if (credits >= 100) {
    rewardBox.innerText = "🎉 Reward Unlocked!";
  } else {
    const remaining = 100 - credits;
    rewardBox.innerText = `(${remaining} credits for reward)`;
  }
}

