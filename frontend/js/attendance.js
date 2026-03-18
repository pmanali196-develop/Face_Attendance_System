console.log("Attendance script loaded");

let video = document.getElementById('video');
let statusText = document.getElementById('status');

// =======================
// LOAD MODELS
// =======================
async function loadModels(){
    await faceapi.nets.tinyFaceDetector.loadFromUri('frontend/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('frontend/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('frontend/models');

    statusText.innerText = "Models Loaded ✅";
}

loadModels();

// =======================
// CAMERA
// =======================
async function startCamera(){
    try{
        let stream = await navigator.mediaDevices.getUserMedia({video:true});
        video.srcObject = stream;
        statusText.innerText = "Camera Started";
    }catch{
        alert("Camera access denied ❌");
    }
}

// =======================
// GPS CHECK
// =======================
async function checkLocation(){

    return new Promise((resolve, reject)=>{

        navigator.geolocation.getCurrentPosition(async pos=>{

            let res = await fetch('/api/get-location');
            let loc = await res.json();

            if(!loc.lat){
                alert("Admin has not set location ❌");
                reject();
                return;
            }

            let dist = getDistance(
                pos.coords.latitude,
                pos.coords.longitude,
                loc.lat,
                loc.lng
            );

            if(dist > loc.radius){
                alert("Outside company area ❌");
                reject();
            }else{
                resolve();
            }

        }, ()=>{
            alert("Location permission denied ❌");
            reject();
        });

    });
}

// =======================
// LOAD DATASET
// =======================
async function loadLabeledImages(empId){

    const descriptions = [];

    for(let i=0;i<15;i++){
        try{
            const img = await faceapi.fetchImage(`/dataset/${empId}/${i}.jpg`);

            const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if(detection){
                descriptions.push(detection.descriptor);
            }
        }catch(e){
            console.log("Image load error", i);
        }
    }

    return new faceapi.LabeledFaceDescriptors(empId, descriptions);
}

// =======================
// MAIN FUNCTION
// =======================
async function verifyAndMark(){

    let empId = document.getElementById('emp_id').value;

    if(!empId){
        alert("Enter Employee ID");
        return;
    }

    // 🔥 STEP 1: GPS CHECK
    try{
        await checkLocation();
    }catch{
        return;
    }

    statusText.innerText = "Verifying face...";

    let labeled = await loadLabeledImages(empId);

    if(labeled.descriptors.length === 0){
        alert("No dataset found ❌");
        return;
    }

    const matcher = new faceapi.FaceMatcher([labeled], 0.6);

    let attempts = 0;

    let interval = setInterval(async ()=>{

        const detection = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if(!detection){
            statusText.innerText = "No face detected";
            return;
        }

        const match = matcher.findBestMatch(detection.descriptor);

        attempts++;

        statusText.innerText = `Matching... ${attempts}`;

        if(attempts > 10){

            clearInterval(interval);

            if(match.label === "unknown"){
                alert("Face not matched ❌");
                return;
            }

            // ✅ SUCCESS
            await markAttendance(empId);
        }

    }, 500);
}

// =======================
// SAVE ATTENDANCE
// =======================
async function markAttendance(empId){

    await fetch('/api/attendance',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            employee_id: empId,
            date: new Date().toISOString().split('T')[0],
            check_in: new Date().toLocaleTimeString()
        })
    });

    alert("Attendance Marked ✅");
    window.location.href = "/dashboard";
}