
import React from 'react';

interface BinInfo {
  color: string;
  title: string;
  items: string;
  bg: string;
  border: string;
  icon: string;
}

const bins: BinInfo[] = [
  { color: 'Blue', title: 'Paper', items: 'Cardboard, Books, Newspapers', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'fa-file-lines' },
  { color: 'Brown', title: 'Glass', items: 'Bottles, Jars, Glass Vials', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'fa-wine-bottle' },
  { color: 'Orange', title: 'Plastics & Metals', items: 'Bottles, Cans, Tetrapaks', bg: 'bg-orange-50', border: 'border-orange-200', icon: 'fa-bottle-water' },
  { color: 'Green', title: 'Residual', items: 'Food Waste, Diapers, Contaminated', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'fa-trash-can' },
];

const GuideCard: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
      {bins.map((bin) => (
        <div key={bin.color} className={`${bin.bg} border ${bin.border} rounded-2xl p-3 text-center transition-transform hover:scale-105 cursor-default shadow-sm`}>
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
