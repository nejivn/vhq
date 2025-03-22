document.addEventListener("DOMContentLoaded", async () => {
    const usernameField = document.getElementById("username");
    const emailField = document.getElementById("email");
    const saveBtn = document.getElementById("saveBtn");
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Bạn cần đăng nhập!");
        window.location.href = "index.html";
        return;
    }

    try {
        console.log(token);

        const response = await fetch("http://vhq.onrender.com/profile", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            throw new Error("Không thể lấy thông tin cá nhân");
        }

        const user = await response.json();
        usernameField.value = user.username;
        emailField.value = user.email;
        console.log(user.email);
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Đã xảy ra lỗi khi tải thông tin tài khoản!");
    }

    saveBtn.addEventListener("click", async () => {
        const updatedUser = {
            username: usernameField.value,
            email: emailField.value
        };

        try {
            const response = await fetch("http://vhq.onrender.com/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(updatedUser)
            });

            if (!response.ok) {
                throw new Error("Không thể cập nhật thông tin cá nhân");
            }

            alert("Cập nhật thông tin thành công!");
        } catch (error) {
            console.error("Lỗi:", error);
            alert("Đã xảy ra lỗi khi cập nhật thông tin tài khoản!");
        }
    });
});
