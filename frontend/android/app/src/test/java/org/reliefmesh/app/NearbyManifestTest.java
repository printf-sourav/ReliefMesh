package org.reliefmesh.app;

import static org.junit.Assert.*;

import java.io.File;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.Test;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

public class NearbyManifestTest {
    @Test public void pinnedNearbyClientCanUseWifiOnModernAndroid() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        NodeList permissions = factory.newDocumentBuilder()
                .parse(new File("src/main/AndroidManifest.xml"))
                .getElementsByTagName("uses-permission");
        String namespace = "http://schemas.android.com/apk/res/android";
        boolean found = false;
        for (int i = 0; i < permissions.getLength(); i++) {
            Element permission = (Element) permissions.item(i);
            if ("android.permission.CHANGE_WIFI_STATE".equals(permission.getAttributeNS(namespace, "name"))) {
                found = true;
                // Nearby 19.3.0 returns status 8033 on Android 16 if this is SDK-capped.
                assertFalse("The pinned Nearby client needs this normal permission on Android 16",
                        permission.hasAttributeNS(namespace, "maxSdkVersion"));
            }
        }
        assertTrue("Nearby Wi-Fi transport permission must be declared", found);
    }
}
