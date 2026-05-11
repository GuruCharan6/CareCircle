import asyncio
from app.worker._db import worker_conn
from datetime import date

async def reset():
    today = date.today()
    async with worker_conn() as conn:
        await conn.execute("DELETE FROM public.notifications WHERE type = 'morning_digest' AND created_at::date = $1", today)
    print("Database reset successful! You can test the morning digest again today.")

if __name__ == "__main__":
    asyncio.run(reset())
