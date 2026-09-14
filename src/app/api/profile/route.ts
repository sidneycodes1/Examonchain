import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, isAuthErrorMessage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const supabaseAdmin = createAdminClient();

    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, privy_id, phantom_wallet, email, name, total_tokens_earned')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }

    let userRow = dbUser;

    if (!userRow) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          privy_id: privyId,
          phantom_wallet: `temp-${privyId}`,
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Failed to create user profile on demand:', createError);
        return NextResponse.json({ error: 'Failed to initialize profile' }, { status: 500 });
      }
      userRow = newUser;
    }

    if (!userRow) {
      return NextResponse.json({ error: 'Failed to find or create user profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userRow.id,
        privyId: userRow.privy_id,
        phantomWallet: userRow.phantom_wallet,
        email: userRow.email,
        name: userRow.name,
        totalTokensEarned: Number(userRow.total_tokens_earned || 0),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET profile error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}
