
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

_client = None


def get_mongo_client():
    """Return a reusable MongoDB Atlas client."""
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


def check_mongodb_connection():
    """Check connectivity to MongoDB Atlas."""
    try:
        client = get_mongo_client()
        client.admin.command("ping")

        return {
            "connected": True,
            "message": "MongoDB Atlas connection successful.",
        }
    except PyMongoError as exc:
        return {
            "connected": False,
            "message": f"MongoDB connection failed: {exc}",
        }


def list_databases():
    """List databases accessible to this MongoDB user."""
    return get_mongo_client().list_database_names()


def get_database(database_name):
    """Return a database selected by name."""
    if not database_name:
        raise ValueError("A database name is required.")

    return get_mongo_client()[database_name]


def list_collections(database_name):
    """List collections in the selected database."""
    return get_database(database_name).list_collection_names()
def get_collection(database_name, collection_name):
    """Return a collection selected by name."""
    if not database_name or not collection_name:
        raise ValueError(
            "Both database and collection names are required."
        )

    return get_database(database_name)[collection_name]