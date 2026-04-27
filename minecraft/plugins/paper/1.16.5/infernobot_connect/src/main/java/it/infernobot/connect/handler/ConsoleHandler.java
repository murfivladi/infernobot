package it.infernobot.connect.handler;

import com.google.gson.JsonObject;
import it.infernobot.connect.InfernoBotConnect;
import it.infernobot.connect.packet.PacketHandler;
import it.infernobot.connect.websocket.BotWebSocketServer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.bukkit.Bukkit;
import org.java_websocket.WebSocket;

public class ConsoleHandler {

    private final InfernoBotConnect plugin;
    private final BotWebSocketServer server;
    private LogAppender appender;

    public ConsoleHandler(InfernoBotConnect plugin, BotWebSocketServer server) {
        this.plugin = plugin;
        this.server = server;
        attachAppender();
    }

    /** Execute a console command sent by the bot. */
    public void execute(WebSocket conn, JsonObject packet) {
        String cmd = packet.has("command") ? packet.get("command").getAsString() : "";
        if (cmd.isEmpty()) {
            conn.send(PacketHandler.error("invalid_packet", "Missing 'command' field"));
            return;
        }
        Bukkit.getScheduler().runTask(plugin, () -> Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd));
        JsonObject resp = new JsonObject();
        resp.addProperty("type", "console_exec_ack");
        resp.addProperty("command", cmd);
        conn.send(PacketHandler.gson().toJson(resp));
    }

    /** Attach a Log4j appender to stream console lines to all connected bots. */
    private void attachAppender() {
        LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
        Configuration config = ctx.getConfiguration();
        appender = new LogAppender();
        appender.start();
        config.getRootLogger().addAppender(appender, null, null);
        ctx.updateLoggers();
    }

    public void detach() {
        if (appender == null) return;
        LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
        ctx.getConfiguration().getRootLogger().removeAppender(appender.getName());
        ctx.updateLoggers();
        appender.stop();
    }

    private class LogAppender extends AbstractAppender {
        protected LogAppender() {
            super("InfernoBotAppender", null,
                    PatternLayout.newBuilder().withPattern("[%d{HH:mm:ss}] [%t/%level]: %msg%n").build(),
                    true, null);
        }

        @Override
        public void append(LogEvent event) {
            JsonObject obj = new JsonObject();
            obj.addProperty("type", "console_line");
            obj.addProperty("level", event.getLevel().name());
            obj.addProperty("message", event.getMessage().getFormattedMessage());
            obj.addProperty("timestamp", event.getTimeMillis());
            server.broadcast(PacketHandler.gson().toJson(obj));
        }
    }
}
