import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const { materialId, message, history = [] } = await req.json() as {
      materialId: string;
      message: string;
      history?: ChatMessage[];
    };

    if (!materialId || !message) {
      return NextResponse.json({ error: 'Missing materialId or message' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing GOOGLE_GEMINI_API_KEY from environment' }, { status: 500 });
    }

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

    // Fetch study material
    const { data: material, error: materialError } = await supabaseAdmin
      .from('materials')
      .select('extracted_text, title')
      .eq('id', materialId)
      .eq('user_id', dbUser.id)
      .maybeSingle();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are an AI study assistant for the ExamChain platform.
You are helping a student review and master their uploaded material titled: "${material.title}".
Rely on the following extracted material content to answer the student's questions, summarize concepts, or explain topics.
Be clear, educational, and concise. Format your responses in Markdown.
If the student asks a completely unrelated question, guide them back to the study material.

Uploaded Material Content:
"""
${material.extracted_text || '(No text extracted from this study material)'}
"""`,
    });

    // Format history for Gemini API: roles must be 'user' and 'model'
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Gemini chat API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
