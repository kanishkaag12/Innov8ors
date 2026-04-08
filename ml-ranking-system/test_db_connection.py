#!/usr/bin/env python3
"""
Database Connection Test
Verifies PostgreSQL connection and schema setup
"""

import os
import psycopg2
import sys
from dotenv import load_dotenv
from db_config import get_db_config

load_dotenv()

def test_database_connection():
    """Test database connection using environment variables"""

    db_config = get_db_config()

    print("🔍 Testing PostgreSQL connection...")
    print(f"   Host: {db_config['host']}:{db_config['port']}")
    print(f"   Database: {db_config['database']}")
    print(f"   User: {db_config['user']}")

    try:
        # Connect to database
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # Test basic query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connected to PostgreSQL: {version[:50]}...")

        # Check if tables exist
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]

        expected_tables = [
            'users', 'freelancer_profiles', 'freelancer_skills', 'skills',
            'jobs', 'job_skills', 'proposals', 'freelancer_metrics',
            'ml_feature_snapshots', 'ranking_predictions', 'ml_models'
        ]

        print(f"📋 Found {len(table_names)} tables:")
        for table in table_names:
            status = "✅" if table in expected_tables else "⚠️"
            print(f"   {status} {table}")

        # Check for missing tables
        missing_tables = [t for t in expected_tables if t not in table_names]
        if missing_tables:
            print(f"❌ Missing tables: {', '.join(missing_tables)}")
            print("   Run: psql synapescrow_ml < 01_schema.sql")
            return False

        # Test a simple query
        cursor.execute("SELECT COUNT(*) FROM freelancer_profiles;")
        count = cursor.fetchone()[0]
        print(f"📊 freelancer_profiles table has {count} records")

        cursor.close()
        conn.close()

        print("🎉 Database connection and schema verified!")
        return True

    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure PostgreSQL is running")
        print("   2. Check your .env file credentials")
        print("   3. Verify database exists: createdb synapescrow_ml")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)