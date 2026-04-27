package it.infernobot.connect.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import it.infernobot.connect.InfernoBotConnect;
import it.infernobot.connect.packet.PacketHandler;
import it.infernobot.connect.websocket.BotWebSocketServer;
import org.java_websocket.WebSocket;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class FileHandler {

    private final InfernoBotConnect plugin;
    private final Path serverRoot;
    private final List<String> allowedPaths;

    public FileHandler(InfernoBotConnect plugin, BotWebSocketServer server) {
        this.plugin = plugin;
        this.serverRoot = plugin.getServer().getWorldContainer().toPath().toAbsolutePath().normalize();
        this.allowedPaths = plugin.getConfig().getStringList("files.allowed-paths");
    }

    public void handle(WebSocket conn, JsonObject packet) {
        String type = packet.get("type").getAsString();
        switch (type) {
            case "file_list":  handleList(conn, packet);  break;
            case "file_read":  handleRead(conn, packet);  break;
            case "file_write": handleWrite(conn, packet); break;
        }
    }

    private void handleList(WebSocket conn, JsonObject packet) {
        String pathStr = packet.has("path") ? packet.get("path").getAsString() : "";
        Path target = resolve(pathStr);
        if (target == null) { conn.send(PacketHandler.error("forbidden", "Path not allowed")); return; }

        File dir = target.toFile();
        JsonArray files = new JsonArray();
        if (dir.isDirectory()) {
            File[] entries = dir.listFiles();
            if (entries != null) for (File f : entries) {
                JsonObject entry = new JsonObject();
                entry.addProperty("name", f.getName());
                entry.addProperty("type", f.isDirectory() ? "dir" : "file");
                entry.addProperty("size", f.isFile() ? f.length() : -1);
                files.add(entry);
            }
        }
        JsonObject resp = new JsonObject();
        resp.addProperty("type", "file_list_response");
        resp.addProperty("path", pathStr);
        resp.add("files", files);
        conn.send(PacketHandler.gson().toJson(resp));
    }

    private void handleRead(WebSocket conn, JsonObject packet) {
        String pathStr = packet.has("path") ? packet.get("path").getAsString() : "";
        Path target = resolve(pathStr);
        if (target == null) { conn.send(PacketHandler.error("forbidden", "Path not allowed")); return; }
        try {
            String content = new String(Files.readAllBytes(target), StandardCharsets.UTF_8);
            JsonObject resp = new JsonObject();
            resp.addProperty("type", "file_read_response");
            resp.addProperty("path", pathStr);
            resp.addProperty("content", content);
            conn.send(PacketHandler.gson().toJson(resp));
        } catch (IOException e) {
            conn.send(PacketHandler.error("io_error", e.getMessage()));
        }
    }

    private void handleWrite(WebSocket conn, JsonObject packet) {
        String pathStr = packet.has("path") ? packet.get("path").getAsString() : "";
        String content = packet.has("content") ? packet.get("content").getAsString() : "";
        Path target = resolve(pathStr);
        if (target == null) { conn.send(PacketHandler.error("forbidden", "Path not allowed")); return; }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content.getBytes(StandardCharsets.UTF_8));
            JsonObject resp = new JsonObject();
            resp.addProperty("type", "file_write_response");
            resp.addProperty("path", pathStr);
            resp.addProperty("success", true);
            conn.send(PacketHandler.gson().toJson(resp));
        } catch (IOException e) {
            conn.send(PacketHandler.error("io_error", e.getMessage()));
        }
    }

    /** Resolve and validate path against whitelist. Returns null if not allowed. */
    private Path resolve(String pathStr) {
        if (pathStr == null || pathStr.isEmpty()) return null;
        Path resolved = serverRoot.resolve(pathStr).normalize();
        if (!resolved.startsWith(serverRoot)) return null; // path traversal guard
        for (String allowed : allowedPaths) {
            if (resolved.startsWith(serverRoot.resolve(allowed).normalize())) return resolved;
        }
        return null;
    }
}
