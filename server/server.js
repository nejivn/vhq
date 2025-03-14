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

app.post("/register", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "Lỗi mã hóa mật khẩu." });

        const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.query(sql, [username, email, hash], (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi khi đăng ký." });
            res.json({ message: "Đăng ký thành công!" });
        });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, "secret", { expiresIn: "24h" });

            res.json({ message: "Đăng nhập thành công!", token });
        });
    });
});


app.get("/user", (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Không có token!" });

    jwt.verify(token, "secret", (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token không hợp lệ!" });

        const sql = "SELECT username FROM users WHERE id = ?";
        db.query(sql, [decoded.id], (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi server!" });

            if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

            res.json({ username: results[0].username });
        });

    });
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
        db.query("SELECT username, role FROM users WHERE id = ?", [req.user.id], (err, results) => {
            if (err) {
                console.error("Lỗi MySQL:", err);
                return res.status(500).json({ message: "Lỗi server" });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Người dùng không tồn tại" });
            }

            const user = results[0];
            res.json({ username: user.username, role: user.role });
        });
    } catch (error) {
        console.error("Lỗi server:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Lỗi server" });
        }
    }
});

app.get("/admin/users", authenticateToken, (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    db.query("SELECT id, username, email, password, role FROM users", (err, rows) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }

        res.json(rows);
    });
});


app.get("/admin/questions", authenticateToken, (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    db.query("SELECT id, question, option_a, option_b, option_c, option_d, correct_option, difficulty, type FROM quizzes", (err, rows) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }

        res.json(rows);
    });
});

app.post("/admin/users", async (req, res) => {
    const { username, email, password, role } = req.body;
    await db.query("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)", [username, email, password, role]);
    res.status(201).send("Người dùng đã được thêm");
});

app.put("/admin/users/:id", async (req, res) => {
    const { username, role } = req.body;
    const { id } = req.params;
    await db.query("UPDATE users SET username = ?, role = ? WHERE id = ?", [username, role, id]);
    res.send("Người dùng đã được cập nhật");
});

app.delete("/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.send("Người dùng đã bị xóa");
});

app.post("/admin/questions", async (req, res) => {
    try {
        const { question, option_a, option_b, option_c, option_d, correct_option, difficulty, type } = req.body;
        await db.query(
            "INSERT INTO quizzes (question, option_a, option_b, option_c, option_d, correct_option, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [question, option_a, option_b, option_c, option_d, correct_option, difficulty, type]
        );
        res.status(201).send("Câu hỏi đã được thêm thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi thêm câu hỏi: " + error.message);
    }
});

app.put("/admin/questions/:id", async (req, res) => {
    try {
        const { question, option_a, option_b, option_c, option_d, correct_option, difficulty, type } = req.body;
        const { id } = req.params;
        await db.query(
            "UPDATE quizzes SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, difficulty = ?, type = ? WHERE id = ?",
            [question, option_a, option_b, option_c, option_d, correct_option, difficulty, type, id]
        );
        res.send("Câu hỏi đã được cập nhật thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi cập nhật câu hỏi: " + error.message);
    }
});

app.delete("/admin/questions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM quizzes WHERE id = ?", [id]);
        res.send("Câu hỏi đã bị xóa thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi xóa câu hỏi: " + error.message);
    }
});

