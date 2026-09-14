import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, isAuthErrorMessage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { distributeTokens, isValidSolanaAddress } from '@/lib/solana';
import { ClaimPostSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const supabaseAdmin = createAdminClient();

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: pending, error } = await supabaseAdmin
      .from('token_distributions')
      .select('id, amount, status, quiz_result_id, quiz_results(score)')
      .eq('user_id', dbUser.id)
      .neq('status', 'confirmed')
      .order('distributed_at', { ascending: false });

    if (error) {
      console.error('Failed to list pending distributions:', error);
      return NextResponse.json({ error: 'Failed to list pending claims' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: pending ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET claim list error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const bodyParsed = ClaimPostSchema.safeParse(await req.json());
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: bodyParsed.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { resultId } = bodyParsed.data;

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

    // Check if user has linked a valid Solana wallet address (base58, 32 bytes)
    const recipient = dbUser.phantom_wallet;
    const isWalletValid = isValidSolanaAddress(recipient);
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

      const solanaMsg = solanaErr instanceof Error ? solanaErr.message : '';
      if (solanaMsg === 'Token rewards are not configured yet') {
        return NextResponse.json({ error: 'Token rewards are not configured yet' }, { status: 503 });
      }
      if (solanaMsg === 'Invalid recipient wallet address') {
        return NextResponse.json({ error: 'Please link your Phantom wallet first in Settings' }, { status: 400 });
      }

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
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}
