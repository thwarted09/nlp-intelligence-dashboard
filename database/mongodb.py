import os
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Existing default connection
_client = None

# Dynamic connections created through the dashboard
_dynamic_clients = {}


def parse_and_clean_uri(uri: str):
    """
    Extract default database and collection from MongoDB URI path if present.
    Returns (cleaned_uri_for_pymongo, default_database, default_collection).
    If URI has /database/collection, strips the /collection from the connection string
    so PyMongo's MongoClient accepts it without InvalidURI error.
    """
    try:
        parsed = urlparse(uri)
        path = parsed.path.strip("/")
        parts = [p for p in path.split("/") if p]
        default_db = parts[0] if len(parts) > 0 else None
        default_col = parts[1] if len(parts) > 1 else None

        clean_path = f"/{default_db}" if default_db else "/"
        cleaned_uri = urlunparse((
            parsed.scheme,
            parsed.netloc,
            clean_path,
            parsed.params,
            parsed.query,
            parsed.fragment,
        ))
        return cleaned_uri, default_db, default_col
    except Exception:
        return uri, None, None


def mask_uri(uri: str) -> str:
    """Mask credentials in MongoDB URI for safe logging/display."""
    if not isinstance(uri, str):
        return ""
    # Mask password between colon and @
    return re.sub(r"(mongodb(?:\+srv)?://[^:]+:)([^@]+)(@)", r"\1****\3", uri)


def _create_client(uri: str):
    """Create and verify a MongoDB client."""
    if not isinstance(uri, str) or not uri.strip():
        raise ValueError("A MongoDB connection URI is required.")

    uri = uri.strip()

    if not uri.startswith(("mongodb://", "mongodb+srv://")):
        raise ValueError("Please provide a valid MongoDB URI starting with mongodb:// or mongodb+srv://.")

    client = MongoClient(
        uri,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
    )

    try:
        client.admin.command("ping")
        return client
    except PyMongoError:
        client.close()
        raise


def get_mongo_client():
    """Return the existing default MongoDB client."""
    global _client

    if _client is None:
        uri = os.getenv("MONGODB_URI")

        if not uri:
            raise RuntimeError(
                "MONGODB_URI is missing from the project-root .env file."
            )

        _client = MongoClient(
            uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
        )

    return _client


def connect_mongodb(uri: str):
    """Create a dynamic connection and return its connection ID and metadata."""
    cleaned_uri, default_db, default_col = parse_and_clean_uri(uri)
    client = _create_client(cleaned_uri)
    connection_id = str(uuid.uuid4())
    _dynamic_clients[connection_id] = client

    try:
        db_names = [
            d for d in client.list_database_names()
            if d not in ("admin", "local", "config")
        ]
    except PyMongoError:
        # Fallback if user only has permissions on a specific database
        db_names = [default_db] if default_db else []

    return {
        "connection_id": connection_id,
        "connected": True,
        "databases": db_names,
        "default_database": default_db,
        "default_collection": default_col,
        "masked_uri": mask_uri(uri),
    }


def get_client(connection_id=None):
    """Get either a dynamic client or the default client."""
    if connection_id is None:
        return get_mongo_client()

    client = _dynamic_clients.get(connection_id)

    if client is None:
        raise ValueError("MongoDB connection not found.")

    return client


def disconnect_mongodb(connection_id: str):
    """Close and remove a dynamic connection."""
    client = _dynamic_clients.pop(connection_id, None)

    if client is None:
        return False

    client.close()
    return True


def check_mongodb_connection(connection_id=None):
    """Check connectivity to the selected MongoDB instance."""
    try:
        client = get_client(connection_id)
        client.admin.command("ping")

        return {
            "connected": True,
            "message": "MongoDB connection successful.",
        }
    except (PyMongoError, ValueError, RuntimeError) as exc:
        return {
            "connected": False,
            "message": f"MongoDB connection failed: {exc}",
        }


def list_databases(connection_id=None):
    """List databases accessible to the selected connection."""
    client = get_client(connection_id)
    try:
        return [
            d for d in client.list_database_names()
            if d not in ("admin", "local", "config")
        ]
    except PyMongoError:
        return []


def get_database(database_name: str, connection_id=None):
    """Return a database from the selected connection."""
    if not database_name:
        raise ValueError("A database name is required.")

    return get_client(connection_id)[database_name]


def list_collections(database_name: str, connection_id=None):
    """List collections in a selected database."""
    try:
        return get_database(database_name, connection_id).list_collection_names()
    except PyMongoError:
        return []


def get_collection(database_name: str, collection_name: str, connection_id=None):
    """Return a collection from the selected connection."""
    if not database_name or not collection_name:
        raise ValueError("Both database and collection names are required.")

    return get_database(database_name, connection_id)[collection_name]


def get_collection_stats(database_name: str, collection_name: str, connection_id=None):
    """Get document count and discovered fields for a collection."""
    col = get_collection(database_name, collection_name, connection_id)
    try:
        total_records = col.count_documents({})
    except PyMongoError:
        total_records = 0

    try:
        sample_docs = list(col.find({}).limit(10))
        fields = sorted({key for doc in sample_docs for key in doc})
    except PyMongoError:
        fields = []

    return {
        "database": database_name,
        "collection": collection_name,
        "total_records": total_records,
        "fields": fields,
    }
