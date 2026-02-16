const rooms = new Map();
const socketToRoom = new Map();

const createEmptyDice = () => [1, 1, 1, 1, 1];
const createEmptyKeep = () => [false, false, false, false, false];

const createPlayer = (id, name) => ({
  id,
  name: name?.trim() || "Jugador",
  dice: createEmptyDice(),
  keep: createEmptyKeep(),
  rolls: 0,
  evaluation: null,
});

const createRoomId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
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

  if (isFiveOfAKind) return { name: "Cinco iguales", value: 7 };
  if (isFourOfAKind) return { name: "Cuatro iguales", value: 6 };
  if (isFullHouse) return { name: "Full House", value: 5 };
  if (isThreeOfAKind) return { name: "Trío", value: 4 };
  if (isTwoPair) return { name: "Doble par", value: 3 };
  if (isOnePair) return { name: "Un par", value: 2 };

  return { name: "Carta alta", value: 1 };
};

const OBJECTIVES = [
  {
    id: "FIVE_KIND",
    name: "Cinco iguales",
    target: "Cinco iguales",
    bonus: 3,
    description: "+3 a Cinco iguales",
  },
  {
    id: "FOUR_KIND",
    name: "Cuatro iguales",
    target: "Cuatro iguales",
    bonus: 2,
    description: "+2 a Cuatro iguales",
  },
  {
    id: "FULL_HOUSE",
    name: "Full House",
    target: "Full House",
    bonus: 2,
    description: "+2 a Full House",
  },
  {
    id: "THREE_KIND",
    name: "Trío",
    target: "Trío",
    bonus: 1,
    description: "+1 a Trío",
  },
  {
    id: "TWO_PAIR",
    name: "Doble par",
    target: "Doble par",
    bonus: 1,
    description: "+1 a Doble par",
  },
];

const formatEvaluationName = (evaluationName) =>
  evaluationName?.toLowerCase?.() || evaluationName;

const pickObjective = () =>
  OBJECTIVES[Math.floor(Math.random() * OBJECTIVES.length)];

const applyObjective = (evaluation, objective) => {
  if (!objective) return evaluation;
  if (evaluation.name === objective.target) {
    return {
      ...evaluation,
      value: evaluation.value + objective.bonus,
      bonus: objective.bonus,
    };
  }
  return evaluation;
};

const pushAction = (room, message, dice = null) => {
  room.lastActionId += 1;
  room.lastActions.push({ id: room.lastActionId, message, dice });
  if (room.lastActions.length > 10) {
    room.lastActions.shift();
  }
};

const determineWinner = (players, objective) => {
  if (players.length < 2) return { name: "Empate", index: null };
  const evaluations = players.map((player) =>
    applyObjective(
      player.evaluation ?? evaluateCombination(player.dice),
      objective
    )
  );

  if (evaluations[0].value > evaluations[1].value) {
    return { name: players[0].name || "Jugador 1", index: 0 };
  }
  if (evaluations[0].value < evaluations[1].value) {
    return { name: players[1].name || "Jugador 2", index: 1 };
  }
  return { name: "Empate", index: null };
};

const advanceTurn = (room) => {
  room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
  room.winner = null;

  if (room.currentPlayer === 0) {
    const winner = determineWinner(room.players, room.objective);
    room.roundWinner = winner.name;
    if (winner.index !== null) {
      room.scores[winner.index] += 1;
    }

    const setsToWin = 3;
    if (room.scores.some((score) => score >= setsToWin)) {
      const matchWinnerIndex = room.scores.findIndex(
        (score) => score >= setsToWin
      );
      room.matchWinner =
        room.players[matchWinnerIndex]?.name || "Ganador";
    } else {
      room.round += 1;
      room.objective = pickObjective();
    }
  } else {
    room.roundWinner = null;
  }

  const nextPlayer = room.players[room.currentPlayer];
  if (nextPlayer) {
    nextPlayer.rolls = 0;
    nextPlayer.keep = createEmptyKeep();
    if (!room.matchWinner) {
      pushAction(room, `Turno de ${nextPlayer.name}`);
    }
  }
};

const serializeRoom = (room) => ({
  id: room.id,
  players: room.players.map((player) => ({
    id: player.id,
    name: player.name,
    dice: player.dice,
    keep: player.keep,
    rolls: player.rolls,
    evaluation: player.evaluation,
  })),
  currentPlayer: room.currentPlayer,
  winner: room.winner,
  roundWinner: room.roundWinner,
  matchWinner: room.matchWinner,
  round: room.round,
  scores: room.scores,
  objective: room.objective,
  lastActions: room.lastActions,
  lastActionId: room.lastActionId,
});

const getRoomBySocket = (socketId) => {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  return room ? { room, roomId } : null;
};

