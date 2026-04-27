package it.infernobot.connect.websocket;

import it.infernobot.connect.InfernoBotConnect;
import it.infernobot.connect.packet.PacketHandler;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;

public class BotWebSocketServer extends WebSocketServer {

    private final String token;
    private final PacketHandler packetHandler;

    public BotWebSocketServer(int port, String token, InfernoBotConnect plugin) {
        super(new InetSocketAddress(port));
        this.token = token;
        this.packetHandler = new PacketHandler(plugin, this);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String clientToken = handshake.getFieldValue("Authorization");
        if (!token.equals(clientToken)) {
            conn.close(1008, "Unauthorized");
            return;
        }
        conn.setAttachment("auth:ok");
        System.out.println("[InfernoBotConnect] Bot connected: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("[InfernoBotConnect] Bot disconnected: " + reason);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (!"auth:ok".equals(conn.getAttachment())) {
            conn.close(1008, "Unauthorized");
            return;
        }
        packetHandler.handle(conn, message);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("[InfernoBotConnect] WebSocket error: " + ex.getMessage());
    }

    @Override
    public void onStart() {
        System.out.println("[InfernoBotConnect] WebSocket server ready.");
    }

    /** Broadcast a JSON string to all authenticated connections. */
    public void broadcast(String json) {
        for (WebSocket conn : getConnections()) {
            if ("auth:ok".equals(conn.getAttachment())) {
                conn.send(json);
            }
        }
    }
}
