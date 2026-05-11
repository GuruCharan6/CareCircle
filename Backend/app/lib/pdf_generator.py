from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any

from reportlab.lib import colors  # type: ignore
from reportlab.lib.pagesizes import A4  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.units import cm  # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable  # type: ignore

_STYLES = getSampleStyleSheet()

_HEADER_STYLE = ParagraphStyle(
    "CareCircleHeader",
    parent=_STYLES["Heading1"],
    fontSize=16,
    textColor=colors.HexColor("#1a1a2e"),
    spaceAfter=4,
)
_SUBHEAD_STYLE = ParagraphStyle(
    "CareCircleSubhead",
    parent=_STYLES["Heading2"],
    fontSize=11,
    textColor=colors.HexColor("#16213e"),
    spaceBefore=12,
    spaceAfter=4,
)
_BODY_STYLE = ParagraphStyle(
    "CareCircleBody",
    parent=_STYLES["Normal"],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor("#333333"),
)
_WARN_STYLE = ParagraphStyle(
    "CareCircleWarn",
    parent=_STYLES["Normal"],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor("#c0392b"),
)
_FOOTER_STYLE = ParagraphStyle(
    "CareCircleFooter",
    parent=_STYLES["Normal"],
    fontSize=7,
    textColor=colors.grey,
    spaceBefore=8,
)

_TABLE_HEADER_BG = colors.HexColor("#16213e")
_TABLE_ALT_BG = colors.HexColor("#f0f4f8")
_TABLE_WARN_BG = colors.HexColor("#fff3cd")

_BASE_TABLE_CMDS = [
    ("BACKGROUND", (0, 0), (-1, 0), _TABLE_HEADER_BG),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
    ("TOPPADDING", (0, 0), (-1, 0), 7),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 8),
    ("TOPPADDING", (0, 1), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _TABLE_ALT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]

_TABLE_STYLE_BASE = TableStyle(_BASE_TABLE_CMDS)


def _hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=6)


def _now_str(dt: datetime | None) -> str:
    return (dt or datetime.now()).strftime("%d %b %Y, %I:%M %p")


