import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function RootPage() {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (org?.id) {
      redirect(`/p/${org.id}`);
    }
  } catch {}

  redirect('/p/00000000-0000-0000-0000-000000000001');
}
