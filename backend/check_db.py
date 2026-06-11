import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect("postgresql://test:qwer1234@192.168.0.156:5432/save_point")
    rows = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
        "users"
    )
    for r in rows:
        print(r["column_name"], "-", r["data_type"])
    await conn.close()

asyncio.run(check())
