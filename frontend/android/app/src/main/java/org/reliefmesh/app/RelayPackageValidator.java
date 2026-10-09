package org.reliefmesh.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;

final class RelayPackageValidator {
    static final int MAX_PACKAGE=16*1024*1024;
    static JSONObject validate(String json) throws Exception {
        if(json.getBytes(StandardCharsets.UTF_8).length>MAX_PACKAGE) throw new IllegalArgumentException("Package exceeds 16 MiB");
        JSONObject p=new JSONObject(json);keys(p,"version","origin_device_id","source_json","image_base64","content_sha256","hop_count","visited_device_ids");
        if(p.getInt("version")!=1) throw new IllegalArgumentException("Unsupported package version");
        uuid(p.getString("origin_device_id"));int hops=p.getInt("hop_count");JSONArray visited=p.getJSONArray("visited_device_ids");
        if(hops<0||hops>3||visited.length()!=hops+1||!visited.getString(0).equals(p.getString("origin_device_id"))) throw new IllegalArgumentException("Invalid hop history");
        Set<String> devices=new HashSet<>();for(int n=0;n<visited.length();n++){String id=visited.getString(n);uuid(id);if(!devices.add(id))throw new IllegalArgumentException("Repeated device");}
        byte[] source=p.getString("source_json").getBytes(StandardCharsets.UTF_8);
        if(source.length>64*1024) throw new IllegalArgumentException("Metadata exceeds 64 KiB");
        String encoded=p.getString("image_base64");
        if(encoded.length()>14*1024*1024||!encoded.matches("([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?"))throw new IllegalArgumentException("Invalid Base64 photo");
        byte[] image=Base64.decode(encoded,Base64.NO_WRAP);
        if(image.length==0||image.length>10*1024*1024) throw new IllegalArgumentException("Photo must be 1 byte to 10 MiB");
        MessageDigest hash=MessageDigest.getInstance("SHA-256");hash.update(ByteBuffer.allocate(4).putInt(source.length).array());hash.update(source);hash.update(image);
        if(!RelayHandshake.equal(RelayHandshake.hex(hash.digest()),p.getString("content_sha256"))) throw new IllegalArgumentException("Digest mismatch");
        JSONObject s=new JSONObject(p.getString("source_json"));keys(s,"metadata","image_name","image_mime");text(s,"image_name",255);
        JSONObject m=s.getJSONObject("metadata");keys(m,"client_report_id","original_text","location","latitude","longitude","analysis_result","edited_analysis");
        uuid(m.getString("client_report_id"));text(m,"original_text",10000);text(m,"location",300);coordinate(m,"latitude",90);coordinate(m,"longitude",180);
        if(!m.isNull("analysis_result")) {JSONObject result=m.getJSONObject("analysis_result");keys(result,"analysis","analysis_mode","model_id","warnings");if(!Arrays.asList("live","fixture").contains(result.getString("analysis_mode")))throw new IllegalArgumentException("Invalid analysis mode");text(result,"model_id",10000);analysis(result.getJSONObject("analysis"));JSONArray warnings=result.optJSONArray("warnings");if(warnings!=null)for(int n=0;n<warnings.length();n++)if(!(warnings.get(n) instanceof String))throw new IllegalArgumentException("Invalid warning");}
        if(!m.isNull("edited_analysis")) analysis(m.getJSONObject("edited_analysis"));
        String mime=s.getString("image_mime");
        boolean matches="image/jpeg".equals(mime)&&image.length>2&&(image[0]&255)==255&&(image[1]&255)==216
            ||"image/png".equals(mime)&&image.length>=8&&Arrays.equals(Arrays.copyOf(image,8),new byte[]{(byte)137,80,78,71,13,10,26,10})
            ||"image/webp".equals(mime)&&image.length>=12&&new String(image,0,4,StandardCharsets.US_ASCII).equals("RIFF")&&new String(image,8,4,StandardCharsets.US_ASCII).equals("WEBP");
        if(!matches)throw new IllegalArgumentException("Unsupported photo or MIME mismatch");
        BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(image,0,image.length,bounds);
        if(bounds.outWidth<=0||bounds.outHeight<=0||(long)bounds.outWidth*bounds.outHeight>20000000)throw new IllegalArgumentException("Invalid dimensions or more than 20 million pixels");
        BitmapFactory.Options decode=new BitmapFactory.Options();decode.inSampleSize=1;while(bounds.outWidth/decode.inSampleSize>1024||bounds.outHeight/decode.inSampleSize>1024)decode.inSampleSize*=2;
        Bitmap bitmap=BitmapFactory.decodeByteArray(image,0,image.length,decode);if(bitmap==null)throw new IllegalArgumentException("Photo cannot be decoded");bitmap.recycle();return p;
    }
    static void uuid(String id) {if(!UUID.fromString(id).toString().equalsIgnoreCase(id))throw new IllegalArgumentException("Invalid UUID");}
    static void keys(JSONObject obj,String... names) {Set<String> allowed=new HashSet<>(Arrays.asList(names));Iterator<String> keys=obj.keys();while(keys.hasNext())if(!allowed.contains(keys.next()))throw new IllegalArgumentException("Unsupported source field");}
    static void text(JSONObject obj,String key,int max) throws Exception {Object input=obj.get(key);if(!(input instanceof String))throw new IllegalArgumentException("Invalid "+key);String value=((String)input).trim();if(value.isEmpty()||value.codePointCount(0,value.length())>max)throw new IllegalArgumentException("Invalid length for "+key);}
    static void coordinate(JSONObject obj,String key,int bound) throws Exception {if(obj.has(key)&&!obj.isNull(key)){Object value=obj.get(key);if(!(value instanceof Number)||!Double.isFinite(((Number)value).doubleValue())||Math.abs(((Number)value).doubleValue())>bound)throw new IllegalArgumentException("Invalid coordinate");}}
    static void analysis(JSONObject a) throws Exception {
        keys(a,"incident_type","summary","people_affected","vulnerable_people","reported_needs","location_context","language","image_observations","confidence","verification_required");
        for(String key:new String[]{"incident_type","summary","location_context","language"})text(a,key,10000);
        for(String key:new String[]{"vulnerable_people","reported_needs","image_observations"}){JSONArray values=a.getJSONArray(key);for(int n=0;n<values.length();n++){JSONObject item=new JSONObject().put("item",values.get(n));text(item,"item",10000);}}
        if(!a.isNull("people_affected")){Object count=a.get("people_affected");if(!(count instanceof Number)||((Number)count).doubleValue()<0||Math.floor(((Number)count).doubleValue())!=((Number)count).doubleValue())throw new IllegalArgumentException("Invalid people count");}
        if(!a.isNull("confidence")){Object score=a.get("confidence");if(!(score instanceof Number)||!Double.isFinite(((Number)score).doubleValue())||((Number)score).doubleValue()<0||((Number)score).doubleValue()>1)throw new IllegalArgumentException("Invalid confidence");}
        if(!Boolean.TRUE.equals(a.get("verification_required")))throw new IllegalArgumentException("Analysis cannot verify a source");
    }
}
