document.addEventListener("DOMContentLoaded", function () {
  const usersTableBody = document.querySelector("#usersTable tbody");
  const questionsTableBody = document.querySelector("#questionsTable tbody");
  const competitionTableBody = document.querySelector(
    "#competitionTable tbody"
  );
  const logoutBtn = document.getElementById("logoutBtn");
  const token = localStorage.getItem("token");
  document.getElementById("addUser").addEventListener("click", addUser);
  document.getElementById("addQuestion").addEventListener("click", addQuestion);
  document
    .getElementById("addCompetition")
    .addEventListener("click", addCompetition);

  document
    .getElementById("addQuestionFromFile")
    .addEventListener("click", addQuestionFromFile);

  if (!token) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "login.html";
    return;
  }

  fetch("https://vhq.onrender.com/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((user) => {
      if (user.role !== "admin") {
        alert("Bạn không có quyền truy cập vào trang này!");
        window.location.href = "index.html";
      }
    })
    .catch((err) => {
      console.error("Lỗi lấy thông tin người dùng:", err);
      alert("Không thể xác minh quyền truy cập!");
      window.location.href = "login.html";
    });

  function fetchUsers() {
    fetch("https://vhq.onrender.com/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((users) => {
        usersTableBody.innerHTML = "";
        users.forEach((user) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${user.id}</td>
                    <td contenteditable="true">${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.password}</td>
                    <td contenteditable="true">${user.role}</td>
                    <td>
                        <button class="updateUserBtn" data-id="${user.id}">Lưu</button>
                        <button class="deleteUserBtn" data-id="${user.id}">Xóa</button>
                    </td>
                `;
          usersTableBody.appendChild(row);
        });

        document.querySelectorAll(".updateUserBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const userId = this.getAttribute("data-id");
            updateUser(userId, this);
          });
        });

        document.querySelectorAll(".deleteUserBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const userId = this.getAttribute("data-id");
            deleteUser(userId);
          });
        });
      })
      .catch((err) => console.error("Lỗi lấy người dùng:", err));
  }

  function fetchQuestions() {
    fetch("https://vhq.onrender.com/admin/questions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((questions) => {
        questionsTableBody.innerHTML = "";
        questions.forEach((q) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${q.id}</td>
                    <td contenteditable="true">${q.question}</td>
                    <td contenteditable="true">${q.option_a}</td>
                    <td contenteditable="true">${q.option_b}</td>
                    <td contenteditable="true">${q.option_c}</td>
                    <td contenteditable="true">${q.option_d}</td>
                    <td contenteditable="true">${q.correct_option}</td>
                    <td contenteditable="true">${q.difficulty}</td>
                    <td contenteditable="true">${q.type}</td>
                    <td>
                        <button class="updateQuestionBtn" data-id="${q.id}">Lưu</button>
                        <button class="deleteQuestionBtn" data-id="${q.id}">Xóa</button>
                    </td>
                `;
          questionsTableBody.appendChild(row);
        });
        document.querySelectorAll(".updateQuestionBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const questionId = this.getAttribute("data-id");
            updateQuestion(questionId, this);
          });
        });

        document.querySelectorAll(".deleteQuestionBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const questionId = this.getAttribute("data-id");
            deleteQuestion(questionId);
          });
        });
      })
      .catch((err) => console.error("Lỗi lấy câu hỏi:", err));
  }

  function fetchCompetition() {
    fetch("https://vhq.onrender.com/admin/competitions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((competitions) => {
        console.log(competitions);
        competitionTableBody.innerHTML = "";
        competitions.forEach((c) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${c.id}</td>
                    <td contenteditable="true">${c.name}</td>
                    <td contenteditable="true">${c.difficulty}</td>
                    <td contenteditable="true">${c.question_count}</td>
                    <td contenteditable="true">${c.subject}</td>
                    <td>
                        <button class="updateCompetitionsBtn" data-id="${c.id}">Lưu</button>
                        <button class="deleteCompetitionsBtn" data-id="${c.id}">Xóa</button>
                    </td>
                `;
          competitionTableBody.appendChild(row);
        });
        document.querySelectorAll(".updateCompetitionsBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const competitionId = this.getAttribute("data-id");
            updateCompetition(competitionId, this);
          });
        });

        document.querySelectorAll(".deleteCompetitionsBtn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const competitionId = this.getAttribute("data-id");
            deleteCompetition(competitionId);
          });
        });
      })
      .catch((err) => console.error("Lỗi lấy kỳ thi:", err));
  }

  function addUser() {
    const username = prompt("Nhập tên người dùng:");
    const email = prompt("Nhập email:");
    const password = prompt("Nhập mật khẩu:");
    const role = prompt("Nhập vai trò (user/admin):");

    if (!username || !email || !password || !role)
      return alert("Vui lòng nhập đầy đủ thông tin!");

    fetch("https://vhq.onrender.com/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, email, password, role }),
    })
      .then(() => fetchUsers())
      .catch((err) => console.error("Lỗi thêm người dùng:", err));
  }

  function updateUser(id, btn) {
    const row = btn.closest("tr");
    const username = row.children[1].textContent;
    const role = row.children[4].textContent;

    fetch(`https://vhq.onrender.com/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, role }),
    })
      .then(() => alert("Cập nhật thành công!"))
      .catch((err) => console.error("Lỗi cập nhật:", err));
  }

  function deleteUser(id) {
    console.log("Pass delte");
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    fetch(`https://vhq.onrender.com/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchUsers())
      .catch((err) => console.error("Lỗi xóa:", err));
  }

  function addQuestion() {
    const question = prompt("Nhập câu hỏi:");
    const option_a = prompt("Nhập đáp án A:");
    const option_b = prompt("Nhập đáp án B:");
    const option_c = prompt("Nhập đáp án C:");
    const option_d = prompt("Nhập đáp án D:");
    const correct_option = prompt("Nhập đáp án đúng (A, B, C, D):");
    const difficulty = prompt("Nhập độ khó:");
    const type = prompt("Nhập dạng câu hỏi:");

    if (
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_option ||
      !difficulty ||
      !type
    )
      return alert("Vui lòng nhập đầy đủ thông tin!");

    fetch("https://vhq.onrender.com/admin/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        difficulty,
        type,
      }),
    })
      .then(() => fetchQuestions())
      .catch((err) => console.error("Lỗi thêm câu hỏi:", err));
  }

  function updateQuestion(id, btn) {
    const row = btn.closest("tr");
    const question = row.children[1].textContent;
    const option_a = row.children[2].textContent;
    const option_b = row.children[3].textContent;
    const option_c = row.children[4].textContent;
    const option_d = row.children[5].textContent;
    const correct_option = row.children[6].textContent;
    const difficulty = row.children[7].textContent;
    const type = row.children[8].textContent;
    console.log(correct_option);

    fetch(`https://vhq.onrender.com/admin/questions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        difficulty,
        type,
      }),
    })
      .then(() => alert("Cập nhật câu hỏi thành công!"))
      .catch((err) => console.error("Lỗi cập nhật:", err));
  }

  function deleteQuestion(id) {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    fetch(`https://vhq.onrender.com/admin/questions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchQuestions())
      .catch((err) => console.error("Lỗi xóa:", err));
  }

  function addCompetition() {
    console.log("Pass AddC");
    const name = prompt("Nhập tên kỳ thi:");
    const difficulty = prompt("Nhập độ khó:");
    const question_count = prompt("Nhập số câu hỏi:");
    const subject = prompt("Nhập môn học:")

    if (!name || !difficulty || !question_count)
      return alert("Vui lòng nhập đầy đủ thông tin!");

    fetch("https://vhq.onrender.com/admin/competitions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        difficulty,
        question_count,
        subject,
      }),
    })
      .then(() => fetchCompetition())
      .catch((err) => console.error("Lỗi thêm kỳ thi:", err));
  }

  function updateCompetition(id, btn) {
    const row = btn.closest("tr");
    const name = row.children[1].textContent;
    const difficulty = row.children[2].textContent;
    const question_count = row.children[3].textContent;
    const subject = row.children[4].textContent;
    console.log(subject)

    fetch(`https://vhq.onrender.com/admin/competitions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        difficulty,
        question_count,
        subject,
      }),
    })
      .then(() => alert("Cập nhật kì thi thành công!"))
      .catch((err) => console.error("Lỗi cập nhật:", err));
  }

  function deleteCompetition(id) {
    if (!confirm("Bạn có chắc muốn kì thi hỏi này?")) return;

    fetch(`https://vhq.onrender.com/admin/competitions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchQuestions())
      .catch((err) => console.error("Lỗi xóa:", err));
  }

  function addQuestionFromFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".docx";
    fileInput.onchange = function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const arrayBuffer = e.target.result;
          mammoth
            .extractRawText({ arrayBuffer: arrayBuffer })
            .then(function (result) {
              const text = result.value;
              const questions = parseQuestionsFromText(text);
              addQuestionsToDatabase(questions);
            })
            .catch(function (err) {
              console.error("Lỗi đọc file Word:", err);
              alert("Lỗi đọc file Word!");
            });
        };
        reader.readAsArrayBuffer(file);
      }
    };
    fileInput.click();
  }

  function parseQuestionsFromText(text) {
    const questions = [];
    const lines = text.split("\n");
    let currentQuestion = null;
  
    lines.forEach((line) => {
      line = line.trim();
  
      if (line.startsWith("Câu hỏi:")) {
        
        if (currentQuestion) {
          questions.push(currentQuestion); 
        }
        currentQuestion = {
          question: line.replace("Câu hỏi:", "").trim(),
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          correct_option: "",
          difficulty: "",
          type: "",
        };
      } else if (line.startsWith("A:")) {
        currentQuestion.option_a = line.replace("A:", "").trim();
      } else if (line.startsWith("B:")) {
        currentQuestion.option_b = line.replace("B:", "").trim();
      } else if (line.startsWith("C:")) {
        currentQuestion.option_c = line.replace("C:", "").trim();
      } else if (line.startsWith("D:")) {
        currentQuestion.option_d = line.replace("D:", "").trim();
      } else if (line.startsWith("Đáp án đúng:")) {
        currentQuestion.correct_option = line.replace("Đáp án đúng:", "").trim();
      } else if (line.startsWith("Độ khó:")) {
        currentQuestion.difficulty = line.replace("Độ khó:", "").trim();
      } else if (line.startsWith("Dạng câu hỏi:")) {
        currentQuestion.type = line.replace("Dạng câu hỏi:", "").trim();
      }
    });
 
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
  
    console.log("Danh sách câu hỏi sau khi phân tích:", questions);
    return questions;
  }

  function addQuestionsToDatabase(questions) {
    questions.forEach((q) => {
      fetch("https://vhq.onrender.com/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          difficulty: q.difficulty,
          type: q.type,
        }),
      })
        .then(() => fetchQuestions())
        .catch((err) => console.error("Lỗi thêm câu hỏi:", err));
    });
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  fetchUsers();
  fetchQuestions();
  fetchCompetition();
});