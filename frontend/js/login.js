async function login() {

    let username = document.getElementById('username').value;
    console.log(username);
    let password = document.getElementById('password').value;
    console.log(password);

    if (!username || !password) {
        alert("Please enter username and password");
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

            console.log(data.role);

            // ROLE-BASED REDIRECTION
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