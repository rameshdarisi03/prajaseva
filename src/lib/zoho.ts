// ==============================================================================
// ZOHO WORKDRIVE UPLOAD & FOLDER RESOLVER SERVICE
// Connects to Zoho India Data Center (zohoapis.in)
// Hierarchy: /[Constituency]/[Ward]/[DD-MM-YYYY]/[TicketRef]/
// ==============================================================================

import { formatDDMMYYYY } from './dateUtils';

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Retrieves a fresh access token using the permanent Refresh Token.
 */
export async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now + 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho WorkDrive credentials missing in environment');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
    method: 'POST',
    body: params,
  });

  const data: ZohoTokenResponse = await response.json();
  if (!data.access_token) {
    throw new Error(`Failed to refresh Zoho token: ${JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedAccessToken;
}

/**
 * Creates or retrieves a subfolder inside a parent folder in Zoho WorkDrive.
 */
async function getOrCreateSubfolder(
  parentFolderId: string,
  folderName: string,
  accessToken: string
): Promise<string> {
  // First, check if folder already exists in parent
  const listRes = await fetch(
    `https://www.zohoapis.in/workdrive/api/v1/files/${parentFolderId}/files`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    }
  );

  const listData = await listRes.json();
  if (listData.data && Array.isArray(listData.data)) {
    const existing = listData.data.find(
      (item: any) =>
        item.attributes &&
        item.attributes.name === folderName &&
        item.attributes.type === 'folder'
    );
    if (existing) {
      return existing.id;
    }
  }

  // Create new folder
  const createRes = await fetch('https://www.zohoapis.in/workdrive/api/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          name: folderName,
          parent_id: parentFolderId,
        },
        type: 'files',
      },
    }),
  });

  const createData = await createRes.json();
  if (!createData.data || !createData.data.id) {
    // If conflict occurred in race condition, return parent or re-query
    return parentFolderId;
  }
  return createData.data.id;
}

/**
 * Resolves the nested folder path: /[Constituency]/[Ward]/[DD-MM-YYYY]/[TicketRef]/
 */
export async function resolveComplaintFolder(params: {
  constituencyName: string;
  wardNumber: string;
  ticketNumber: string;
  date?: Date | string;
}): Promise<string> {
  const rootFolderId = process.env.ZOHO_WORKDRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error('Root Zoho Folder ID not configured');

  const accessToken = await getZohoAccessToken();
  const dateStr = formatDDMMYYYY(params.date || new Date());

  // Level 1: Constituency Folder
  const constituencyFolderId = await getOrCreateSubfolder(
    rootFolderId,
    params.constituencyName.toUpperCase().replace(/\s+/g, '_'),
    accessToken
  );

  // Level 2: Ward Folder
  const wardFolderId = await getOrCreateSubfolder(
    constituencyFolderId,
    `WARD_${params.wardNumber.padStart(2, '0')}`,
    accessToken
  );

  // Level 3: Date Folder (DD-MM-YYYY)
  const dateFolderId = await getOrCreateSubfolder(
    wardFolderId,
    dateStr,
    accessToken
  );

  // Level 4: Ticket Folder
  const ticketFolderId = await getOrCreateSubfolder(
    dateFolderId,
    params.ticketNumber,
    accessToken
  );

  return ticketFolderId;
}

/**
 * Uploads a file buffer directly into the target Zoho WorkDrive folder.
 */
export async function uploadToZohoWorkDrive(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer | Blob,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const accessToken = await getZohoAccessToken();

  const formData = new FormData();
  const blob =
    fileBuffer instanceof Blob
      ? fileBuffer
      : new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append('content', blob, fileName);

  const response = await fetch(
    `https://www.zohoapis.in/workdrive/api/v1/upload?parent_id=${folderId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const result = await response.json();
  if (result.data && result.data[0] && result.data[0].attributes) {
    return result.data[0].attributes.permalink || result.data[0].id;
  }

  // Fallback return ID
  return result.data?.[0]?.id || `zoho://${folderId}/${fileName}`;
}
