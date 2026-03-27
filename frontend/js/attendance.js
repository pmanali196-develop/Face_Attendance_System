console.log("Attendance script loaded");

let cachedDescriptors = null;

let video = document.getElementById('video');
let statusText = document.getElementById('status');

let modelsLoaded = false;

// LOAD MODELS
async function loadModels() {

    await faceapi.nets.tinyFaceDetector.loadFromUri('/frontend/models');

    await faceapi.nets.faceLandmark68Net.loadFromUri('/frontend/models');

    await faceapi.nets.faceRecognitionNet.loadFromUri('/frontend/models');

    // ADD THIS (IMPORTANT FIX)
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/frontend/models');

    modelsLoaded = true;
    statusText.innerText = "Models Loaded";
}

loadModels();

async function fetchEmployee() {

    let empId = document.getElementById('emp_id').value;
    let dept = document.getElementById('dept').value;
    let empName = document.getElementById('emp_name');
    let btn = document.getElementById('attendanceBtn');

    if (!empId || !dept) {
        empName.innerText = "";
        btn.disabled = true;
        return;
    }
    else {
        empName.innerText = "Checking...";
    }

    try {
        let res = await fetch(`/api/employee/${empId}`);
        // let res1 = await fetch(`/api/employee/${dept}`);
        let data = await res.json();
        // let data1 = await res1.json();

        console.log(data.name);
        console.log(data.department);

        if (data && data.name && data.department === dept) {
            empName.innerText = "Name: " + data.name;

            btn.disabled = false;
        } else {
            empName.innerText = "Employee not found / Department mismatch";

            btn.disabled = true;
        }

    } catch {
        empName.innerText = "Error fetching data";

        btn.disabled = true;
    }
}

// CAMERA
async function startCamera() {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        statusText.innerText = "Camera Started";
    } catch {
        alert("Camera access denied");
    }
}

// GPS CHECK
async function checkLocation() {

    return new Promise((resolve, reject) => {

        navigator.geolocation.getCurrentPosition(async pos => {

            let res = await fetch('/api/get-location');
            let loc = await res.json();

            if (!loc.lat) {
                alert("Admin has not set location");
                reject();
                return;
            }

            let dist = getDistance(
                pos.coords.latitude,
                pos.coords.longitude,
                loc.lat,
                loc.lng
            );

            if (dist > loc.radius) {
                alert("Outside company area");
                reject();
            } else {
                resolve();
            }

        }, () => {
            alert("Location permission denied");
            reject();
        });

    });
}

// LOAD DATASET
async function loadLabeledImages(empId) {

    if (cachedDescriptors) {
        console.log("Using cached descriptors");
        return cachedDescriptors;
    }

    let res = await fetch(`/api/employee/${empId}`);
    let user = await res.json();

    if (!user.images || user.images.length === 0) {
        console.log("No images in DB");
        return null;
    }

    const descriptions = [];

    for (let url of user.images) {
        try {
            console.log("Loading image:", url);

            const img = await faceapi.fetchImage(url);

            // document.body.appendChild(img);  // debug line to match images...

            const detection = await faceapi.detectSingleFace(img,
                new faceapi.SsdMobilenetv1Options({
                    minConfidence: 0.2
                })
            )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                console.log("Face detected");
                descriptions.push(detection.descriptor);
            }
            else {
                console.log("Face not detected");
            }

            // if (!modelsLoaded) {
            //     alert("Models not loaded yet");
            //     return;
            // }
        } catch (e) {
            console.log("Image load error", e);
        }
    }

    console.log("Total descriptors: ", descriptions.length);

    cachedDescriptors = new faceapi.LabeledFaceDescriptors(empId, descriptions);

    return cachedDescriptors;
}

// MAIN FUNCTION
async function verifyAndMark() {

    let empId = document.getElementById('emp_id').value;

    if (!empId) {
        alert("Enter Employee ID");
        return;
    }

    // STEP 1: GPS CHECK
    try {
        await checkLocation();
    } catch {
        return;
    }

    statusText.innerText = "Verifying face...";

    let labeled = await loadLabeledImages(empId);

    if (labeled.descriptors.length === 0) {
        alert("No dataset found");
        return;
    }

    const matcher = new faceapi.FaceMatcher([labeled], 0.6);

    let attempts = 0;

    let interval = setInterval(async () => {

        const detection = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 160,
                scoreThreshold: 0.3     // default is 0.5 (too strict)
            })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!modelsLoaded) {
            alert("Models not loaded yet");
            return;
        }

        if (!detection) {
            statusText.innerText = "No face detected";
            return;
        }

        const match = matcher.findBestMatch(detection.descriptor);

        attempts++;

        // statusText.innerText = `Matching... ${attempts}`;

        // if (attempts > 6) {

        //     clearInterval(interval);

        //     if (match.label === "unknown") {
        //         alert("Face not matched");
        //         return;
        //     }

        //     // SUCCESS
        //     await markAttendance(empId);
        // }

        if (match.label !== "unknown") {
            clearInterval(interval);
            await markAttendance(empId);
            return;
        }

        // fallback after attempts
        if (attempts > 6) {
            clearInterval(interval);

            alert("Face not matched");
        }

    }, 500);
}

// SAVE ATTENDANCE
async function markAttendance(empId) {

    await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            employee_id: empId,
            date: new Date().toISOString().split('T')[0],
            check_in: new Date().toLocaleTimeString()
        })
    });

    alert("Attendance Marked");
    window.location.href = "/dashboard";
}