document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("score-box").style.display = "none";

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
    const congratulationSound = new Audio("./sounds/congratulation.mp3");

    const nextBtn = document.getElementById("nextBtn");

    nextBtn.addEventListener("click", () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion(currentQuestionIndex);
        } else {
            congratulationSound.play();
            saveScore();
        }
    });


    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        alert("Bạn đã đăng xuất.");
        window.location.href = "login.html";
    });

    function loadQuestion(index) {
        answered = false;
        const questionData = questions[index];
    
        console.log(questionData);
        console.log(questionData.type);
    
        document.getElementById("question").textContent = `${questionData.question} (Độ khó: ${questionData.difficulty})`;
        document.getElementById("score").textContent = `Điểm: ${score}`;
    
        const optionsContainer = document.getElementById("options");
        optionsContainer.innerHTML = "";
    
        if (questionData.type === "multiple_choice") {
            console.log('pass');
            const optionsMap = ["a", "b", "c", "d"];
    
            optionsMap.forEach((key) => {
                const button = document.createElement("button");
                button.textContent = `${key.toUpperCase()}. ${questionData[`option_${key}`]}`;
                button.classList.add("option");
                button.dataset.option = key;
                
                button.onclick = () => {
                    if (!answered) checkAnswer(button, questionData.correct_option.toLowerCase(), questionData.difficulty);
                };
    
                optionsContainer.appendChild(button);
            });
        } else if (questionData.type === "true_false") {
            ["Đúng", "Sai"].forEach((text, i) => {
                const button = document.createElement("button");
                button.textContent = text;
                button.classList.add("option");
                button.dataset.option = i === 0 ? "true" : "false";
                
                button.onclick = () => {
                    if (!answered) checkAnswer(button, questionData.correct_option.toLowerCase(), questionData.difficulty);
                };
    
                optionsContainer.appendChild(button);
            });
        } else if (questionData.type === "fill_in_blank") {
            const input = document.createElement("input");
            input.type = "text";
            input.id = "fill-answer";
            input.placeholder = "Nhập câu trả lời của bạn";
        
            const submitButton = document.createElement("button");
            submitButton.textContent = "Xác nhận";
            submitButton.id = "fill-submit";
            submitButton.onclick = () => {
                if (!answered) checkAnswerFillIn(input.value.trim(), questionData.correct_option, questionData.difficulty);
            };
        
            optionsContainer.appendChild(input);
            optionsContainer.appendChild(submitButton);
        }
        
        
        const nextBtn = document.getElementById("nextBtn");
        if (nextBtn) {
            nextBtn.textContent = index === questions.length - 1 ? "Lưu bài" : "Tiếp theo";
        }
    }
    


    function checkAnswer(button, correctOption, difficulty) {
        answered = true;
        const selectedOption = button.dataset.option;
    
        let difficultyPoints = {
            "easy": 5,
            "medium": 10,
            "hard": 15
        };
        let questionScore = difficultyPoints[difficulty] || 10;
    
        if (selectedOption === correctOption) {
            button.classList.add("correct");
            score += questionScore;
            correctSound.play();
        } else {
            button.classList.add("incorrect");
            wrongSound.play();
        }
    
        document.getElementById("score").textContent = `Điểm: ${score}`;
    }
    
    function checkAnswerFillIn(userAnswer, correctAnswer, difficulty) {
        answered = true;
        let difficultyPoints = {
            "easy": 5,
            "medium": 10,
            "hard": 15
        };
        let questionScore = difficultyPoints[difficulty] || 10;
    
        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            document.getElementById("fill-answer").classList.add("correct");
            score += questionScore;
            correctSound.play();
        } else {
            document.getElementById("fill-answer").classList.add("incorrect");
            wrongSound.play();
        }
    
        document.getElementById("score").textContent = `Điểm: ${score}`;
    }


    async function saveScore() {
        console.log("Điểm cần lưu:", score);

        if (score === null || score === undefined || isNaN(score)) {
            alert("Lỗi: Điểm không hợp lệ!");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/save-score", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ score })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Lỗi khi lưu điểm!");
            }

            alert(`Bài kiểm tra hoàn thành! Bạn đạt ${score} điểm.`);
            window.location.reload();
        } catch (error) {
            console.error("Lỗi:", error);
            alert("Không thể lưu điểm, vui lòng thử lại!");
        }
    }

    async function fetchHistory() {
        try {
            const res = await fetch("http://localhost:3000/history", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Không thể lấy lịch sử làm bài!");

            const historyData = await res.json();
            // console.log("Dữ liệu lịch sử:", historyData);

            const historyContainer = document.getElementById("history");

            if (!historyContainer) {
                console.error("Phần tử #history không tồn tại trên trang!");
                return;
            }

            if (historyData.length === 0) {
                historyContainer.innerHTML = "<p>Bạn chưa có lịch sử làm bài.</p>";
                return;
            }

            historyContainer.innerHTML = "<h3>Lịch sử làm bài</h3>";
            historyData.forEach((entry, index) => {
                const date = new Date(entry.quiz_date).toLocaleString("vi-VN");
                historyContainer.innerHTML += `<p>${entry.score} điểm (${date})</p>`;
            });
        } catch (error) {
            console.error("Lỗi khi lấy lịch sử:", error);
        }
    }

    async function fetchCompetitions() {
        try {
            const res = await fetch("http://localhost:3000/competitions", {
                headers: { Authorization: token }
            });

            if (!res.ok) throw new Error("Lỗi tải kỳ thi!");

            const competitions = await res.json();
            const competitionContainer = document.getElementById("competition-container");

            if (!competitionContainer) {
                console.error("Phần tử #competition-container không tồn tại!");
                return;
            }

            competitionContainer.innerHTML = "<h3>Chọn kỳ thi</h3>";

            competitions.forEach(competition => {
                const button = document.createElement("button");
                button.textContent = competition.name;
                button.classList.add("competition-btn");
                button.onclick = () => loadCompetition(competition.id);
                competitionContainer.appendChild(button);
                fetchHistory()
            });
        } catch (error) {
            console.error("Lỗi khi tải kỳ thi:", error);
            alert("Lỗi khi tải kỳ thi, vui lòng thử lại!");
        }
    }



    async function loadCompetition(competitionId) {
        try {
            const res = await fetch(`http://localhost:3000/competitions/${competitionId}/questions`, {
                headers: { Authorization: token }
            });

            if (!res.ok) throw new Error("Lỗi tải câu hỏi kỳ thi!");

            const data = await res.json();

            if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
                alert("Kỳ thi này chưa có câu hỏi!");
                return;
            }

            questions = data.questions;

            document.getElementById("competition-container").style.display = "none";
            document.getElementById("quiz-container").style.display = "block";
            document.getElementById("score-box").style.display = "block";

            currentQuestionIndex = 0;
            score = 0;
            document.getElementById("score").textContent = `Điểm: ${score}`;

            loadQuestion(currentQuestionIndex);
        } catch (error) {
            console.error("Lỗi khi tải câu hỏi kỳ thi:", error);
            alert("Không thể tải câu hỏi, vui lòng thử lại!");
        }
    }






    fetchCompetitions()
});
