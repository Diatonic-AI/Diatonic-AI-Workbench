
import { cn } from "@/lib/utils";

interface DiatomicLogoProps {
  className?: string;
  showText?: boolean;
}

export const DiatomicLogo = ({ className, showText = true }: DiatomicLogoProps) => {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="w-8 h-8 mr-2 text-workbbench-purple">
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 1080 1080"
          fill="none" 
          stroke="currentColor" 
          strokeWidth="40"
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <circle cx="540" cy="540" r="490"/>
          <g clipPath="url(#clipCircle)">
            <defs>
              <clipPath id="clipCircle">
                <circle cx="540" cy="540" r="470"/>
              </clipPath>
            </defs>
            <path d="
              M120 540
              Q180 360 240 540
              T360 540
              T480 540
              T600 540
              T720 540
              T840 540
              T960 540" />
            <path 
              opacity="0.45" 
              strokeWidth="28" 
              d="
                M120 540
                Q150 450 180 540
                T240 540
                T300 540
                T360 540
                T420 540
                T480 540
                T540 540
                T600 540
                T660 540
                T720 540
                T780 540
                T840 540
                T900 540
                T960 540" 
            />
          </g>
          <g stroke="none" fill="currentColor">
            <circle cx="180" cy="360" r="22"/>
            <circle cx="300" cy="720" r="22"/>
            <circle cx="420" cy="360" r="22"/>
            <circle cx="540" cy="540" r="24"/>
            <circle cx="660" cy="360" r="22"/>
            <circle cx="780" cy="720" r="22"/>
            <circle cx="900" cy="360" r="22"/>
          </g>
        </svg>
      </div>
      {showText && (
        <span className="font-bold text-xl text-white">Diatonic AI</span>
      )}
    </div>
  );
};

// Keep the old export name for compatibility
export const WorkbbenchLogo = DiatomicLogo;
