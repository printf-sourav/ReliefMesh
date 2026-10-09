package org.reliefmesh.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebSettings;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReliefMeshNearbyPlugin.class);
        super.onCreate(savedInstanceState);
        // HTTPS WebView assets may call a LAN HTTP API in debug demos only.
        if (BuildConfig.DEBUG) {
            bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
