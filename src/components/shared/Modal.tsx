import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement>;
}

export const Modal = ({ isOpen, onClose, children, triggerRef }: ModalProps) => {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current && modalRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      
      setPosition({
        top: triggerRect.bottom + window.scrollY,
        right: window.innerWidth - triggerRect.right
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
      />
      <div 
        ref={modalRef}
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
        className="bg-white rounded-lg shadow-lg min-w-[200px] overflow-hidden"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}; 