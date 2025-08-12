import asyncpg
import os

# database connection setup
DB_USER = os.getenv('POSTGRES_USER', 'realtimechat')
DB_PASS = os.getenv('POSTGRES_PASSWORD', 'password123') 
DB_NAME = os.getenv('POSTGRES_DB', 'realtimechat')
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# connection pool
db_pool = None

async def get_db_pool():
    global db_pool
    if db_pool is None:
        print(f"Connecting to database: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        try:
            db_pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=2,
                max_size=10
            )
            print("Database pool created successfully")
        except Exception as e:
            print(f"Failed to create database pool: {e}")
            raise
    return db_pool

async def close_db_pool():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("Database pool closed")