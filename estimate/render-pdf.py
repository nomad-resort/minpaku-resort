#!/usr/bin/env python3

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Flowable,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


FONT = "HeiseiKakuGo-W5"
FONT_BOLD = "HeiseiKakuGo-W5"
LOGO_GOLD = colors.HexColor("#9B7A3D")


def register_fonts():
    pdfmetrics.registerFont(UnicodeCIDFont(FONT))


def esc(value):
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleJa",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=20,
            leading=26,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "HeadingJa",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=11,
            leading=15,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "BodyJa",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=9,
            leading=13,
            alignment=TA_LEFT,
        ),
        "small": ParagraphStyle(
            "SmallJa",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=8,
            leading=11,
            alignment=TA_LEFT,
        ),
        "right": ParagraphStyle(
            "RightJa",
            parent=base["BodyText"],
            fontName=FONT,
            fontSize=9,
            leading=13,
            alignment=TA_RIGHT,
        ),
    }


def para(style, value):
    return Paragraph(esc(value), style)


def bullet_list(style, items):
    return ListFlowable(
        [ListItem(para(style, item), leftIndent=4) for item in items],
        bulletType="bullet",
        leftIndent=12,
        bulletFontName=FONT,
        bulletFontSize=8,
    )


def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawRightString(200 * mm, 10 * mm, f"{doc.page}")
    canvas.restoreState()


class MinpakuResortLogo(Flowable):
    def __init__(self, width=66 * mm, height=20 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(LOGO_GOLD)
        c.setStrokeColor(colors.HexColor("#E6DED0"))
        c.setLineWidth(0.6)

        mr_font_size = self.height * 0.72
        c.setFont("Times-Roman", mr_font_size)
        c.drawString(0, self.height * 0.18, "MR")

        divider_x = self.width * 0.34
        c.line(divider_x, self.height * 0.08, divider_x, self.height * 0.92)

        c.setFont("Helvetica", self.height * 0.22)
        text_x = self.width * 0.43
        c.drawString(text_x, self.height * 0.54, "M I N P A K U")
        c.drawString(text_x, self.height * 0.16, "R E S O R T")
        c.restoreState()


def price_table(model, style):
    rows = [[para(style["body"], "項目"), para(style["body"], "金額・算定方法")]]
    rows.extend([[para(style["body"], left), para(style["body"], right)] for left, right in model["priceRows"]])

    table = Table(rows, colWidths=[103 * mm, 67 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def item_columns(items, columns=3):
    lines = []
    for index in range(0, len(items), columns):
        chunk = items[index:index + columns]
        lines.append("　　".join([f"・{item}" for item in chunk]))
    return "<br/>".join(lines)


def service_table(service, style):
    content_parts = [service.get("lead", "")]
    content_parts.append(item_columns(service.get("items", []), 3))
    for note in service.get("notes", []):
        content_parts.append(f"※ {note}")

    rows = [
        [para(style["body"], service["headers"][0]), para(style["body"], service["headers"][1])],
        [para(style["body"], service["category"]), Paragraph("<br/>".join([esc(part) if "<br/>" not in part else part for part in content_parts]), style["small"])],
    ]
    table = Table(rows, colWidths=[38 * mm, 132 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#999999")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def build_story(model):
    style = styles()
    story = []

    story.append(para(style["right"], model["issueDate"]))
    story.append(Spacer(1, 7 * mm))
    story.append(para(style["body"], model["customerName"]))
    story.append(Spacer(1, 7 * mm))
    story.append(para(style["title"], model["title"]))
    story.append(Spacer(1, 5 * mm))
    story.append(para(style["body"], f"施設所在地：{model['facilityAddress']}"))
    story.append(para(style["body"], f"施設概要：{model['facilitySummary']}"))
    story.append(Spacer(1, 5 * mm))
    story.append(para(style["h2"], f"【{model['packageTitle']}】"))
    story.append(price_table(model, style))
    story.append(Spacer(1, 4 * mm))
    for note in model["notes"]:
        story.append(para(style["small"], f"※ {note}"))

    story.append(PageBreak())
    story.append(para(style["h2"], "【サービス内容】"))
    if model.get("serviceTables"):
        for service in model["serviceTables"]:
            story.append(service_table(service, style))
            story.append(Spacer(1, 2 * mm))
    else:
        for section in model["serviceSections"]:
            story.append(para(style["h2"], section["title"]))
            story.append(bullet_list(style["body"], section["items"]))
            story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())
    story.append(para(style["h2"], "【その他】"))
    for term in model["otherTerms"]:
        story.append(para(style["body"], term))
        story.append(Spacer(1, 2 * mm))

    story.append(Spacer(1, 5 * mm))
    story.append(para(style["h2"], "【支払条件】"))
    payment_terms = model.get("paymentTerms") or [
        "フルサービスの場合は不動産管理と同様に、弊社アカウントにて集金し、必要経費を控除した上で、オーナー様に剰余金をお振込みいたします。",
        "OTAの入金期間に依存しますが、月末閉め後約1ヶ月で精算致します。",
    ]
    for term in payment_terms:
        story.append(para(style["body"], term))

    contact = model["contact"]
    story.append(Spacer(1, 8 * mm))
    story.append(para(style["body"], "ご不明点等ございましたらお気軽にご連絡ください。"))
    story.append(Spacer(1, 4 * mm))
    signature = [
        para(style["body"], f"{contact['name']}"),
        para(style["body"], f"{contact['company']}"),
        para(style["body"], f"電話番号: {contact['phone']}"),
        para(style["body"], f"メールアドレス: {contact['email']}"),
    ]
    signature_table = Table(
        [[signature, MinpakuResortLogo()]],
        colWidths=[92 * mm, 78 * mm],
    )
    signature_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    story.append(signature_table)
    return story


def render(model_path, output_path):
    register_fonts()
    model = json.loads(Path(model_path).read_text(encoding="utf-8"))
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=model.get("title", "概算お見積書"),
        author="Minpaku Resort",
    )
    doc.build(build_story(model), onFirstPage=draw_footer, onLaterPages=draw_footer)


def main(argv):
    if len(argv) != 3:
        print("Usage: python3 estimate/render-pdf.py model.json output.pdf", file=sys.stderr)
        return 1
    render(argv[1], argv[2])
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
