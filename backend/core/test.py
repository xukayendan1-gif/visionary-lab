import os
import base64
import hashlib
import hmac
import requests
import urllib.parse
import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# ---- CONFIG ----
COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_DB_ENDPOINT").rstrip("/")
COSMOS_KEY = os.getenv("AZURE_COSMOS_DB_KEY")
DATABASE_ID = os.getenv("AZURE_COMOS_DB_ID")  # (note: typo "COMOS" in your .env)
CONTAINER_ID = os.getenv("AZURE_COSMOS_CONTAINER_ID")


def build_auth_token(verb, resource_type, resource_id, date, key):
    """Generate Cosmos DB auth token."""
    key = base64.b64decode(key)
    text = f"{verb.lower()}\n{resource_type.lower()}\n{resource_id}\n{date.lower()}\n\n"
    signature = base64.b64encode(
        hmac.new(key, text.encode("utf-8"), hashlib.sha256).digest()
    ).decode()
    return f"type=master&ver=1.0&sig={urllib.parse.quote(signature)}"


def run_cosmos_query(query, enable_cross_partition_query=True):
    """Execute a SQL query against Cosmos DB."""
    # Use the proper query endpoint
    url = f"{COSMOS_ENDPOINT}/dbs/{DATABASE_ID}/colls/{CONTAINER_ID}/docs"
    resource_link = f"dbs/{DATABASE_ID}/colls/{CONTAINER_ID}"
    date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

    headers = {
        "Authorization": build_auth_token(
            "POST", "docs", resource_link, date, COSMOS_KEY
        ),
        "x-ms-date": date,
        "x-ms-version": "2018-12-31",
        "x-ms-documentdb-isquery": "true",
        "Content-Type": "application/query+json",
        "Accept": "application/json",
        "x-ms-documentdb-query-enablecrosspartition": str(
            enable_cross_partition_query
        ).lower(),
        "x-ms-max-item-count": "-1",  # Return all results
    }

    # Properly format the query body
    body = {
        "query": query,
        "parameters": [],  # Add parameters array (even if empty)
    }

    try:
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status()

        # Parse the response
        result = response.json()

        # Extract the documents from the response
        if "Documents" in result:
            return result["Documents"]
        else:
            return result

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Body: {response.text}")
        raise


def run_cosmos_query_with_pagination(
    query, enable_cross_partition_query=True, max_items_per_page=100
):
    """Execute a SQL query against Cosmos DB with pagination support."""
    url = f"{COSMOS_ENDPOINT}/dbs/{DATABASE_ID}/colls/{CONTAINER_ID}/docs"
    resource_link = f"dbs/{DATABASE_ID}/colls/{CONTAINER_ID}"

    all_results = []
    continuation_token = None

    while True:
        date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

        headers = {
            "Authorization": build_auth_token(
                "POST", "docs", resource_link, date, COSMOS_KEY
            ),
            "x-ms-date": date,
            "x-ms-version": "2018-12-31",
            "x-ms-documentdb-isquery": "true",
            "Content-Type": "application/query+json",
            "Accept": "application/json",
            "x-ms-documentdb-query-enablecrosspartition": str(
                enable_cross_partition_query
            ).lower(),
            "x-ms-max-item-count": str(max_items_per_page),
        }

        # Add continuation token if we have one
        if continuation_token:
            headers["x-ms-continuation"] = continuation_token

        body = {"query": query, "parameters": []}

        try:
            response = requests.post(url, headers=headers, json=body)
            response.raise_for_status()

            result = response.json()

            # Add documents to results
            if "Documents" in result:
                all_results.extend(result["Documents"])

            # Check for continuation token
            continuation_token = response.headers.get("x-ms-continuation")

            # If no continuation token, we're done
            if not continuation_token:
                break

        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            print(f"Response Status Code: {response.status_code}")
            print(f"Response Headers: {response.headers}")
            print(f"Response Body: {response.text}")
            raise

    return all_results


if __name__ == "__main__":
    # Test with a simple count query first
    simple_query = "SELECT * FROM c"

    # Then try your GROUP BY query
    group_query = """
    SELECT COUNT(1) as asset_count, c.folder_path, c.media_type
    FROM c
    GROUP BY c.folder_path, c.media_type
    """

    try:
        # Try simple query first to verify connection
        print("Testing simple query...")
        result = run_cosmos_query(simple_query)
        print(
            f"Simple query returned {len(result) if isinstance(result, list) else 1} results"
        )

        # Then try the GROUP BY query
        print("\nTesting GROUP BY query...")
        result = run_cosmos_query(group_query)
        print("GROUP BY Results:")
        for item in result:
            print(
                f"  Folder: {item.get('folder_path', 'N/A')}, "
                f"Media Type: {item.get('media_type', 'N/A')}, "
                f"Count: {item.get('asset_count', 0)}"
            )
    except Exception as e:
        print(f"Error: {e}")

        # If GROUP BY fails, it might be due to indexing or query features
        print("\nNote: GROUP BY queries require proper indexing in Cosmos DB.")
        print(
            "Make sure your container has the necessary composite indexes configured."
        )
        print("You may need to enable aggregate functions in your Cosmos DB account.")
