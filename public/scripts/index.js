document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username") || "Người dùng";

    if (!token) {
        alert("Bạn chưa đăng nhập! Vui lòng đăng nhập.");
        window.location.href = "login.html";
    } else {
        document.getElementById("username").textContent = username;
    }

    try {
        const res = await fetch("http://localhost:3000/user", {
            method: "GET",
            headers: { Authorization: token }
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("username").textContent = data.username;
        } else {
            alert("Lỗi: " + data.message);
            window.location.href = "login.html";
        }


        
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Lỗi kết nối đến server!");
        window.location.href = "login.html";
    }

    try {
        const res = await fetch("http://localhost:3000/userinfo", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("username").textContent = data.username;
            
            if (data.role === "admin") {
                document.getElementById("adminPanel").style.display = "inline";
            }
        } else {
            alert("Lỗi lấy thông tin người dùng: " + data.message);
            localStorage.removeItem("token");
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Lỗi kết nối server:", error);
        alert("Lỗi kết nối đến server!");
    }

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        alert("Bạn đã đăng xuất.");
        window.location.href = "login.html";
    });
    
});


function startQuiz(quizId) {
    window.location.href = `quiz.html?id=${quizId}`;
}
