import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: false,
  reconnection: true,
  transports: ["websocket", "polling"],
});

export default socket;
