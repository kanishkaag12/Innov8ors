import os
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

load_dotenv()


def _parse_database_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    config = {
        'host': parsed.hostname,
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/'),
        'user': parsed.username,
        'password': parsed.password,
    }

    query_params = parse_qs(parsed.query)
    for key, values in query_params.items():
        if values:
            config[key] = values[-1]

    return config


def get_db_config() -> dict:
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return _parse_database_url(database_url)

    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME', 'synapescrow_ml'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'password'),
    }
