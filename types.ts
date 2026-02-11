
export interface WasteAnalysis {
  material: string;
  recyclable: boolean;
  instruction: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: WasteAnalysis;
}
