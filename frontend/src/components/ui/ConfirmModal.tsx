import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  type?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, type = 'info', title, message, confirmLabel = 'Ya, Lanjutkan', cancelLabel = 'Batal', onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = {
    info: { icon: <Info size={44} color="var(--color-primary)" />, bg: 'rgba(59,130,246,0.1)', btnClass: 'btn-primary' },
    warning: { icon: <AlertTriangle size={44} color="var(--color-warning)" />, bg: 'rgba(245,158,11,0.1)', btnClass: 'btn-warning' },
    danger: { icon: <AlertTriangle size={44} color="var(--color-danger)" />, bg: 'rgba(239,68,68,0.1)', btnClass: 'btn-danger' },
    success: { icon: <CheckCircle size={44} color="var(--color-success)" />, bg: 'rgba(16,185,129,0.1)', btnClass: 'btn-success' },
  };

  const curr = config[type];

  return (
    <div className="modal-overlay" onClick={onCancel} style={{zIndex:9998}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:420, textAlign:'center', padding:'32px 24px'}}>
        <button onClick={onCancel} style={{position:'absolute',right:16,top:16,background:'none',border:'none',cursor:'pointer',color:'var(--color-text-muted)'}}>
          <X size={20}/>
        </button>
        
        <div style={{display:'inline-flex', padding:18, borderRadius:'50%', background:curr.bg, marginBottom:20}}>
          {curr.icon}
        </div>
        
        <h2 style={{marginBottom:12, fontSize:20}}>{title}</h2>
        <p style={{color:'var(--color-text-muted)', marginBottom:24, lineHeight:1.6, fontSize:14}}>{message}</p>
        
        <div style={{display:'flex', gap:10, justifyContent:'center'}}>
          <button className="btn btn-outline" onClick={onCancel} style={{minWidth:110, fontWeight:500}}>
            {cancelLabel}
          </button>
          <button className={`btn ${curr.btnClass}`} onClick={onConfirm} style={{minWidth:140, fontWeight:600}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
