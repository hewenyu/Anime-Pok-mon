
import React from 'react';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ currentHp, maxHp }) => {
  const percentage = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  
  let barColorClass = 'bg-green-500'; // Default green
  if (percentage <= 20) {
    barColorClass = 'bg-red-600'; // Critical red
  } else if (percentage <= 50) {
    barColorClass = 'bg-yellow-500'; // Warning yellow
  }

  return (
    <div className="w-full bg-gray-700 rounded-full h-3 md:h-4 border border-gray-900 shadow-inner overflow-hidden my-1">
      <div
        className={`h-full rounded-full transition-all duration-300 ease-linear ${barColorClass}`}
        style={{ width: `${percentage}%` }}
        aria-valuenow={currentHp}
        aria-valuemin={0}
        aria-valuemax={maxHp}
      />
    </div>
  );
};

export default HealthBar;
