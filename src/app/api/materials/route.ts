import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const walletAddress = formData.get('walletAddress') as string;
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate type: pdf, png, jpg, jpeg, gif
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Validate size: <= 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // If PDF, extract text with pdf-parse
    let extractedText: string | null = null;
    if (file.type === 'application/pdf' || fileExtension === 'pdf') {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const pdfParserModule = (await import('pdf-parse')) as unknown as Record<string, unknown>;
        // Safely extract the parsing function reference
        const pdfParser = (pdfParserModule.default || pdfParserModule) as unknown as (
          dataBuffer: Buffer
        ) => Promise<{ text: string }>;
        
        const pdfData = await pdfParser(fileBuffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr) {
        console.error('Failed to parse PDF text:', pdfErr);
        extractedText = ''; // Fallback to empty string
      }
    }

    const supabaseAdmin = createAdminClient();
    let dbUserId: string;

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('privy_id', privyId)
      .maybeSingle();

    if (userError) {
      console.error('Failed to query user profile:', userError);
    }

    if (!dbUser) {
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          privy_id: privyId,
          phantom_wallet: walletAddress || `temp-${privyId}`,
          email: email || null,
          name: name || null,
        })
        .select('id')
        .single();

      if (createUserError) {
        console.error('Failed to create user:', createUserError);
        return NextResponse.json({ error: 'Failed to create user profile: ' + createUserError.message }, { status: 500 });
      }
      dbUserId = newUser.id;
    } else {
      dbUserId = dbUser.id;
    }
    const materialId = crypto.randomUUID();
    const filename = file.name;
    const storagePath = `uploads/${privyId}/${materialId}/${filename}`;

    // Ensure study-materials bucket exists
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'study-materials');
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket('study-materials', {
          public: true,
        });
      }
    } catch (bucketErr) {
      console.warn('Bucket listing/creation warning (might already exist):', bucketErr);
    }

    // Upload file to Supabase Storage bucket 'study-materials'
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('study-materials')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to store file in bucket' }, { status: 500 });
    }

    // Insert row into materials table
    const { data: materialRow, error: insertError } = await supabaseAdmin
      .from('materials')
      .insert({
        id: materialId,
        user_id: dbUserId,
        title: filename.replace(/\.[^/.]+$/, ""), // strip extension
        file_name: filename,
        file_size_bytes: file.size,
        file_type: file.type || fileExtension,
        storage_path: storagePath,
        extracted_text: extractedText,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to save material record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        materialId: materialRow.id,
        title: materialRow.title,
        fileName: materialRow.file_name,
        fileSizeBytes: materialRow.file_size_bytes,
        fileType: materialRow.file_type,
        storagePath: materialRow.storage_path,
        extractedText: materialRow.extracted_text,
        uploadedAt: materialRow.uploaded_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST materials API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
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

    const { data: materials, error } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('user_id', dbUser.id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Failed to list materials:', error);
      return NextResponse.json({ error: 'Failed to list materials' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET materials API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
