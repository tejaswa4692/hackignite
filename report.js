async function init() {
    try {
        const res = await fetch('http://127.0.0.1:5000/');
        const reports = await res.json();

        const reportList = document.getElementById('reportList');
        reportList.innerHTML = ''; // clear any existing content

        reports.forEach(r => {
            const item = document.createElement('div');
            item.className = 'report-item';

            item.innerHTML = `
                <img src='${r.imglnk}' alt='Issue Image' style="object-fit: cover; height: 400px; width: 700px;">
                <div class='report-content'>
                    <div class='report-meta'>
                        <span class='title'>${r.type}</span>
                        <span class='status ${r.status}'>${r.status}</span>
                    </div>
                    <p class='desc'>${r.desc}</p>
                    <p style='font-size:12px;color:#555;'>${new Date(r.time).toLocaleString()}</p>
                </div>
            `;

            reportList.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

// Run init when page loads
document.addEventListener('DOMContentLoaded', init);
