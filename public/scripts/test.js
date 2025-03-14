document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Bạn chưa đăng nhập! Vui lòng đăng nhập.");
        window.location.href = "login.html";
        return;
    }

    let currentQuestionIndex = 0;
    let questions = [];
    let score = 0;
    let answered = false;

    const correctSound = new Audio("./sounds/correct.mp3");
    const wrongSound = new Audio("./sounds/wrong2.mp3");

    const nextBtn = document.getElementById("nextBtn");

    nextBtn.addEventListener("click", () => {
        fetchCompetitions()
    });
    

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        alert("Bạn đã đăng xuất.");
        window.location.href = "login.html";
    });

    async function fetchCompetitions() {
        try {
            const res = await fetch("http://localhost:3000/competitionstest", { 
                headers: { Authorization: token } 
            });
    
            if (!res.ok) throw new Error("Lỗi tải kỳ thi!");
    
            const competitions = await res.json();
            console.log(competitions)
            const competitionContainer = document.getElementById("competition-container");
    
            if (!competitionContainer) {
                console.error("Phần tử #competition-container không tồn tại!");
                return;
            }

        } catch (error) {
            console.error("Lỗi khi tải kỳ thi:", error);
            alert("Lỗi khi tải kỳ thi, vui lòng thử lại!");
        }
    }
    
    
     

    fetchQuestions();
});
