import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise SystemExit("DATABASE_URL is not set in .env")

with open("01_schema.sql", "r", encoding="utf-8") as f:
    schema_sql = f.read()

conn = psycopg2.connect(database_url)
try:
    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.commit()
finally:
    conn.close()

print("Schema applied successfully.")