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

// Search location using OpenStreetMap
async function searchLocation(){

    let query = document.getElementById('locationInput').value;

    if(!query){
        alert("Enter location or pincode");
        return;
    }

    let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
    let data = await res.json();

    document.getElementById('locationName').innerText = data[0].display_name;

    if(data.length === 0){
        alert("Location not found");
        return;
    }

    let lat = parseFloat(data[0].lat);
    let lon = parseFloat(data[0].lon);

    map.setView([lat, lon], 15);

    if(marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);

    // Store temporarily
    window.selectedLat = lat;
    window.selectedLng = lon;
}

// Save location
async function setLocation(){

    let radius = document.getElementById('radius').value;

    if(!window.selectedLat || !window.selectedLng){
        alert("Search location first");
        return;
    }

    if(!radius){
        alert("Enter radius");
        return;
    }

    await fetch('/api/set-location',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
            lat: window.selectedLat,
            lng: window.selectedLng,
            radius: parseFloat(radius)
        })
    });

    alert("Location Saved");
}

// Initialize map AFTER page loads
window.onload = initMap;