# Backup Restore Drill — Filling POS

**RPO:** 24h (daily backup) — **RTO:** 2h — **Encryption:** pg_dump piped to AES-256 (drift ยังไม่เปิด — แนะนำ `age` หรือ `gpg` ก่อน production)

## Drill steps (non-destructive)
```powershell
npm run db:backup                    # -> backups/filling-pos-YYYYMMDD-HHMMSS.sql
docker compose exec postgres pg_isready -U postgres -d filling_pos
# restore บน staging DB แยกเท่านั้น:
npm run db:restore -- -BackupPath "backups\filling-pos-YYYYMMDD-HHMMSS.sql" -Confirmation "RESTORE FILLING POS"
# verify
npx prisma migrate deploy
npm run db:seed  # เฉพาะถ้าเป็น empty staging
psql "postgresql://postgres:postgres@localhost:55433/filling_pos" -c "select count(*) from \"PosOrder\";"
```

## Checklist ก่อน production
- [ ] ย้าย backup ไป object storage แบบ encrypted (S3 + age)
- [ ] ตั้ง cron daily + เก็บ 30 วัน
- [ ] ทดสอบ restore ทุกเดือน + บันทึก RTO จริง
- [ ] เอกสาร RPO/RTO ลง ADR
