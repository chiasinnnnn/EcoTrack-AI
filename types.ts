
export interface WasteAnalysis {
  material: string;
  recyclable: boolean;
  instruction: string;
  hazard_level: 'Low' | 'Medium' | 'High';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: WasteAnalysis;
}
