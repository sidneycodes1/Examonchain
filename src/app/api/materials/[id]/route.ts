import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyToken, isAuthErrorMessage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;
    const materialId = params.id;

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

    const { data: material, error } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', dbUser.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !material) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET material detail error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const claims = await verifyPrivyToken(authHeader);
    const privyId = claims.sub;
    const materialId = params.id;

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

    // Verify ownership and get material (including storage path for cleanup)
    const { data: material, error } = await supabaseAdmin
      .from('materials')
      .select('id, storage_path')
      .eq('id', materialId)
      .eq('user_id', dbUser.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !material) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    // Soft delete: set deleted_at
    const { error: deleteError } = await supabaseAdmin
      .from('materials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', materialId);

    if (deleteError) {
      console.error('Failed to soft delete material:', deleteError);
      return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
    }

    // Delete the underlying file from Supabase Storage (best-effort: row stays soft-deleted either way)
    if (material.storage_path) {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('study-materials')
        .remove([material.storage_path]);
      if (storageError) {
        console.warn('Soft-deleted material row but failed to remove Storage object:', storageError);
      }
    }

    return NextResponse.json({ success: true, message: 'Material successfully deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('DELETE material error:', error);
    return NextResponse.json({ error: message }, { status: isAuthErrorMessage(message) ? 401 : 500 });
  }
}
