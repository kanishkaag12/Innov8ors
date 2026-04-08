import psycopg2
from db_config import get_db_config

config = get_db_config()
conn = psycopg2.connect(**config)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) as total, COUNT(semantic_similarity_job_proposal) as ready FROM ml_feature_snapshots")
total, ready = cursor.fetchone()
print(f'Total snapshots: {total}')
print(f'Ready features (semantic_similarity not NULL): {ready}')
print(f'Ready %: {ready/total*100:.1f}%' if total > 0 else 'N/A (no snapshots)')

cursor.execute("SELECT AVG(semantic_similarity_job_proposal) FROM ml_feature_snapshots WHERE semantic_similarity_job_proposal IS NOT NULL")
avg = cursor.fetchone()[0] or 0
print(f'Avg semantic similarity: {avg}')

cursor.close()
conn.close()
print('Check complete')
