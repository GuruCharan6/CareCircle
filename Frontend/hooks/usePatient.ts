import { usePatientContext } from "@/components/PatientProvider";

export function usePatient() {
  const context = usePatientContext();

  return {
    patients: context.patients,
    activePatient: context.activePatient,
    loading: context.loading,
    error: context.error,
    fetchPatients: context.fetchPatients,
    createPatient: context.createPatient,
    updatePatient: context.updatePatient,
    deletePatient: context.deletePatient,
    setActivePatient: context.setActivePatient,
  };
}
