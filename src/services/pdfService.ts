// ============================================================
// PDF Export — 2-page Portrait A4 premium closet spec document
//
// Pipeline: Build HTML template → html2canvas → jsPDF
// Page 1: Header → Specs grid → Full-width External View
// Page 2: Mini header → Full-width Internal View → Breakdown → Footer
// ============================================================

import html2canvas from 'html2canvas'
import DOMPurify from 'dompurify'
import { jsPDF } from 'jspdf'
import type { ClosetConfig, CustomerDetails } from '../types/closet.types'
import { MATERIALS, FRONT_FINISH_LABELS, ELEMENT_KIND_LABELS } from '../types/closet.types'

interface PdfParams {
  customer: CustomerDetails
  closet: ClosetConfig
  internalDataUrl: string
  externalDataUrl: string
}

// A4 portrait at 96 dpi
const PAGE_W = 794
const PAGE_H = 1123

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function materialLabel(value: string): string {
  return MATERIALS.find(m => m.value === value)?.label ?? value
}

function esc(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

function buildSectionRows(closet: ClosetConfig): string {
  return closet.sections.map((sec, i) => {
    const elements = sec.elements
      .filter(el => !(el.kind === 'shelf' && (el as any).isStructural))
      .map(el => ELEMENT_KIND_LABELS[el.kind])
    const summary = elements.length > 0 ? elements.join(', ') : 'ריק'
    return `
      <div style="display:inline-flex;align-items:baseline;gap:4px;margin-left:16px;white-space:nowrap;">
        <span style="color:#c8a97e;font-weight:600;">תא ${i + 1}</span>
        <span style="color:#666;">(${Math.round(sec.width)}ס״מ):</span>
        <span style="color:#333;">${esc(summary)}</span>
      </div>
    `
  }).join('')
}

// ── Shared header bar ──
function headerHtml(customer: CustomerDetails, now: string, subtitle?: string): string {
  return `
    <div style="
      background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
      padding:12px 28px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    ">
      <div style="display:flex;align-items:baseline;gap:16px;">
        <div style="font-size:20px;font-weight:700;color:#c8a97e;">מפרט עיצוב ארון</div>
        ${subtitle ? `<div style="font-size:11px;color:#94a3b8;">${esc(subtitle)}</div>` : ''}
        <div style="font-size:11px;color:#64748b;">${esc(now)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${esc(customer.name)}</span>
        <span style="font-size:11px;color:#94a3b8;direction:ltr;">${esc(customer.phone)}</span>
      </div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#c8a97e,#e8d5b0,#c8a97e);"></div>
  `
}

// ── Page wrapper ──
function pageWrapper(content: string): string {
  return `
    <div style="
      width:${PAGE_W}px;
      height:${PAGE_H}px;
      font-family:'Segoe UI','Assistant','Heebo',Tahoma,Arial,sans-serif;
      background:#ffffff;
      color:#222;
      box-sizing:border-box;
      overflow:hidden;
      position:relative;
    ">
      ${content}
    </div>
  `
}

// ── Page 1: Header → Specs → External View ──
function buildPage1Html(params: PdfParams): string {
  const { customer, closet, externalDataUrl } = params
  const typeLabel = closet.closetType === 'hinge' ? 'צירים' : 'הזזה'
  const dims = closet.dimensions
  const now = formatDate(new Date())

  // Image gets all remaining space after header (~60px) + specs (~90px) + labels (~30px) + padding
  const imgH = PAGE_H - 210

  return pageWrapper(`
    ${headerHtml(customer, now)}

    <!-- ═══ SPECS GRID ═══ -->
    <div style="padding:14px 28px 8px;display:flex;gap:12px;">
      <div style="background:#f8f8f8;border-radius:6px;padding:10px 14px;border:1px solid #eee;flex:1;">
        <div style="font-size:9px;color:#999;font-weight:600;">מידות</div>
        <div style="font-size:15px;color:#222;font-weight:700;margin-top:3px;">
          <span style="direction:ltr;unicode-bidi:embed;">${dims.width}×${dims.height}×${dims.depth}</span>
          <span style="font-size:10px;color:#888;font-weight:400;"> ס״מ</span>
        </div>
      </div>
      <div style="background:#f8f8f8;border-radius:6px;padding:10px 14px;border:1px solid #eee;flex:1;">
        <div style="font-size:9px;color:#999;font-weight:600;">סוג</div>
        <div style="font-size:15px;color:#222;font-weight:700;margin-top:3px;">${esc(typeLabel)}</div>
        <div style="font-size:10px;color:#666;">${closet.doors.count} דלתות · ${closet.sections.length} תאים</div>
      </div>
      <div style="background:#f8f8f8;border-radius:6px;padding:10px 14px;border:1px solid #eee;flex:1;">
        <div style="font-size:9px;color:#999;font-weight:600;">חומרים</div>
        <div style="font-size:12px;color:#222;font-weight:600;margin-top:3px;">גוף: ${esc(materialLabel(closet.bodyMaterial.material))}</div>
        <div style="font-size:10px;color:#666;">חזית: ${esc(materialLabel(closet.frontMaterial.material))} · ${esc(FRONT_FINISH_LABELS[closet.frontFinish])}</div>
      </div>
      <div style="background:#f8f8f8;border-radius:6px;padding:10px 14px;border:1px solid #eee;flex:1;">
        <div style="font-size:9px;color:#999;font-weight:600;">נפח</div>
        <div style="font-size:15px;color:#222;font-weight:700;margin-top:3px;">
          ${Math.round(dims.width * dims.height * dims.depth / 1000).toLocaleString('he-IL')} ליטר
        </div>
      </div>
    </div>

    <!-- ═══ EXTERNAL VIEW ═══ -->
    <div dir="rtl" style="padding:6px 28px 0;">
      <div style="font-size:10px;color:#999;font-weight:600;margin-bottom:6px;letter-spacing:0.3px;">תצוגה חיצונית</div>
      <div style="
        width:100%;
        height:${imgH}px;
        border-radius:8px;
        overflow:hidden;
        border:1px solid #ddd;
        box-shadow:0 2px 16px rgba(0,0,0,0.06);
        background:#0a1220;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <img src="${externalDataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" />
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div style="
      position:absolute;
      bottom:0;left:0;right:0;
      padding:6px 28px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      border-top:1px solid #e8e8e8;
      background:#fafafa;
    ">
      <div style="font-size:8px;color:#ccc;">עמוד 1 מתוך 2</div>
      <div style="font-size:8px;color:#ccc;direction:ltr;">Closet Designer · Professional Edition</div>
    </div>
  `)
}

// ── Page 2: Mini header → Internal View → Breakdown → Footer ──
function buildPage2Html(params: PdfParams): string {
  const { customer, closet, internalDataUrl } = params
  const now = formatDate(new Date())
  const totalUserElements = closet.sections.reduce((sum, s) =>
    sum + s.elements.filter(el => !(el.kind === 'shelf' && (el as any).isStructural)).length, 0)

  // Image gets all remaining space after header (~60px) + breakdown (~50px) + footer (~30px) + padding
  const imgH = PAGE_H - 180

  return pageWrapper(`
    ${headerHtml(customer, now, 'תצוגה פנימית')}

    <!-- ═══ INTERNAL VIEW ═══ -->
    <div dir="rtl" style="padding:12px 28px 0;">
      <div style="font-size:10px;color:#999;font-weight:600;margin-bottom:6px;letter-spacing:0.3px;">תצוגה פנימית</div>
      <div style="
        width:100%;
        height:${imgH}px;
        border-radius:8px;
        overflow:hidden;
        border:1px solid #ddd;
        box-shadow:0 2px 16px rgba(0,0,0,0.06);
        background:#0a1220;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <img src="${internalDataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" />
      </div>
    </div>

    <!-- ═══ SECTION BREAKDOWN ═══ -->
    <div dir="rtl" style="padding:10px 28px 0;">
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
        <span style="font-size:12px;font-weight:700;color:#c8a97e;">פירוט תאים:</span>
        ${buildSectionRows(closet)}
        <span style="font-size:10px;color:#aaa;margin-right:8px;">
          (סה״כ ${totalUserElements} רכיבים)
        </span>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div style="
      position:absolute;
      bottom:0;left:0;right:0;
      padding:6px 28px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      border-top:1px solid #e8e8e8;
      background:#fafafa;
    ">
      <div style="font-size:8px;color:#ccc;">עמוד 2 מתוך 2</div>
      <div style="font-size:8px;color:#ccc;">${esc(now)} · מעצב הארון</div>
    </div>
  `)
}

async function renderPage(html: string): Promise<string> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.innerHTML = html
  document.body.appendChild(container)

  const root = container.firstElementChild as HTMLElement

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: PAGE_W,
      height: PAGE_H,
      logging: false,
    })
    return canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(container)
  }
}

export async function generatePdf(params: PdfParams): Promise<void> {
  // Render both pages in parallel
  const [page1Img, page2Img] = await Promise.all([
    renderPage(buildPage1Html(params)),
    renderPage(buildPage2Html(params)),
  ])

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Page 1: external view + specs
  doc.addImage(page1Img, 'PNG', 0, 0, pageW, pageH)

  // Page 2: internal view + breakdown
  doc.addPage()
  doc.addImage(page2Img, 'PNG', 0, 0, pageW, pageH)

  const fileName = `closet-${params.customer.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`
  doc.save(fileName)
}
