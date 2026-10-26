# Room Database ProGuard Rules
-keepclassmembers class * {
    @androidx.room.Database *;
    @androidx.room.Dao *;
    @androidx.room.Entity *;
}
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# WebRTC Native Bridge ProGuard Rules
-keep class org.webrtc.** { *; }
-keep class com.pintu.offline.webrtc.** { *; }
-dontwarn org.webrtc.**

# JavascriptInterface bridge preserve
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# General Keep rules for Kotlin Serialization/Coroutines
-keepclassmembers class * extends javax.net.ssl.SSLSocket { *; }
-keepclassmembers class * extends java.net.Socket { *; }
-dontwarn kotlinx.coroutines.**
