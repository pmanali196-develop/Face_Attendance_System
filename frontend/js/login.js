async function login() {

    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    if (!username || !password) {
        alert("Please enter email and password");
        return;
    }

    if (!username.includes("@")) {
        alert("Please enter valid email");
        return;
    }

    try {
        let res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        let data = await res.json();

        let statusText = document.getElementById('status');

        statusText.innerText = "Logging in...";

        if (data.success) {

            // Role-based Redirection
            if (data.role === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/dashboard";
            }

        } else {
            statusText.innerText = "Invalid credentials";
        }

    } catch (err) {
        statusText.innerText = "Server error";
    }
}