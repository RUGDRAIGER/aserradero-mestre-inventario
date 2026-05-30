#!/usr/bin/env python3
"""
Genera GOOGLE_OAUTH_REFRESH_TOKEN para subir PDFs a Mi unidad (Gmail personal).

Requisitos en Google Cloud (mismo proyecto):
  - OAuth consent screen configurada
  - Credenciales OAuth 2.0 → Tipo «App de escritorio»

Uso:
  export GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
  export GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-..."
  python3 scripts/google-oauth-refresh-token.py

Luego:
  gh secret set GOOGLE_OAUTH_CLIENT_ID ...
  gh secret set GOOGLE_OAUTH_CLIENT_SECRET ...
  gh secret set GOOGLE_OAUTH_REFRESH_TOKEN ...
  Actions → Sincronizar secrets Drive a Supabase
"""
import json
import os
import sys
import urllib.parse
import urllib.request
import webbrowser

SCOPE = "https://www.googleapis.com/auth/drive.file"
REDIRECT = "http://localhost:8765/"


def main() -> int:
    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Define GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET", file=sys.stderr)
        return 1

    params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": REDIRECT,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    print("1. Abre esta URL (inicia sesión con project.manager.rug@gmail.com si aplica):")
    print(auth_url)
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass
    print(f"\n2. Tras autorizar, copia la URL completa del navegador (debe empezar con {REDIRECT})")
    redirect_url = input("URL: ").strip()
    parsed = urllib.parse.urlparse(redirect_url)
    code = urllib.parse.parse_qs(parsed.query).get("code", [None])[0]
    if not code:
        print("No se encontró ?code= en la URL", file=sys.stderr)
        return 1

    body = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": REDIRECT,
            "grant_type": "authorization_code",
        }
    ).encode()
    tok = json.loads(
        urllib.request.urlopen(
            urllib.request.Request(
                "https://oauth2.googleapis.com/token",
                data=body,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        ).read()
    )
    refresh = tok.get("refresh_token")
    if not refresh:
        print(json.dumps(tok, indent=2), file=sys.stderr)
        print("Sin refresh_token. Revoca acceso previo en Google y repite con prompt=consent.", file=sys.stderr)
        return 1

    print("\n--- GOOGLE_OAUTH_REFRESH_TOKEN (guárdalo en GitHub Secrets) ---\n")
    print(refresh)
    print("\n--- fin ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
