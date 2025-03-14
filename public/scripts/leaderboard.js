document.addEventListener("DOMContentLoaded", function () {
    const leaderboardBody = document.querySelector("#leaderboard tbody");

    fetch("http://localhost:3000/leaderboard")
        .then(res => res.json())
        .then(players => {
            leaderboardBody.innerHTML = "";
            players.forEach((player, index) => {
                const row = document.createElement("tr");
                const formattedDate = new Date(player.quiz_date).toLocaleString("vi-VN"); // Format ngày giờ

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${player.username}</td>
                    <td>${player.score}</td>
                    <td>${formattedDate}</td>
                `;
                leaderboardBody.appendChild(row);
            });
        })
        .catch(err => console.error("Lỗi lấy bảng xếp hạng:", err));
});