app.post("/save-score", authenticateToken, async (req, res) => {
    const { score } = req.body;
    const userId = req.user.id;

    if (score === undefined || score === null || isNaN(score)) {
        return res.status(400).json({ message: "Điểm số không hợp lệ!" });
    }

    try {
        await db.query("INSERT INTO scores (user_id, score) VALUES (?, ?)", [userId, score]);
        res.json({ message: "Lưu điểm thành công!" });
    } catch (error) {
        console.error("Lỗi khi lưu điểm:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

app.get("/history", authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log(userId)

    db.query(
        "SELECT score, quiz_date FROM scores WHERE user_id = ? ORDER BY quiz_date DESC",
        [userId],
        (error, results) => {
            if (error) {
                console.error("Lỗi khi lấy lịch sử làm bài:", error);
                return res.status(500).json({ message: "Lỗi server!" });
            }

            res.json(results);
        }
    );
});

app.get("/me", authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.get("/leaderboard", (req, res) => {
    const sql = `
        SELECT 
            RANK() OVER (ORDER BY s.score DESC, s.quiz_date ASC) AS rank,
            u.id, 
            u.username, 
            s.score, 
            s.quiz_date
        FROM scores s
        JOIN users u ON s.user_id = u.id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi truy vấn:", err);
            return res.status(500).json({ error: "Lỗi truy vấn dữ liệu" });
        }
        res.json(results);
    });
});

app.get("/profile", authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query("SELECT username, email FROM users WHERE id = ?", [userId], (err, result) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        res.json({ id: req.user.id, username: req.user.username, role: req.user.role, ...result[0] });
    });
});

app.put("/profile", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { username, email } = req.body;

    db.query(
        "UPDATE users SET username = ?, email = ? WHERE id = ?",
        [username, email, userId],
        (err, result) => {
            if (err) {
                console.error("Lỗi MySQL:", err);
                return res.status(500).json({ message: "Lỗi server" });
            }

            res.json({ message: "Cập nhật thông tin thành công!" });
        }
    );
});

app.post("/admin/competitions", async (req, res) => {
    try {
        const { name, difficulty, question_count } = req.body;
        await db.query(
            "INSERT INTO competitions (name, difficulty, question_count) VALUES (?, ?, ?)",
            [name, difficulty, question_count]
        );
        res.status(201).send("Câu hỏi đã được thêm thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi thêm câu hỏi: " + error.message);
    }
});

app.get("/admin/competitions", authenticateToken, (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Không có quyền truy cập" });

    db.query("SELECT id, name, difficulty, question_count, subject FROM competitions", (err, rows) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }

        console.log(rows)
        res.json(rows);
    });
});

app.get("/competitions", (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Không có token!" });

    jwt.verify(token, "secret", (err) => {
        if (err) return res.status(401).json({ message: "Token không hợp lệ!" });

        db.query("SELECT * FROM competitions", (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi server!" });

            res.json(results);
        });
    });
});

app.get("/competitionstest", (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Không có token!" });

    jwt.verify(token, "secret", (err) => {
        if (err) return res.status(401).json({ message: "Token không hợp lệ!" });

        db.query("SELECT * FROM quizzes WHERE difficulty = 'easy' ORDER BY RAND() LIMIT 3", (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi server!" });

            res.json(results);
            console.log(results)
        });

    });
});

app.get("/competitions/:id/questions", async (req, res) => {
    try {
        const { id } = req.params;

        // Hàm hỗ trợ truy vấn MySQL với Promise
        const queryPromise = (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.query(sql, params, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
        };

        // Lấy thông tin kỳ thi để kiểm tra độ khó
        const competition = await queryPromise(
            "SELECT difficulty FROM competitions WHERE id = ?",
            [id]
        );

        if (competition.length === 0) {
            return res.status(404).json({ error: "Kỳ thi không tồn tại" });
        }

        const competitionDifficulty = competition[0].difficulty;

        // Xác định số lượng câu hỏi dựa trên độ khó của kỳ thi
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

        // Lấy danh sách câu hỏi theo độ khó
        const easyQuestions = await queryPromise(
            "SELECT * FROM quizzes WHERE difficulty = 'easy' ORDER BY RAND() LIMIT ?",
            [questionDistribution.easy]
        );

        const mediumQuestions = await queryPromise(
            "SELECT * FROM quizzes WHERE difficulty = 'medium' ORDER BY RAND() LIMIT ?",
            [questionDistribution.medium]
        );

        const hardQuestions = await queryPromise(
            "SELECT * FROM quizzes WHERE difficulty = 'hard' ORDER BY RAND() LIMIT ?",
            [questionDistribution.hard]
        );

        // Debug dữ liệu truy vấn
        console.log("Easy Questions:", easyQuestions);
        console.log("Medium Questions:", mediumQuestions);
        console.log("Hard Questions:", hardQuestions);

        const questions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

        if (questions.length === 0) {
            return res.status(404).json({ error: "Không có câu hỏi nào phù hợp" });
        }

        res.json({ competition_id: id, difficulty: competitionDifficulty, questions });
    } catch (error) {
        console.error("Lỗi khi lấy câu hỏi kỳ thi:", error);
        res.status(500).json({ error: "Lỗi khi lấy câu hỏi kỳ thi" });
    }
});

app.put("/admin/competitions/:id", async (req, res) => {
    try {
        const { name, difficulty, question_count, subject} = req.body;
        const { id } = req.params;
        await db.query(
            "UPDATE competitions SET name = ?, difficulty = ?, question_count = ?, subject = ? WHERE id = ?",
            [name, difficulty, question_count, subject, id]
        );
        res.send("Kỳ thi đã được cập nhật thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi cập nhật kì thi: " + error.message);
    }
});

app.delete("/admin/competitions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM competitions WHERE id = ?", [id]);
        res.send("Kỳ thi đã bị xóa thành công");
    } catch (error) {
        res.status(500).send("Lỗi khi xóa kì thi: " + error.message);
    }
});










// app.put("/admin/competitions/:id", async (req, res) => {
//     try {
//         const { question, option_a, option_b, option_c, option_d, correct_option } = req.body;
//         const { id } = req.params;
//         await db.query(
//             "UPDATE quizzes SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ? WHERE id = ?",
//             [question, option_a, option_b, option_c, option_d, correct_option, id]
//         );
//         res.send("Câu hỏi đã được cập nhật thành công");
//     } catch (error) {
//         res.status(500).send("Lỗi khi cập nhật câu hỏi: " + error.message);
//     }
// });

// app.delete("/admin/competitions/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await db.query("DELETE FROM quizzes WHERE id = ?", [id]);
//         res.send("Câu hỏi đã bị xóa thành công");
//     } catch (error) {
//         res.status(500).send("Lỗi khi xóa câu hỏi: " + error.message);
//     }
// });

// Chạy server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
