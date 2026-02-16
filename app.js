import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import gameRoutes from "./routes/gameRoutes.js";
import {
	createRoom,
	joinRoom,
	setKeep,
	rollDice,
	endTurn,
	newGame,
	removePlayer,
} from "./services/gameService.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
	})
);
app.use(express.json());
app.use("/api", gameRoutes);

io.on("connection", (socket) => {
	socket.on("create_room", ({ name }) => {
		const room = createRoom(socket.id, name);
		socket.join(room.id);
		socket.emit("room_joined", { roomId: room.id, playerIndex: 0, room });
		io.to(room.id).emit("state_update", room);
	});

	socket.on("join_room", ({ roomId, name }) => {
		const result = joinRoom(socket.id, roomId, name);
		if (result?.error) {
			socket.emit("error_message", { message: result.error });
			return;
		}
		socket.join(roomId);
		socket.emit("room_joined", {
			roomId,
			playerIndex: result.playerIndex,
			room: result.room,
		});
		io.to(roomId).emit("state_update", result.room);
	});

	socket.on("set_keep", ({ keep }) => {
		const result = setKeep(socket.id, keep);
		if (result?.error) {
			socket.emit("error_message", { message: result.error });
			return;
		}
		io.to(result.roomId).emit("state_update", result.room);
	});

	socket.on("roll_dice", ({ rerollDice }) => {
		const result = rollDice(socket.id, rerollDice);
		if (result?.error) {
			socket.emit("error_message", { message: result.error });
			return;
		}
		io.to(result.roomId).emit("state_update", result.room);
	});

	socket.on("end_turn", () => {
		const result = endTurn(socket.id);
		if (result?.error) {
			socket.emit("error_message", { message: result.error });
			return;
		}
		io.to(result.roomId).emit("state_update", result.room);
	});

	socket.on("new_game", () => {
		const result = newGame(socket.id);
		if (result?.error) {
			socket.emit("error_message", { message: result.error });
			return;
		}
		io.to(result.roomId).emit("state_update", result.room);
	});

	socket.on("disconnect", () => {
		const result = removePlayer(socket.id);
		if (result?.roomId) {
			io.to(result.roomId).emit("state_update", result.room);
		}
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
