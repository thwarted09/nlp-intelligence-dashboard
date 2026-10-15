
from database.mongodb import (
    check_mongodb_connection,
    list_databases,
    list_collections,
)

if __name__ == "__main__":
    result = check_mongodb_connection()
    print(result["message"])

    if result["connected"]:
        for db_name in list_databases():
            print(f"\nDatabase: {db_name}")
            for collection in list_collections(db_name):
                print(f"  Collection: {collection}")
