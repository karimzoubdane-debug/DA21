from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

OUT = "/home/user/DA21/recapitulatif_montants.pdf"

BLUE = colors.HexColor("#1F3B73")
LIGHT = colors.HexColor("#EAF0FB")
GREEN = colors.HexColor("#1E7A46")
GREY = colors.HexColor("#555555")

styles = getSampleStyleSheet()
title = ParagraphStyle("t", parent=styles["Title"], textColor=BLUE, fontSize=22)
sub = ParagraphStyle("s", parent=styles["Normal"], textColor=GREY, fontSize=10,
                     alignment=1, spaceAfter=6)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=BLUE, fontSize=13,
                    spaceBefore=14, spaceAfter=6)
note = ParagraphStyle("n", parent=styles["Normal"], textColor=GREY, fontSize=9,
                      spaceBefore=4)

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        topMargin=22*mm, bottomMargin=18*mm,
                        leftMargin=20*mm, rightMargin=20*mm)
story = []

story.append(Paragraph("Récapitulatif des montants", title))
story.append(Paragraph("Réorganisation et calcul — 18 juillet 2026", sub))
story.append(Spacer(1, 8))


def make_table(data, money_col=1, total_row=True):
    t = Table(data, colWidths=[110*mm, 45*mm])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2 if total_row else -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C5D2EC")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]
    if total_row:
        style += [
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#D6E2F7")),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, -1), (-1, -1), BLUE),
        ]
    t.setStyle(TableStyle(style))
    return t


# Euros
story.append(Paragraph("Montants en euros (€)", h2))
euros = [
    ["Poste", "Montant"],
    ["Rahma", "380 €"],
    ["Chemises", "55 €"],
    ["Médoc", "24 €"],
    ["Chemise déchirée", "30 €"],
    ["Abdel — piano (120 + 50)", "170 €"],
    ["TOTAL EUROS", "659 €"],
]
story.append(make_table(euros))

# Dirhams
story.append(Paragraph("Montants en dirhams (dhs)", h2))
dhs = [
    ["Poste", "Montant"],
    ["Puit", "100 000 dhs"],
    ["Anciens solde Nada", "40 000 dhs"],
    ["Terre (2026)", "40 000 dhs"],
    ["Rahma (juin 2026)", "5 000 dhs"],
    ["Rahma", "2 000 dhs"],
    ["TOTAL DIRHAMS", "187 000 dhs"],
]
story.append(make_table(dhs))

# Par personne
story.append(Paragraph("Regroupement par personne / poste", h2))
perso = [
    ["Personne / poste", "Euros", "Dirhams"],
    ["Rahma", "380 €", "7 000 dhs"],
    ["Nada", "—", "40 000 dhs"],
    ["Abdel (piano)", "170 €", "—"],
    ["Chemises / Médoc / Chemise déchirée", "109 €", "—"],
    ["Puit", "—", "100 000 dhs"],
    ["Terre", "—", "40 000 dhs"],
]
tp = Table(perso, colWidths=[85*mm, 35*mm, 35*mm])
tp.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), BLUE),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C5D2EC")),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(tp)

# Totaux généraux
story.append(Paragraph("Totaux généraux", h2))
tot = [
    ["Devise", "Total"],
    ["Euros", "659 €"],
    ["Dirhams", "187 000 dhs"],
]
tt = Table(tot, colWidths=[110*mm, 45*mm])
tt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 11),
    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#E6F4EC"), colors.white]),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B7D8C4")),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(tt)

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Conversion indicative (≈ 1 € = 10,8 dhs) : 659 € ≈ 7 120 dhs. "
    "Total consolidé ≈ 194 120 dhs, soit environ 18 000 €.", note))

doc.build(story)
print("PDF créé :", OUT)
