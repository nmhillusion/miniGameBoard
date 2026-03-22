const GAME_INDEXES = [
  {
    id: 1,
    name: "Dark Maze Game",
    description:
      "Trò chơi mê cung bóng tối, nơi bạn phải tìm lối thoát trong khi tránh quái vật và bom.",
    url: "dark-maze/index.html",
    icon: "🌑",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const gameBoard = document.getElementById("game-board");
  if (!gameBoard) return;

  const gameList = document.createElement("div");
  gameList.className = "game-list";

  GAME_INDEXES.forEach((game) => {
    const gameCard = document.createElement("div");
    gameCard.className = "game-card";
    gameCard.innerHTML = `
      <div class="game-icon">${game.icon || "🎮"}</div>
      <h3>${game.name}</h3>
      <p>${game.description}</p>
      <a href="${game.url}" class="play-btn">Play Now</a>
    `;
    gameList.appendChild(gameCard);
  });

  gameBoard.appendChild(gameList);
});
