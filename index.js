
const ISSUES_KEY = "civicfix_issues_v1_demo";
const DEFAULT_CENTER = [26.2183, 78.1828]; // Gwalior
let map;
let markersLayer;

const imagebb_api = "80d583c76874d0b710d837acf5d259f1"
let linktoimg;


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
async function loadIssues() {
  try {

    const res = await fetch('http://127.0.0.1:5000/');
    const data = await res.json();

    console.log(data)
    
    data.forEach(c => {
        addcards(c.heading, c.imglnk, c.content, c.date);
    });    

    
    return JSON.parse(localStorage.getItem(ISSUES_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveIssues(arr) {
  localStorage.clear()
  console.log(arr)
  localStorage.setItem(ISSUES_KEY, JSON.stringify(arr));
}


// Upload image and return URL when done
async function uploadimage(fileInput) {
    const image = fileInput.files[0];

    if (!image) {
        document.getElementById("submitbtn").innerHTML = "Please select an image first";
        return null;
    }

    document.getElementById("submitbtn").innerHTML = "Uploading image...";

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async () => {
            const base64image = reader.result.split(',')[1];

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${imagebb_api}`, {
                    method: 'POST',
                    body: new URLSearchParams({ 'image': base64image })
                });

                const data = await response.json();

                if (data.success) {
                    console.log("Image uploaded:", data.data.url);
                    document.getElementById("submitbtn").innerHTML = "Image Uploaded!";
                    resolve(data.data.url);
                } else {
                    document.getElementById("submitbtn").innerHTML = "Image upload failed";
                    console.error("Image upload failed", data);
                    resolve(null);
                }
            } catch (err) {
                document.getElementById("submitbtn").innerHTML = "Upload error";
                console.error("Upload error", err);
                resolve(null);
            }
        };

        reader.readAsDataURL(image);
    });
}

async function uploadentry(link2iimg) {
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('desc').value.trim();

    if (!desc) {
        alert('Please enter a description');
        return;
    }

    const center = map.getCenter();
    console.log(center)
    const coordx = center.lat;
    const coordy = center.lng;

    const issue = {
        id: 'i_' + Date.now(),
        type,
        desc,
        coordx,
        coordy,
        status: "pending",
        imglnk: link2iimg
    };

    const arr = loadIssues();
    arr.push(issue);
    saveIssues(arr);


    try {
      const res = await fetch("http://127.0.0.1:5000/add_entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issue)
    });

    const data = await res.json();
    console.log("Server response:", data);
  } catch (err) {
    console.error("Error:", err);
  }



    addMarkerForIssue(issue);
    renderIssuesList();

    document.getElementById('desc').value = '';
    const fileInput = document.getElementById('imgfile');
    if (fileInput) fileInput.value = '';

    alert('Issue submitted! Marker placed at current map center.');
    document.getElementById("submitbtn").innerHTML = "Issue Submitted";

    // Wait 2 seconds then reset button text
    setTimeout(() => {
        document.getElementById("submitbtn").innerHTML = "Submit Issue";
        linktoimg = null; // reset image link for next submission
    }, 2000);
}


async function submitIssue() {
  try {
      const fileInput = document.getElementById('imgfile');
      let imageUrl = linktoimg || null;

      if (!imageUrl && fileInput && fileInput.files.length > 0) {
          // Wait until image is uploaded
          imageUrl = await uploadimage(fileInput);
          if (!imageUrl) return; // Stop if upload failed
          linktoimg = imageUrl; // Save for next time
      }

      await uploadentry(imageUrl);
  }catch (err) {
      console.error("Error submitting issue:", err);
      alert("An error occurred while submitting the issue. Please try again.");
      document.getElementById("submitbtn").innerHTML = "Submit Issue";
  }
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
    coordx: center.lat,
    coordy: center.lng,
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
  const icon = L.circleMarker([issue.coordx, issue.coordy], {
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
  if(!navigator.geolocation){
     alert('Geolocation not supported');
     document.getElementById("usemyloc").innerHTML = "Loc not supported pan to the place manually"
     return; 
    }
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 17);
  }, err => {
    alert('Unable to get location or permission denied');
    document.getElementById("usemyloc").innerHTML = "Unable to get choose map instead"
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


