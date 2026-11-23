import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function uploadFile(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);
  console.log(`Uploading ${localPath} (${fileBuffer.length} bytes) to ${storagePath}...`);
  const { data, error } = await supabase.storage
    .from('complaints')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error(`Error uploading ${storagePath}:`, error);
  } else {
    const { data: pubData } = supabase.storage.from('complaints').getPublicUrl(storagePath);
    console.log(`✓ Uploaded ${storagePath}: ${pubData.publicUrl}`);
  }
}

async function run() {
  await uploadFile('public/leaders/modi.jpg', 'leaders/modi.jpg');
  await uploadFile('public/leaders/cbn.jpg', 'leaders/cbn.jpg');
  await uploadFile('public/leaders/pk.jpg', 'leaders/pk.jpg');
  await uploadFile('public/leaders/ramesh_darisi.jpg', 'leaders/ramesh_darisi.jpg');
  console.log('All leader images uploaded successfully!');
}

run();
