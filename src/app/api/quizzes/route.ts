import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, isAuthErrorMessage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { generateQuizFromText } from '@/lib/gemini';
import { QuizzesPostSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const bodyParsed = QuizzesPostSchema.safeParse(await req.json());
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: bodyParsed.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { materialId } = bodyParsed.data;

    const supabaseAdmin = createAdminClient();

    // Look up db user
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized profile' }, { status: 401 });
    }

    // Fetch material and verify ownership
    const { data: material, error: materialError } = await supabaseAdmin
      .from('materials')
      .select('title, extracted_text')
      .eq('id', materialId)
      .eq('user_id', dbUser.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    if (!material.extracted_text || material.extracted_text.trim().length === 0) {
      return NextResponse.json({
        error: 'This study material has no text content extracted yet. Cannot generate quiz.'
      }, { status: 400 });
    }

    // Call Gemini to generate quiz
    let generated;
    try {
      generated = await generateQuizFromText(material.extracted_text);
    } catch (genErr) {
      const genMsg = genErr instanceof Error ? genErr.message : '';
      if (genMsg === 'AI quiz generation is not configured yet') {
        return NextResponse.json({ error: 'AI quiz generation is not configured yet' }, { status: 503 });
      }
      throw genErr;
    }

    // Insert quiz row
    const { data: quizRow, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        material_id: materialId,
        user_id: dbUser.id,
        title: `Quiz: ${material.title}`,
      })
      .select('id')
      .single();

    if (quizError || !quizRow) {
      console.error('Failed to create quiz:', quizError);
      return NextResponse.json({ error: 'Failed to create quiz record' }, { status: 500 });
    }

    const quizId = quizRow.id;
    const questionsResponse = [];

    // Sequential insert of questions and options
    for (const q of generated.questions) {
      const { data: questionRow, error: questionError } = await supabaseAdmin
        .from('questions')
        .insert({
          quiz_id: quizId,
          question_text: q.questionText,
          question_type: 'multiple-choice',
        })
        .select('id, question_text')
        .single();

      if (questionError || !questionRow) {
        console.error('Failed to insert question:', questionError);
        continue;
      }

      const questionId = questionRow.id;

      const optionsToInsert = q.options.map(opt => ({
        question_id: questionId,
        option_text: opt.text,
        is_correct: opt.isCorrect,
      }));

      const { data: optionsRows, error: optionsError } = await supabaseAdmin
        .from('options')
        .insert(optionsToInsert)
        .select('id, option_text, is_correct');

      if (optionsError || !optionsRows) {
        console.error('Failed to insert options:', optionsError);
        continue;
      }

      questionsResponse.push({
        id: questionId,
        questionText: questionRow.question_text,
        options: optionsRows.map(o => ({
          id: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
        })),
        explanation: q.explanation,
      });
    }

    return NextResponse.json({
      success: true,
      quizId,
      questions: questionsResponse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST quiz API error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}

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

    const { data: quizzes, error } = await supabaseAdmin
      .from('quizzes')
      .select('*, materials(title)')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch quizzes:', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: quizzes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET quizzes API error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}
