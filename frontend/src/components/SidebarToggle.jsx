import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EASE = [0.4, 0, 0.2, 1];

export default function SidebarToggle({ isOpen, onToggle }) {
  return (
    <motion.button
      animate={{ left: isOpen ? 252 : 4 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={onToggle}
      title={isOpen ? '사이드바 닫기' : '사이드바 열기'}
      style={{
        position: 'fixed',
        top: 60,
        width: 16,
        height: 28,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: 'var(--elev)',
        border: '1px solid var(--border-strong)',
        borderLeft: 'none',
        borderRadius: '0 4px 4px 0',
        color: 'var(--faint)',
        padding: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--elev2)'; e.currentTarget.style.color = 'var(--dim)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--elev)'; e.currentTarget.style.color = 'var(--faint)'; }}
    >
      {isOpen
        ? <ChevronLeft size={10} />
        : <ChevronRight size={10} />
      }
    </motion.button>
  );
}
