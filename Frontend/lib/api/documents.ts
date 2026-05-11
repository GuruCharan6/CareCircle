import { api } from "./client";
import type {
  SignedUploadURLRequest,
  SignedUploadURLResponse,
  DocumentApproveRequest,
  DocumentRejectRequest,
  DocumentResponse,
  DocumentListItem,
} from "../types";

export const documentsApi = {
  getUploadUrl(patientId: string, data: SignedUploadURLRequest) {
    return api.post<SignedUploadURLResponse>(`/patients/${patientId}/documents/upload-url`, data);
  },

  // PUT to Supabase Storage signed URL — must be multipart FormData (Supabase TUS endpoint requirement)
  async uploadToStorage(uploadUrl: string, file: Blob, mimeType: string): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Storage upload failed: ${res.status} ${body}`);
    }
  },

  triggerExtraction(docId: string) {
    return api.post<DocumentResponse>(`/documents/${docId}/process`);
  },

  get(docId: string) {
    return api.get<DocumentResponse>(`/documents/${docId}`);
  },

  list(patientId: string) {
    return api.get<DocumentListItem[]>(`/patients/${patientId}/documents`);
  },

  approve(docId: string, data: DocumentApproveRequest) {
    return api.post<DocumentResponse>(`/documents/${docId}/approve`, data);
  },

  reject(docId: string, data: DocumentRejectRequest) {
    return api.post<DocumentResponse>(`/documents/${docId}/reject`, data);
  },
  
  update(docId: string, data: DocumentApproveRequest) {
    return api.patch<DocumentResponse>(`/documents/${docId}`, data);
  },

  delete(docId: string) {
    return api.delete(`/documents/${docId}`);
  },
};
