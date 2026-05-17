# Troubleshooting Guide

Common issues and solutions for CareCircle development and deployment.

---

## Database Issues

### `asyncpg.exceptions.InvalidPasswordError`

**Symptom:** Backend fails to connect to database on startup

**Cause:** Incorrect database URL format

**Solution:**
Supabase database URL must include the project-ref subdomain:
```
✅ Correct:
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

❌ Wrong:
DATABASE_URL=postgresql://postgres:<password>@supabase.com:5432/postgres
```

Get the correct URL from Supabase Dashboard → Project Settings → Database → Connection String (Session mode)

---

### `vector dimension mismatch` on semantic search

**Symptom:** Error when searching or creating embeddings
```
ERROR: vector dimension 1536 does not match column dimension 768
```

**Cause:** Migration 016 not applied (changes vector dimension from 1536 → 768 for Gemini)

**Solution:**
```bash
# Option 1: Apply via Supabase CLI
supabase db push

# Option 2: Apply manually in Supabase Dashboard SQL Editor
-- Run this in SQL Editor:
ALTER TABLE source_documents 
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE document_chunks 
  ALTER COLUMN embedding TYPE vector(768);
```

**Verify fix:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'source_documents' AND column_name = 'embedding';
-- Should return: vector(768)
```

---

### RLS policy blocking background jobs

**Symptom:** Celery jobs fail with "permission denied" or "no rows returned" when they should

**Cause:** Background job using wrong database pool (user pool instead of service-role pool)

**Solution:**
Check `Backend/app/core/database.py` — jobs should use `service_pool`:
```python
# ✅ Correct (bypasses RLS)
async with service_pool.connection() as conn:
    await conn.execute(...)

# ❌ Wrong (enforces RLS, blocks service account)
async with user_pool.connection() as conn:
    await conn.execute(...)
