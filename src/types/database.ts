export interface User {
  id: string;
  privy_id: string;
  phantom_wallet: string;
  email: string | null;
  name: string | null;
  total_tokens_earned: number;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size_bytes: number | null;
  file_type: string | null;
  storage_path: string;
  extracted_text: string | null;
  uploaded_at: string;
  deleted_at: string | null;
}