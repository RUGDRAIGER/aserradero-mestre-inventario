type ServiceAccount = {
  client_email: string;
  private_key: string;
};

/** Acepta ID puro o URL completa de Drive. */
export function normalizeFolderId(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  const fromUrl = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return fromUrl ? fromUrl[1] : trimmed;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const enc = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${sigB64}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) throw new Error(`Google token error: ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

function driveErrorMessage(status: number, body: string, saEmail: string): string {
  if (status === 404 || body.includes("notFound")) {
    return (
      `Carpeta Drive no encontrada o sin acceso. Comparte una carpeta con ${saEmail} como Editor ` +
      `y actualiza GOOGLE_DRIVE_FOLDER_ID (ID de la URL .../folders/XXXX).`
    );
  }
  if (status === 403 && (body.includes("storageQuota") || body.includes("storage quota"))) {
    return (
      `La cuenta de servicio no puede guardar en su Drive propio. Comparte TU carpeta con ${saEmail} (Editor).`
    );
  }
  return `Drive (${status}): ${body.slice(0, 280)}`;
}

async function folderExists(folderId: string, token: string): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return false;
  const meta = await res.json();
  return meta.mimeType === "application/vnd.google-apps.folder";
}

/** Carpetas compartidas con la cuenta de servicio (cuando el ID del secret es incorrecto). */
async function findSharedFolder(token: string, preferId?: string): Promise<string | null> {
  const q = encodeURIComponent(
    "sharedWithMe and mimeType='application/vnd.google-apps.folder' and trashed=false",
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const files = (await res.json()).files as { id: string; name: string }[];
  if (!files?.length) return null;
  if (preferId && files.some((f) => f.id === preferId)) return preferId;
  const keywords = /aserradero|mestre|comprobante|pdf|inventario/i;
  const match = files.find((f) => keywords.test(f.name));
  return (match ?? files[0]).id;
}

async function resolveParentFolder(
  folderId: string,
  token: string,
  saEmail: string,
): Promise<string> {
  const parentId = normalizeFolderId(folderId);
  if (await folderExists(parentId, token)) return parentId;

  const shared = await findSharedFolder(token, parentId);
  if (shared) {
    console.warn(`Drive: usando carpeta compartida ${shared} (ID configurado ${parentId} no accesible)`);
    return shared;
  }

  throw new Error(driveErrorMessage(404, "notFound", saEmail));
}

async function uploadMultipart(
  pdfBytes: Uint8Array,
  fileName: string,
  metadata: Record<string, unknown>,
  token: string,
  saEmail: string,
): Promise<string> {
  const boundary = "-------supabasePdfBoundary";
  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  ];
  const closing = `\r\n--${boundary}--`;

  const metaBytes = new TextEncoder().encode(bodyParts[0]);
  const midBytes = new TextEncoder().encode(bodyParts[1]);
  const endBytes = new TextEncoder().encode(closing);
  const fullBody = new Uint8Array(
    metaBytes.length + midBytes.length + pdfBytes.length + endBytes.length,
  );
  fullBody.set(metaBytes, 0);
  fullBody.set(midBytes, metaBytes.length);
  fullBody.set(pdfBytes, metaBytes.length + midBytes.length);
  fullBody.set(endBytes, metaBytes.length + midBytes.length + pdfBytes.length);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: fullBody,
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(driveErrorMessage(res.status, body, saEmail));
  }
  const json = await res.json();
  return json.id as string;
}

export async function uploadPdfToDrive(
  pdfBytes: Uint8Array,
  fileName: string,
  folderId: string,
  serviceAccountJson: string,
): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const token = await getAccessToken(sa);
  const parentId = await resolveParentFolder(folderId, token, sa.client_email);

  const metadata = {
    name: fileName,
    parents: [parentId],
    mimeType: "application/pdf",
  };

  return await uploadMultipart(pdfBytes, fileName, metadata, token, sa.client_email);
}
