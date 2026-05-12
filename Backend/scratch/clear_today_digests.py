import asyncio
import os
from datetime import date
import asyncpg
from dotenv import load_dotenv

# Load environment variables for DB connection
load_dotenv()
DATABASE_URL = os.getenv("SUPABASE_DB_URL")

async def clear_digests():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        return

    # Use the connection string to connect
    # Note: asyncpg requires a slightly different format if it's a supabase string, 
    # but usually the URL works directly if it's postgresql://
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        today = date.today()
        print(f"Clearing evening_digest notifications for {today}...")
        
        # Delete from notifications table
        result = await conn.execute(
            """
            DELETE FROM public.notifications 
            WHERE type = 'evening_digest' 
            AND created_at::date = $1
            """,
            today
        )
        
        print(f"Successfully cleared: {result}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(clear_digests())
