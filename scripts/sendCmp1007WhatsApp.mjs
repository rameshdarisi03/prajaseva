import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf-8').split('\n').forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const token = env.META_WHATSAPP_TOKEN;
const phoneId = env.META_WHATSAPP_PHONE_NUMBER_ID;

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: complaint, error } = await supa
  .from('complaints')
  .select('*, ward:wards(*), organization:organizations(*)')
  .eq('ticket_number', 'CMP-1007')
  .single();

if (error) {
  console.error('Complaint fetch error:', error);
  process.exit(1);
}

console.log('Sending Victory PR Poster to WhatsApp...');
console.log('Recipient:', complaint.citizen_phone);
console.log('Poster URL:', complaint.poster_url);

const cleanPhone = '919206651295';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';

const templatePayload = {
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: cleanPhone,
  type: 'template',
  template: {
    name: 'praja_resolution_poster_v1',
    language: { code: 'en_US' },
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: complaint.poster_url },
          },
        ],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: complaint.citizen_name || 'Citizen' },
          { type: 'text', text: complaint.ticket_number },
          { type: 'text', text: complaint.category },
          { type: 'text', text: complaint.ward?.name || 'Ward 05' },
          { type: 'text', text: 'Team Ramesh Darisi' },
          { type: 'text', text: '3 Mins' },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: complaint.ticket_number },
        ],
      },
    ],
  },
};

const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(templatePayload),
});

const data = await res.json();
console.log('WhatsApp API Response:', JSON.stringify(data, null, 2));
