console.log("Register script loaded");

let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let statusText = document.getElementById('status');

let images = [];
let blinkDetected = false;
let headMoves = { left: false, right: false, up: false, down: false };

let modelsLoaded = false;

// LOAD MODELS
console.log("faceapi:", typeof faceapi);
async function loadModels(){

    await faceapi.nets.tinyFaceDetector.loadFromUri('/frontend/models');

    await faceapi.nets.faceLandmark68Net.loadFromUri('/frontend/models');

    await faceapi.nets.faceRecognitionNet.loadFromUri('/frontend/models');

    // ADD THIS (IMPORTANT FIX)
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/frontend/models');

    modelsLoaded = true;

    statusText.innerText = "Models Loaded";
}

loadModels();

// CAMERA
async function startCamera() {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        statusText.innerText = "Camera Started";
    } catch {
        alert("Camera permission denied");
    }
}

// CAPTURE + VERIFY
async function startVerification() {

    images = [];
    blinkDetected = false;
    headMoves = { left: false, right: false, up: false, down: false };

    let count = 0;

    statusText.innerText = "Capturing... Blink & move head";

    let interval = setInterval(async () => {

        let detection = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        if (!modelsLoaded) {
            alert("Models not loaded yet");
            return;
        }

        if (!detection) {
            statusText.innerText = "Face not detected";
            return;
        }

        let box = detection.detection.box;

        ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, 320, 240);

        // grayscale
        let imgData = ctx.getImageData(0, 0, 320, 240);
        let d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
            let avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
            d[i] = d[i + 1] = d[i + 2] = avg;
        }

        ctx.putImageData(imgData, 0, 0);

        images.push(canvas.toDataURL("image/jpeg"));

        if (detectBlink(detection.landmarks)) blinkDetected = true;
        detectHeadMovement(detection.landmarks, headMoves);

        count++;

        statusText.innerText = `Captured ${count}/15`;

        if (count >= 15) {

            clearInterval(interval);
            
            console.log("Images captured:", images.length);

            if (!blinkDetected) {
                alert("Blink required");
                return;
            }

            if (Object.values(headMoves).includes(false)) {
                alert("Move head in all directions");
                return;
            }

            statusText.innerText = "Verification Completed";
        }

    }, 500);
}

// REGISTER USER
async function registerUser() {

    if(!username.includes("@")) {
        alert("Please enter valid email");
        return;
    }
    if (images.length < 15) {
        alert("Complete face verification first");
        return;
    }

    let data = {
        employee_id: document.getElementById('emp_id').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        department: document.getElementById('dept').value,
        password: document.getElementById('password').value,
        role: document.getElementById('role').value,
        images: images
    };

    let res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    let r = await res.json();

    if (r.success) {
        alert("Registered Successfully");
        window.location.href = "/";
    } else {
        alert("Registration failed");
    }
}