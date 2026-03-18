console.log("Admin script loaded");

let map, marker;

function initMap() {

    map = L.map('map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    map.on('click', function (e) {

        document.getElementById('lat').value = e.latlng.lat;
        document.getElementById('lng').value = e.latlng.lng;

        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
    });
}

// Save location
async function setLocation() {

    let lat = document.getElementById('lat').value;
    let lng = document.getElementById('lng').value;
    let radius = document.getElementById('radius').value;

    if (!lat || !lng || !radius) {
        alert("Please fill all fields");
        return;
    }

    await fetch('/api/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius: parseFloat(radius)
        })
    });

    alert("Location Saved ✅");
}

// Initialize map AFTER page loads
window.onload = initMap;