const createRoom = (socketId, name) => {
  let roomId = createRoomId();
  while (rooms.has(roomId)) {
    roomId = createRoomId();
  }
  const room = {
    id: roomId,
    players: [createPlayer(socketId, name)],
    currentPlayer: 0,
    winner: null,
    roundWinner: null,
    matchWinner: null,
    round: 1,
    scores: [0, 0],
    objective: pickObjective(),
    lastActions: [],
    lastActionId: 0,
  };
  rooms.set(roomId, room);
  socketToRoom.set(socketId, roomId);
  return serializeRoom(room);
};

const joinRoom = (socketId, roomId, name) => {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "La sala no existe." };
  }
  if (room.players.length >= 2) {
    return { error: "La sala está llena." };
  }
  room.players.push(createPlayer(socketId, name));
  socketToRoom.set(socketId, roomId);
  return { room: serializeRoom(room), playerIndex: room.players.length - 1 };
};

const setKeep = (socketId, keep) => {
  const data = getRoomBySocket(socketId);
  if (!data) return { error: "No estás en una sala." };
  const { room } = data;
  const playerIndex = room.players.findIndex((player) => player.id === socketId);
  if (playerIndex === -1) return { error: "Jugador no encontrado." };

  room.players[playerIndex].keep = keep;
  return { room: serializeRoom(room), roomId: room.id };
};

const rollDice = (socketId, rerollDice) => {
  const data = getRoomBySocket(socketId);
  if (!data) return { error: "No estás en una sala." };
  const { room } = data;
  if (room.matchWinner) {
    return { error: "La partida terminó. Inicia una nueva." };
  }
  const playerIndex = room.players.findIndex((player) => player.id === socketId);
  if (playerIndex === -1) return { error: "Jugador no encontrado." };
  if (room.currentPlayer !== playerIndex) {
    return { error: "No es tu turno." };
  }

  const player = room.players[playerIndex];
  if (player.rolls >= 2) {
    return { error: "No puedes tirar más dados." };
  }

  player.dice = rerollDice.map((reroll, index) =>
    reroll ? Math.floor(Math.random() * 6) + 1 : player.dice[index]
  );
  player.rolls += 1;
  player.keep = createEmptyKeep();
  player.evaluation = applyObjective(
    evaluateCombination(player.dice),
    room.objective
  );
  pushAction(
    room,
    `${player.name} consiguió ${formatEvaluationName(player.evaluation.name)}`,
    [...player.dice]
  );

  if (player.rolls >= 2) {
    advanceTurn(room);
  }

  return { room: serializeRoom(room), roomId: room.id };
};

const endTurn = (socketId) => {
  const data = getRoomBySocket(socketId);
  if (!data) return { error: "No estás en una sala." };
  const { room } = data;
  if (room.matchWinner) {
    return { error: "La partida terminó. Inicia una nueva." };
  }
  const playerIndex = room.players.findIndex((player) => player.id === socketId);
  if (playerIndex === -1) return { error: "Jugador no encontrado." };
  if (room.currentPlayer !== playerIndex) {
    return { error: "No es tu turno." };
  }

  const player = room.players[playerIndex];
  if (player.rolls === 0) {
    return { error: "Debes tirar al menos una vez." };
  }

  player.evaluation = applyObjective(
    evaluateCombination(player.dice),
    room.objective
  );
  advanceTurn(room);

  return { room: serializeRoom(room), roomId: room.id };
};

const newGame = (socketId) => {
  const data = getRoomBySocket(socketId);
  if (!data) return { error: "No estás en una sala." };
  const { room } = data;

  room.players = room.players.map((player) => ({
    ...player,
    dice: createEmptyDice(),
    keep: createEmptyKeep(),
    rolls: 0,
    evaluation: null,
  }));
  room.currentPlayer = 0;
  room.winner = null;
  room.roundWinner = null;
  room.matchWinner = null;
  room.round = 1;
  room.scores = [0, 0];
  room.objective = pickObjective();
  room.lastActions = [];
  room.lastActionId = 0;

  return { room: serializeRoom(room), roomId: room.id };
};

const removePlayer = (socketId) => {
  const data = getRoomBySocket(socketId);
  if (!data) return null;
  const { room, roomId } = data;
  room.players = room.players.filter((player) => player.id !== socketId);
  socketToRoom.delete(socketId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  if (room.currentPlayer >= room.players.length) {
    room.currentPlayer = 0;
  }
  room.winner = null;
  room.roundWinner = null;
  room.matchWinner = null;
  room.lastActions = [];
  room.lastActionId = 0;

  return { room: serializeRoom(room), roomId };
};

export {
  createRoom,
  joinRoom,
  setKeep,
  rollDice,
  endTurn,
  newGame,
  removePlayer,
  serializeRoom,
};
