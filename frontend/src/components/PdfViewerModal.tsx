import { X, Download } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDataUrl: string;
  title?: string;
}

export function PdfViewerModal({ isOpen, onClose, pdfDataUrl, title }: PdfViewerModalProps) {
  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfDataUrl;
    a.download = `${(title || 'document').replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            {title || 'Document Preview'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={onClose} className="modal-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950">
          <iframe
            src={pdfDataUrl}
            className="w-full h-[70vh] rounded-xl"
            title={title || 'Document Preview'}
          />
        </div>
      </div>
    </div>
  );
}
