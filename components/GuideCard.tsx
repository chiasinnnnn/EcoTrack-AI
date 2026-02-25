
import React from 'react';

interface BinInfo {
  color: string;
  title: string;
  items: string;
  bg: string;
  border: string;
  icon: string;
  details: {
    dos: string[];
    donts: string[];
  };
}

const bins: BinInfo[] = [
  { 
    color: 'Blue', 
    title: 'Paper', 
    items: 'Cardboard, Books, Newspapers', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    icon: 'fa-file-lines',
    details: {
      dos: ['Flatten cardboard boxes', 'Remove plastic tape', 'Keep paper dry'],
      donts: ['Greasy pizza boxes', 'Tissues or paper towels', 'Laminated paper']
    }
  },
  { 
    color: 'Brown', 
    title: 'Glass', 
    items: 'Bottles, Jars, Glass Vials', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200', 
    icon: 'fa-wine-bottle',
    details: {
      dos: ['Rinse bottles and jars', 'Remove metal/plastic caps', 'Separate by color if possible'],
      donts: ['Broken window glass', 'Ceramics or Pyrex', 'Light bulbs']
    }
  },
  { 
    color: 'Orange', 
    title: 'Plastics & Metals', 
    items: 'Bottles, Cans, Tetrapaks', 
    bg: 'bg-orange-50', 
    border: 'border-orange-200', 
    icon: 'fa-bottle-water',
    details: {
      dos: ['Rinse food containers', 'Crush plastic bottles', 'Recycle clean aluminum foil'],
      donts: ['Plastic bags or wrap', 'Polystyrene (Styrofoam)', 'Hazardous waste containers']
    }
  },
  { 
    color: 'Green', 
    title: 'Residual', 
    items: 'Food Waste, Diapers, Contaminated', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200', 
    icon: 'fa-trash-can',
    details: {
      dos: ['Bag your trash securely', 'Dispose of food waste properly', 'Keep bin area clean'],
      donts: ['Recyclable materials', 'Hazardous chemicals', 'E-waste']
    }
  },
];

interface GuideCardProps {
  onSelect?: (bin: BinInfo) => void;
}

const GuideCard: React.FC<GuideCardProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
      {bins.map((bin) => (
        <div 
          key={bin.color} 
          onClick={() => onSelect?.(bin)}
          className={`${bin.bg} border ${bin.border} rounded-2xl p-3 text-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm`}
        >
          <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full mb-2 ${bin.bg.replace('50', '200')}`}>
            <i className={`fas ${bin.icon} text-gray-700`}></i>
          </div>
          <h3 className="font-bold text-sm text-gray-800">{bin.title}</h3>
          <p className="text-[10px] text-gray-600 leading-tight mt-1">{bin.items}</p>
        </div>
      ))}
    </div>
  );
};

export default GuideCard;
