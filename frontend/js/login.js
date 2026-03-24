async function login() {

    let email = document.getElementById('email').value;
    console.log(email);
    let password = document.getElementById('password').value;
    console.log(password);

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    if (!email.includes("@")) {
        alert("Please enter valid email");
        return;
    }

    try {
        let res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
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