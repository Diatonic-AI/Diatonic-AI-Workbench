
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  className?: string;
}

const FeatureCard = ({ icon, title, description, color, className }: FeatureCardProps) => {
  return (
    <div 
      className={cn(
        "group p-6 rounded-xl glass-morphism transition-all duration-300 hover:scale-[1.02]",
        className
      )}
    >
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", color)}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
};

export default FeatureCard;
