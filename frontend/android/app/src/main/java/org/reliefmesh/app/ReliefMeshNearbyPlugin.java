package org.reliefmesh.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.LocationManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.*;
import com.google.android.gms.tasks.Tasks;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="ReliefMeshNearby",permissions={
    @Permission(alias="bluetooth",strings={Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_ADVERTISE,Manifest.permission.BLUETOOTH_CONNECT}),
    @Permission(alias="wifi",strings={Manifest.permission.NEARBY_WIFI_DEVICES}),
    @Permission(alias="location",strings={Manifest.permission.ACCESS_FINE_LOCATION}),
    @Permission(alias="coarse",strings={Manifest.permission.ACCESS_COARSE_LOCATION}),
    @Permission(alias="legacyFiles",strings={Manifest.permission.READ_EXTERNAL_STORAGE})
})
public class ReliefMeshNearbyPlugin extends Plugin {
    private static final String SERVICE="org.reliefmesh.app.relay.v1",KEY_ALIAS="ReliefMeshRelayGroup";
    private ConnectionsClient client;
    private SharedPreferences prefs;
    private String deviceId,groupId="",status="Sharing disabled";
    private byte[] groupKey;
    private boolean enabled,running,starting,foreground=true,destroyed;
    private long scanGeneration;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService disk=Executors.newSingleThreadExecutor();
    private final Map<String,Session> sessions=new HashMap<>();
    private final Map<String,Long> backoff=new HashMap<>();
    private final Set<String> connecting=new HashSet<>();
    private final Map<String,String> discovered=new HashMap<>();
    private final Map<String,Long> connectingAt=new HashMap<>();
    private final Map<Long,Incoming> incoming=new HashMap<>();
    private final Map<Long,String> completion=new HashMap<>();
    private final Set<Long> bytePayloads=new HashSet<>();
    private final Map<Long,File> outgoing=new HashMap<>();
    private final Map<String,Long> sending=new HashMap<>();
    private final Map<String,Long> sendingAt=new HashMap<>();
    private File inbox,outbox;
    private final Runnable maintenance=new Runnable(){public void run(){if(destroyed)return;if(enabled&&foreground){if(!running&&!starting)begin(null);long now=System.currentTimeMillis();for(String endpoint:new ArrayList<>(discovered.keySet())){Long started=connectingAt.get(endpoint);if(connecting.contains(endpoint)&&started!=null&&now-started>20000)connecting.remove(endpoint);connect(endpoint,discovered.get(endpoint));}for(String endpoint:new ArrayList<>(sessions.keySet())){Session s=sessions.get(endpoint);if(!s.emitted&&now>s.deadline)drop(endpoint,"Group authentication timed out");}for(Incoming transfer:new ArrayList<>(incoming.values()))if(now-transfer.started>120000)drop(transfer.endpoint,"Photo transfer timed out; source retained for retry");for(String endpoint:new ArrayList<>(sendingAt.keySet()))if(now-sendingAt.get(endpoint)>120000)drop(endpoint,"Photo transfer timed out; source retained for retry");}main.postDelayed(this,10000);}};
    private static class Session {RelayHandshake auth;String expectedDevice;boolean emitted;long deadline;Session(RelayHandshake a,String id){auth=a;expectedDevice=id;deadline=System.currentTimeMillis()+15000;}}
    private static class Incoming {Payload payload;String endpoint;long started=System.currentTimeMillis();Incoming(Payload p,String id){payload=p;endpoint=id;}}
    private final BroadcastReceiver radios=new BroadcastReceiver(){public void onReceive(Context c,Intent i){if(!enabled||!foreground)return;String issue=readiness();if(issue!=null){halt();state(issue);}else if(!running&&!starting)begin(null);}};

