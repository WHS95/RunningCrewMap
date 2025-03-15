"use client";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  message,
  size = "md",
  className = "h-screen",
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };

  const textSizes = {
    sm: "text-sm mt-2",
    md: "text-base mt-4",
    lg: "text-lg mt-4",
  };

  const spinnerSize = sizes[size];
  const textSize = textSizes[size];

  return (
    <div className={`flex items-center justify-center flex-col ${className}`}>
      <div
        className={`${spinnerSize} border-primary border-t-transparent rounded-full animate-spin`}
      ></div>
      {message && <span className={textSize}>{message}</span>}
    </div>
  );
}
