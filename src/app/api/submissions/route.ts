import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { distributeTokens } from '@/lib/solana';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const { quizId, answers } = await req.json() as {
      quizId: string;
      answers: Record<string, string> | { questionId: string; optionId: string }[];
    };

    if (!quizId || !answers) {
      return NextResponse.json({ error: 'Missing quizId or answers' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Load user profile
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, phantom_wallet, total_tokens_earned')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Load quiz questions
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('quiz_id', quizId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to retrieve quiz questions' }, { status: 500 });
    }

    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 });
    }

    // Normalize answers format to Record<questionId, optionId>
    let normalizedAnswers: Record<string, string> = {};
    if (Array.isArray(answers)) {
      answers.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          if ('questionId' in item && 'optionId' in item) {
            normalizedAnswers[item.questionId] = item.optionId;
          } else {
            Object.keys(item).forEach((k) => {
              normalizedAnswers[k] = (item as Record<string, string>)[k];
            });
          }
        }
      });
    } else {
      normalizedAnswers = answers;
    }

    let correctCount = 0;
    const evaluatedList = [];

    // Evaluate correct options
    for (const q of questions) {
      const { data: options, error: optionsError } = await supabaseAdmin
        .from('options')
        .select('id, is_correct')
        .eq('question_id', q.id);

      if (optionsError || !options) {
        continue;
      }

      const selectedOptionId = normalizedAnswers[q.id] || null;
      const correctOption = options.find(o => o.is_correct);
      const isCorrect = selectedOptionId === correctOption?.id;

      if (isCorrect) {
        correctCount++;
      }

      evaluatedList.push({
        questionId: q.id,
        selectedOptionId,
        isCorrect,
      });
    }

    const score = Math.round((correctCount / totalQuestions) * 100);
    const tokensEarned = score >= 70 ? score : 0;

    // Insert quiz result
    const { data: resultRow, error: resultError } = await supabaseAdmin
      .from('quiz_results')
      .insert({
        quiz_id: quizId,
        user_id: dbUser.id,
        score,
        total_questions: totalQuestions,
      })
      .select('id')
      .single();

    if (resultError || !resultRow) {
      console.error('Failed to create quiz result:', resultError);
      return NextResponse.json({ error: 'Failed to record quiz results' }, { status: 500 });
    }

    const resultId = resultRow.id;

    // Insert user answers
    const answersToInsert = evaluatedList.map((ans) => ({
      quiz_result_id: resultId,
      question_id: ans.questionId,
      selected_option_id: ans.selectedOptionId,
      is_correct: ans.isCorrect,
    }));

    const { error: answersError } = await supabaseAdmin
      .from('user_answers')
      .insert(answersToInsert);

    if (answersError) {
      console.error('Failed to insert user answers:', answersError);
    }

    let txHash: string | null = null;

    if (tokensEarned > 0) {
      // 1. Insert pending token distribution
      const { data: distRow, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .insert({
          user_id: dbUser.id,
          quiz_result_id: resultId,
          amount: tokensEarned,
          status: 'pending',
        })
        .select('id')
        .single();

      if (distError || !distRow) {
        console.error('Failed to register token distribution:', distError);
      } else {
        const distId = distRow.id;

        // Check if user has a valid Solana wallet address
        const recipient = dbUser.phantom_wallet;
        const isWalletValid = recipient && !recipient.startsWith('temp-') && recipient.length >= 32;

        if (isWalletValid) {
          try {
            // 2. Trigger SPL token transfer on devnet
            const { signature } = await distributeTokens(recipient, tokensEarned);
            txHash = signature;

            // 3. Update distribution to confirmed
            await supabaseAdmin
              .from('token_distributions')
              .update({
                status: 'confirmed',
                tx_signature: signature,
              })
              .eq('id', distId);

            // 4. Update user's aggregate balance
            const currentTotal = BigInt(dbUser.total_tokens_earned || 0);
            await supabaseAdmin
              .from('users')
              .update({
                total_tokens_earned: currentTotal + BigInt(tokensEarned),
              })
              .eq('id', dbUser.id);

          } catch (solanaErr) {
            console.error('Solana token distribution failed:', solanaErr);
            await supabaseAdmin
              .from('token_distributions')
              .update({ status: 'failed' })
              .eq('id', distId);
          }
        } else {
          console.warn('Skipping devnet transfer: user has no valid wallet linked.', recipient);
          await supabaseAdmin
            .from('token_distributions')
            .update({ status: 'failed' })
            .eq('id', distId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      resultId,
      score,
      tokensEarned,
      txHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST quiz submissions route error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