    @Override public void load() {
        client=Nearby.getConnectionsClient(getContext());prefs=getContext().getSharedPreferences("reliefmesh-relay",Context.MODE_PRIVATE);
        deviceId=prefs.getString("deviceId",null);if(deviceId==null){deviceId=UUID.randomUUID().toString();prefs.edit().putString("deviceId",deviceId).commit();}
        groupId=prefs.getString("groupId","");enabled=prefs.getBoolean("enabled",false);
        inbox=new File(getContext().getNoBackupFilesDir(),"relay-inbox");outbox=new File(getContext().getNoBackupFilesDir(),"relay-outbox");inbox.mkdirs();outbox.mkdirs();
        File[] stale=outbox.listFiles();if(stale!=null)for(File f:stale)f.delete();
        try {String secret=prefs.getString("encryptedKey",null);if(secret!=null)groupKey=decrypt(secret);}catch(Exception e){enabled=false;status="Group key unavailable; set up the group again";}
        IntentFilter filter=new IntentFilter();filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);filter.addAction(WifiManager.WIFI_STATE_CHANGED_ACTION);
        if(Build.VERSION.SDK_INT>=33)getContext().registerReceiver(radios,filter,Context.RECEIVER_NOT_EXPORTED);else getContext().registerReceiver(radios,filter);
        main.post(maintenance);
    }
    private SecretKey storageKey() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(KEY_ALIAS)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}
        return (SecretKey)store.getKey(KEY_ALIAS,null);
    }
    private String encrypt(byte[] key) throws Exception {Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,storageKey());return Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(key),Base64.NO_WRAP);}
    private byte[] decrypt(String value) throws Exception {String[] pieces=value.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,storageKey(),new GCMParameterSpec(128,Base64.decode(pieces[0],Base64.NO_WRAP)));return cipher.doFinal(Base64.decode(pieces[1],Base64.NO_WRAP));}
    private JSObject currentState(){int peers=0;for(Session s:sessions.values())if(s.emitted)peers++;JSObject result=new JSObject();result.put("enabled",enabled);result.put("running",running);result.put("configured",groupKey!=null);result.put("deviceId",deviceId);result.put("groupId",groupId);result.put("status",status);result.put("peers",peers);return result;}
    private boolean hasDevice(String id){for(Session s:sessions.values())if(s.expectedDevice.equals(id))return true;return false;}
    private boolean receiving(String endpoint){for(Incoming transfer:incoming.values())if(transfer.endpoint.equals(endpoint))return true;return false;}
    private void releaseSend(String endpoint,long id){if(Objects.equals(sending.get(endpoint),id)){sending.remove(endpoint);sendingAt.remove(endpoint);}}
    private void emit(String type,JSObject data){data.put("type",type);notifyListeners("event",data);}
    private void state(String value){status=value;emit("state",new JSObject());}
    private void error(String value){JSObject data=new JSObject();data.put("message",value);emit("error",data);}
    @PluginMethod public void getState(PluginCall call){main.post(()->call.resolve(currentState()));}
    @PluginMethod public void configureGroup(PluginCall call){main.post(()->{
        try {
            String group=call.getString("groupId","").trim();if(group.isEmpty()||group.length()>64)throw new IllegalArgumentException("Enter a group name of 1–64 characters");
            byte[] key;boolean generate=call.getBoolean("generate",false);
            if(generate){key=new byte[32];new SecureRandom().nextBytes(key);}else{String text=call.getString("key","");if(!text.matches("[A-Za-z0-9+/]+={0,2}"))throw new IllegalArgumentException("Use the group's Base64 key");key=Base64.decode(text,Base64.NO_WRAP);}
            if(key.length<16||key.length>64)throw new IllegalArgumentException("Shared key must contain 16–64 random bytes");
            halt();enabled=false;
            String encrypted=encrypt(key);if(!prefs.edit().putString("groupId",group).putString("encryptedKey",encrypted).putBoolean("enabled",false).commit())throw new IOException("Group could not be saved");
            if(groupKey!=null)Arrays.fill(groupKey,(byte)0);groupId=group;groupKey=key;
            JSObject result=new JSObject();result.put("groupId",group);if(generate)result.put("key",Base64.encodeToString(key,Base64.NO_WRAP));call.resolve(result);state("Group configured; enable sharing");
        }catch(Exception e){call.reject(e.getMessage());}
    });}
    private String[] aliases(){ArrayList<String> names=new ArrayList<>();if(Build.VERSION.SDK_INT>=31)names.add("bluetooth");if(Build.VERSION.SDK_INT>=33)names.add("wifi");else names.add(Build.VERSION.SDK_INT>=29?"location":"coarse");if(Build.VERSION.SDK_INT<=28)names.add("legacyFiles");return names.toArray(new String[0]);}
    private boolean permissions(){for(String alias:aliases())if(getPermissionState(alias)!=PermissionState.GRANTED)return false;return true;}
    @PluginMethod public void start(PluginCall call){main.post(()->{if(groupKey==null){call.reject("Set up a shared group first");return;}if(!permissions()){requestPermissionForAliases(aliases(),call,"permissionResult");return;}enabled=true;prefs.edit().putBoolean("enabled",true).commit();begin(call);});}
    @PermissionCallback private void permissionResult(PluginCall call){if(!permissions()){state("Permissions denied; allow Nearby permissions in Android settings");call.reject(status);return;}enabled=true;prefs.edit().putBoolean("enabled",true).commit();begin(call);}
    @PluginMethod public void stop(PluginCall call){main.post(()->{enabled=false;prefs.edit().putBoolean("enabled",false).commit();halt();state("Sharing disabled");call.resolve();});}
    private String readiness(){
        if(groupKey==null)return "Set up a shared group first";if(!permissions())return "Allow Nearby permissions in Android settings";
        if(GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext())!=ConnectionResult.SUCCESS)return "Google Play services unavailable or needs updating";
        try {BluetoothManager bm=(BluetoothManager)getContext().getSystemService(Context.BLUETOOTH_SERVICE);BluetoothAdapter bt=bm==null?null:bm.getAdapter();WifiManager wifi=(WifiManager)getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);if(bt==null||!bt.isEnabled()||wifi==null||!wifi.isWifiEnabled())return "Turn on Bluetooth and Wi-Fi to share nearby";
            if(Build.VERSION.SDK_INT<33){LocationManager location=(LocationManager)getContext().getSystemService(Context.LOCATION_SERVICE);boolean on=Build.VERSION.SDK_INT>=28?location.isLocationEnabled():location.isProviderEnabled(LocationManager.GPS_PROVIDER)||location.isProviderEnabled(LocationManager.NETWORK_PROVIDER);if(!on)return "Turn on location services for nearby discovery on this Android version";}
        }catch(SecurityException e){return "Allow Nearby permissions in Android settings";}return null;
    }
    private void begin(PluginCall call){
        if(!foreground||!enabled){if(call!=null)call.reject("Sharing runs only while the app is foregrounded");return;}
        if(running){if(call!=null)call.resolve(currentState());return;}if(starting){if(call!=null)call.reject("Nearby discovery is starting; try again shortly");return;}
        String issue=readiness();if(issue!=null){state(issue);if(call!=null)call.reject(issue);return;}
        starting=true;long generation=++scanGeneration;
        Tasks.whenAll(client.startAdvertising(deviceId,SERVICE,connections,new AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()),client.startDiscovery(SERVICE,discovery,new DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()))
            .addOnSuccessListener(v->{if(generation!=scanGeneration){if(call!=null)call.reject("Sharing start cancelled");return;}starting=false;running=true;state("Discovering trusted phones");if(call!=null)call.resolve(currentState());})
            .addOnFailureListener(e->{if(generation==scanGeneration){halt();state("Nearby could not start: "+e.getMessage());}if(call!=null)call.reject("Nearby could not start: "+e.getMessage());});
    }
    private void halt(){scanGeneration++;starting=false;running=false;client.stopAdvertising();client.stopDiscovery();client.stopAllEndpoints();for(Session s:sessions.values())s.auth.clear();sessions.clear();connecting.clear();connectingAt.clear();discovered.clear();for(Incoming p:incoming.values())cleanupPayload(p.payload);incoming.clear();completion.clear();bytePayloads.clear();for(File file:outgoing.values())file.delete();outgoing.clear();sending.clear();sendingAt.clear();}
    private void drop(String endpoint,String reason){Session s=sessions.remove(endpoint);if(s==null&&!connecting.contains(endpoint))return;if(s!=null){backoff.put(s.expectedDevice,System.currentTimeMillis()+30000);s.auth.clear();}connecting.remove(endpoint);connectingAt.remove(endpoint);
        for(Long id:new ArrayList<>(incoming.keySet()))if(incoming.get(id).endpoint.equals(endpoint)){Incoming transfer=incoming.remove(id);client.cancelPayload(id);cleanupPayload(transfer.payload);}
        Long sent=sending.remove(endpoint);sendingAt.remove(endpoint);if(sent!=null&&sent!=0){client.cancelPayload(sent);File file=outgoing.remove(sent);if(file!=null)file.delete();}
        for(Long id:new ArrayList<>(completion.keySet()))if(endpoint.equals(completion.get(id)))completion.remove(id);client.disconnectFromEndpoint(endpoint);JSObject data=new JSObject();data.put("endpointId",endpoint);emit("disconnected",data);if(reason!=null)error(reason);}
    private void connect(String endpoint,String remote){
        Long until=backoff.get(remote);if(!running||deviceId.compareTo(remote)>=0||connecting.contains(endpoint)||sessions.containsKey(endpoint)||hasDevice(remote)||(until!=null&&until>System.currentTimeMillis()))return;
        connecting.add(endpoint);connectingAt.put(endpoint,System.currentTimeMillis());
        client.requestConnection(deviceId,endpoint,connections).addOnFailureListener(e->{connecting.remove(endpoint);connectingAt.remove(endpoint);backoff.put(remote,System.currentTimeMillis()+15000);});
    }
    private final EndpointDiscoveryCallback discovery=new EndpointDiscoveryCallback(){
        public void onEndpointFound(String endpoint,DiscoveredEndpointInfo info){try{String remote=info.getEndpointName();RelayPackageValidator.uuid(remote);if(discovered.size()<50){discovered.put(endpoint,remote);connect(endpoint,remote);}}catch(Exception ignored){}}
        public void onEndpointLost(String endpoint){connecting.remove(endpoint);connectingAt.remove(endpoint);discovered.remove(endpoint);}
    };
    private final ConnectionLifecycleCallback connections=new ConnectionLifecycleCallback(){
        public void onConnectionInitiated(String endpoint,ConnectionInfo info){
            try {String remote=info.getEndpointName();RelayPackageValidator.uuid(remote);if(!enabled||!foreground||deviceId.equals(remote)||sessions.containsKey(endpoint)||hasDevice(remote))throw new IllegalArgumentException("Duplicate or disabled session");
                // Lower device UUID initiates, preventing simultaneous outbound connections.
                if(info.isIncomingConnection()&&remote.compareTo(deviceId)>=0)throw new IllegalArgumentException("Noncanonical connection direction");
                Session s=new Session(new RelayHandshake(groupId,deviceId,groupKey,info.getRawAuthenticationToken()),remote);sessions.put(endpoint,s);
                client.acceptConnection(endpoint,payloads).addOnFailureListener(e->drop(endpoint,"Nearby acceptance failed"));
            }catch(Exception e){client.rejectConnection(endpoint);connecting.remove(endpoint);}
        }
        public void onConnectionResult(String endpoint,ConnectionResolution resolution){connecting.remove(endpoint);Session s=sessions.get(endpoint);if(s==null)return;if(!resolution.getStatus().isSuccess()){drop(endpoint,null);return;}try{send(endpoint,new JSONObject().put("type","hello").put("version",1).put("groupId",groupId).put("deviceId",deviceId).put("nonce",s.auth.nonce));}catch(Exception e){drop(endpoint,"Group HELLO failed");}}
        public void onDisconnected(String endpoint){drop(endpoint,null);}
    };
    private void send(String endpoint,JSONObject control) throws Exception {byte[] bytes=control.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>32768)throw new IllegalArgumentException("Control exceeds 32 KiB");Payload payload=Payload.fromBytes(bytes);bytePayloads.add(payload.getId());client.sendPayload(endpoint,payload).addOnFailureListener(e->drop(endpoint,"Nearby control failed"));}
    private void receivedControl(String endpoint,byte[] bytes){try{
        if(bytes==null||bytes.length>32768)throw new IllegalArgumentException("Oversized control");Session s=sessions.get(endpoint);if(s==null)throw new IllegalArgumentException("Session missing");JSONObject data=new JSONObject(new String(bytes,StandardCharsets.UTF_8));String type=data.getString("type");
        if(type.equals("hello")){if(data.getInt("version")!=1||!s.expectedDevice.equals(data.getString("deviceId")))throw new IllegalArgumentException("Invalid HELLO identity");s.auth.hello(data.getString("groupId"),data.getString("deviceId"),data.getString("nonce"));send(endpoint,new JSONObject().put("type","proof").put("value",s.auth.proof()));}
        else if(type.equals("proof")){s.auth.verifyProof(data.getString("value"));send(endpoint,new JSONObject().put("type","proof_ack").put("value",s.auth.acknowledgment()));}
        else if(type.equals("proof_ack")){s.auth.verifyAcknowledgment(data.getString("value"));}
        else {if(!s.auth.authenticated())throw new IllegalArgumentException("Data before group authentication");if(!Arrays.asList("inventory","request","peer_stored","hub_receipt").contains(type))throw new IllegalArgumentException("Unsupported control");JSObject event=new JSObject();event.put("endpointId",endpoint);event.put("control",data);emit("control",event);}
        if(s.auth.authenticated()&&!s.emitted){s.emitted=true;JSObject peer=new JSObject();peer.put("endpointId",endpoint);peer.put("deviceId",s.auth.peerId());emit("peer",peer);}
    }catch(Exception e){drop(endpoint,"Group authentication/control rejected: "+e.getMessage());}}
    private final PayloadCallback payloads=new PayloadCallback(){
        public void onPayloadReceived(String endpoint,Payload payload){
            if(payload.getType()==Payload.Type.BYTES){if(completion.remove(payload.getId())==null)bytePayloads.add(payload.getId());receivedControl(endpoint,payload.asBytes());return;}
            Session s=sessions.get(endpoint);if(payload.getType()!=Payload.Type.FILE||s==null||!s.auth.authenticated()||receiving(endpoint)||incoming.size()>=4){client.cancelPayload(payload.getId());cleanupPayload(payload);error("Photo transfer rejected before authentication or at transfer limit");return;}
            incoming.put(payload.getId(),new Incoming(payload,endpoint));if(completion.remove(payload.getId())!=null)finish(payload.getId());
        }
        public void onPayloadTransferUpdate(String endpoint,PayloadTransferUpdate update){
            long id=update.getPayloadId();if(bytePayloads.contains(id)){if(update.getStatus()!=PayloadTransferUpdate.Status.IN_PROGRESS)bytePayloads.remove(id);return;}if(update.getTotalBytes()>RelayPackageValidator.MAX_PACKAGE){client.cancelPayload(id);Incoming p=incoming.remove(id);if(p!=null)cleanupPayload(p.payload);error("Oversized transfer cancelled");return;}
            JSObject progress=new JSObject();progress.put("endpointId",endpoint);progress.put("payloadId",Long.toString(id));progress.put("transferred",update.getBytesTransferred());progress.put("total",update.getTotalBytes());emit("progress",progress);
            if(update.getStatus()==PayloadTransferUpdate.Status.SUCCESS){File file=outgoing.remove(id);if(file!=null){file.delete();releaseSend(endpoint,id);return;}if(incoming.containsKey(id))finish(id);else if(sessions.containsKey(endpoint)&&completion.size()<8)completion.put(id,endpoint);}
            else if(update.getStatus()==PayloadTransferUpdate.Status.FAILURE||update.getStatus()==PayloadTransferUpdate.Status.CANCELED){Incoming p=incoming.remove(id);if(p!=null)cleanupPayload(p.payload);File file=outgoing.remove(id);if(file!=null)file.delete();releaseSend(endpoint,id);completion.remove(id);}
        }
    };
    private void cleanupPayload(Payload payload){try{if(payload.asFile()!=null){Uri uri=payload.asFile().asUri();if(uri!=null)getContext().getContentResolver().delete(uri,null,null);else if(payload.asFile().asJavaFile()!=null)payload.asFile().asJavaFile().delete();}}catch(Exception ignored){}}
    private byte[] bounded(InputStream stream) throws IOException {try(InputStream in=stream;ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new IOException("Nearby file URI unreadable");byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>RelayPackageValidator.MAX_PACKAGE)throw new IOException("Package exceeds 16 MiB");out.write(buffer,0,count);}return out.toByteArray();}}
    private void atomic(File file,byte[] bytes) throws IOException {AtomicFile atomic=new AtomicFile(file);FileOutputStream out=null;try{out=atomic.startWrite();out.write(bytes);out.getFD().sync();atomic.finishWrite(out);}catch(IOException e){if(out!=null)atomic.failWrite(out);throw e;}}
    private void finish(long id){Incoming transfer=incoming.remove(id);if(transfer==null)return;Session session=sessions.get(transfer.endpoint);if(session==null||!session.auth.authenticated()){cleanupPayload(transfer.payload);return;}String remote=session.auth.peerId();disk.execute(()->{
        try {
            File[] retained=inbox.listFiles((dir,name)->name.endsWith(".json"));long size=0;if(retained!=null)for(File f:retained)size+=f.length();if(retained!=null&&(retained.length>=32||size>128L*1024*1024))throw new IOException("Native inbox full; foreground app to import saved copies");
            Uri uri=transfer.payload.asFile().asUri();InputStream stream=uri!=null?getContext().getContentResolver().openInputStream(uri):new FileInputStream(transfer.payload.asFile().asJavaFile());String json=new String(bounded(stream),StandardCharsets.UTF_8);
            RelayPackageValidator.validate(json);String token=UUID.randomUUID().toString();JSONObject retainedPackage=new JSONObject().put("endpointId",transfer.endpoint).put("deviceId",remote).put("packageJson",json);
            byte[] retainedBytes=retainedPackage.toString().getBytes(StandardCharsets.UTF_8);if(size+retainedBytes.length>128L*1024*1024)throw new IOException("Native inbox storage limit reached; source remains on sender");atomic(new File(inbox,token+".json"),retainedBytes);
            main.post(()->{JSObject data=new JSObject();data.put("inboxId",token);data.put("endpointId",transfer.endpoint);data.put("deviceId",remote);emit("inbox",data);});
        }catch(Exception|OutOfMemoryError e){main.post(()->error("Received package retained unsuccessfully: "+e.getMessage()));}finally{cleanupPayload(transfer.payload);}
    });}
    @PluginMethod public void sendControl(PluginCall call){main.post(()->{try{String endpoint=call.getString("endpointId");Session s=sessions.get(endpoint);if(s==null||!s.auth.authenticated())throw new IllegalStateException("Authenticated peer required");JSONObject data=call.getObject("control");if(data==null||!Arrays.asList("inventory","request","peer_stored","hub_receipt").contains(data.getString("type")))throw new IllegalArgumentException("Unsupported control");send(endpoint,data);call.resolve();}catch(Exception e){call.reject(e.getMessage());}});}
    @PluginMethod public void sendReport(PluginCall call){main.post(()->{
        String endpoint=call.getString("endpointId"),json=call.getString("packageJson");Session s=sessions.get(endpoint);
        if(s==null||!s.auth.authenticated()||sending.containsKey(endpoint)){call.reject("Authenticated idle peer required");return;}sending.put(endpoint,0L);sendingAt.put(endpoint,System.currentTimeMillis());
        disk.execute(()->{File file=null;try{if(json==null)throw new IllegalArgumentException("Package required");RelayPackageValidator.validate(json);file=new File(outbox,UUID.randomUUID()+".json");atomic(file,json.getBytes(StandardCharsets.UTF_8));Payload payload=Payload.fromFile(file);File sent=file;main.post(()->{Session current=sessions.get(endpoint);if(current!=s||!current.auth.authenticated()){sent.delete();if(current==s)releaseSend(endpoint,0L);call.reject("Peer disconnected before transfer");return;}outgoing.put(payload.getId(),sent);sending.put(endpoint,payload.getId());client.sendPayload(endpoint,payload).addOnSuccessListener(v->{JSObject result=new JSObject();result.put("payloadId",Long.toString(payload.getId()));call.resolve(result);}).addOnFailureListener(e->{outgoing.remove(payload.getId());releaseSend(endpoint,payload.getId());sent.delete();call.reject("Photo transfer failed: "+e.getMessage());});});}catch(Exception|OutOfMemoryError e){if(file!=null)file.delete();main.post(()->{if(sessions.get(endpoint)==s)releaseSend(endpoint,0L);call.reject("Cannot send report: "+e.getMessage());});}});
    });}
    private File inboxFile(String id){RelayPackageValidator.uuid(id);return new File(inbox,id+".json");}
    @PluginMethod public void listInbox(PluginCall call){disk.execute(()->{try{JSArray items=new JSArray();File[] files=inbox.listFiles((dir,name)->name.endsWith(".json"));if(files!=null)for(File file:files){JSONObject data=new JSONObject(new String(bounded(new FileInputStream(file)),StandardCharsets.UTF_8));JSONObject item=new JSONObject().put("inboxId",file.getName().replace(".json","")).put("endpointId",data.getString("endpointId")).put("deviceId",data.getString("deviceId"));items.put(item);}JSObject result=new JSObject();result.put("items",items);call.resolve(result);}catch(Exception e){call.reject("Cannot read retained inbox: "+e.getMessage());}});}
    @PluginMethod public void readInbox(PluginCall call){disk.execute(()->{try{JSONObject data=new JSONObject(new String(bounded(new FileInputStream(inboxFile(call.getString("inboxId")))),StandardCharsets.UTF_8));JSObject result=new JSObject();result.put("packageJson",data.getString("packageJson"));call.resolve(result);}catch(Exception e){call.reject(e.getMessage());}});}
    @PluginMethod public void acknowledgeInbox(PluginCall call){disk.execute(()->{try{File file=inboxFile(call.getString("inboxId"));if(file.exists()&&!file.delete())throw new IOException("Retained inbox copy could not be removed");call.resolve();}catch(Exception e){call.reject(e.getMessage());}});}
    @Override protected void handleOnPause(){foreground=false;halt();state(enabled?"Sharing paused; open the app to resume":"Sharing disabled");}
    @Override protected void handleOnResume(){foreground=true;if(enabled)begin(null);}
    @Override protected void handleOnDestroy(){destroyed=true;main.removeCallbacks(maintenance);halt();try{getContext().unregisterReceiver(radios);}catch(Exception ignored){}disk.shutdown();if(groupKey!=null)Arrays.fill(groupKey,(byte)0);}
}
