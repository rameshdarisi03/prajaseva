import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function ManagementRedirect() {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, slug')
      .limit(1)
      .single();

    if (org) {
      redirect(`/m/${org.slug || 'org_mangalagiri'}`);
    }
  } catch {}

  redirect('/m/org_mangalagiri');
}
