package org.reliefmesh.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Arrays;
public class RelayHandshakeTest {
    static final String A="11111111-1111-4111-8111-111111111111",B="22222222-2222-4222-8222-222222222222";
    byte[] key(){byte[] bytes=new byte[32];Arrays.fill(bytes,(byte)7);return bytes;}
    RelayHandshake[] pair(byte[] aKey,byte[] bKey,byte[] aToken,byte[] bToken){RelayHandshake a=new RelayHandshake("group",A,aKey,aToken),b=new RelayHandshake("group",B,bKey,bToken);a.hello("group",B,b.nonce);b.hello("group",A,a.nonce);return new RelayHandshake[]{a,b};}
    @Test public void noIncidentDataUntilMutualProofAndAcknowledgment() throws Exception {
        RelayHandshake[] p=pair(key(),key(),new byte[]{1,2},new byte[]{1,2});assertFalse(p[0].authenticated());
        p[0].verifyProof(p[1].proof());assertFalse(p[0].authenticated());p[1].verifyProof(p[0].proof());
        p[0].verifyAcknowledgment(p[1].acknowledgment());p[1].verifyAcknowledgment(p[0].acknowledgment());assertTrue(p[0].authenticated());assertTrue(p[1].authenticated());p[0].clear();assertFalse(p[0].authenticated());
    }
    @Test public void wrongKeyAndModifiedTranscriptFail() throws Exception {
        byte[] wrong=key();wrong[0]++;RelayHandshake[] p=pair(key(),wrong,new byte[]{1},new byte[]{1});assertThrows(IllegalArgumentException.class,()->p[0].verifyProof(p[1].proof()));
        RelayHandshake[] tokens=pair(key(),key(),new byte[]{1},new byte[]{2});assertThrows(IllegalArgumentException.class,()->tokens[0].verifyProof(tokens[1].proof()));
    }
    @Test public void reflectedAndReplayedProofsFail() throws Exception {
        RelayHandshake[] p=pair(key(),key(),new byte[]{1},new byte[]{1});assertThrows(IllegalArgumentException.class,()->p[0].verifyProof(p[0].proof()));
        String old=p[1].proof();RelayHandshake[] fresh=pair(key(),key(),new byte[]{1},new byte[]{1});assertThrows(IllegalArgumentException.class,()->fresh[0].verifyProof(old));
    }
    @Test public void missingTokenAndWrongGroupFail() {
        assertThrows(IllegalArgumentException.class,()->new RelayHandshake("group",A,key(),null));
        RelayHandshake p=new RelayHandshake("group",A,key(),new byte[]{1});assertThrows(IllegalArgumentException.class,()->p.hello("other",B,"0".repeat(64)));
    }
}
