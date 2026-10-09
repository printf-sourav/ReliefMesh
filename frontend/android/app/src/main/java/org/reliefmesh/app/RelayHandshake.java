package org.reliefmesh.app;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Group proof bound to fresh nonces and this exact Nearby raw authentication token. */
final class RelayHandshake {
    final String deviceId, groupId, nonce;
    private final byte[] key, token;
    private String peerId, peerNonce;
    private boolean peerVerified, proofAcknowledged;
    RelayHandshake(String group, String device, byte[] groupKey, byte[] rawToken) {
        UUID.fromString(device);
        if (groupKey.length < 16 || rawToken == null || rawToken.length == 0) throw new IllegalArgumentException("Missing group key or raw authentication token");
        groupId=group; deviceId=device; key=groupKey.clone();token=rawToken.clone();
        byte[] random=new byte[32];new SecureRandom().nextBytes(random);nonce=hex(random);
    }
    void hello(String group, String peer, String remoteNonce) {
        UUID.fromString(peer);
        if (!groupId.equals(group) || deviceId.equals(peer) || !remoteNonce.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Wrong group or invalid HELLO");
        if (peerId!=null && (!peerId.equals(peer)||!peerNonce.equals(remoteNonce))) throw new IllegalArgumentException("Changed HELLO");
        peerId=peer;peerNonce=remoteNonce;
    }
    boolean hasHello() {return peerId!=null;}
    String peerId() {return peerId;}
    private byte[] transcript() throws Exception {
        if(peerId==null) throw new IllegalStateException("HELLO required");
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);
        field(out,"ReliefMeshNearby/v1");field(out,groupId);
        boolean localFirst=deviceId.compareTo(peerId)<0;
        field(out,localFirst?deviceId:peerId);field(out,localFirst?nonce:peerNonce);
        field(out,localFirst?peerId:deviceId);field(out,localFirst?peerNonce:nonce);
        out.writeInt(token.length);out.write(token);return bytes.toByteArray();
    }
    private static void field(DataOutputStream out,String value) throws Exception {byte[] bytes=value.getBytes(StandardCharsets.UTF_8);out.writeInt(bytes.length);out.write(bytes);}
    private String signed(String purpose,String signer,String proof) throws Exception {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);
        out.write(transcript());field(out,purpose);field(out,signer);field(out,proof);
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));return hex(mac.doFinal(bytes.toByteArray()));
    }
    String proof() throws Exception {return signed("proof",deviceId,"");}
    void verifyProof(String proof) throws Exception {
        if(!equal(signed("proof",peerId,""),proof)) throw new IllegalArgumentException("Group authentication failed");peerVerified=true;
    }
    String acknowledgment() throws Exception {if(!peerVerified)throw new IllegalStateException("Peer proof required");return signed("ack",deviceId,signed("proof",peerId,""));}
    void verifyAcknowledgment(String ack) throws Exception {
        if(!equal(signed("ack",peerId,proof()),ack)) throw new IllegalArgumentException("Invalid proof acknowledgment");proofAcknowledged=true;
    }
    boolean authenticated() {return peerVerified&&proofAcknowledged;}
    void clear() {Arrays.fill(key,(byte)0);Arrays.fill(token,(byte)0);peerId=null;peerNonce=null;peerVerified=false;proofAcknowledged=false;}
    static boolean equal(String a,String b) {return b!=null&&b.matches("[a-f0-9]{64}")&&MessageDigest.isEqual(a.getBytes(StandardCharsets.US_ASCII),b.getBytes(StandardCharsets.US_ASCII));}
    static String hex(byte[] bytes) {StringBuilder text=new StringBuilder();for(byte value:bytes)text.append(String.format("%02x",value&255));return text.toString();}
}
