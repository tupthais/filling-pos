package com.filling.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.BackoffPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.WorkManager
import com.filling.pos.data.OutboxDb
import com.filling.pos.sync.OrderSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private data class MenuItem(val id: String, val name: String, val priceSatang: Int)
private val fallbackMenu = listOf(MenuItem("p1", "ข้าวกะเพราเนื้อ", 8900), MenuItem("p2", "ข้าวผัดกุ้ง", 7900), MenuItem("p3", "ชาไทยเย็น", 4500), MenuItem("p4", "น้ำเปล่า", 1500))

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { RootScreen() } }
    private fun savedToken() = getSharedPreferences("pos_auth", MODE_PRIVATE).getString("session_token", null)
    private fun saveToken(token: String) { getSharedPreferences("pos_auth", MODE_PRIVATE).edit().putString("session_token", token).apply() }
    private fun queueSync() { val request = OneTimeWorkRequestBuilder<OrderSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, java.util.concurrent.TimeUnit.SECONDS).build(); WorkManager.getInstance(this).enqueueUniqueWork("pos-order-sync", ExistingWorkPolicy.KEEP, request) }
    private suspend fun fetchMenu(): List<MenuItem> = withContext(Dispatchers.IO) { try { val connection = URL("${BuildConfig.API_BASE_URL}/api/catalog/menu?channel=POS").openConnection() as HttpURLConnection; connection.connectTimeout = 5000; connection.readTimeout = 5000; if (connection.responseCode !in 200..299) return@withContext fallbackMenu; val rows = JSONObject(connection.inputStream.bufferedReader().use { it.readText() }).getJSONArray("data"); List(rows.length()) { index -> val row = rows.getJSONObject(index); MenuItem(row.getString("id"), row.getString("name"), row.getInt("priceSatang")) }.ifEmpty { fallbackMenu } } catch (_: Exception) { fallbackMenu } }
    private suspend fun postJson(path: String, body: JSONObject, token: String? = savedToken()): JSONObject = withContext(Dispatchers.IO) { val connection = URL("${BuildConfig.API_BASE_URL}$path").openConnection() as HttpURLConnection; connection.requestMethod = "POST"; connection.connectTimeout = 5000; connection.readTimeout = 5000; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); if (token != null) connection.setRequestProperty("Authorization", "Bearer $token"); val statusBody = runCatching { connection.outputStream.use { it.write(body.toString().toByteArray()) }; if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP ${connection.responseCode}"); connection.inputStream.bufferedReader().use { it.readText() } }.getOrElse { throw it }; connection.disconnect(); JSONObject(statusBody) }
    @Composable private fun RootScreen() { var token by remember { mutableStateOf(savedToken()) }; if (BuildConfig.TENANT_ID.isNotBlank() && BuildConfig.BRANCH_ID.matches(Regex("[0-9a-fA-F-]{36}")) && token == null) LoginScreen { token = it } else PosScreen(token) }
    @Composable private fun LoginScreen(onLoggedIn: (String) -> Unit) { var email by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }; var notice by remember { mutableStateOf("เข้าสู่ระบบเครื่อง POS") }; val scope = rememberCoroutineScope(); Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text("Filling POS", style = MaterialTheme.typography.headlineMedium); Text("เข้าสู่ระบบสาขา", style = MaterialTheme.typography.titleMedium); OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(password, { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()); Text(notice, style = MaterialTheme.typography.bodySmall); Button(onClick = { scope.launch { try { val result = postJson("/api/auth/login", JSONObject().apply { put("tenantId", BuildConfig.TENANT_ID); put("branchId", BuildConfig.BRANCH_ID); put("email", email); put("password", password) }, null); val newToken = result.getJSONObject("data").getString("token"); saveToken(newToken); onLoggedIn(newToken) } catch (_: Exception) { notice = "เข้าสู่ระบบไม่สำเร็จ" } } }, enabled = email.isNotBlank() && password.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("เข้าสู่ระบบ") } } }
    @Composable private fun PosScreen(token: String?) { val cart = remember { mutableStateMapOf<String, Int>() }; var menuItems by remember { mutableStateOf(fallbackMenu) }; var notice by remember { mutableStateOf("กำลังโหลดเมนู • offline fallback พร้อม") }; var busy by remember { mutableStateOf(false) }; val scope = rememberCoroutineScope(); LaunchedEffect(Unit) { menuItems = fetchMenu(); notice = "พร้อมขาย • offline outbox พร้อมใช้งาน" }; val total = menuItems.sumOf { it.priceSatang * (cart[it.id] ?: 0) }; MaterialTheme { Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text("Filling POS", style = MaterialTheme.typography.headlineMedium); Text("โต๊ะ 04 • ${if (total == 0) "รายการว่าง" else "ยอด ฿${total / 100}.${(total % 100).toString().padStart(2, '0')}"}"); LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(menuItems) { item -> Card(Modifier.fillMaxWidth()) { Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) { Column { Text(item.name, style = MaterialTheme.typography.titleMedium); Text("฿${item.priceSatang / 100}.${(item.priceSatang % 100).toString().padStart(2, '0')}") }; Button(onClick = { cart[item.id] = (cart[item.id] ?: 0) + 1 }) { Text("เพิ่ม") } } } } }; Text(notice, style = MaterialTheme.typography.bodySmall); Button(modifier = Modifier.fillMaxWidth(), enabled = total > 0 && !busy, onClick = { val localId = UUID.randomUUID().toString(); val payload = JSONObject().apply { put("source", "POS"); put("branchId", BuildConfig.BRANCH_ID); put("totalSatang", total); put("items", JSONArray(cart.map { (id, quantity) -> val product = menuItems.first { it.id == id }; JSONObject().apply { put("productId", id); put("quantity", quantity); put("unitPriceSatang", product.priceSatang) } })) }; busy = true; scope.launch { try { val synced = postJson("/api/sync/orders", JSONObject().apply { put("localOrderId", localId); put("deviceId", "android-pos"); put("payload", payload) }, token); val orderId = synced.getJSONObject("data").getString("serverOrderId"); postJson("/api/orders/$orderId/confirm", JSONObject(), token); val paid = postJson("/api/payments/confirm", JSONObject().apply { put("orderId", orderId); put("idempotencyKey", "android-payment-$localId"); put("tenderedSatang", total); put("allocations", JSONArray().put(JSONObject().apply { put("method", "cash"); put("amountSatang", total) })) }, token); notice = "ขายสำเร็จ • Receipt ถูกสร้างแล้ว • change ฿${paid.getJSONObject("data").optInt("changeSatang", 0) / 100}"; cart.clear() } catch (_: Exception) { OutboxDb(this@MainActivity).enqueue(payload.toString()); queueSync(); notice = "บันทึกออฟไลน์แล้ว • จะ sync เมื่อ network พร้อม" } finally { busy = false } } }) { Text(if (busy) "กำลังบันทึก..." else "รับเงินสด / บันทึกออฟไลน์") } } } }
}
