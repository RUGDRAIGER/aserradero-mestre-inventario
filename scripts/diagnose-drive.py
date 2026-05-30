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
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip()
    if "/folders/" in folder_id:
        import re
        m = re.search(r"/folders/([a-zA-Z0-9_-]+)", folder_id)
        if m:
            folder_id = m.group(1)
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

    def folder_ok(fid: str, tok: str) -> tuple[bool, str]:
        u = (
            f"https://www.googleapis.com/drive/v3/files/{fid}"
            "?fields=id,mimeType,capabilities/canAddChildren&supportsAllDrives=true"
        )
        try:
            meta = json.loads(
                urllib.request.urlopen(
                    urllib.request.Request(u, headers={"Authorization": f"Bearer {tok}"})
                ).read()
            )
            if meta.get("mimeType") != "application/vnd.google-apps.folder":
                return False, "El ID no es una carpeta."
            caps = meta.get("capabilities") or {}
            if not caps.get("canAddChildren"):
                return False, (
                    f"La carpeta existe pero sin permiso de escritura. "
                    f"Comparte con {email} como Editor (no Lector)."
                )
            return True, ""
        except urllib.error.HTTPError:
            return False, "Carpeta no encontrada o sin compartir."

    def shared_folders(tok: str) -> list:
        q = urllib.parse.quote(
            "sharedWithMe and mimeType='application/vnd.google-apps.folder' and trashed=false"
        )
        u = (
            f"https://www.googleapis.com/drive/v3/files?q={q}"
            "&fields=files(id,name)&pageSize=20&supportsAllDrives=true"
        )
        data = json.loads(
            urllib.request.urlopen(
                urllib.request.Request(u, headers={"Authorization": f"Bearer {tok}"})
            ).read()
        )
        return data.get("files", [])

    import re

    keywords = re.compile(r"aserradero|mestre|comprobante|pdf|inventario", re.I)
    parent = folder_id
    folder_name = ""
    shared = shared_folders(token)
    if shared:
        print("Carpetas compartidas con la cuenta de servicio:")
        for f in shared:
            print(f"  - «{f.get('name')}» → {f.get('id')}")
        ordered = (
            [f for f in shared if keywords.search(f.get("name", ""))]
            + [f for f in shared if f.get("id") == folder_id]
            + shared
        )
        seen = set()
        for f in ordered:
            fid = f.get("id")
            if not fid or fid in seen:
                continue
            seen.add(fid)
            ok_folder, reason = folder_ok(fid, token)
            if ok_folder:
                parent = fid
                folder_name = f.get("name", "")
                if fid != folder_id:
                    print(
                        f"AVISO: usando carpeta compartida «{folder_name}» ({parent}); "
                        f"actualiza GOOGLE_DRIVE_FOLDER_ID con este ID.",
                        file=sys.stderr,
                    )
                break
        else:
            print(reason or f"Ninguna carpeta con permiso Editor para {email}.", file=sys.stderr)
            return 1
    else:
        ok_folder, reason = folder_ok(parent, token)
        if not ok_folder:
            print(reason or f"Ninguna carpeta compartida con {email}.", file=sys.stderr)
            return 1

    print(f"Carpeta destino: «{folder_name or parent}» ({parent})")
    test_name = "e2e-drive-test.txt"
    metadata = json.dumps({"name": test_name, "parents": [parent], "mimeType": "text/plain"})
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
        print(f"OK — archivo en carpeta id={res.get('id')}")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"ERROR ({e.code}): {body[:500]}", file=sys.stderr)
        if "storage quota" in body.lower() or e.code == 403:
            print(
                "Las cuentas de servicio NO pueden guardar en su Drive propio. "
                "Debes compartir TU carpeta con la cuenta de servicio (Editor).",
                file=sys.stderr,
            )
        if "404" in body or "notFound" in body:
            print(
                "Carpeta no encontrada: revisa GOOGLE_DRIVE_FOLDER_ID en GitHub Secrets "
                "(solo el ID de la URL, o la URL completa).",
                file=sys.stderr,
            )
        return 1


if __name__ == "__main__":
    sys.exit(main())
