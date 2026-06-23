import { FrozenBadge } from './FrozenBadge';

export function FrozenOverlay({ isActive, children }) {
  if (!isActive) return children;

  return (
    <div className="relative">
      <FrozenBadge />
      <div
        className="pointer-events-none opacity-60 select-none"
        aria-disabled="true"
        inert=""
      >
        {children}
      </div>
    </div>
  );
}
