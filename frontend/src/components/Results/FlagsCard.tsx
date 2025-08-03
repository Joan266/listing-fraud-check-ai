import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux'; // Assuming you have this for theme

interface Flag {
  category: 'High' | 'Medium' | 'Positive' | string;
  description: string;
}

interface FlagsCardProps {
  flags: Flag[];
}

export const FlagsCard: React.FC<FlagsCardProps> = ({ flags }) => {
  const { theme } = useAppSelector((state) => state.app);

  // Helper to map category to icon and color
  const getFlagStyle = (category: Flag['category']) => {
    switch (category) {
      case 'High':
        return {
          Icon: AlertTriangle,
          color: 'text-red-500 dark:text-red-400',
        };
      case 'Medium':
        return {
          Icon: AlertCircle,
          color: 'text-yellow-500 dark:text-yellow-400',
        };
      case 'Positive':
        return {
          Icon: CheckCircle,
          color: 'text-green-500 dark:text-green-400',
        };
      default:
        return {
          Icon: AlertCircle,
          color: 'text-gray-500 dark:text-gray-400',
        };
    }
  };
  
  if (!flags || flags.length === 0) {
    return null; // Don't render the card if there are no flags
  }

  return (
    <div className={`border rounded-lg p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Key Findings
      </h2>
      <div className="space-y-4">
        {flags.map((flag, index) => {
          const { Icon, color } = getFlagStyle(flag.category);
          return (
            <div key={index} className="flex items-start space-x-3">
              <Icon size={20} className={`${color} mt-0.5 flex-shrink-0`} />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{flag.category}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {flag.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};