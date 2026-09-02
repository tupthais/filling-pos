package com.filling.pos.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.util.UUID

data class LocalOrder(val id: String, val payload: String, val status: String)

class OutboxDb(context: Context) : SQLiteOpenHelper(context, "filling_pos.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) { db.execSQL("CREATE TABLE orders (id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)") }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) { }
    fun enqueue(payload: String): String { val id = UUID.randomUUID().toString(); writableDatabase.insertOrThrow("orders", null, ContentValues().apply { put("id", id); put("payload", payload); put("status", "PENDING"); put("created_at", System.currentTimeMillis()) }); return id }
    fun pending(): List<LocalOrder> = readableDatabase.query("orders", arrayOf("id", "payload", "status"), "status = ?", arrayOf("PENDING"), null, null, "created_at ASC").use { cursor -> buildList { while (cursor.moveToNext()) add(LocalOrder(cursor.getString(0), cursor.getString(1), cursor.getString(2))) } }
    fun pendingCount(): Int = readableDatabase.rawQuery("SELECT COUNT(*) FROM orders WHERE status = ?", arrayOf("PENDING")).use { cursor -> if (cursor.moveToFirst()) cursor.getInt(0) else 0 }
    fun markAcked(id: String) { writableDatabase.update("orders", ContentValues().apply { put("status", "ACKED") }, "id = ?", arrayOf(id)) }
    fun markConflict(id: String) { writableDatabase.update("orders", ContentValues().apply { put("status", "CONFLICT") }, "id = ?", arrayOf(id)) }
}
