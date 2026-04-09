
// FIX: Removed import from './constants' to break circular dependency. All types are now defined here.

export interface Score {
    'シミ・くすみ': number;
    'シワ・小ジワ': number;
    'ハリ・弾力': number;
    '毛穴ケア': number;
    '保湿持続性': number;
    '総合評価'?: number;
    'バリア機能/鎮静'?: number;
}

export interface Ingredient {
    name: string;
    percentage: number;
    effect: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    mainIngredients: string[];
    volume: number; // 容量(ml)
    isPublished: boolean; // 公開・非公開フラグ
    type: 'serum' | 'foundation' | 'performance'; // Added type to Product
}

export interface Serum extends Product {
    type: 'serum';
    subscriptionPrice?: number;
    baseScores: Score;
    ingredients: Ingredient[];
    totalActiveConcentration: number;
}

export interface Ampoule extends Product {
    type: 'foundation' | 'performance';
    function: string;
    target: string;
    boosts: Partial<Score>;
    totalActiveConcentration?: number;
}

export interface Competitor {
    name: string;
    priceTier: string;
    scores: Omit<Score, '総合評価' | 'バリア機能/鎮静'>;
}

// FIX: Added AnalyzedCompetitor type to be used for products analyzed by the AI.
export interface AnalyzedCompetitor {
    name:string;
    scores: Score;
    report: string;
    citations?: { uri: string; title: string; }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  priceAtPurchase: number; // カート投入時の確定価格（定期価格や無料枠適用後）
}

export interface IngredientAnalysis {
    name: string;
    description: string;
    timeframe: string;
}

export interface MedicalChartReport {
  summaryBullets: string[];
  knowledgeLevelRationale: string;
  patientSummary: string;
  prescriptionIntent: string;
  serumRationale: string;
  ampouleRationales: { ampouleId: string; rationale: string; }[];
  futureOutlook: string;
  usageInstructions: string;
  serumIngredientAnalysis: IngredientAnalysis[];
  ampouleIngredientAnalysis: IngredientAnalysis[];
}

export interface PhotoValidationResult {
  isValid: boolean;
  reason: string;
}

export interface IngredientLabAnalysis {
    name: string;
    functions: string;
    evidence: string;
    timeframe: string;
}

export interface AdvancedProductAnalysis {
    productName: string;
    retailPrice: string;
    productOverview: string;
    positiveFeedback: string[];
    negativeFeedback: string[];
    ingredientBreakdown: {
        name: string;
        estimatedConcentration: string;
        efficacyScore: number;
        efficacyAnalysis: string;
    }[];
    overallVerdict: string;
    citations: { uri: string; title: string; }[];
}

export type ConsultationInput = 
  | { 
      type: 'concerns'; 
      ageGroup: string; 
      skinType: string; 
      skinConcerns: { [key: string]: number }; 
      lifestyleFactors: string[]; 
      knowledgeLevel: number;
      troubleHistory: string;
      concernTimings: string[];
    } 
  | { 
      type: 'ideal'; 
      ageGroup: string; 
      skinType: string; 
      idealSkin: string; 
      skinConcerns: { [key: string]: number }; 
      lifestyleFactors: string[]; 
      knowledgeLevel: number; 
      troubleHistory: string;
      currentLacks: string[];
    } 
  | { 
      type: 'investigate'; 
      ageGroup: string; 
      skinType: string; 
      currentUserProducts: string[]; 
      dissatisfactions: string[]; 
      idealSkin: string; 
      skinConcerns: { [key: string]: number }; 
      knowledgeLevel: number; 
      troubleHistory: string;
      productUsageDuration: string;
    };

export interface FullConsultationResponse {
    recommendations: {
        serumId: string;
        ampouleIds: string[];
    };
    medicalChartReport: MedicalChartReport;
    competitorAnalysis?: AnalyzedCompetitor[];
    citations?: { uri: string; title: string; }[];
}

// --- Admin & Analytics Types ---

export type LogEventType = 
    | 'SESSION_START' 
    | 'VIEW_STEP' 
    | 'UPDATE_INPUT' 
    | 'GENERATE_PLAN' 
    | 'DROP_OFF' 
    | 'CHAT_MESSAGE_SENT' 
    | 'CHAT_MESSAGE_RECEIVED' 
    | 'CHAT_OPEN';

export interface LogEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  type: LogEventType;
  payload?: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: number;
}

export interface UserSession {
  sessionId: string;
  startTime: number;
  lastActive: number;
  status: 'active' | 'completed' | 'abandoned';
  currentStep?: string;
  demographics?: {
      ageGroup?: string;
      skinType?: string;
      skinConcerns?: string[];
      knowledgeLevel?: number;
  };
  selectedGoal?: string;
  currentProducts?: string[];
  dissatisfactions?: string[];
  chatHistory?: ChatMessage[];
  selectedSerumId?: string;
  selectedFoundationAmpouleIds?: string[];
  selectedPerformanceAmpouleIds?: string[];
}

export type MasterConfigCategory = 
    | 'skin_concerns' 
    | 'ideal_goals' 
    | 'lifestyle_factors' 
    | 'dissatisfactions' 
    | 'trouble_history' 
    | 'concern_timings' 
    | 'current_lacks' 
    | 'usage_durations';

export interface MasterConfig {
    id: string;
    category: MasterConfigCategory;
    label: string;
    description?: string;
    order: number;
    isActive: boolean;
    metadata?: any;
}
