// ============================================================
// PDF Export — Premium architectural closet spec document
//
// Pipeline: Build HTML template → html2canvas → jsPDF
// This ensures perfect RTL/Hebrew rendering, CSS styling,
// and pixel-precise A4 layout.
// ============================================================

import html2canvas from 'html2canvas'
import DOMPurify from 'dompurify'
import { jsPDF } from 'jspdf'
import type { ClosetConfig, CustomerDetails } from '../types/closet.types'
import { MATERIALS, FRONT_FINISH_LABELS, ELEMENT_KIND_LABELS } from '../types/closet.types'

interface PdfParams {
  customer: CustomerDetails
  closet: ClosetConfig
  canvasDataUrl: string
}

/** Format date as DD/MM/YYYY HH:mm */
function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Get Hebrew label for a material value */
function materialLabel(value: string): string {
  return MATERIALS.find(m => m.value === value)?.label ?? value
}

/** Sanitize text for safe HTML insertion */
function esc(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

/** Build the section breakdown HTML rows */
function buildSectionRows(closet: ClosetConfig): string {
  return closet.sections.map((sec, i) => {
    const elements = sec.elements
      .filter(el => !(el.kind === 'shelf' && (el as any).isStructural))
      .map(el => ELEMENT_KIND_LABELS[el.kind])
    const summary = elements.length > 0 ? elements.join(', ') : 'ריק'
    return `
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid #e8e8e8;">
        <span style="color:#888;font-size:11px;white-space:nowrap;">${Math.round(sec.width)} ס״מ</span>
        <span style="flex:1;margin:0 12px;color:#333;font-size:12px;">${esc(summary)}</span>
        <span style="color:#c8a97e;font-weight:600;font-size:12px;white-space:nowrap;">סקציה ${i + 1}</span>
      </div>
    `
  }).join('')
}

/** Build the full HTML template for the PDF page */
function buildPdfHtml(params: PdfParams): string {
  const { customer, closet, canvasDataUrl } = params
  const typeLabel = closet.closetType === 'hinge' ? 'צירים' : 'הזזה'
  const doorsLabel = `${closet.doors.count} דלתות`
  const sectionsLabel = `${closet.sections.length} סקציות`
  const dims = closet.dimensions
  const now = formatDate(new Date())

  // Count user elements (non-structural)
  const totalUserElements = closet.sections.reduce((sum, s) =>
    sum + s.elements.filter(el => !(el.kind === 'shelf' && (el as any).isStructural)).length, 0)

  return `
    <div id="pdf-root" dir="rtl" style="
      width: 794px;
      height: 1123px;
      font-family: 'Segoe UI', 'Assistant', 'Heebo', Tahoma, Arial, sans-serif;
      background: #ffffff;
      color: #222;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    ">
      <!-- ═══ HEADER ═══ -->
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        padding: 24px 32px 20px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      ">
        <div style="text-align:right;flex:1;">
          <div style="font-size:22px;font-weight:700;color:#c8a97e;letter-spacing:0.5px;margin-bottom:4px;">
            מפרט עיצוב ארון
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
            ${esc(now)}
          </div>
        </div>
        <div style="text-align:left;padding-top:2px;">
          <div style="font-size:13px;color:#e2e8f0;font-weight:600;">${esc(customer.name)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;direction:ltr;text-align:left;">${esc(customer.phone)}</div>
        </div>
      </div>

      <!-- Gold accent line -->
      <div style="height:3px;background:linear-gradient(90deg,#c8a97e,#e8d5b0,#c8a97e);"></div>

      <!-- ═══ HERO IMAGE ═══ -->
      <div style="padding:20px 28px 16px;">
        <div style="
          border-radius:8px;
          overflow:hidden;
          border:1px solid #e0e0e0;
          box-shadow:0 4px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);
          background:#0a1220;
        ">
          <img src="${canvasDataUrl}" style="
            width:100%;
            height:auto;
            max-height:420px;
            object-fit:contain;
            display:block;
          " />
        </div>
      </div>

      <!-- ═══ SPECS GRID ═══ -->
      <div style="padding:0 28px 16px;">
        <!-- Section title -->
        <div style="
          font-size:14px;
          font-weight:700;
          color:#c8a97e;
          margin-bottom:12px;
          padding-bottom:6px;
          border-bottom:2px solid #c8a97e;
          display:inline-block;
        ">מפרט טכני</div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          <!-- Dimensions card -->
          <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;border:1px solid #eee;">
            <div style="font-size:10px;color:#999;margin-bottom:4px;font-weight:600;letter-spacing:0.3px;">מידות כלליות</div>
            <div style="font-size:15px;color:#222;font-weight:600;">
              <span style="direction:ltr;unicode-bidi:embed;">${dims.width} × ${dims.height} × ${dims.depth}</span> ס״מ
            </div>
          </div>

          <!-- Type card -->
          <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;border:1px solid #eee;">
            <div style="font-size:10px;color:#999;margin-bottom:4px;font-weight:600;letter-spacing:0.3px;">סוג ארון</div>
            <div style="font-size:15px;color:#222;font-weight:600;">${esc(typeLabel)}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${esc(doorsLabel)} · ${esc(sectionsLabel)}</div>
          </div>

          <!-- Materials card -->
          <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;border:1px solid #eee;">
            <div style="font-size:10px;color:#999;margin-bottom:4px;font-weight:600;letter-spacing:0.3px;">חומרים</div>
            <div style="font-size:13px;color:#222;font-weight:600;">
              גוף: ${esc(materialLabel(closet.bodyMaterial.material))}
            </div>
            <div style="font-size:11px;color:#666;margin-top:2px;">
              חזית: ${esc(materialLabel(closet.frontMaterial.material))} · ${esc(FRONT_FINISH_LABELS[closet.frontFinish])}
            </div>
          </div>
        </div>

        <!-- ═══ SECTION BREAKDOWN ═══ -->
        <div style="
          font-size:14px;
          font-weight:700;
          color:#c8a97e;
          margin-bottom:8px;
          padding-bottom:6px;
          border-bottom:2px solid #c8a97e;
          display:inline-block;
        ">פירוט סקציות</div>

        <div style="background:#fafafa;border-radius:8px;padding:10px 16px;border:1px solid #eee;">
          ${buildSectionRows(closet)}
        </div>

        <!-- Element count summary -->
        <div style="text-align:center;margin-top:10px;font-size:11px;color:#999;">
          סה״כ ${totalUserElements} רכיבים ב-${closet.sections.length} סקציות
        </div>
      </div>

      <!-- ═══ FOOTER ═══ -->
      <div style="
        position:absolute;
        bottom:0;
        left:0;
        right:0;
        padding:10px 28px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        border-top:1px solid #e0e0e0;
        background:#fafafa;
      ">
        <div style="font-size:9px;color:#bbb;direction:ltr;">Closet Designer · Professional Edition</div>
        <div style="font-size:9px;color:#bbb;">${esc(now)} · מעצב הארון</div>
      </div>
    </div>
  `
}

export async function generatePdf(params: PdfParams): Promise<void> {
  // 1. Create an offscreen container with the HTML template
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.innerHTML = buildPdfHtml(params)
  document.body.appendChild(container)

  const root = container.querySelector('#pdf-root') as HTMLElement

  try {
    // 2. Render HTML to canvas via html2canvas
    const canvas = await html2canvas(root, {
      scale: 2,                  // High-res for crisp output
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,                // A4 at 96dpi
      height: 1123,
      logging: false,
    })

    // 3. Convert canvas to PDF via jsPDF
    const imgData = canvas.toDataURL('image/png')
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageW = doc.internal.pageSize.getWidth()   // 210mm
    const pageH = doc.internal.pageSize.getHeight()  // 297mm

    doc.addImage(imgData, 'PNG', 0, 0, pageW, pageH)

    // 4. Download
    const fileName = `closet-${params.customer.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`
    doc.save(fileName)
  } finally {
    // Clean up offscreen element
    document.body.removeChild(container)
  }
}
