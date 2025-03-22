const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    try {
        // Mã hóa mật khẩu
        const hash = await bcrypt.hash(password, 10);

        // Thêm người dùng vào cơ sở dữ liệu
        const result = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hash]
        );

        // Trả về phản hồi thành công
        res.status(201).json({ message: "Đăng ký thành công!", user: result.rows[0] });
    } catch (err) {
        console.error("Lỗi khi đăng ký:", err);

        // Xử lý lỗi trùng lặp email hoặc username
        if (err.code === '23505') { // PostgreSQL error code for unique violation
            return res.status(400).json({ message: "Email hoặc username đã tồn tại." });
        }

        // Lỗi server khác
        res.status(500).json({ message: "Lỗi server khi đăng ký." });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, "secret", { expiresIn: "24h" });
        res.json({ message: "Đăng nhập thành công!", token });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server." });
    }
});

app.get("/user", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Không có token!" });

    try {
        const decoded = jwt.verify(token, "secret");
        const result = await db.query("SELECT username FROM users WHERE id = $1", [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }
        res.json({ username: result.rows[0].username });
    } catch (err) {
        res.status(401).json({ message: "Token không hợp lệ!" });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Không có token!" });

    jwt.verify(token, "secret", (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token không hợp lệ!" });

        if (!decoded.role) return res.status(403).json({ message: "Không có quyền truy cập!" });

        req.user = decoded;
        next();
    });
};

app.get("/userinfo", authenticateToken, async (req, res) => {
    try {
        const result = await db.query("SELECT username, role FROM users WHERE id = $1", [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }
        const user = result.rows[0];
        res.json({ username: user.username, role: user.role });
    } catch (err) {
        console.error("Lỗi server:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.get("/admin/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    try {
        const result = await db.query("SELECT id, username, email, password, role FROM users");
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi PostgreSQL:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.get("/admin/questions", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    try {
        const result = await db.query("SELECT id, question, option_a, option_b, option_c, option_d, correct_option, difficulty, type FROM quizzes");
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi PostgreSQL:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.post("/admin/users", async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        await db.query("INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)", [username, email, password, role]);
        res.status(201).send("Người dùng đã được thêm");
    } catch (err) {
        res.status(500).send("Lỗi khi thêm người dùng: " + err.message);
    }
});

app.put("/admin/users/:id", async (req, res) => {
    const { username, role } = req.body;
    const { id } = req.params;
    try {
        await db.query("UPDATE users SET username = $1, role = $2 WHERE id = $3", [username, role, id]);
        res.send("Người dùng đã được cập nhật");
    } catch (err) {
        res.status(500).send("Lỗi khi cập nhật người dùng: " + err.message);
    }
});

app.delete("/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = $1", [id]);
        res.send("Người dùng đã bị xóa");
    } catch (err) {
        res.status(500).send("Lỗi khi xóa người dùng: " + err.message);
    }
});

app.post("/admin/questions", async (req, res) => {
    try {
        const { question, option_a, option_b, option_c, option_d, correct_option, difficulty, type } = req.body;
        await db.query(
            "INSERT INTO quizzes (question, option_a, option_b, option_c, option_d, correct_option, difficulty, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [question, option_a, option_b, option_c, option_d, correct_option, difficulty, type]
        );
        res.status(201).send("Câu hỏi đã được thêm thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi thêm câu hỏi: " + err.message);
    }
});

app.put("/admin/questions/:id", async (req, res) => {
    try {
        const { question, option_a, option_b, option_c, option_d, correct_option, difficulty, type } = req.body;
        const { id } = req.params;
        await db.query(
            "UPDATE quizzes SET question = $1, option_a = $2, option_b = $3, option_c = $4, option_d = $5, correct_option = $6, difficulty = $7, type = $8 WHERE id = $9",
            [question, option_a, option_b, option_c, option_d, correct_option, difficulty, type, id]
        );
        res.send("Câu hỏi đã được cập nhật thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi cập nhật câu hỏi: " + err.message);
    }
});

app.delete("/admin/questions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM quizzes WHERE id = $1", [id]);
        res.send("Câu hỏi đã bị xóa thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi xóa câu hỏi: " + err.message);
    }
});

app.post("/save-score", authenticateToken, async (req, res) => {
    const { score } = req.body;
    const userId = req.user.id;

    if (score === undefined || score === null || isNaN(score)) {
        return res.status(400).json({ message: "Điểm số không hợp lệ!" });
    }

    try {
        await db.query("INSERT INTO scores (user_id, score) VALUES ($1, $2)", [userId, score]);
        res.json({ message: "Lưu điểm thành công!" });
    } catch (err) {
        console.error("Lỗi khi lưu điểm:", err);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.get("/history", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            "SELECT score, quiz_date FROM scores WHERE user_id = $1 ORDER BY quiz_date DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi khi lấy lịch sử làm bài:", err);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.get("/me", authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.get("/leaderboard", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                RANK() OVER (ORDER BY s.score DESC, s.quiz_date ASC) AS rank,
                u.id, 
                u.username, 
                s.score, 
                s.quiz_date
            FROM scores s
            JOIN users u ON s.user_id = u.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi truy vấn:", err);
        res.status(500).json({ error: "Lỗi truy vấn dữ liệu" });
    }
});

app.get("/profile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query("SELECT username, email FROM users WHERE id = $1", [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        res.json({ id: req.user.id, username: req.user.username, role: req.user.role, ...result.rows[0] });
    } catch (err) {
        console.error("Lỗi PostgreSQL:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.put("/profile", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { username, email } = req.body;

    try {
        await db.query(
            "UPDATE users SET username = $1, email = $2 WHERE id = $3",
            [username, email, userId]
        );
        res.json({ message: "Cập nhật thông tin thành công!" });
    } catch (err) {
        console.error("Lỗi PostgreSQL:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.post("/admin/competitions", async (req, res) => {
    try {
        const { name, difficulty, question_count } = req.body;
        await db.query(
            "INSERT INTO competitions (name, difficulty, question_count) VALUES ($1, $2, $3)",
            [name, difficulty, question_count]
        );
        res.status(201).send("Kỳ thi đã được thêm thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi thêm kỳ thi: " + err.message);
    }
});

app.get("/admin/competitions", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    try {
        const result = await db.query("SELECT id, name, difficulty, question_count, subject FROM competitions");
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi PostgreSQL:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.get("/competitions", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Không có token!" });

    try {
        jwt.verify(token, "secret");
        const result = await db.query("SELECT * FROM competitions");
        res.json(result.rows);
    } catch (err) {
        res.status(401).json({ message: "Token không hợp lệ!" });
    }
});

app.get("/competitions/:id/questions", async (req, res) => {
    try {
        const { id } = req.params;

        const competition = await db.query(
            "SELECT difficulty FROM competitions WHERE id = $1",
            [id]
        );

        if (competition.rows.length === 0) {
            return res.status(404).json({ error: "Kỳ thi không tồn tại" });
        }

        const competitionDifficulty = competition.rows[0].difficulty;

        let questionDistribution;
        if (competitionDifficulty === "easy") {
            questionDistribution = { easy: 12, medium: 5, hard: 3 };
        } else if (competitionDifficulty === "medium") {
            questionDistribution = { easy: 8, medium: 8, hard: 4 };
        } else if (competitionDifficulty === "hard") {
            questionDistribution = { easy: 5, medium: 7, hard: 8 };
        } else {
            return res.status(400).json({ error: "Độ khó kỳ thi không hợp lệ" });
        }

        const easyQuestions = await db.query(
            "SELECT * FROM quizzes WHERE difficulty = 'easy' ORDER BY RANDOM() LIMIT $1",
            [questionDistribution.easy]
        );

        const mediumQuestions = await db.query(
            "SELECT * FROM quizzes WHERE difficulty = 'medium' ORDER BY RANDOM() LIMIT $1",
            [questionDistribution.medium]
        );

        const hardQuestions = await db.query(
            "SELECT * FROM quizzes WHERE difficulty = 'hard' ORDER BY RANDOM() LIMIT $1",
            [questionDistribution.hard]
        );

        const questions = [...easyQuestions.rows, ...mediumQuestions.rows, ...hardQuestions.rows];

        if (questions.length === 0) {
            return res.status(404).json({ error: "Không có câu hỏi nào phù hợp" });
        }

        res.json({ competition_id: id, difficulty: competitionDifficulty, questions });
    } catch (err) {
        console.error("Lỗi khi lấy câu hỏi kỳ thi:", err);
        res.status(500).json({ error: "Lỗi khi lấy câu hỏi kỳ thi" });
    }
});

app.put("/admin/competitions/:id", async (req, res) => {
    try {
        const { name, difficulty, question_count, subject } = req.body;
        const { id } = req.params;
        await db.query(
            "UPDATE competitions SET name = $1, difficulty = $2, question_count = $3, subject = $4 WHERE id = $5",
            [name, difficulty, question_count, subject, id]
        );
        res.send("Kỳ thi đã được cập nhật thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi cập nhật kỳ thi: " + err.message);
    }
});

app.delete("/admin/competitions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM competitions WHERE id = $1", [id]);
        res.send("Kỳ thi đã bị xóa thành công");
    } catch (err) {
        res.status(500).send("Lỗi khi xóa kỳ thi: " + err.message);
    }
});

// Chạy server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});