import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { distributeTokens } from '@/lib/solana';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const { resultId } = await req.json() as { resultId: string };
    if (!resultId) {
      return NextResponse.json({ error: 'Missing resultId' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Get user profile
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, phantom_wallet, total_tokens_earned')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user has linked a valid Solana wallet address
    const recipient = dbUser.phantom_wallet;
    const isWalletValid = recipient && !recipient.startsWith('temp-') && recipient.length >= 32;
    if (!isWalletValid) {
      return NextResponse.json({ error: 'Please link your Phantom wallet first in Settings' }, { status: 400 });
    }

    // 2. Find the token distribution record
    const { data: distRow, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('id, amount, status')
      .eq('quiz_result_id', resultId)
      .eq('user_id', dbUser.id)
      .maybeSingle();

    if (distError || !distRow) {
      return NextResponse.json({ error: 'Token distribution record not found' }, { status: 404 });
    }

    if (distRow.status === 'confirmed') {
      return NextResponse.json({ error: 'Tokens have already been claimed successfully for this quiz.' }, { status: 400 });
    }

    // 3. Trigger distribution
    const amount = Number(distRow.amount);
    let txHash: string;
    try {
      const { signature } = await distributeTokens(recipient, amount);
      txHash = signature;
    } catch (solanaErr) {
      console.error('Retry distribution Solana transfer failed:', solanaErr);
      await supabaseAdmin
        .from('token_distributions')
        .update({ status: 'failed' })
        .eq('id', distRow.id);

      return NextResponse.json({ error: 'Solana Devnet transfer failed. Please try again later.' }, { status: 500 });
    }

    // 4. Update status and aggregate balance
    const { error: updateError } = await supabaseAdmin
      .from('token_distributions')
      .update({
        status: 'confirmed',
        tx_signature: txHash,
      })
      .eq('id', distRow.id);

    if (updateError) {
      console.error('Failed to update distribution status:', updateError);
    }

    const currentTotal = BigInt(dbUser.total_tokens_earned || 0);
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        total_tokens_earned: currentTotal + BigInt(amount),
      })
      .eq('id', dbUser.id);

    if (userUpdateError) {
      console.error('Failed to update user total balance:', userUpdateError);
    }

    return NextResponse.json({
      success: true,
      txHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST claim retry API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
