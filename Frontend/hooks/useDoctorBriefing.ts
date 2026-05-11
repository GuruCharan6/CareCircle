"use client";

import { useState, useCallback } from "react";
import { doctorBriefingApi, type DoctorBriefingResponse } from "@/lib/api/doctor-briefing";

export function useDoctorBriefing() {
  const [briefing, setBriefing] = useState<DoctorBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async (patientId: string, eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorBriefingApi.get(patientId, eventId);
      setBriefing(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load briefing");
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPdf = useCallback(async (url: string, filename: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Storage error: ${res.status} ${res.statusText}`);
    const blob = new Blob([await res.arrayBuffer()], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }, []);

  const openBriefingPdf = useCallback(async (patientId: string, eventId: string) => {
    setPdfLoading(true);
    try {
      const { signed_url } = await doctorBriefingApi.getPdf(patientId, eventId);
      await downloadPdf(signed_url, `briefing-${eventId}.pdf`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [downloadPdf]);

  const openMedListPdf = useCallback(async (patientId: string) => {
    setPdfLoading(true);
    try {
      const { signed_url } = await doctorBriefingApi.getMedListPdf(patientId);
      await downloadPdf(signed_url, `medication-list-${patientId}.pdf`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get med list PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [downloadPdf]);

  return { briefing, loading, pdfLoading, error, fetchBriefing, openBriefingPdf, openMedListPdf };
}
