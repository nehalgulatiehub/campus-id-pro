import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("spinner", sizeClasses[size], className)} />
  );
};

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingState = ({ message = "Loading...", size = "lg" }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <LoadingSpinner size={size} />
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
};