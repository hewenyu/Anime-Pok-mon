import React from 'react';

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  barColorClass: string;
  textColorClass?: string;
}

const StatBar: React.FC<StatBarProps> = ({
  label,
  current,
  max,
  barColorClass,
  textColorClass,
}) => {
  const widthPercentage = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className={`w-full ${textColorClass || ''}`}>
      <div className="flex justify-between text-sm">
        <span className={textColorClass}>{label}:</span>
        <span className={textColorClass}>
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
        <div
          className={`${barColorClass} h-2.5 rounded-full`}
          style={{ width: `${widthPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StatBar;