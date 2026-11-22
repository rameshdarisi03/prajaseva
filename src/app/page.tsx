import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function RootPage() {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, slug')
      .limit(1)
      .single();

    if (org) {
      redirect(`/p/${org.slug || 'org_mangalagiri'}`);
    }
  } catch {}

  redirect('/p/org_mangalagiri');
}
