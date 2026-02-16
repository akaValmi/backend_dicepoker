import express from "express";
import {
  rollDice,
  evaluateDice,
  nextTurn,
  newGame,
} from "../controllers/gameController.js";

const router = express.Router();

router.post("/roll", rollDice);
router.post("/evaluate", evaluateDice);
router.post("/next-turn", nextTurn);
router.post("/new-game", newGame);

export default router;
