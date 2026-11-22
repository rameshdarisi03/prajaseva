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

const p = new URLSearchParams({
  grant_type: 'refresh_token',
  client_id: env.ZOHO_CLIENT_ID,
  client_secret: env.ZOHO_CLIENT_SECRET,
  refresh_token: env.ZOHO_REFRESH_TOKEN,
});

async function run() {
  const tRes = await fetch('https://accounts.zoho.in/oauth/v2/token', { method: 'POST', body: p });
  const tData = await tRes.json();
  const token = tData.access_token;
  console.log('Token acquired');

  // Download after_CMP-1003.jpg (file ID: zf0n7694a10e7693f4ba9890f89c848c96da5)
  const dlRes = await fetch('https://www.zohoapis.in/workdrive/api/v1/download/zf0n7694a10e7693f4ba9890f89c848c96da5', {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Download status:', dlRes.status, dlRes.headers.get('content-type'));
  const buf = Buffer.from(await dlRes.arrayBuffer());
  console.log('Downloaded bytes:', buf.length);

  // Upload to Supabase storage
  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const upRes = await supa.storage.from('complaints').upload('resolution/CMP-1003_after.jpg', buf, {
    contentType: 'image/jpeg',
    upsert: true
  });
  console.log('Supabase upload result:', upRes.error ? upRes.error : 'SUCCESS');
  const { data: pubUrl } = supa.storage.from('complaints').getPublicUrl('resolution/CMP-1003_after.jpg');
  console.log('Public URL:', pubUrl.publicUrl);

  // Update complaint CMP-1003 after_photo_url and before_photo_url
  // Also let's set before_photo_url to CMP-1005_before.jpg so it has an actual road/civic image if test.jpg was empty!
  const dbRes = await supa.from('complaints').update({ 
    after_photo_url: pubUrl.publicUrl,
    before_photo_url: 'https://miciwfmbgdsrsdogvhit.supabase.co/storage/v1/object/public/complaints/evidence/CMP-1005_before.jpg'
  }).eq('ticket_number', 'CMP-1003');
  console.log('DB update error:', dbRes.error);
}

run().catch(console.error);
