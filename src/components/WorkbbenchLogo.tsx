
import { cn } from "@/lib/utils";

interface WorkbbenchLogoProps {
  className?: string;
}

export const WorkbbenchLogo = ({ className }: WorkbbenchLogoProps) => {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="w-8 h-8 rounded-md mr-2 bg-gradient-flow animate-flow"></div>
      <span className="font-bold text-xl text-white">Workbbench</span>
    </div>
  );
};
