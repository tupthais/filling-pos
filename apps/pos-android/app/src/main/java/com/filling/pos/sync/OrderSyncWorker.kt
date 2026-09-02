package com.filling.pos.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.filling.pos.BuildConfig
import com.filling.pos.data.OutboxDb
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class OrderSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result { val db = OutboxDb(applicationContext); val token = applicationContext.getSharedPreferences("pos_auth", Context.MODE_PRIVATE).getString("session_token", null); for (order in db.pending()) { try { val connection = URL("${BuildConfig.API_BASE_URL}/api/sync/orders").openConnection() as HttpURLConnection; connection.requestMethod = "POST"; connection.connectTimeout = 5000; connection.readTimeout = 5000; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); if (token != null) connection.setRequestProperty("Authorization", "Bearer $token"); connection.outputStream.use { it.write(JSONObject().apply { put("localOrderId", order.id); put("deviceId", "android-pos"); put("payload", JSONObject(order.payload)) }.toString().toByteArray()) }; if (connection.responseCode in 200..299) db.markAcked(order.id) else if (connection.responseCode in 409..499) db.markConflict(order.id) else return Result.retry(); connection.disconnect() } catch (_: Exception) { return Result.retry() } }; return Result.success() }
}
