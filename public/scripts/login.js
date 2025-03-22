document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("https://vhq.onrender.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) {
            localStorage.setItem("token", data.token);
            window.location.href = "index.html";
            localStorage.setItem("username", data.username);
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
});
