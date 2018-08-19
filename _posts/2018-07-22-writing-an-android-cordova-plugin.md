---
title: Writing an Android Cordova Plugin
updated: 2018-07-22 18:12
---

Over a year a go i was contracted to write a proof of concept application for a digital agency. The idea behind the app was that we would monitor your data usage
and try and upsell you before you ran out of data by integrating with major network operators. The operators didnt have APIs that allowed us to query customer data and 
so we had to write a Cordova plugin that would allow us to get this data from the operating system since there was not one that existed already.

#### Plugman
Plugman is a useful tool that helps with developing and managing Cordova plugins. Plugman can be installed easily as a global NPM module

```bash
$ npm install -g plugman
```

We can then use it to scaffold the skeleton for our project, inlcuding a `plugin.xml` file

```bash
$ plugman create --name datatracker 
                 --plugin_id developerhut.plugin.data 
                 --plugin_version 0.0.1

$ plugman platform add --platform_name android
```

You find the `plugin.xml` in the root of the newely scaffolded project, we need to make a few tweaks to that before we get started:

* adding the appropriate application permissions
* adding minimum sdk requirements
* merging an xml namespace to the manifest
* changing the clobber target from `cordova.plugins.datatracker` to `developerhut`

Once we have made the changes, our `plugin.xml` file should look like this:

```xml
<?xml version='1.0' encoding='utf-8'?>
<plugin id="developerhut.plugin.data" version="0.0.1" 
    xmlns="http://apache.org/cordova/ns/plugins/1.0" 
    xmlns:android="http://schemas.android.com/apk/res/android">
    <name>datatracker</name>
    <js-module name="datatracker" src="www/datatracker.js">
        <clobbers target="developerhut" />
    </js-module>
    <platform name="android">
        <config-file parent="/*" target="res/xml/config.xml">
            <feature name="datatracker">
                <param name="android-package" 
                       value="developerhut.plugin.data.datatracker" />
            </feature>
        </config-file>
        <config-file parent="/*" target="AndroidManifest.xml">
            <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="25" />
            <uses-permission android:name="android.permission.READ_PHONE_STATE" />
            <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" 
                             tools:ignore="ProtectedPermissions"/>
        </config-file>
        <edit-config file="AndroidManifest.xml" target="/manifest" mode="merge">
            <manifest xmlns:tools="http://schemas.android.com/tools" />
        </edit-config>
        <source-file src="src/android/datatracker.java" 
                    target-dir="src/developerhut/plugin/data/datatracker" />
    </platform>
</plugin>
```

Next we need to write the native code that queries the NetworkStatsManager introduced in....

```java
package developerhut.plugin.data;

import android.Manifest;
import android.app.AppOpsManager;
import android.app.usage.NetworkStats;
import android.app.usage.NetworkStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.os.RemoteException;
import android.provider.Settings;
import android.telephony.TelephonyManager;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class datatracker extends CordovaPlugin {
    private final int PHONE_STATE_REQUEST = 0;
    private CallbackContext _callbackContext;

    @Override
    public boolean execute(String action, 
                           JSONArray args, 
                           CallbackContext callbackContext) throws JSONException {

        _callbackContext = callbackContext;
        if (action.equals("getMobileConsumptionData")) {
            this.getMobileConsumptionData(args.getLong(0), args.getLong(1));
            return true;
        }
        return false;

    }

    private void getMobileConsumptionData(long startDate, 
                                          long endDate) throws JSONException {

        Context context = cordova.getActivity().getApplicationContext();

        if(!systemPermissionsEnabled(context)){
            launchSystemPermissionsActivity(context);
        }

        if(!userPermissionsEnabled()){
            launchUserPermissionsDialog(context);
        }

        NetworkStats.Bucket bucket = getMobileNetworkStatsBucket(context, 
                                                                 startDate, 
                                                                 endDate);

        if(bucket != null){
            JSONObject result = new JSONObject();
            result.put("RxBytes", bucket.getRxBytes());
            result.put("TxBytes", bucket.getTxBytes());

            _callbackContext.success(result);
        }
        else{
            _callbackContext.error("An error occured.");
        }
    }
    private NetworkStats.Bucket getMobileNetworkStatsBucket(Context context,  long startDate, long endDate) {
        NetworkStatsManager networkStatsManager = (NetworkStatsManager) context.getSystemService(Context.NETWORK_STATS_SERVICE);
        try {
            return networkStatsManager.querySummaryForDevice(ConnectivityManager.TYPE_MOBILE,
                    getSubscriberId(context), startDate, endDate);
        }
        catch (RemoteException e){
            return null;
        }
    }

    private String getSubscriberId(Context context){
        TelephonyManager manager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        return manager.getSubscriberId();
    }

    private boolean systemPermissionsEnabled(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), context.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private void launchSystemPermissionsActivity(Context context){
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    private boolean userPermissionsEnabled(){
        return cordova.hasPermission(Manifest.permission.READ_PHONE_STATE);
    }

    private void launchUserPermissionsDialog(Context context) {
        cordova.requestPermission(this, PHONE_STATE_REQUEST, Manifest.permission.READ_PHONE_STATE);
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException
    {
        if(grantResults[0] == PackageManager.PERMISSION_DENIED){
            _callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR));
            return;
        }
    }

}
```