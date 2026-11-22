import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function ManagementRedirect() {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (org?.id) {
      redirect(`/m/${org.id}`);
    }
  } catch {}

  redirect('/m/00000000-0000-0000-0000-000000000001');
}
