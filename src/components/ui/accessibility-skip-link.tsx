import { memo } from 'react';

export const SkipLink = memo(function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-foreground transition-all"
    >
      Skip to main content
    </a>
  );
});

export const VisuallyHidden = memo(function VisuallyHidden({ 
  children,
  as: Component = 'span'
}: { 
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
});

export const FocusTrap = memo(function FocusTrap({ 
  children,
  active = true 
}: { 
  children: React.ReactNode;
  active?: boolean;
}) {
  if (!active) return <>{children}</>;
  
  return (
    <div 
      role="dialog" 
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
});

export default SkipLink;
