import { Phone, MapPin } from "lucide-react";
import type { CrisisEmergencyContact, CrisisNearestEmergency } from "@/lib/types";

interface Props {
  contacts: CrisisEmergencyContact[];
  nearestEmergency: CrisisNearestEmergency | null;
}

export function EmergencyContactList({ contacts, nearestEmergency }: Props) {
  return (
    <div className="space-y-4">
      {contacts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Emergency Contacts
          </h4>
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <ContactRow 
                key={i} 
                name={c.name} 
                phone={c.phone} 
                label={c.relationship || c.specialty || "Primary Contact"} 
                subtext={c.hospital}
              />
            ))}
          </div>
        </div>
      )}

      {nearestEmergency && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Nearest Emergency Room
          </h4>
          <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-[var(--color-border)]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">{nearestEmergency.name}</p>
              <p className="text-xs text-[var(--color-muted)] truncate flex items-center gap-1">
                <MapPin size={10} /> {nearestEmergency.address}
              </p>
            </div>
            {nearestEmergency.distance_km !== null && (
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded">
                {nearestEmergency.distance_km}km
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({ name, phone, label, subtext }: { name: string; phone: string; label: string; subtext?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-[var(--color-border)]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{name}</p>
        <p className="text-xs text-[var(--color-muted)] capitalize">
          {label}{subtext ? ` · ${subtext}` : ""}
        </p>
      </div>
      <a
        href={`tel:${phone}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-ok)] text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
        aria-label={`Call ${name}`}
      >
        <Phone size={12} />
        {phone}
      </a>
    </div>
  );
}
