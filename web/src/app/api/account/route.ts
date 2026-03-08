import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete in FK-safe order, checking each step
    const tables = [
      { table: 'execution_logs', key: 'user_id' },
      { table: 'automations', key: 'user_id' },
      { table: 'connections', key: 'user_id' },
      { table: 'profiles', key: 'id' },
    ];

    for (const { table, key } of tables) {
      const { error: delError } = await admin.from(table).delete().eq(key, user.id);
      if (delError) {
        return NextResponse.json(
          { error: `Failed to delete ${table}: ${delError.message}` },
          { status: 500 }
        );
      }
    }

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      return NextResponse.json(
        { error: `Failed to delete auth user: ${authError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
