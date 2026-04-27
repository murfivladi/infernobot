package it.infernobot.connect;

import it.infernobot.connect.websocket.BotWebSocketServer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class InfernoBotConnect extends JavaPlugin {

    private BotWebSocketServer wsServer;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        startWebSocket();
        getLogger().info("InfernoBotConnect enabled.");
    }

    @Override
    public void onDisable() {
        stopWebSocket();
        getLogger().info("InfernoBotConnect disabled.");
    }

    private void startWebSocket() {
        int port = getConfig().getInt("websocket.port", 8887);
        String token = getConfig().getString("websocket.token", "");
        wsServer = new BotWebSocketServer(port, token, this);
        wsServer.start();
        getLogger().info("WebSocket server started on port " + port);
    }

    private void stopWebSocket() {
        if (wsServer != null) {
            try {
                wsServer.stop(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("ibc")) return false;
        if (!sender.hasPermission("infernobot.admin")) {
            sender.sendMessage("§cNo permission.");
            return true;
        }
        if (args.length == 0) {
            sender.sendMessage("§eUsage: /ibc <reload|status>");
            return true;
        }
        switch (args[0].toLowerCase()) {
            case "reload":
                stopWebSocket();
                reloadConfig();
                startWebSocket();
                sender.sendMessage("§aInfernoBotConnect reloaded.");
                break;
            case "status":
                boolean running = wsServer != null && wsServer.getPort() > 0;
                sender.sendMessage("§eWebSocket: " + (running ? "§aRUNNING" : "§cSTOPPED"));
                if (running) sender.sendMessage("§eConnections: §f" + wsServer.getConnections().size());
                break;
            default:
                sender.sendMessage("§eUsage: /ibc <reload|status>");
        }
        return true;
    }
}