```

**Jobs that MUST use service_pool:**
- Pipeline writes (ingestion, enrichment, reconciliation)
- Background jobs (digests, gap detection, crisis rebuild)
- Webhooks (Twilio inbound messages)

**Routes that MUST use user_pool:**
- All `/api/v1/*` endpoints (user-facing)

---

## AI/LLM Issues

### Gemini API returns 400 "API key not valid"

**Symptom:** Pipeline fails at Layer 1 (OCR) with authentication error

**Cause:** Missing or incorrect `GEMINI_API_KEY`

**Solution:**
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env`:
   ```
   GEMINI_API_KEY=AIza...
   ```
3. Restart backend

**Verify:**
```bash
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
```

---

### Gemini API rate limit exceeded

**Symptom:** Pipeline fails with "quota exceeded" or "rate limit" error

**Cause:** Free tier Gemini quota (15 requests/min, 1500 requests/day) exceeded

**Solution:**
1. **Short term:** Wait 1 minute and retry
2. **Medium term:** Implement request throttling in `Backend/app/providers/llm/gemini.py`:
   ```python
   from tenacity import retry, wait_exponential, stop_after_attempt
   
   @retry(wait=wait_exponential(min=1, max=60), stop=stop_after_attempt(5))
   async def call_gemini(...):
       # existing code
   ```
3. **Long term:** Upgrade to paid tier (60 requests/min, unlimited daily)

**Monitor usage:**
Check `gemini_api_calls_total` Prometheus metric

---

### Confidence scores always <0.7 (constant review required)

**Symptom:** Every prescription extraction shows `extraction_status = "review_required"`

**Cause:** Blurry images, handwritten prescriptions, or overly strict confidence threshold

**Solution:**
1. **Improve image quality:**
   - Ask users to upload clearer photos
   - Better lighting, no shadows
   - Capture full prescription (no cropping)

2. **Adjust confidence threshold** (if quality is actually good):
   Edit `Backend/app/pipeline/layer1_ingest/prescription.py`:
   ```python
   # Current threshold
   CONFIDENCE_THRESHOLD = 0.7
   
   # Lower threshold (more auto-approvals, higher risk)
   CONFIDENCE_THRESHOLD = 0.5  # Use with caution
   ```

3. **Test with known-good images:**
   ```bash
   pytest tests/test_ocr.py -k "test_prescription_high_quality"
   ```

---

## Celery & Redis Issues

### Celery tasks not running

**Symptom:** Pipeline triggered but never completes, or scheduled jobs don't fire

**Cause:** Worker or beat not running, or Redis connection issue

**Solution:**

**1. Check worker is running:**
```bash
# Should see worker process
ps aux | grep celery

# If not running, start it:
celery -A app.worker.celery_app worker --loglevel=info
```

**2. Check beat is running:**
```bash
# Should see beat process
ps aux | grep "celery.*beat"

# If not running, start it:
celery -A app.worker.celery_app beat --loglevel=info
```

**3. Check Redis connectivity:**
```bash
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

**4. Check Celery can see tasks:**
```bash
celery -A app.worker.celery_app inspect registered
# Should list all @task functions
```

**5. Check task queue:**
```bash
celery -A app.worker.celery_app inspect active
# Shows currently running tasks

celery -A app.worker.celery_app inspect scheduled
# Shows scheduled tasks
```

---

### Tasks stuck in "pending" forever

**Symptom:** Task triggered, shows in queue, but never executes

**Cause:** Task name mismatch or serialization error

**Solution:**

**1. Check task is registered:**
```python
# In Backend/app/worker/celery_app.py
app.autodiscover_tasks(['app.worker.jobs'])
```

**2. Check task name matches:**
```python
# Task definition
@app.task(name='app.worker.jobs.morning_digest')
def morning_digest():
    ...

# Task call
morning_digest.apply_async()  # Celery auto-resolves name
```

**3. Check serialization:**
Celery uses JSON by default. If passing complex objects:
```python
# ❌ Wrong (can't serialize SQLAlchemy model)
pipeline.apply_async(args=[patient_model])

# ✅ Correct (pass primitive ID)
pipeline.apply_async(args=[patient_model.id])
```

---

### Celery beat schedule in wrong timezone

**Symptom:** Jobs running at wrong times (e.g., 7:00 AM job runs at 12:30 PM)

**Cause:** `CELERY_TIMEZONE` not set or wrong

**Solution:**
Add to `.env`:
```
CELERY_TIMEZONE=Asia/Kolkata
```

Restart beat:
```bash
celery -A app.worker.celery_app beat --loglevel=info
```

**Verify timezone:**
```python
from app.worker.celery_app import app
print(app.conf.timezone)  # Should print: Asia/Kolkata
```

---

## WhatsApp Integration Issues

### WhatsApp webhook not receiving messages

**Symptom:** Send message to bot number, nothing happens, no logs

**Cause:** Twilio webhook URL not publicly accessible

**Solution:**

**1. For local development, use ngrok:**
```bash
ngrok http 8000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

**2. Set webhook in Twilio Console:**
- Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox settings
- Set webhook URL: `https://abc123.ngrok.io/api/v1/webhooks/whatsapp`
- Method: POST

**3. Verify webhook signature:**
Check `TWILIO_AUTH_TOKEN` in `.env` matches Twilio Console → Account → Auth Token

**4. Test webhook:**
```bash
curl -X POST http://localhost:8000/api/v1/webhooks/whatsapp \
  -d "From=whatsapp:+1234567890&Body=test message"
```

---

### WhatsApp messages not sending

**Symptom:** `POST /whatsapp/send` returns 200 but message never arrives

**Cause:** Twilio sandbox not approved, or recipient not opted in

**Solution:**

**1. Sandbox limitation:**
Twilio sandbox requires recipient to send "join <code>" first

**2. Production WhatsApp Business API:**
Apply for production access (requires business verification)

**3. Check Twilio logs:**
Twilio Console → Monitor → Logs → Messaging logs
Look for status: `failed`, `undelivered`

**4. Verify phone number format:**
```python
# ✅ Correct
to = "whatsapp:+919876543210"

# ❌ Wrong
to = "+919876543210"  # Missing whatsapp: prefix
to = "whatsapp:9876543210"  # Missing country code
```

---

## Firebase Push Notifications

### Push notifications not arriving

**Symptom:** In-app notifications work, but device doesn't receive push

**Cause:** Firebase credentials, FCM token, or browser permissions

**Solution:**

**1. Check Firebase credentials:**
```bash
# Should be valid service account JSON
cat $FIREBASE_CREDENTIALS_PATH
```

**2. Check FCM token registration:**
Frontend should register token on login:
```typescript
// Frontend/lib/firebase.ts
const token = await getToken(messaging, {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
});
await saveTokenToBackend(token);
```

**3. Check browser permissions:**
- Chrome: Settings → Privacy → Site settings → Notifications
- Allow notifications for your app domain

**4. Test FCM directly:**
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: Bearer $FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN",
    "notification": {
      "title": "Test",
      "body": "Test notification"
    }
  }'
```

**5. Check notification permission status:**
```javascript
console.log(Notification.permission);
// Should be: "granted"
```

---

## Frontend Issues

### `401 Unauthorized` on all API requests

**Symptom:** Every API call returns 401, even after login

**Cause:** JWT secret mismatch or token expiry

**Solution:**

**1. Check JWT secret matches:**
```bash
# Backend .env
SUPABASE_JWT_SECRET=your-jwt-secret

# Get correct value from Supabase Dashboard:
# Project Settings → API → JWT Secret
```

**2. Check token refresh logic:**
`Frontend/lib/api/client.ts` should refresh token before expiry:
```typescript
if (isTokenExpired(accessToken)) {
  const newToken = await refreshToken();
  // Retry request with new token
}
```

**3. Check token in request:**
Browser DevTools → Network → Request Headers
```
Authorization: Bearer eyJ...
```

**4. Decode token to check expiry:**
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(new Date(payload.exp * 1000));  // Expiry time
```

---

### CORS errors from frontend

**Symptom:** `Access-Control-Allow-Origin` error in browser console

**Cause:** Frontend origin not in backend allowed origins

**Solution:**

Edit `Backend/app/main.py`:
```python
origins = [
    "http://localhost:3000",  # Local dev
    "https://your-production-domain.com",  # Production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Restart backend after changing CORS config.

---

### Frontend build fails with `Module not found`

**Symptom:** `npm run build` fails with missing module error

**Cause:** Dependency not installed or version mismatch

**Solution:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, check Node version
node --version  # Should be 18+

# Update to latest LTS
nvm install 18
nvm use 18
npm install
```

---

## Drug Interaction Checker

### Drug interaction check returns no results

**Symptom:** Patient has ≥2 active medications but interaction check returns empty array

**Cause:** Redis cache issue, Gemini API error, or no active medications

**Solution:**

**1. Verify patient has active medications:**
```bash
curl http://localhost:8000/api/v1/medications?patient_id=UUID&active_only=true
# Should return ≥2 medications with status="active"
```

**2. Check Redis cache:**
```bash
redis-cli -u $REDIS_URL
> keys drug_interaction:*
> get drug_interaction:metformin:lisinopril
```

**3. Check Gemini API key:**
See [Gemini API issues](#gemini-api-returns-400-api-key-not-valid)

**4. Manually trigger interaction check:**
```bash
curl -X POST http://localhost:8000/api/v1/drug-interactions/check \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "UUID",
    "medications": ["Metformin", "Lisinopril"]
  }'
```

**5. Check logs for errors:**
```bash
grep "drug_interaction" logs/app.log | tail -20
```

---

## Performance Issues

### API requests slow (>5 seconds)

**Symptom:** Dashboard loads slowly, API calls timeout

**Cause:** Missing indexes, N+1 queries, or unoptimized database queries

**Solution:**

**1. Check slow query log:**
Supabase Dashboard → Database → Query Performance
Look for queries >1 second

**2. Add missing indexes:**
```sql
-- Example: If filtering by extraction_status is slow
CREATE INDEX idx_documents_extraction_status 
  ON source_documents(extraction_status);
```

**3. Check for N+1 queries:**
```python
# ❌ N+1 query (loads medications one-by-one)
for med in medications:
    prescriber = await get_prescriber(med.prescriber_id)

# ✅ Batch load (single query)
prescriber_ids = [m.prescriber_id for m in medications]
prescribers = await get_prescribers(prescriber_ids)
```

**4. Enable query logging:**
`Backend/app/core/database.py`:
```python
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

---

### Pipeline extraction takes >60 seconds

**Symptom:** Prescription OCR times out or takes very long

**Cause:** Large image file, Gemini API latency, or network issues

**Solution:**

**1. Compress images before upload:**
Frontend should resize to max 2000x2000px:
```typescript
// Frontend/lib/imageCompressor.ts
await compressImage(file, { maxWidth: 2000, maxHeight: 2000 });
```

**2. Use Gemini Flash (faster than Pro):**
```python
# Backend/app/providers/vision/gemini_vision.py
model = genai.GenerativeModel('gemini-1.5-flash')  # ✅ Fast
# Not: gemini-1.5-pro  # ❌ Slower, more expensive
```

**3. Monitor Gemini latency:**
```bash
grep "gemini_api_duration" logs/app.log | awk '{sum+=$NF; n++} END {print sum/n}'
# Average latency
```

---

## Common Deployment Issues

### Environment variables not loading

**Symptom:** App crashes with "GEMINI_API_KEY not set" even though .env exists

**Cause:** `.env` not in correct directory or not loaded by deployment platform

**Solution:**

**1. For local development:**
```bash
# .env must be in Backend/ directory
ls Backend/.env  # Should exist
```

**2. For Railway/Render/Heroku:**
Set environment variables in dashboard, not .env file

**3. For Docker:**
```dockerfile
# Load .env in Dockerfile
ENV $(cat .env | xargs)
```

---

### Database migrations not applied on deploy

**Symptom:** Fresh deployment crashes with "table does not exist"

**Cause:** Migrations not applied during deployment

**Solution:**

**Railway:**
Add to `railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "supabase db push && uvicorn app.main:app --host 0.0.0.0"
```

**Render:**
Add build command:
```bash
supabase db push && pip install -r requirements.txt
```

---

## Monitoring & Debugging

### Enable debug logging

Edit `Backend/app/core/logging.py`:
```python
import structlog

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
    # ... rest of config
)
```

Restart backend, logs will be much more verbose.

---

### Check Prometheus metrics

```bash
curl http://localhost:8000/metrics | grep pipeline
# Shows pipeline execution times, error counts
```

---

### Inspect Celery task state

```bash
celery -A app.worker.celery_app inspect active
celery -A app.worker.celery_app inspect reserved
celery -A app.worker.celery_app inspect stats
```

---

## Getting Help

If none of the above solves your issue:

1. **Check logs:** `Backend/logs/app.log` for backend errors
2. **Check browser console:** For frontend errors
3. **Check Celery logs:** For background job errors
4. **Enable debug mode:** See [Enable debug logging](#enable-debug-logging)
5. **Create GitHub issue:** Include logs, error messages, steps to reproduce

**Common log locations:**
- Backend API: `Backend/logs/app.log`
- Celery worker: stdout when running `celery worker`
- Frontend: Browser DevTools → Console
- Database: Supabase Dashboard → Logs