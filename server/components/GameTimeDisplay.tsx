import React from 'react';

interface GameTimeDisplayProps {
  timestamp: number;
}

const GameTimeDisplay: React.FC<GameTimeDisplayProps> = ({ timestamp }) => {
  const date = new Date(timestamp);

  const jsYear = date.getFullYear();
  let displayYearString: string;

  if (jsYear === 0) {
    // JavaScript year 0 corresponds to 1 BC
    displayYearString = '公元前 1年';
  } else if (jsYear < 0) {
    // JavaScript year -N corresponds to (N+1) BC
    displayYearString = `公元前 ${Math.abs(jsYear) + 1}年`;
  } else {
    // Positive years are AD/CE
    displayYearString = `公元 ${jsYear}年`;
  }

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const fullDateTimeString = `${displayYearString} ${month}月${day}日 ${hours}点${minutes}分`;

  return (
    <div
      className="game-time-display"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`当前游戏时间：${fullDateTimeString}`}
    >
      <span>
        {displayYearString} {month}月{day}日
      </span>
      <span>
        {hours}:{minutes}
      </span>
    </div>
  );
};

export default GameTimeDisplay;
