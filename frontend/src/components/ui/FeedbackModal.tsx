import { CheckCircle, XCircle, X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function FeedbackModal({ isOpen, type, title, message, onClose, actionLabel, onAction }: FeedbackModalProps) {
  if (!isOpen) return null;

  const config = {
    success: { icon: <CheckCircle size={48} color="var(--color-success)" />, bg: 'rgba(16,185,129,0.1)' },
    error: { icon: <XCircle size={48} color="var(--color-danger)" />, bg: 'rgba(239,68,68,0.1)' },
    warning: { icon: <CheckCircle size={48} color="var(--color-warning)" />, bg: 'rgba(245,158,11,0.1)' } // Warning or alert
  };

  const curr = config[type];

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex:9999}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400, textAlign:'center', padding:'32px 24px'}}>
        <button onClick={onClose} style={{position:'absolute',right:16,top:16,background:'none',border:'none',cursor:'pointer',color:'var(--color-text-muted)'}}>
          <X size={20}/>
        </button>
        
        <div style={{display:'inline-flex', padding:20, borderRadius:'50%', background:curr.bg, marginBottom:20}}>
          {curr.icon}
        </div>
        
        <h2 style={{marginBottom:12, fontSize:22}}>{title}</h2>
        <p style={{color:'var(--color-text-muted)', marginBottom:24, lineHeight:1.5}}>{message}</p>
        
        <div style={{display:'flex', gap:10, justifyContent:'center'}}>
          {onAction && actionLabel && (
            <>
              <button className="btn btn-outline" onClick={onClose} style={{minWidth:100}}>
                Batal
              </button>
              <button className={`btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`} onClick={onAction} style={{minWidth:120}}>
                {actionLabel}
              </button>
            </>
          )}
          {!onAction && (
            <button className="btn btn-primary" onClick={onClose} style={{minWidth:120}}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