def generate_medication_list_pdf(
    patient_name: str,
    medications: list[dict[str, Any]],
    interactions: list[dict[str, Any]] | None = None,
    generated_at: datetime | None = None,
) -> bytes:
    """Generate current active medication list as PDF bytes.

    medications items: {brand_name, generic_name, dose, frequency, timing,
                        prescriber_name, prescriber_specialty, prescribed_date}
    interactions items: {drug_a, drug_b, severity, mechanism}
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    story: list[Any] = []

    story.append(Paragraph("CareCircle", _HEADER_STYLE))
    story.append(Paragraph(f"{patient_name} — Active Medications", _SUBHEAD_STYLE))
    story.append(Paragraph(f"Generated: {_now_str(generated_at)}", _BODY_STYLE))
    story.append(Spacer(1, 0.3 * cm))
    story.append(_hr())

    if medications:
        header = ["Brand", "Generic", "Dose", "Frequency", "Timing", "Prescriber", "Date"]
        rows = [header]
        for m in medications:
            rows.append([
                m.get("brand_name") or "—",
                m.get("generic_name", "—"),
                m.get("dose", "—"),
                m.get("frequency", "—"),
                m.get("timing") or "—",
                _prescriber_label(m),
                _date_str(m.get("prescribed_date")),
            ])
        col_widths = [2.5 * cm, 3 * cm, 2 * cm, 3 * cm, 2.5 * cm, 3.5 * cm, 2 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(_TABLE_STYLE_BASE)
        story.append(table)
    else:
        story.append(Paragraph("No active medications on record.", _BODY_STYLE))

    if interactions:
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph("⚠ Flagged Interactions", _SUBHEAD_STYLE))
        for ix in interactions:
            severity = ix.get("severity", "unknown")
            drug_a = ix.get("drug_a", "")
            drug_b = ix.get("drug_b", "")
            mechanism = ix.get("mechanism", "")
            story.append(Paragraph(
                f"<b>{drug_a} + {drug_b}</b> — {severity.upper()} severity. {mechanism}",
                _WARN_STYLE,
            ))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(
            "Confirm all flagged interactions with prescribing doctors before next dose.",
            _WARN_STYLE,
        ))

    story.append(Spacer(1, 0.5 * cm))
    story.append(_hr())
    story.append(Paragraph(
        "Generated by CareCircle. For informational purposes only. "
        "Always verify with prescribing doctors.",
        _FOOTER_STYLE,
    ))

    doc.build(story)
    return buf.getvalue()


def generate_doctor_briefing_pdf(
    patient_name: str,
    appointment_title: str,
    appointment_date: str,
    specialist: str,
    medications_other_doctors: list[dict[str, Any]],
    lab_trends: list[dict[str, Any]],
    behavioral_notes: list[str],
    questions_to_raise: list[str],
    allergies: list[str] | None = None,
    known_conditions: list[str] | None = None,
    adherence: dict | None = None,
    generated_at: datetime | None = None,
) -> bytes:
    """Generate pre-appointment doctor briefing PDF bytes.

    medications_other_doctors: {brand_name, generic_name, dose, frequency, prescriber_specialty,
                                 interaction_flag, interaction_pairs}
    lab_trends: {test_name_display, direction, latest_value, unit, is_abnormal}
    behavioral_notes: plain text strings
    questions_to_raise: plain text strings
    adherence: {pct, of} or None
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    story: list[Any] = []

    story.append(Paragraph("CareCircle — Pre-Appointment Briefing", _HEADER_STYLE))
    story.append(Paragraph(
        f"Preparing for: {appointment_title} ({specialist})", _SUBHEAD_STYLE,
    ))
    story.append(Paragraph(f"Date: {appointment_date}", _BODY_STYLE))
    story.append(Paragraph(f"Patient: {patient_name}", _BODY_STYLE))
    story.append(Paragraph(f"Generated: {_now_str(generated_at)}", _BODY_STYLE))
    story.append(Spacer(1, 0.3 * cm))
    story.append(_hr())

    # Allergies + conditions banner (critical safety info at top)
    if allergies or known_conditions:
        story.append(Paragraph("Patient Background", _SUBHEAD_STYLE))
        if allergies:
            story.append(Paragraph(
                f"<b>⚠ Allergies:</b> {', '.join(allergies)}", _WARN_STYLE,
            ))
        if known_conditions:
            story.append(Paragraph(
                f"<b>Conditions:</b> {', '.join(known_conditions)}", _BODY_STYLE,
            ))
        if adherence:
            adh_style = _WARN_STYLE if adherence["pct"] < 70 else _BODY_STYLE
            story.append(Paragraph(
                f"<b>Adherence (last {adherence['of']} recorded doses):</b> {adherence['pct']}%",
                adh_style,
            ))
        story.append(Spacer(1, 0.3 * cm))

    # Medications from other doctors
    story.append(Paragraph("Medications from Other Doctors", _SUBHEAD_STYLE))
    if medications_other_doctors:
        header = ["Brand", "Generic", "Dose", "Frequency", "Prescribed By", "Interactions"]
        rows = [header]
        for m in medications_other_doctors:
            pairs = m.get("interaction_pairs") or []
            flag_text = "; ".join(pairs) if pairs else ""
            rows.append([
                m.get("brand_name") or "—",
                m.get("generic_name", "—"),
                m.get("dose", "—"),
                m.get("frequency", "—"),
                m.get("prescriber_specialty") or "—",
                flag_text,
            ])
        col_widths = [2.5 * cm, 2.5 * cm, 1.8 * cm, 2.5 * cm, 3 * cm, 4.2 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        style = TableStyle(_BASE_TABLE_CMDS[:])
        for i, m in enumerate(medications_other_doctors, start=1):
            if m.get("interaction_flag"):
                style.add("BACKGROUND", (5, i), (5, i), _TABLE_WARN_BG)
                style.add("TEXTCOLOR", (5, i), (5, i), colors.HexColor("#c0392b"))
        table.setStyle(style)
        story.append(table)
    else:
        story.append(Paragraph("No medications from other specialists on record.", _BODY_STYLE))

    # Lab trends — format: {test_name_display, direction, latest_value, unit, is_abnormal}
    story.append(Paragraph("Recent Lab Trends", _SUBHEAD_STYLE))
    if lab_trends:
        _DIR_ARROW = {"worsening": " ↑", "improving": " ↓", "stable": " →"}
        for trend in lab_trends:
            test = trend.get("test_name_display", "")
            direction = trend.get("direction", "stable")
            latest = trend.get("latest_value", "—")
            unit = trend.get("unit", "")
            is_abnormal = trend.get("is_abnormal", False)
            arrow = _DIR_ARROW.get(direction, "")
            abnormal_marker = " ⚠" if is_abnormal else ""
            use_style = _WARN_STYLE if (is_abnormal and direction == "worsening") else _BODY_STYLE
            story.append(Paragraph(
                f"<b>{test}{arrow}{abnormal_marker}:</b> {latest} {unit} ({direction})",
                use_style,
            ))
    else:
        story.append(Paragraph("No recent lab results on record.", _BODY_STYLE))

    # Behavioral notes
    story.append(Paragraph("Behavioral Observations", _SUBHEAD_STYLE))
    if behavioral_notes:
        for note in behavioral_notes:
            story.append(Paragraph(f"• {note}", _BODY_STYLE))
    else:
        story.append(Paragraph("No behavioral observations recorded.", _BODY_STYLE))

    # Questions to raise
    story.append(Paragraph("Questions to Raise with Doctor", _SUBHEAD_STYLE))
    if questions_to_raise:
        for q in questions_to_raise:
            story.append(Paragraph(f"• {q}", _BODY_STYLE))
    else:
        story.append(Paragraph("No specific questions identified.", _BODY_STYLE))

    story.append(Spacer(1, 0.5 * cm))
    story.append(_hr())
    story.append(Paragraph(
        "Generated by CareCircle. Shared with doctor's consent. "
        "System surfaces information — Meera relays at her discretion.",
        _FOOTER_STYLE,
    ))

    doc.build(story)
    return buf.getvalue()


def generate_patient_history_pdf(
    patient_name: str,
    timeline: list[dict[str, Any]],
    generated_at: datetime | None = None,
) -> bytes:
    """Generate chronological medical journey timeline PDF.
    Only includes events, no medication tables or lab results.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    story: list[Any] = []

    story.append(Paragraph("CareCircle — Medical Journey Timeline", _HEADER_STYLE))
    story.append(Paragraph(f"Patient: {patient_name}", _SUBHEAD_STYLE))
    story.append(Paragraph(f"Generated: {_now_str(generated_at)}", _BODY_STYLE))
    story.append(Spacer(1, 0.4 * cm))
    story.append(_hr())
    story.append(Spacer(1, 0.4 * cm))

    if timeline:
        for item in timeline:
            date_raw = item.get("date")
            if isinstance(date_raw, str):
                try:
                    dt = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
                    date_str = dt.strftime("%d %b %Y, %I:%M %p")
                except:
                    date_str = date_raw
            else:
                date_str = _date_str(date_raw)
                
            title = item.get("title", "Event")
            summary_text = item.get("summary") or ""
            
            # Use bold for date and title
            p_text = f"<b>{date_str}</b> | <b>{title}</b>"
            story.append(Paragraph(p_text, _BODY_STYLE))
            if summary_text:
                # Indent summary slightly
                story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;Summary: {summary_text}", _BODY_STYLE))
            story.append(Spacer(1, 0.3 * cm))
    else:
        story.append(Paragraph("No timeline events recorded.", _BODY_STYLE))

    story.append(Spacer(1, 0.5 * cm))
    story.append(_hr())
    story.append(Paragraph(
        "Generated by CareCircle. For informational purposes only. "
        "Always verify medical history with treating physicians.",
        _FOOTER_STYLE,
    ))

    doc.build(story)
    return buf.getvalue()


def generate_crisis_pdf(
    patient_name: str,
    blood_type: str | None,
    known_allergies: list[str],
    emergency_contacts: list[dict[str, Any]],
    medications: list[dict[str, Any]],
    active_alerts: list[str],
    known_conditions: list[str] | None = None,
    lab_results: list[dict[str, Any]] | None = None,
    last_cardiac_event: dict[str, Any] | None = None,
    nearest_emergency: dict[str, Any] | None = None,
    prescribers: list[dict[str, Any]] | None = None,
    freshness_note: str = "",
    generated_at: datetime | None = None,
) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    story: list[Any] = []

    story.append(Paragraph("CareCircle — Emergency Card", _HEADER_STYLE))
    story.append(Paragraph(patient_name, _SUBHEAD_STYLE))
    story.append(Paragraph(f"Generated: {_now_str(generated_at)}", _BODY_STYLE))
    if freshness_note:
        story.append(Paragraph(freshness_note, _WARN_STYLE))
    story.append(Spacer(1, 0.3 * cm))
    story.append(_hr())

    # Critical vitals box
    story.append(Paragraph("Critical Vitals", _SUBHEAD_STYLE))
    vitals_data = [
        ["Blood Type", blood_type or "Unknown"],
        ["Known Allergies", ", ".join(known_allergies) if known_allergies else "None recorded"],
    ]
    vitals_table = Table(vitals_data, colWidths=[4 * cm, 13 * cm])
    vitals_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fff0f0")),
        ("BACKGROUND", (1, 0), (1, -1), colors.white),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#c0392b")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f5c0c0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(vitals_table)
    story.append(Spacer(1, 0.4 * cm))

    # Known conditions
    if known_conditions:
        story.append(Paragraph("Known Conditions", _SUBHEAD_STYLE))
        for cond in known_conditions:
            story.append(Paragraph(f"• {cond}", _BODY_STYLE))
        story.append(Spacer(1, 0.4 * cm))

    # Emergency contacts
    story.append(Paragraph("Emergency Contacts", _SUBHEAD_STYLE))
    if emergency_contacts:
        header = ["Name", "Phone", "Relationship", "Hospital / Specialty"]
        rows = [header]
        for c in emergency_contacts:
            rows.append([
                c.get("name", "—"),
                c.get("phone") or "—",
                c.get("relationship") or "—",
                c.get("hospital") or c.get("specialty") or "—",
            ])
        col_widths = [4.5 * cm, 3.5 * cm, 3.5 * cm, 5.5 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(_TABLE_STYLE_BASE)
        story.append(table)
    else:
        story.append(Paragraph("No emergency contacts recorded.", _WARN_STYLE))
    story.append(Spacer(1, 0.4 * cm))

    # Medications (Full history)
    story.append(Paragraph("Medication History", _SUBHEAD_STYLE))
    if medications:
        header = ["Brand", "Generic", "Dose", "Frequency", "Timing", "Status"]
        rows = [header]
        for m in medications:
            rows.append([
                m.get("brand") or "—",
                m.get("generic", "—"),
                m.get("dose", "—"),
                m.get("frequency", "—"),
                m.get("timing") or "—",
                "ACTIVE" if m.get("is_active") else "PAST",
            ])
        col_widths = [3 * cm, 3.5 * cm, 2.5 * cm, 3.5 * cm, 3 * cm, 1.5 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        style = TableStyle(_BASE_TABLE_CMDS[:])
        for i, m in enumerate(medications, start=1):
            if not m.get("is_active"):
                style.add("TEXTCOLOR", (0, i), (-1, i), colors.grey)
        table.setStyle(style)
        story.append(table)
    else:
        story.append(Paragraph("No medications on record.", _BODY_STYLE))
    story.append(Spacer(1, 0.4 * cm))

    # Doctors / Specialists
    if prescribers:
        story.append(Paragraph("Doctors & Specialists", _SUBHEAD_STYLE))
        header = ["Name", "Specialty", "Hospital", "Phone"]
        rows = [header]
        for p in prescribers:
            rows.append([
                p.get("name", "—"),
                p.get("specialty") or "—",
                p.get("hospital") or "—",
                p.get("phone") or "—",
            ])
        col_widths = [5 * cm, 4 * cm, 4.5 * cm, 3.5 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(_TABLE_STYLE_BASE)
        story.append(table)
        story.append(Spacer(1, 0.4 * cm))

    # Recent lab results
    if lab_results:
        story.append(Paragraph("Recent Lab Results", _SUBHEAD_STYLE))
        header = ["Test", "Value", "Unit", "Reference Range", "Date", ""]
        rows = [header]
        for r in lab_results:
            abnormal = "↑" if r.get("is_abnormal") else ""
            rows.append([
                r.get("test_name", "—"),
                r.get("value", "—"),
                r.get("unit", "—"),
                r.get("reference_range") or "—",
                r.get("test_date", "—"),
                abnormal,
            ])
        col_widths = [4.5 * cm, 2 * cm, 1.5 * cm, 4 * cm, 3 * cm, 0.8 * cm]
        lab_table = Table(rows, colWidths=col_widths, repeatRows=1)
        style = TableStyle(_BASE_TABLE_CMDS[:])
        for i, r in enumerate(lab_results, start=1):
            if r.get("is_abnormal"):
                style.add("BACKGROUND", (0, i), (-1, i), _TABLE_WARN_BG)
        lab_table.setStyle(style)
        story.append(lab_table)
        story.append(Spacer(1, 0.4 * cm))

    # Active clinical alerts
    if active_alerts:
        story.append(Paragraph("⚠ Active Clinical Alerts", _SUBHEAD_STYLE))
        for alert in active_alerts:
            story.append(Paragraph(f"• {alert}", _WARN_STYLE))
        story.append(Spacer(1, 0.3 * cm))

    # Last cardiac event
    if last_cardiac_event:
        story.append(Paragraph("Last Cardiac Event", _SUBHEAD_STYLE))
        story.append(Paragraph(
            f"<b>{last_cardiac_event.get('date', '—')}:</b> {last_cardiac_event.get('summary', '—')}",
            _BODY_STYLE,
        ))
        story.append(Spacer(1, 0.3 * cm))

    # Nearest emergency facility
    if nearest_emergency:
        story.append(Paragraph("Nearest Emergency Facility", _SUBHEAD_STYLE))
        name = nearest_emergency.get("name", "—")
        phone = nearest_emergency.get("phone") or nearest_emergency.get("address") or "—"
        dist = nearest_emergency.get("distance_km")
        dist_str = f" ({dist} km away)" if dist else ""
        story.append(Paragraph(f"<b>{name}</b>{dist_str} — Emergency: {phone}", _BODY_STYLE))
        story.append(Spacer(1, 0.3 * cm))

    story.append(_hr())
    story.append(Paragraph(
        "Generated by CareCircle. Show this card to emergency responders. "
        "Verify all information with treating physicians.",
        _FOOTER_STYLE,
    ))

    doc.build(story)
    return buf.getvalue()


def _prescriber_label(m: dict[str, Any]) -> str:
    parts = []
    if m.get("prescriber_name"):
        parts.append(m["prescriber_name"])
    if m.get("prescriber_specialty"):
        parts.append(f"({m['prescriber_specialty']})")
    return " ".join(parts) or "—"


def _date_str(d: Any) -> str:
    if not d:
        return "—"
    if hasattr(d, "strftime"):
        return d.strftime("%b %Y")
    return str(d)
