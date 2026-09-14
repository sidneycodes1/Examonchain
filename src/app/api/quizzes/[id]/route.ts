import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, isAuthErrorMessage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;
    const quizId = params.id;

    const supabaseAdmin = createAdminClient();

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized profile' }, { status: 401 });
    }

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*, materials(title)')
      .eq('id', quizId)
      .eq('user_id', dbUser.id)
      .maybeSingle();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found or access denied' }, { status: 404 });
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to retrieve questions' }, { status: 500 });
    }

    const questionsWithOptions = [];

    for (const q of questions) {
      const { data: options, error: optionsError } = await supabaseAdmin
        .from('options')
        .select('id, option_text') // Omit is_correct field
        .eq('question_id', q.id);

      if (optionsError) {
        console.error('Failed to retrieve options:', optionsError);
        continue;
      }

      questionsWithOptions.push({
        id: q.id,
        questionText: q.question_text,
        options: options.map(o => ({
          id: o.id,
          text: o.option_text,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        materialId: quiz.material_id,
        createdAt: quiz.created_at,
        questions: questionsWithOptions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET quiz detail error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}

// Deprecated: quiz submission lives at POST /api/submissions (the single
// reward-granting submit path). This endpoint is retained as a 410 stub so
// any legacy callers fail with a clear message instead of double-scoring.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { error: 'Deprecated: submit quizzes via POST /api/submissions' },
    { status: 410 }
  );
}
