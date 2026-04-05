'use client';
import { useState, useEffect, useRef } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  variant?: 'danger' | 'primary';
}

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  variant = 'primary',
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setInputValue('');
      setInputError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    if (inputLabel && inputRequired && !inputValue.trim()) {
      setInputError(true);
      inputRef.current?.focus();
      return;
    }
    onConfirm(inputLabel ? inputValue.trim() : undefined);
  };

  const primaryBg = variant === 'danger' ? '#b91c1c' : '#e31c79';
  const primaryHoverBg = variant === 'danger' ? '#991b1b' : '#c9166a';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        background: 'rgba(0,0,0,0.3)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 440,
          padding: '28px 28px 22px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          animation: 'anim-scale-in 0.2s ease',
          fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', letterSpacing: -0.2 }}>
          {title}
        </h3>
        <p style={{ fontSize: 12.5, color: '#666', margin: '0 0 18px', lineHeight: 1.5 }}>
          {message}
        </p>

        {inputLabel && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              {inputLabel} {inputRequired && <span style={{ color: '#b91c1c' }}>*</span>}
            </label>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setInputError(false); }}
              placeholder={inputPlaceholder || ''}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 12.5,
                border: `0.5px solid ${inputError ? '#b91c1c' : '#e8e4df'}`,
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => { if (!inputError) e.target.style.borderColor = '#d3ad6b'; }}
              onBlur={(e) => { if (!inputError) e.target.style.borderColor = '#e8e4df'; }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {inputError && (
              <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>This field is required.</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 600,
              color: '#777',
              background: '#fff',
              border: '0.5px solid #e0dcd7',
              borderRadius: 7,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: primaryBg,
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = primaryHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = primaryBg; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
