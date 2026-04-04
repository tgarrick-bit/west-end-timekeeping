// e.g. src/lib/uploadReceipt.ts
import { createClient } from "@/lib/supabase/client";

export async function uploadReceipt(file: File) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const filePath = `receipts/${user.id}/${Date.now()}-${file.name}`;

  const { error: upErr } = await supabase
    .storage.from("expense-receipts")
    .upload(filePath, file, { upsert: true, cacheControl: "3600" });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase
    .storage.from("expense-receipts")
    .createSignedUrl(filePath, 60 * 60); // 1 hour
  if (signErr) throw signErr;

  return { filePath, url: signed.signedUrl };
}
