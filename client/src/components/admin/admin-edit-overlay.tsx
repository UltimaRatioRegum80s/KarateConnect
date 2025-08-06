import { useAdmin } from "@/contexts/AdminContext";

interface AdminEditOverlayProps {
  children: React.ReactNode;
  className?: string;
  editHint?: string;
}

export function AdminEditOverlay({ children, className = "", editHint }: AdminEditOverlayProps) {
  const { isAdminMode } = useAdmin();

  if (!isAdminMode) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`relative group ${className}`}
      data-testid="admin-editable-area"
    >
      {/* Subtle overlay indicating editable area */}
      <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-red-300 bg-red-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg z-10">
        {editHint && (
          <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-sm">
            {editHint}
          </div>
        )}
      </div>
      
      {children}
    </div>
  );
}