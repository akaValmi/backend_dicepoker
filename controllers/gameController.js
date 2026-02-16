let gameState = {
  players: [
    {
      dice: [1, 1, 1, 1, 1],
      rerollDice: [false, false, false, false, false],
      rolls: 0,
    },
    {
      dice: [1, 1, 1, 1, 1],
      rerollDice: [false, false, false, false, false],
      rolls: 0,
    },
  ],
  currentPlayer: 0,
  winner: null,
};

export const rollDice = (req, res) => {
  const { rerollDice } = req.body;
  if (!rerollDice) {
    return res.status(400).json({ message: "rerollDice is required" });
  }

  const player = gameState.players[gameState.currentPlayer];

  if (player.rolls >= 2) {
    return res.status(400).json({ message: "No more rolls allowed" });
  }

  player.dice = rerollDice.map((reroll, index) =>
    reroll ? Math.floor(Math.random() * 6) + 1 : player.dice[index]
  );
  player.rerollDice = rerollDice;
  player.rolls += 1;

  res.json({ dice: player.dice });
};

export const evaluateDice = (req, res) => {
  const player = gameState.players[gameState.currentPlayer];
  const evaluation = evaluateCombination(player.dice);
  res.json({ evaluation });
};

export const nextTurn = (req, res) => {
  gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;
  if (gameState.currentPlayer === 0) {
    gameState.winner = determineWinner();
  }
  res.json({
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
  });
};

export const newGame = (req, res) => {
  gameState = {
    players: [
      {
        dice: [1, 1, 1, 1, 1],
        rerollDice: [false, false, false, false, false],
        rolls: 0,
      },
      {
        dice: [1, 1, 1, 1, 1],
        rerollDice: [false, false, false, false, false],
        rolls: 0,
      },
    ],
    currentPlayer: 0,
    winner: null,
  };
  res.json({ message: "New game started" });
};

const evaluateCombination = (dice) => {
  const counts = new Array(6).fill(0);
  dice.forEach((die) => counts[die - 1]++);

  const isFiveOfAKind = counts.includes(5);
  const isFourOfAKind = counts.includes(4);
  const isFullHouse = counts.includes(3) && counts.includes(2);
  const isThreeOfAKind = counts.includes(3);
  const isTwoPair = counts.filter((count) => count === 2).length === 2;
  const isOnePair = counts.includes(2);

  if (isFiveOfAKind) return { name: "Five of a Kind", value: 7 };
  if (isFourOfAKind) return { name: "Four of a Kind", value: 6 };
  if (isFullHouse) return { name: "Full House", value: 5 };
  if (isThreeOfAKind) return { name: "Three of a Kind", value: 4 };
  if (isTwoPair) return { name: "Two Pair", value: 3 };
  if (isOnePair) return { name: "One Pair", value: 2 };

  return { name: "High Card", value: 1 };
};

const determineWinner = () => {
  const evaluations = gameState.players.map((player) =>
    evaluateCombination(player.dice)
  );

  if (evaluations[0].value > evaluations[1].value) {
    return "Player 1";
  } else if (evaluations[0].value < evaluations[1].value) {
    return "Player 2";
  } else {
    return "Draw";
  }
};
