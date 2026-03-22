const GAME_INDEXES = [
  {
    id: 1,
    name: "Dark Maze Game",
    description: "A dark maze game where you must find the exit while avoiding monsters and bombs.",
    url: "darkMaze/index.html",
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
