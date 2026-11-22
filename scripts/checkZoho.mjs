import fs from 'fs';

const env = {};
const lines = fs.readFileSync('.env.local', 'utf-8').split('\n');
for (const line of lines) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
}

async function checkZoho() {
  const clientId = env.ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  const refreshToken = env.ZOHO_REFRESH_TOKEN;

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const tokenRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
    method: 'POST',
    body: params,
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  for (const folderId of ['3iz3lb2113715ed6b48bdba5f2c1edc716efa', 'zf0n78c31dc2f0fb64f828bb25529d81e5298']) {
    const res = await fetch(`https://www.zohoapis.in/workdrive/api/v1/files/${folderId}/files`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.api+json' }
    });
    const d = await res.json();
    console.log(`\nFiles inside folder ${folderId}:`);
    if (d.data && d.data.length > 0) {
      d.data.forEach(f => {
        console.log(`- ${f.attributes?.name} | type: ${f.attributes?.type} | permalink: ${f.attributes?.permalink || f.attributes?.Permalink} | download_url: ${f.attributes?.download_url}`);
      });
    } else {
      console.log('  (Empty folder)');
    }
  }
}

checkZoho().catch(console.error);
