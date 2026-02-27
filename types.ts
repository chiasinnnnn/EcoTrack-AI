
export interface WasteItem {
  material: string;
  recyclable: boolean;
  instruction: string;
  hazard_level: 'Low' | 'Medium' | 'High';
}

export interface WasteAnalysis {
  items: WasteItem[];
  timestamp?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: WasteAnalysis;
}
