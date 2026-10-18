package com.filling.pos

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * The APK shell deliberately renders the same POS surface as the browser.
 * This keeps menu, finance, inventory, KDS, QR ordering and reports on one
 * implementation while the native bridge owns Bluetooth printing/settings.
 */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var cookiePrimed = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.setBackgroundColor(Color.rgb(245, 248, 245))
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            loadWithOverviewMode = false
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            userAgentString = "$userAgentString FillingPOSNative/1.0"
        }
        CookieManager.getInstance().apply { setAcceptCookie(true); setAcceptThirdPartyCookies(webView, true) }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return request.url.toString().startsWith("http://") && !request.url.toString().startsWith(BuildConfig.API_BASE_URL)
            }
            override fun onPageFinished(view: WebView, url: String) {
                val token = getSharedPreferences("pos_auth", MODE_PRIVATE).getString("session_token", null)
                if (!cookiePrimed && token != null && url.startsWith(BuildConfig.API_BASE_URL)) {
                    cookiePrimed = true
                    CookieManager.getInstance().setCookie(BuildConfig.API_BASE_URL.trimEnd('/') + "/", "pos_session=$token; Path=/")
                    CookieManager.getInstance().flush()
                    view.reload()
                }
            }
        }
        webView.addJavascriptInterface(NativeBridge(), "FillingNative")
        setContentView(webView)
        loadPos()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (webView.canGoBack()) webView.goBack() else finish() }
        })
    }

    private fun loadPos() {
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        getSharedPreferences("pos_auth", MODE_PRIVATE).getString("session_token", null)?.let { token ->
            CookieManager.getInstance().setCookie("$base/", "pos_session=$token; Path=/")
            CookieManager.getInstance().flush()
            val safeToken = JSONObject.quote(token)
            val safeBase = JSONObject.quote("$base/")
            webView.loadDataWithBaseURL("$base/", "<script>document.cookie='pos_session='+$safeToken+'; path=/'; location.replace($safeBase);</script>", "text/html", "UTF-8", null)
            return
        }
        webView.loadUrl("$base/")
    }

    override fun onResume() { super.onResume(); if (::webView.isInitialized) webView.onResume() }
    override fun onPause() { if (::webView.isInitialized) webView.onPause(); super.onPause() }
    override fun onDestroy() { if (::webView.isInitialized) webView.destroy(); super.onDestroy() }

    private inner class NativeBridge {
        @JavascriptInterface fun openPrinterPairing(station: String?) { runOnUiThread { startActivity(Intent(this@MainActivity, SettingsActivity::class.java).putExtra("pairing_station", station ?: "")) } }
        @JavascriptInterface fun getApiBaseUrl(): String = BuildConfig.API_BASE_URL
        @JavascriptInterface fun getSessionToken(): String = getSharedPreferences("pos_auth", MODE_PRIVATE).getString("session_token", "") ?: ""
        @JavascriptInterface fun printReceipt(payload: String, paperWidth: String) {
            val prefs = getSharedPreferences("printer_config", MODE_PRIVATE)
            val mac = prefs.getString("counter_mac", "")?.trim().orEmpty()
            if (mac.isBlank()) { runOnUiThread { Toast.makeText(this@MainActivity, "ยังไม่ได้เลือกเครื่องพิมพ์เคาน์เตอร์", Toast.LENGTH_LONG).show() }; return }
            CoroutineScope(Dispatchers.Main).launch {
                val receipt = runCatching { JSONObject(payload) }.getOrNull()
                if (receipt == null) { Toast.makeText(this@MainActivity, "ข้อมูลใบเสร็จไม่ถูกต้อง", Toast.LENGTH_LONG).show(); return@launch }
                val lines = buildList {
                    val items = receipt.optJSONArray("lines") ?: JSONArray()
                    for (index in 0 until items.length()) {
                        val item = items.optJSONObject(index) ?: continue
                        add("${item.optInt("quantity")} x ${item.optString("name")}")
                        item.optJSONArray("modifiers")?.let { modifiers -> if (modifiers.length() > 0) add("  " + (0 until modifiers.length()).joinToString(", ") { modifiers.optJSONObject(it)?.optString("name") ?: "" }) }
                    }
                    add("รวม ${receipt.optInt("totalSatang") / 100}.${(receipt.optInt("totalSatang") % 100).toString().padStart(2, '0')} บาท")
                    receipt.optString("method").takeIf { it.isNotBlank() }?.let { add("ชำระเงิน: $it") }
                }
                val config = ThermalPrinterConfig(PrinterStation.COUNTER, "เคาน์เตอร์", mac, if (paperWidth.startsWith("58")) PaperWidth.MM58 else PaperWidth.MM80, prefs.getBoolean("counter_drawer", true))
                val result = ThermalPrinterAdapter(this@MainActivity).print(config, PrintJob("FILLING POS", lines, "ขอบคุณที่ใช้บริการ", receipt.optBoolean("openDrawer", false)))
                Toast.makeText(this@MainActivity, if (result.isSuccess) "พิมพ์ใบเสร็จแล้ว" else "พิมพ์ไม่สำเร็จ: ${result.exceptionOrNull()?.message ?: "ตรวจสอบเครื่องพิมพ์"}", Toast.LENGTH_LONG).show()
            }
        }
        @JavascriptInterface fun isNative(): Boolean = true
        @JavascriptInterface fun printerStatus(): String = JSONObject().put("available", true).put("mode", "bluetooth").toString()
    }
}
