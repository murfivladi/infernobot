package it.infernobot.connect.packet;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import it.infernobot.connect.InfernoBotConnect;
import it.infernobot.connect.handler.ConsoleHandler;
import it.infernobot.connect.handler.FileHandler;
import it.infernobot.connect.handler.StatsHandler;
import it.infernobot.connect.websocket.BotWebSocketServer;
import org.java_websocket.WebSocket;

public class PacketHandler {

    private static final Gson GSON = new Gson();

    private final ConsoleHandler consoleHandler;
    private final StatsHandler statsHandler;
    private final FileHandler fileHandler;

    public PacketHandler(InfernoBotConnect plugin, BotWebSocketServer server) {
        this.consoleHandler = new ConsoleHandler(plugin, server);
        this.statsHandler   = new StatsHandler(plugin, server);
        this.fileHandler    = new FileHandler(plugin, server);
    }

    public void handle(WebSocket conn, String raw) {
        try {
            JsonObject packet = GSON.fromJson(raw, JsonObject.class);
            String type = packet.get("type").getAsString();
            switch (type) {
                case "console_exec":  consoleHandler.execute(conn, packet); break;
                case "stats_request": statsHandler.respond(conn, packet);   break;
                case "file_list":
                case "file_read":
                case "file_write":    fileHandler.handle(conn, packet);     break;
                default:
                    conn.send(error("unknown_type", "Unknown packet type: " + type));
            }
        } catch (Exception e) {
            conn.send(error("parse_error", e.getMessage()));
        }
    }

    public static String error(String code, String message) {
        JsonObject obj = new JsonObject();
        obj.addProperty("type", "error");
        obj.addProperty("code", code);
        obj.addProperty("message", message);
        return GSON.toJson(obj);
    }

    public static Gson gson() { return GSON; }
}
