/**
 * Certificate Generator — creates a styled certificate image using HTML Canvas.
 * Returns a data URL (PNG) that can be displayed inline or downloaded.
 */

const RANDOM_COMPANIES = [
  'Nexora Technologies',
  'Vanguard Digital Solutions',
  'Horizon Labs International',
  'Apex Innovation Corp',
  'Stellar Bridge Enterprises',
  'Quantum Forge Inc.',
  'Pinnacle Systems Group',
  'Cobalt Dynamics',
  'Meridian Software Co.',
  'Ironclad Ventures',
  'Luminary Tech Partners',
  'Prism Analytics Ltd.',
  'Atlas Cloud Services',
  'Ember Innovations',
  'Crestline Digital Agency',
];

function pickCompanyName(hash: string): string {
  // Deterministic pick based on hash so same credential always gets same company
  let sum = 0;
  for (let i = 0; i < hash.length; i++) sum += hash.charCodeAt(i);
  return RANDOM_COMPANIES[sum % RANDOM_COMPANIES.length];
}

export interface CertificateData {
  studentName: string;
  certificateTitle: string;
  completionNotes: string;
  date: string;
  employerWallet: string;
  hash: string;
}

export function generateCertificateImage(data: CertificateData): string {
  const W = 1200;
  const H = 850;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e293b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Decorative corner glows ──
  const drawGlow = (x: number, y: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 220);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, y - 220, 440, 440);
  };
  drawGlow(80, 80, 'rgba(16, 185, 129, 0.12)');
  drawGlow(W - 80, H - 80, 'rgba(20, 184, 166, 0.10)');
  drawGlow(W - 80, 80, 'rgba(59, 130, 246, 0.06)');

  // ── Outer border ──
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 30, 30, W - 60, H - 60, 24);
  ctx.stroke();

  // ── Inner border ──
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, 44, 44, W - 88, H - 88, 18);
  ctx.stroke();

  // ── Decorative line under header area ──
  const lineY = 200;
  const lineGrad = ctx.createLinearGradient(120, lineY, W - 120, lineY);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, 'rgba(16, 185, 129, 0.4)');
  lineGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.4)');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, lineY);
  ctx.lineTo(W - 120, lineY);
  ctx.stroke();

  // ── Company name (random, deterministic from hash) ──
  const companyName = pickCompanyName(data.hash);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
  ctx.font = '600 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(companyName.toUpperCase(), W / 2, 85);

  // ── Title: "Certificate of Completion" ──
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 38px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(data.certificateTitle || 'Certificate of Completion', W / 2, 150);

  // ── Subtitle ──
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.font = '400 15px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('This certificate is proudly presented to', W / 2, 250);

  // ── Student Name ──
  const nameGrad = ctx.createLinearGradient(W / 2 - 200, 300, W / 2 + 200, 300);
  nameGrad.addColorStop(0, '#10b981');
  nameGrad.addColorStop(1, '#14b8a6');
  ctx.fillStyle = nameGrad;
  ctx.font = '700 48px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(data.studentName, W / 2, 320);

  // ── Company issuer label ──
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.font = '400 13px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Issued by ${companyName}`, W / 2, 345);

  // ── Accomplishment line under name ──
  const lineY2 = 350;
  const lineGrad2 = ctx.createLinearGradient(250, lineY2, W - 250, lineY2);
  lineGrad2.addColorStop(0, 'transparent');
  lineGrad2.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
  lineGrad2.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(250, lineY2);
  ctx.lineTo(W - 250, lineY2);
  ctx.stroke();

  // ── Completion notes (word-wrapped) ──
  ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
  ctx.font = '400 16px "Inter", "Segoe UI", system-ui, sans-serif';
  const notesLines = wrapText(ctx, data.completionNotes || 'For outstanding completion of assigned tasks.', W - 240);
  let ny = 395;
  for (const line of notesLines.slice(0, 3)) {
    ctx.fillText(line, W / 2, ny);
    ny += 26;
  }

  // ── Bottom info grid ──
  const infoY = 540;

  // Date
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
  ctx.font = '600 11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DATE ISSUED', W / 4, infoY);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 15px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(data.date, W / 4, infoY + 24);

  // Employer
  ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
  ctx.font = '600 11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('VERIFIED BY', (W * 3) / 4, infoY);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 14px "Inter", "Segoe UI", system-ui, sans-serif';
  const shortWallet = data.employerWallet
    ? `${data.employerWallet.slice(0, 8)}...${data.employerWallet.slice(-6)}`
    : 'Employer';
  ctx.fillText(shortWallet, (W * 3) / 4, infoY + 24);

  // ── Bottom decorative line ──
  const lineY3 = 610;
  const lineGrad3 = ctx.createLinearGradient(120, lineY3, W - 120, lineY3);
  lineGrad3.addColorStop(0, 'transparent');
  lineGrad3.addColorStop(0.3, 'rgba(16, 185, 129, 0.2)');
  lineGrad3.addColorStop(0.7, 'rgba(16, 185, 129, 0.2)');
  lineGrad3.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, lineY3);
  ctx.lineTo(W - 120, lineY3);
  ctx.stroke();

  // ── Verification hash ──
  ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
  ctx.font = '600 10px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ON-CHAIN VERIFICATION HASH', W / 2, 660);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.font = '500 12px "Courier New", monospace';
  ctx.fillText(data.hash, W / 2, 685);

  // ── Stellar branding ──
  ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.font = '400 11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Cryptographically verified on the Stellar Network', W / 2, 740);

  // ── Shield icon (simple drawn shape) ──
  drawShield(ctx, W / 2, 785);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.7, 0.7);
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(14, -8);
  ctx.lineTo(14, 4);
  ctx.quadraticCurveTo(14, 14, 0, 20);
  ctx.quadraticCurveTo(-14, 14, -14, 4);
  ctx.lineTo(-14, -8);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Checkmark inside
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.lineTo(-1, 7);
  ctx.lineTo(7, -4);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/**
 * Triggers a download of the certificate as a PNG file.
 */
export function downloadCertificateImage(dataUrl: string, studentName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `stellarni-certificate-${studentName.replace(/\s+/g, '-').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
