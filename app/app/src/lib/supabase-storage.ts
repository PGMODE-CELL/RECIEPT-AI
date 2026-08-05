import { supabase } from "@/lib/supabase";

const DEFAULT_BUCKET = "files";

export interface UploadOptions {
  bucket?: string;
  path?: string;
  upsert?: boolean;
  contentType?: string;
}

export interface UploadResult {
  path: string;
  id: string;
  fullPath: string;
}

export async function uploadFile(
  file: File | Blob,
  filename: string,
  options?: UploadOptions,
): Promise<UploadResult> {
  const bucket = options?.bucket ?? DEFAULT_BUCKET;
  const path = options?.path ? `${options.path}/${filename}` : filename;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options?.upsert ?? false,
      contentType: options?.contentType ?? file.type,
    });

  if (error) throw error;
  return data;
}

export async function uploadFileAsBase64(
  base64Data: string,
  filename: string,
  options?: UploadOptions,
): Promise<UploadResult> {
  const bucket = options?.bucket ?? DEFAULT_BUCKET;
  const path = options?.path ? `${options.path}/${filename}` : filename;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64Data), {
      upsert: options?.upsert ?? false,
      contentType: options?.contentType ?? "application/octet-stream",
    });

  if (error) throw error;
  return data;
}

export async function downloadFile(
  filename: string,
  bucket?: string,
): Promise<Blob> {
  const b = bucket ?? DEFAULT_BUCKET;

  const { data, error } = await supabase.storage.from(b).download(filename);
  if (error) throw error;
  return data;
}

export async function getFileUrl(
  filename: string,
  bucket?: string,
  expiresIn?: number,
): Promise<string> {
  const b = bucket ?? DEFAULT_BUCKET;

  if (expiresIn) {
    const { data, error } = await supabase.storage
      .from(b)
      .createSignedUrl(filename, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  const { data } = supabase.storage.from(b).getPublicUrl(filename);
  return data.publicUrl;
}

export async function deleteFile(
  filenames: string | string[],
  bucket?: string,
): Promise<void> {
  const b = bucket ?? DEFAULT_BUCKET;
  const files = Array.isArray(filenames) ? filenames : [filenames];

  const { error } = await supabase.storage.from(b).remove(files);
  if (error) throw error;
}

export async function listFiles(
  path?: string,
  bucket?: string,
  options?: { limit?: number; offset?: number; sortBy?: string },
): Promise<{ name: string; id: string }[]> {
  const b = bucket ?? DEFAULT_BUCKET;

  const { data, error } = await supabase.storage.from(b).list(path, {
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
    sortBy: options?.sortBy ? { column: options.sortBy, order: "asc" } : undefined,
  });

  if (error) throw error;
  return data ?? [];
}

export async function moveFile(
  fromPath: string,
  toPath: string,
  bucket?: string,
): Promise<void> {
  const b = bucket ?? DEFAULT_BUCKET;

  const { error } = await supabase.storage.from(b).move(fromPath, toPath);
  if (error) throw error;
}

export async function copyFile(
  fromPath: string,
  toPath: string,
  bucket?: string,
): Promise<{ path: string }> {
  const b = bucket ?? DEFAULT_BUCKET;

  const { data, error } = await supabase.storage.from(b).copy(fromPath, toPath);
  if (error) throw error;
  return data;
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
