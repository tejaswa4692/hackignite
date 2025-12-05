// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const DEFAULT_CENTER = [26.2183, 78.1828]; // Gwalior
const IMAGEBB_API = "80d583c76874d0b710d837acf5d259f1";

let map;
let markersLayer;
let cachedImageUrl = null;


// --------------------------------------------------
// INIT
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await initMap();
  await loadIssuesToMap();
  await renderIssuesList();
});

async function initMap() {
  map = L.map('mapid').setView(DEFAULT_CENTER, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}


// --------------------------------------------------
// BACKEND LOAD / SAVE
// --------------------------------------------------
async function loadIssues() {
  try {
    const res = await fetch('http://127.0.0.1:5000/');
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Failed to load issues:", e);
    return [];
  }
}


// --------------------------------------------------
// IMAGE UPLOAD
// --------------------------------------------------
async function uploadImage(fileInput) {
  const image = fileInput.files[0];
  if (!image) {
    document.getElementById("submitbtn").innerHTML = "Select an image first";
    return null;
  }

  document.getElementById("submitbtn").innerHTML = "Uploading...";

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async () => {
      const base64image = reader.result.split(',')[1];

      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMAGEBB_API}`, {
          method: 'POST',
          body: new URLSearchParams({ 'image': base64image })
        });

        const data = await response.json();
        if (data.success) {
          cachedImageUrl = data.data.url;
          document.getElementById("submitbtn").innerHTML = "Image Uploaded!";
          resolve(data.data.url);
        } else {
          console.error("Upload failed:", data);
          document.getElementById("submitbtn").innerHTML = "Upload failed";
          resolve(null);
        }
      } catch (err) {
        console.error("Upload error:", err);
        document.getElementById("submitbtn").innerHTML = "Upload error";
        resolve(null);
      }
    };

    reader.readAsDataURL(image);
  });
}


// --------------------------------------------------
// SUBMIT ISSUE
// --------------------------------------------------
async function submitIssue() {
  try {
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('desc').value.trim();
    const fileInput = document.getElementById('imgfile');

    if (!desc) {
      alert('Please enter a description');
      return;
    }

    let imageUrl = cachedImageUrl;

    if (!imageUrl && fileInput.files.length > 0) {
      imageUrl = await uploadImage(fileInput);
      if (!imageUrl) return;
    }

    const center = map.getCenter();

    const issue = {
      id: 'i_' + Date.now(),
      type,
      desc,
      coordx: center.lat,
      coordy: center.lng,
      status: "pending",
      imglnk: imageUrl
    };

    // Send to backend
    await fetch("http://127.0.0.1:5000/add_entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issue)
    });

    // Update UI from backend
    await loadIssuesToMap();
    await renderIssuesList();

    // Reset form
    document.getElementById('desc').value = "";
    if (fileInput) fileInput.value = "";
    cachedImageUrl = null;

    alert("Issue submitted!");

    document.getElementById("submitbtn").innerHTML = "Issue Submitted";
    setTimeout(() =>
      document.getElementById("submitbtn").innerHTML = "Submit Issue"
    , 2000);

  } catch (err) {
    console.error("Submit error:", err);
    alert("Failed to submit issue.");
  }
}


// --------------------------------------------------
// MARKERS
// --------------------------------------------------
async function loadIssuesToMap() {
  markersLayer.clearLayers();
  const issues = await loadIssues();
  issues.forEach(addMarkerForIssue);
}

function addMarkerForIssue(issue) {
  const color = issue.status === "resolved" ? "green" : "red";

  const icon = L.circleMarker([issue.coordx, issue.coordy], {
    radius: 8,
    color,
    fillColor: color,
    fillOpacity: 0.9
  }).addTo(markersLayer);

  const ts = issue.ts ? new Date(issue.ts).toLocaleString() : "No timestamp";

  icon.bindPopup(`
    <b>${escapeHtml(issue.type)}</b><br>
    ${escapeHtml(issue.desc)}<br>
    <small>${ts}</small><br><br>
    <button onclick="focusAndOpenPopup('${issue.id}')">View</button>
  `);
}


// --------------------------------------------------
// LIST RENDERING
// --------------------------------------------------
async function renderIssuesList() {
  const issues = await loadIssues();
  const container = document.getElementById('issues-list');

  container.innerHTML = '';

  if (issues.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;padding:8px">No reports yet.</div>';
    return;
  }

  issues.forEach(issue => {
    const ts = issue.ts ? new Date(issue.ts).toLocaleString() : "No timestamp";

    const el = document.createElement('div');
    el.className = 'issue-item';
    el.innerHTML = `
      <div class="dot" style="background:${issue.status==='resolved'?'#2e7d32':'#e53935'}"></div>
      <div class="meta">
        <strong>${escapeHtml(issue.type)}</strong>
        <div style="color:#6b7280;font-size:13px">${escapeHtml(issue.desc)}</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:6px">${ts}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="window.location.href='report.html?issue=${issue.id}'">View</button>

      </div>
    `;
    container.appendChild(el);
  });
}


// --------------------------------------------------
// MAP FOCUS
// --------------------------------------------------
async function panToIssue(id) {
  const issues = await loadIssues();
  const issue = issues.find(i => i.id === id);
  if (!issue) return;

  map.setView([issue.coordx, issue.coordy], 17, { animate: true });

  markersLayer.eachLayer(layer => {
    const pos = layer.getLatLng();
    if (pos.lat === issue.coordx && pos.lng === issue.coordy) {
      layer.openPopup();
    }
  });
}

function focusAndOpenPopup(id) {
  panToIssue(id);
}


// --------------------------------------------------
// UTILITIES
// --------------------------------------------------
function useMyLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 17);
  }, () => {
    alert("Unable to get location");
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

function centerToGwalior() {
  map.setView(DEFAULT_CENTER, 13);
}
