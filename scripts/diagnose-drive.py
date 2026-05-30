#!/usr/bin/env python3
"""Sube un PDF de prueba a la carpeta Drive configurada. Imprime error exacto de Google."""
import json
import os
import sys
import time
import base64
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> int:
    sa_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
    if not sa_json or not folder_id:
        print("Falta GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_DRIVE_FOLDER_ID", file=sys.stderr)
        return 1

    sa = json.loads(sa_json)
    email = sa.get("client_email", "?")
    print(f"Cuenta de servicio: {email}")
    print(f"Carpeta: {folder_id}")

    now = int(time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    payload = b64url(
        json.dumps(
            {
                "iss": email,
                "scope": "https://www.googleapis.com/auth/drive",
                "aud": "https://oauth2.googleapis.com/token",
                "iat": now,
                "exp": now + 3600,
            }
        ).encode()
    )
    key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = key.sign(f"{header}.{payload}".encode(), padding.PKCS1v15(), hashes.SHA256())
    jwt = f"{header}.{payload}.{b64url(sig)}"

    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt,
        }
    ).encode()
    tok_res = urllib.request.urlopen(
        urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    )
    token = json.loads(tok_res.read())["access_token"]
    print("Token OAuth OK")

    name = "e2e-drive-test.txt"
    metadata = json.dumps({"name": name, "parents": [folder_id], "mimeType": "text/plain"})
    boundary = "e2eBoundary"
    content = b"E2E test Aserradero Mestre"
    parts = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n"
        f"--{boundary}\r\nContent-Type: text/plain\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()

    url = (
        "https://www.googleapis.com/upload/drive/v3/files"
        "?uploadType=multipart&supportsAllDrives=true&fields=id,name"
    )
    req = urllib.request.Request(
        url,
        data=parts,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        method="POST",
    )
    try:
        res = json.loads(urllib.request.urlopen(req).read())
        print(f"OK — archivo creado id={res.get('id')} name={res.get('name')}")
        return 0
    except urllib.error.HTTPError as e:
        print(f"ERROR HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        print(
            "Si dice 404 o permisos: comparte la carpeta con la cuenta de servicio como Editor.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
