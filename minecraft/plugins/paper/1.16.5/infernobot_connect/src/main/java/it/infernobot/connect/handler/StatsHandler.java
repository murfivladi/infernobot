package it.infernobot.connect.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import it.infernobot.connect.InfernoBotConnect;
import it.infernobot.connect.packet.PacketHandler;
import it.infernobot.connect.websocket.BotWebSocketServer;
import org.bukkit.Bukkit;
import org.java_websocket.WebSocket;

public class StatsHandler {

    private final InfernoBotConnect plugin;
    private final long startTime = System.currentTimeMillis();

    public StatsHandler(InfernoBotConnect plugin, BotWebSocketServer server) {
        this.plugin = plugin;
    }

    public void respond(WebSocket conn, JsonObject packet) {
        Bukkit.getScheduler().runTask(plugin, () ->
            conn.send(PacketHandler.gson().toJson(buildStats())));
    }

    private JsonObject buildStats() {
        Runtime rt = Runtime.getRuntime();
        double[] tps = getTPS();

        JsonArray players = new JsonArray();
        Bukkit.getOnlinePlayers().forEach(p -> players.add(p.getName()));

        JsonObject obj = new JsonObject();
        obj.addProperty("type", "stats_response");
        obj.addProperty("online", Bukkit.getOnlinePlayers().size());
        obj.addProperty("max_players", Bukkit.getMaxPlayers());
        obj.add("players", players);
        obj.addProperty("tps_1m",  Math.round(tps[0] * 100.0) / 100.0);
        obj.addProperty("tps_5m",  Math.round(tps[1] * 100.0) / 100.0);
        obj.addProperty("tps_15m", Math.round(tps[2] * 100.0) / 100.0);
        obj.addProperty("memory_used_mb",  (rt.totalMemory() - rt.freeMemory()) / 1_048_576);
        obj.addProperty("memory_total_mb", rt.totalMemory() / 1_048_576);
        obj.addProperty("memory_max_mb",   rt.maxMemory()   / 1_048_576);
        obj.addProperty("uptime_ms", System.currentTimeMillis() - startTime);
        obj.addProperty("version", Bukkit.getVersion());
        return obj;
    }

    /** Uses reflection so it compiles against spigot-api but works on Paper at runtime. */
    private double[] getTPS() {
        try {
            return (double[]) Bukkit.getServer().getClass().getMethod("getTPS").invoke(Bukkit.getServer());
        } catch (Exception e) {
            return new double[]{20.0, 20.0, 20.0};
        }
    }
}
