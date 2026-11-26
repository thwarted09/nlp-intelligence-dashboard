import os
from dotenv import load_dotenv
from database.mongodb import (
    connect_mongodb,
    disconnect_mongodb,
    list_databases,
    list_collections,
)

load_dotenv(".env")

if __name__ == "__main__":
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("Please provide a MongoDB connection link to test.")
    else:
        print("Connecting to MongoDB via URL link...")
        conn = connect_mongodb(uri)
        cid = conn["connection_id"]
        print(f"Connected successfully (Masked URI: {conn['masked_uri']})")
        print(f"Connection Session ID: {cid}")

        for db_name in list_databases(cid):
            print(f"\nDatabase: {db_name}")
            for collection in list_collections(db_name, cid):
                print(f"  Collection: {collection}")

        disconnect_mongodb(cid)
        print("\nConnection closed cleanly.")
