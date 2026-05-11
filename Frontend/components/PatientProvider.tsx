"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { patientsApi } from "@/lib/api/patients";
import { authStorage } from "@/lib/auth-storage";
import type { PatientResponse, PatientCreate, PatientUpdate } from "@/lib/types";

const ACTIVE_PATIENT_KEY = "cc_active_patient_id";

interface PatientContextType {
  patients: PatientResponse[];
  activePatient: PatientResponse | null;
  loading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  setActivePatient: (patient: PatientResponse) => void;
  createPatient: (data: PatientCreate) => Promise<PatientResponse>;
  updatePatient: (id: string, data: PatientUpdate) => Promise<PatientResponse>;
  deletePatient: (id: string) => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientResponse[]>([]);
  const [activePatient, setActivePatientState] = useState<PatientResponse | null>(null);
  const [loading, setLoading] = useState(true); // Start as true to avoid "no patient" flash
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientsApi.list();
      setPatients(data);
      
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_PATIENT_KEY) : null;
      const active = data.find(p => p.id === savedId) ?? data[0] ?? null;
      setActivePatientState(active);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, []);

  const setActivePatient = useCallback((patient: PatientResponse) => {
    localStorage.setItem(ACTIVE_PATIENT_KEY, patient.id);
    setActivePatientState(patient);
  }, []);

  const createPatient = useCallback(async (data: PatientCreate) => {
    const patient = await patientsApi.create(data);
    setPatients(prev => [...prev, patient]);
    if (!activePatient) setActivePatient(patient);
    return patient;
  }, [activePatient, setActivePatient]);

  const updatePatient = useCallback(async (id: string, data: PatientUpdate) => {
    const updated = await patientsApi.update(id, data);
    setPatients(prev => prev.map(p => p.id === id ? updated : p));
    if (activePatient?.id === id) setActivePatientState(updated);
    return updated;
  }, [activePatient?.id]);

  const deletePatient = useCallback(async (id: string) => {
    await patientsApi.delete(id);
    setPatients(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePatient?.id === id) {
        const replacement = next[0] ?? null;
        if (replacement) localStorage.setItem(ACTIVE_PATIENT_KEY, replacement.id);
        else localStorage.removeItem(ACTIVE_PATIENT_KEY);
        setActivePatientState(replacement);
      }
      return next;
    });
  }, [activePatient?.id]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (token) {
      fetchPatients();
    } else {
      setLoading(false);
    }
  }, [fetchPatients]);

  const value = useMemo(() => ({
    patients,
    activePatient,
    loading,
    error,
    fetchPatients,
    setActivePatient,
    createPatient,
    updatePatient,
    deletePatient,
  }), [patients, activePatient, loading, error, fetchPatients, setActivePatient, createPatient, updatePatient, deletePatient]);

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error("usePatientContext must be used within a PatientProvider");
  }
  return context;
}
