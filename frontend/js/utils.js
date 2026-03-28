// Distance (Haversine)
function getDistance(lat1, lon1, lat2, lon2){

    if(!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    let R = 6371000; // meters

    let dLat = (lat2 - lat1) * Math.PI / 180;
    let dLon = (lon2 - lon1) * Math.PI / 180;

    let a =
        Math.sin(dLat/2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) ** 2;

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Blink Detection
function detectBlink(landmarks){

    if(!landmarks) return false;

    let eye = landmarks.getLeftEye();

    let vertical = Math.abs(eye[1].y - eye[5].y);
    let horizontal = Math.abs(eye[0].x - eye[3].x);

    let ratio = vertical / horizontal;

    return ratio < 0.25; // tuned threshold
}

// Head Movement Detection
function detectHeadMovement(landmarks, state){

    if(!landmarks || !state) return;

    let nose = landmarks.getNose()[3];

    // More flexible thresholds
    if(nose.x < 140) state.left = true;
    if(nose.x > 180) state.right = true;
    if(nose.y < 100) state.up = true;
    if(nose.y > 160) state.down = true;
}

// Validate Form
function validateFields(fields){

    for(let f of fields){
        if(!f || f.trim() === ""){
            return false;
        }
    }
    return true;
}