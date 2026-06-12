import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth';
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;
    const quizId = params.id;

    const { answers } = await req.json() as { answers: Record<string, string> }; // questionId -> optionId

    const supabaseAdmin = createAdminClient();

    // Look up user
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized profile' }, { status: 401 });
    }

    // Fetch questions to evaluate
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id, question_text')
      .eq('quiz_id', quizId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to retrieve questions' }, { status: 500 });
    }

    let score = 0;
    const evaluatedAnswers = [];

    for (const q of questions) {
      const { data: options, error: optionsError } = await supabaseAdmin
        .from('options')
        .select('id, option_text, is_correct')
        .eq('question_id', q.id);

      if (optionsError || !options) {
        continue;
      }

      const selectedOptionId = answers[q.id];
      const correctOption = options.find(o => o.is_correct);
      const isCorrect = selectedOptionId === correctOption?.id;

      if (isCorrect) {
        score++;
      }

      evaluatedAnswers.push({
        questionId: q.id,
        selectedOptionId,
        correctOptionId: correctOption?.id,
        isCorrect,
        options: options.map(o => ({
          id: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
        })),
      });
    }

    // Insert quiz results
    const { data: resultRow, error: resultError } = await supabaseAdmin
      .from('quiz_results')
      .insert({
        quiz_id: quizId,
        user_id: dbUser.id,
        score,
        total_questions: questions.length,
      })
      .select('id')
      .single();

    if (resultError || !resultRow) {
      console.error('Failed to save quiz results:', resultError);
    } else {
      const resultId = resultRow.id;
      // Insert user answers
      const userAnswersToInsert = evaluatedAnswers.map(ans => ({
        quiz_result_id: resultId,
        question_id: ans.questionId,
        selected_option_id: ans.selectedOptionId || null,
        is_correct: ans.isCorrect,
      }));

      const { error: answersInsertError } = await supabaseAdmin
        .from('user_answers')
        .insert(userAnswersToInsert);

      if (answersInsertError) {
        console.error('Failed to insert user answers:', answersInsertError);
      }
    }

    return NextResponse.json({
      success: true,
      score,
      totalQuestions: questions.length,
      evaluatedAnswers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST quiz submit error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
