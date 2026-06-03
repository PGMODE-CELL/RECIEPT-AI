import json

def handler(event, context):
    return {
        "statusCode": 200,
        "body": json.dumps({"status": "healthy", "source": "netlify-function"}),
        "headers": {"Content-Type": "application/json"},
    }
