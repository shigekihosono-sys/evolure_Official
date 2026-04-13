import React, { useReducer, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ShoppingCart, Bot, X, Lightbulb, CheckCircle, Circle, PlusCircle, Send, RefreshCw, Beaker, User, SlidersHorizontal, FileText, ArrowRight, Camera, BarChart2, Radar, Target, Search, UserCircle, TrendingUp, FlaskConical, Video, Edit, Sparkles, ChevronRight, Lock, Cylinder, FileDigit, CreditCard, Repeat } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { Serum, Ampoule, CartItem, Score, Product, MedicalChartReport, AnalyzedCompetitor, IngredientLabAnalysis, AdvancedProductAnalysis, FullConsultationResponse, ChatMessage, ConsultationInput } from './types';
import {
  AGE_GROUPS, SKIN_CONCERNS, SCORE_CATEGORY_KEYS, SEVERITY_SCALE, KNOWLEDGE_SCALE, IDEAL_SKIN_GOALS, LIFESTYLE_FACTORS, SKIN_TYPES, TROUBLE_HISTORY_OPTIONS, CONCERN_TIMINGS, CURRENT_LACKS, PRODUCT_USAGE_DURATIONS,
  SERUM_A as DEFAULT_SERUM_A, SERUM_B as DEFAULT_SERUM_B, SERUM_C as DEFAULT_SERUM_C
} from './constants';
import { sendChatMessageStream, analyzeCompetitorProduct, analyzeSkinFromVideo, validateVideoForSkinAnalysis, analyzeIngredients, analyzeProductAdvanced, createChatSession, runFullConsultation, regenerateMedicalChart, extractScoresFromText } from './services/geminiService';
import { RadarChartComponent } from './components/RadarChartComponent';
import { LoadingSpinner } from './components/LoadingSpinner';
import { MedicalChartModal } from './components/MedicalChartModal';
import { CompetitorReportModal } from './components/CompetitorReportModal';
import { ConsultationStep } from './components/ConsultationStep';
import { Chat } from '@google/genai';
import { CameraCapture } from './components/CameraCapture';
import { BarChartComponent } from './components/BarChartComponent';
import { IngredientLab } from './components/IngredientLab';
import { GlobalChatModal } from './components/GlobalChatModal';
import { ChatFAB } from './components/ChatFAB';
import { PlanSelectionModal } from './components/PlanSelectionModal';
import { MedicalChartSummary } from './components/MedicalChartSummary';
import { CartDrawer } from './components/CartDrawer';
import { useAdmin } from './contexts/AdminContext';
import { AdminDashboard } from './components/admin/AdminDashboard';


// --- App Content Component ---

interface AppState {
    currentView: 'welcome' | 'consultation' | 'dashboard' | 'ingredientLab' | 'admin';
    consultationType: 'concerns' | 'ideal' | null;
    ageGroup: string;
    skinType: string;
    skinConcerns: { [key: string]: number };
    knowledgeLevel: number;
    selectedIdealGoal: string;
    lifestyleFactors: { [key: string]: boolean };
    consultationInput: ConsultationInput | null;
    currentUserProducts: string[];
    currentUserProductInput: string;
    dissatisfactions: { [key: string]: boolean };
    analyzedUserProducts: AnalyzedCompetitor[] | null;
    selectedSerum: Serum | null;
    purchaseType: 'subscription' | 'one-time';
    selectedFoundationAmpoules: Ampoule[];
    selectedPerformanceAmpoules: Ampoule[];
    isPlanSelectionModalOpen: boolean;
    planBeforeEdit: any;
    recommendationReasons: { [key: string]: string };
    cart: CartItem[];
    isCartOpen: boolean;
    competitorCurrentInput: string;
    competitorProductsList: string[];
    dynamicCompetitors: AnalyzedCompetitor[] | null;
    isCompetitorLoading: boolean;
    isCompetitorReportModalOpen: boolean;
    selectedCompetitorReport: null | AnalyzedCompetitor;
    medicalChartReport: MedicalChartReport | null;
    isMedicalChartLoading: boolean;
    isMedicalChartModalOpen: boolean;
    fullPlanScores: Score | null;
    chatHistory: ChatMessage[];
    chatInput: string;
    isChatOpen: boolean;
    isChatLoading: boolean;
    isCameraOpen: boolean;
    cameraMode: 'photo' | 'video';
    cameraCaptureHandler: ((dataUrl: string) => void) | null;
    
    troubleHistory: string;
    concernTimings: { [key: string]: boolean };
    currentLacks: { [key: string]: boolean };
}

type Action =
    | { type: 'SET_VIEW'; payload: AppState['currentView'] }
    | { type: 'SET_CONSULTATION_TYPE'; payload: AppState['consultationType'] }
    | { type: 'SET_AGE_GROUP'; payload: string }
    | { type: 'SET_SKIN_TYPE'; payload: string }
    | { type: 'SET_SKIN_CONCERN'; payload: { concern: string; severity: number } }
    | { type: 'SET_KNOWLEDGE_LEVEL'; payload: number }
    | { type: 'SET_IDEAL_GOAL'; payload: string }
    | { type: 'TOGGLE_LIFESTYLE_FACTOR'; payload: string }
    | { type: 'SET_CONSULTATION_INPUT'; payload: ConsultationInput }
    | { type: 'SET_ANALYZED_USER_PRODUCTS'; payload: AnalyzedCompetitor[] }
    | { type: 'SET_SELECTED_SERUM'; payload: Serum }
    | { type: 'SET_PURCHASE_TYPE'; payload: 'subscription' | 'one-time' }
    | { type: 'TOGGLE_FOUNDATION_AMPOULE'; payload: Ampoule }
    | { type: 'TOGGLE_PERFORMANCE_AMPOULE'; payload: Ampoule }
    | { type: 'SET_PLAN_SELECTION_MODAL'; payload: boolean }
    | { type: 'SET_RECOMMENDATION_REASONS'; payload: { [key: string]: string } }
    | { type: 'ADD_TO_CART'; payload: CartItem }
    | { type: 'SET_CART'; payload: CartItem[] }
    | { type: 'REMOVE_FROM_CART'; payload: number }
    | { type: 'TOGGLE_CART'; payload: boolean }
    | { type: 'SET_COMPETITOR_INPUT'; payload: string }
    | { type: 'ADD_COMPETITOR_PRODUCT'; payload: string }
    | { type: 'REMOVE_COMPETITOR_PRODUCT'; payload: number }
    | { type: 'SET_DYNAMIC_COMPETITORS'; payload: AnalyzedCompetitor[] }
    | { type: 'SET_COMPETITOR_LOADING'; payload: boolean }
    | { type: 'OPEN_COMPETITOR_REPORT'; payload: AnalyzedCompetitor }
    | { type: 'CLOSE_COMPETITOR_REPORT' }
    | { type: 'SET_MEDICAL_CHART_REPORT'; payload: MedicalChartReport }
    | { type: 'SET_MEDICAL_CHART_LOADING'; payload: boolean }
    | { type: 'SET_MEDICAL_CHART_MODAL'; payload: boolean }
    | { type: 'SET_FULL_PLAN_SCORES'; payload: Score }
    | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_CHAT_INPUT'; payload: string }
    | { type: 'TOGGLE_CHAT'; payload: boolean }
    | { type: 'SET_CHAT_LOADING'; payload: boolean }
    | { type: 'SET_CAMERA_OPEN'; payload: boolean }
    | { type: 'SET_CAMERA_MODE'; payload: 'photo' | 'video' }
    | { type: 'SET_CAMERA_HANDLER'; payload: ((dataUrl: string) => void) | null }
    | { type: 'SET_TROUBLE_HISTORY'; payload: string }
    | { type: 'TOGGLE_CONCERN_TIMING'; payload: string }
    | { type: 'TOGGLE_CURRENT_LACK'; payload: string }
    | { type: 'SET_PLAN_BEFORE_EDIT'; payload: any }
    | { type: 'RESET_PLAN_CHANGES' };

const initialState: AppState = {
    currentView: 'welcome',
    consultationType: null,
    ageGroup: '',
    skinType: '',
    skinConcerns: {},
    knowledgeLevel: 1,
    selectedIdealGoal: '',
    lifestyleFactors: {},
    consultationInput: null,
    currentUserProducts: [],
    currentUserProductInput: '',
    dissatisfactions: {},
    analyzedUserProducts: null,
    selectedSerum: null,
    purchaseType: 'subscription',
    selectedFoundationAmpoules: [],
    selectedPerformanceAmpoules: [],
    isPlanSelectionModalOpen: false,
    planBeforeEdit: null,
    recommendationReasons: {},
    cart: [],
    isCartOpen: false,
    competitorCurrentInput: '',
    competitorProductsList: [],
    dynamicCompetitors: null,
    isCompetitorLoading: false,
    isCompetitorReportModalOpen: false,
    selectedCompetitorReport: null,
    medicalChartReport: null,
    isMedicalChartLoading: false,
    isMedicalChartModalOpen: false,
    fullPlanScores: null,
    chatHistory: [],
    chatInput: '',
    isChatOpen: false,
    isChatLoading: false,
    isCameraOpen: false,
    cameraMode: 'photo',
    cameraCaptureHandler: null,
    troubleHistory: '',
    concernTimings: {},
    currentLacks: {}
};

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_VIEW': return { ...state, currentView: action.payload };
        case 'SET_CONSULTATION_TYPE': return { ...state, consultationType: action.payload };
        case 'SET_AGE_GROUP': return { ...state, ageGroup: action.payload };
        case 'SET_SKIN_TYPE': return { ...state, skinType: action.payload };
        case 'SET_SKIN_CONCERN': return { ...state, skinConcerns: { ...state.skinConcerns, [action.payload.concern]: action.payload.severity } };
        case 'SET_KNOWLEDGE_LEVEL': return { ...state, knowledgeLevel: action.payload };
        case 'SET_IDEAL_GOAL': return { ...state, selectedIdealGoal: action.payload };
        case 'TOGGLE_LIFESTYLE_FACTOR':
            const newFactors = { ...state.lifestyleFactors };
            if (newFactors[action.payload]) delete newFactors[action.payload];
            else newFactors[action.payload] = true;
            return { ...state, lifestyleFactors: newFactors };
        case 'SET_CONSULTATION_INPUT': return { ...state, consultationInput: action.payload };
        case 'SET_ANALYZED_USER_PRODUCTS': return { ...state, analyzedUserProducts: action.payload };
        case 'SET_SELECTED_SERUM': return { ...state, selectedSerum: action.payload };
        case 'SET_PURCHASE_TYPE': return { ...state, purchaseType: action.payload };
        case 'TOGGLE_FOUNDATION_AMPOULE': {
            const fIndex = state.selectedFoundationAmpoules.findIndex(a => a.id === action.payload.id);
            let newFoundationAmpoules;
            if (fIndex >= 0) newFoundationAmpoules = state.selectedFoundationAmpoules.filter((_, i) => i !== fIndex);
            else newFoundationAmpoules = [...state.selectedFoundationAmpoules, action.payload];
            let newPurchaseType = state.purchaseType;
            if (newFoundationAmpoules.length === 0 && state.selectedPerformanceAmpoules.length === 0) newPurchaseType = 'one-time';
            return { ...state, selectedFoundationAmpoules: newFoundationAmpoules, purchaseType: newPurchaseType };
        }
        case 'TOGGLE_PERFORMANCE_AMPOULE': {
            const pIndex = state.selectedPerformanceAmpoules.findIndex(a => a.id === action.payload.id);
            let newPerformanceAmpoules;
            if (pIndex >= 0) newPerformanceAmpoules = state.selectedPerformanceAmpoules.filter((_, i) => i !== pIndex);
            else newPerformanceAmpoules = [...state.selectedPerformanceAmpoules, action.payload];
            let newPurchaseType = state.purchaseType;
            if (state.selectedFoundationAmpoules.length === 0 && newPerformanceAmpoules.length === 0) newPurchaseType = 'one-time';
            return { ...state, selectedPerformanceAmpoules: newPerformanceAmpoules, purchaseType: newPurchaseType };
        }
        case 'SET_PLAN_SELECTION_MODAL': return { ...state, isPlanSelectionModalOpen: action.payload };
        case 'SET_PLAN_BEFORE_EDIT': return { ...state, planBeforeEdit: action.payload };
        case 'RESET_PLAN_CHANGES':
            return state.planBeforeEdit ? {
                ...state,
                selectedSerum: state.planBeforeEdit.selectedSerum,
                selectedFoundationAmpoules: state.planBeforeEdit.selectedFoundationAmpoules,
                selectedPerformanceAmpoules: state.planBeforeEdit.selectedPerformanceAmpoules,
                planBeforeEdit: null
            } : state;
        case 'SET_RECOMMENDATION_REASONS': return { ...state, recommendationReasons: action.payload };
        case 'ADD_TO_CART': return { ...state, cart: [...state.cart, action.payload] };
        case 'SET_CART': return { ...state, cart: action.payload };
        case 'REMOVE_FROM_CART': return { ...state, cart: state.cart.filter((_, i) => i !== action.payload) };
        case 'TOGGLE_CART': return { ...state, isCartOpen: action.payload };
        case 'SET_COMPETITOR_INPUT': return { ...state, competitorCurrentInput: action.payload };
        case 'ADD_COMPETITOR_PRODUCT': return { ...state, competitorProductsList: [...state.competitorProductsList, action.payload] };
        case 'REMOVE_COMPETITOR_PRODUCT': return { ...state, competitorProductsList: state.competitorProductsList.filter((_, i) => i !== action.payload) };
        case 'SET_DYNAMIC_COMPETITORS': return { ...state, dynamicCompetitors: action.payload };
        case 'SET_COMPETITOR_LOADING': return { ...state, isCompetitorLoading: action.payload };
        case 'OPEN_COMPETITOR_REPORT': return { ...state, isCompetitorReportModalOpen: true, selectedCompetitorReport: action.payload };
        case 'CLOSE_COMPETITOR_REPORT': return { ...state, isCompetitorReportModalOpen: false, selectedCompetitorReport: null };
        case 'SET_MEDICAL_CHART_REPORT': return { ...state, medicalChartReport: action.payload };
        case 'SET_MEDICAL_CHART_LOADING': return { ...state, isMedicalChartLoading: action.payload };
        case 'SET_MEDICAL_CHART_MODAL': return { ...state, isMedicalChartModalOpen: action.payload };
        case 'SET_FULL_PLAN_SCORES': return { ...state, fullPlanScores: action.payload };
        case 'ADD_CHAT_MESSAGE': return { ...state, chatHistory: [...state.chatHistory, action.payload] };
        case 'SET_CHAT_INPUT': return { ...state, chatInput: action.payload };
        case 'TOGGLE_CHAT': return { ...state, isChatOpen: action.payload };
        case 'SET_CHAT_LOADING': return { ...state, isChatLoading: action.payload };
        case 'SET_CAMERA_OPEN': return { ...state, isCameraOpen: action.payload };
        case 'SET_CAMERA_MODE': return { ...state, cameraMode: action.payload };
        case 'SET_CAMERA_HANDLER': return { ...state, cameraCaptureHandler: action.payload };
        case 'SET_TROUBLE_HISTORY': return { ...state, troubleHistory: action.payload };
        case 'TOGGLE_CONCERN_TIMING': 
            const newTimings = { ...state.concernTimings };
            if (newTimings[action.payload]) delete newTimings[action.payload];
            else newTimings[action.payload] = true;
            return { ...state, concernTimings: newTimings };
        case 'TOGGLE_CURRENT_LACK':
             const newLacks = { ...state.currentLacks };
            if (newLacks[action.payload]) delete newLacks[action.payload];
            else newLacks[action.payload] = true;
            return { ...state, currentLacks: newLacks };
        default: return state;
    }
}

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const chatSessionRef = useRef<Chat | null>(null);
  const { products, logEvent, updateSession, currentSessionId, masterConfigs, user, isAdmin, login, logout } = useAdmin();

  const skinConcernsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'skin_concerns' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : SKIN_CONCERNS;
  }, [masterConfigs]);

  const idealGoalsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'ideal_goals' && c.isActive);
    return list.length > 0 ? list : IDEAL_SKIN_GOALS;
  }, [masterConfigs]);

  const lifestyleFactorsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'lifestyle_factors' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : LIFESTYLE_FACTORS;
  }, [masterConfigs]);

  const dissatisfactionsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'dissatisfactions' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : CURRENT_LACKS;
  }, [masterConfigs]);

  const troubleHistoryList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'trouble_history' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : TROUBLE_HISTORY_OPTIONS;
  }, [masterConfigs]);

  const concernTimingsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'concern_timings' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : CONCERN_TIMINGS;
  }, [masterConfigs]);

  const currentLacksList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'current_lacks' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : CURRENT_LACKS;
  }, [masterConfigs]);

  const usageDurationsList = useMemo(() => {
    const list = masterConfigs.filter(c => c.category === 'usage_durations' && c.isActive).map(c => c.label);
    return list.length > 0 ? list : PRODUCT_USAGE_DURATIONS;
  }, [masterConfigs]);

  const [activeChart, setActiveChart] = useState<'radar' | 'bar'>('radar');

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  useEffect(() => {
      updateSession(currentSessionId, {
          demographics: {
              ageGroup: state.ageGroup,
              skinType: state.skinType,
              skinConcerns: Object.keys(state.skinConcerns),
              knowledgeLevel: state.knowledgeLevel
          },
          // FIX: Changed state.selectedGoal to state.selectedIdealGoal to match AppState property
          selectedGoal: state.selectedIdealGoal,
          currentProducts: state.currentUserProducts,
          dissatisfactions: Object.keys(state.dissatisfactions),
          chatHistory: state.chatHistory,
          currentStep: state.currentView === 'consultation' ? 'consultation-form' : state.currentView,
          selectedSerumId: state.selectedSerum?.id,
          selectedFoundationAmpouleIds: state.selectedFoundationAmpoules.map(a => a.id),
          selectedPerformanceAmpouleIds: state.selectedPerformanceAmpoules.map(a => a.id)
      });
  }, [state.ageGroup, state.skinType, state.skinConcerns, state.knowledgeLevel, state.selectedIdealGoal, state.currentUserProducts, state.dissatisfactions, state.chatHistory, state.currentView, updateSession, currentSessionId]);

  const createCartFromCurrentState = useCallback(() => {
    const newCart: CartItem[] = [];
    if (!state.selectedSerum) return newCart;
    const serumPrice = state.purchaseType === 'subscription' ? (state.selectedSerum.subscriptionPrice || state.selectedSerum.price) : state.selectedSerum.price;
    newCart.push({ product: state.selectedSerum, quantity: 1, priceAtPurchase: serumPrice });
    if (state.purchaseType === 'subscription') {
        const isFreeFoundationEligible = state.selectedPerformanceAmpoules.length === 0;
        const sortedFoundation = [...state.selectedFoundationAmpoules].sort((a, b) => a.id.localeCompare(b.id));
        sortedFoundation.forEach((amp, index) => {
            const price = (isFreeFoundationEligible && index === 0) ? 0 : amp.price;
            newCart.push({ product: amp, quantity: 1, priceAtPurchase: price });
        });
        state.selectedPerformanceAmpoules.forEach(amp => {
            newCart.push({ product: amp, quantity: 1, priceAtPurchase: amp.price });
        });
    }
    return newCart;
  }, [state.selectedSerum, state.selectedFoundationAmpoules, state.selectedPerformanceAmpoules, state.purchaseType]);

  const calculateTotal = useMemo(() => {
    const cart = createCartFromCurrentState();
    return cart.reduce((sum, item) => sum + (item.priceAtPurchase ?? item.product.price) * item.quantity, 0);
  }, [createCartFromCurrentState]);

  const handleStartConsultation = (type: 'concerns' | 'ideal') => {
    logEvent(currentSessionId, 'VIEW_STEP', { step: 'consultation_start', type });
    dispatch({ type: 'SET_CONSULTATION_TYPE', payload: type });
    dispatch({ type: 'SET_VIEW', payload: 'consultation' });
  };
  
  const handleLogoClick = () => {
      dispatch({ type: 'SET_VIEW', payload: 'welcome' });
  };

  const radarChartData = useMemo(() => {
    if (!state.selectedSerum || !state.fullPlanScores) return [];
    const data = [{ name: '美容液のみ', scores: state.selectedSerum.baseScores }];
    const hasAmpoules = (state.selectedFoundationAmpoules.length > 0 || state.selectedPerformanceAmpoules.length > 0) && state.purchaseType === 'subscription';
    if (hasAmpoules) data.push({ name: 'アンプル追加後', scores: state.fullPlanScores });
    else data[0].name = 'あなたのEVOLUREプラン';
    if (state.analyzedUserProducts) state.analyzedUserProducts.forEach(comp => data.push({ name: comp.name, scores: comp.scores }));
    return data;
  }, [state.selectedSerum, state.fullPlanScores, state.selectedFoundationAmpoules, state.selectedPerformanceAmpoules, state.analyzedUserProducts, state.purchaseType]);

  const barChartData = useMemo(() => {
      if (!state.selectedSerum || !state.fullPlanScores) return [];
      const hasAmpoules = (state.selectedFoundationAmpoules.length > 0 || state.selectedPerformanceAmpoules.length > 0) && state.purchaseType === 'subscription';
      return SCORE_CATEGORY_KEYS.map(category => {
          const item: any = { subject: category };
          const baseScore = state.selectedSerum!.baseScores[category] || 0;
          item['美容液'] = baseScore;
          if (hasAmpoules) {
              const fullScore = state.fullPlanScores![category] || 0;
              item['アンプル追加分'] = Math.max(0, fullScore - baseScore);
          } else item['あなたのEVOLUREプラン'] = baseScore;
          if (state.analyzedUserProducts) state.analyzedUserProducts.forEach(comp => item[comp.name] = comp.scores[category] || 0);
          return item;
      });
  }, [state.selectedSerum, state.fullPlanScores, state.selectedFoundationAmpoules, state.selectedPerformanceAmpoules, state.analyzedUserProducts, state.purchaseType]);


  const handleSendChatMessage = async () => {
    if (!state.chatInput.trim()) return;
    const userMessage = state.chatInput;
    dispatch({ type: 'SET_CHAT_INPUT', payload: '' });
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'user', content: userMessage, timestamp: Date.now() } });
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });
    logEvent(currentSessionId, 'CHAT_MESSAGE_SENT', { content: userMessage });
    try {
        const stream = await sendChatMessageStream(chatSessionRef.current, userMessage);
        let fullResponse = '';
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'model', content: '', timestamp: Date.now() } });
        for await (const chunk of stream) {
            fullResponse += chunk.text;
            dispatch({ type: 'REMOVE_FROM_CART', payload: -1 });
        }
         dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { role: 'model', content: fullResponse, timestamp: Date.now() } });
         logEvent(currentSessionId, 'CHAT_MESSAGE_RECEIVED', { content: fullResponse });
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try { handleChatCommand(JSON.parse(jsonMatch[1])); } catch (e) { console.error(e); }
        }
    } catch (error) { toast.error('メッセージの送信に失敗しました'); }
    finally { dispatch({ type: 'SET_CHAT_LOADING', payload: false }); }
  };

  const handleChatCommand = (command: any) => {
      if (command.action === 'start_consultation') {
          const p = command.payload;
          if (p.type) dispatch({ type: 'SET_CONSULTATION_TYPE', payload: p.type });
          if (p.ageGroup) dispatch({ type: 'SET_AGE_GROUP', payload: p.ageGroup });
          if (p.skinConcerns) Object.entries(p.skinConcerns).forEach(([k, v]) => dispatch({ type: 'SET_SKIN_CONCERN', payload: { concern: k, severity: Number(v) } }));
          if (p.knowledgeLevel) dispatch({ type: 'SET_KNOWLEDGE_LEVEL', payload: p.knowledgeLevel });
          const input: ConsultationInput = {
               type: p.type, ageGroup: p.ageGroup || '30代前半', skinType: '混合肌', skinConcerns: p.skinConcerns || {}, lifestyleFactors: [], knowledgeLevel: p.knowledgeLevel || 1, troubleHistory: '特になし', concernTimings: []
           } as any;
           dispatch({ type: 'SET_CONSULTATION_INPUT', payload: input });
           runFullConsultationFlow(input);
      }
  };

  const runFullConsultationFlow = async (input: ConsultationInput) => {
      dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
      dispatch({ type: 'SET_MEDICAL_CHART_LOADING', payload: true });
      logEvent(currentSessionId, 'GENERATE_PLAN', { input });
      
      // Prepare dynamic data from admin settings
      const allDynamicProducts = [...products.serums, ...products.foundationAmpoules, ...products.performanceAmpoules];
      const dynamicMasterConfigs: Record<string, string[]> = {};
      masterConfigs.forEach(config => {
          if (!dynamicMasterConfigs[config.category]) dynamicMasterConfigs[config.category] = [];
          if (config.isActive) dynamicMasterConfigs[config.category].push(config.label);
      });

      try {
        const response = await runFullConsultation(input, allDynamicProducts, dynamicMasterConfigs);
        if (response && response.recommendations && response.recommendations.serumId) {
            const serum = products.serums.find(s => s.id === response.recommendations.serumId && s.isPublished !== false);
            if (serum) dispatch({ type: 'SET_SELECTED_SERUM', payload: serum });
            if(Array.isArray(response.recommendations.ampouleIds)){
                response.recommendations.ampouleIds.forEach(id => {
                    const fAmp = products.foundationAmpoules.find(a => a.id === id && a.isPublished !== false);
                    if (fAmp) dispatch({ type: 'TOGGLE_FOUNDATION_AMPOULE', payload: fAmp });
                    const pAmp = products.performanceAmpoules.find(a => a.id === id && a.isPublished !== false);
                    if (pAmp) dispatch({ type: 'TOGGLE_PERFORMANCE_AMPOULE', payload: pAmp });
                });
            }
            // Set medical chart report with fallback
            if (response.medicalChartReport && response.medicalChartReport.summaryBullets) {
                dispatch({ type: 'SET_MEDICAL_CHART_REPORT', payload: response.medicalChartReport });
            } else {
                // Fallback: If chart is missing or incomplete, regenerate it automatically
                const serum = products.serums.find(s => s.id === response.recommendations.serumId);
                const ampouleIds = response.recommendations.ampouleIds || [];
                const ampoules = [
                    ...products.foundationAmpoules.filter(a => ampouleIds.includes(a.id)),
                    ...products.performanceAmpoules.filter(a => ampouleIds.includes(a.id))
                ];
                if (serum) {
                    try {
                        const report = await regenerateMedicalChart(input, serum, ampoules, allDynamicProducts);
                        dispatch({ type: 'SET_MEDICAL_CHART_REPORT', payload: report });
                    } catch (err) {
                        console.error("Failed to regenerate missing medical chart:", err);
                    }
                }
            }
            dispatch({ type: 'SET_CART', payload: createCartFromCurrentState() });
        } else throw new Error("Invalid response");
      } catch (error) { toast.error("診断の生成に失敗しました。"); dispatch({ type: 'SET_VIEW', payload: 'welcome' }); }
      finally { dispatch({ type: 'SET_MEDICAL_CHART_LOADING', payload: false }); }
  };

  const handleFinishConsultation = () => {
      if (!state.ageGroup || !state.skinType) {
          toast.error("基本情報を入力してください");
          return;
      }
      const input: ConsultationInput = {
          type: state.consultationType as any,
          ageGroup: state.ageGroup,
          skinType: state.skinType,
          knowledgeLevel: state.knowledgeLevel,
          troubleHistory: state.troubleHistory,
          ...(state.consultationType === 'concerns' ? {
              skinConcerns: state.skinConcerns,
              lifestyleFactors: Object.keys(state.lifestyleFactors),
              concernTimings: Object.keys(state.concernTimings)
          } : {}),
           ...(state.consultationType === 'ideal' ? {
              idealSkin: idealGoalsList.find(g => g.id === state.selectedIdealGoal)?.label || '',
              skinConcerns: state.skinConcerns,
              lifestyleFactors: Object.keys(state.lifestyleFactors),
              currentLacks: Object.keys(state.currentLacks)
          } : {})
      } as any;
      dispatch({ type: 'SET_CONSULTATION_INPUT', payload: input });
      runFullConsultationFlow(input);
  };
  
  useEffect(() => {
      if (!state.selectedSerum) return;
      const baseScores = { ...state.selectedSerum.baseScores };
      if (state.purchaseType === 'subscription') {
          const allAmpoules = [...state.selectedFoundationAmpoules, ...state.selectedPerformanceAmpoules];
          allAmpoules.forEach(amp => {
              Object.entries(amp.boosts).forEach(([key, value]) => {
                  const k = key as keyof Score;
                  baseScores[k] = Math.min(100, (baseScores[k] || 0) + (value || 0));
              });
          });
      }
      dispatch({ type: 'SET_FULL_PLAN_SCORES', payload: baseScores });
  }, [state.selectedSerum, state.selectedFoundationAmpoules, state.selectedPerformanceAmpoules, state.purchaseType]);


  const handleCameraCapture = (dataUrl: string) => {
      if (state.cameraCaptureHandler) state.cameraCaptureHandler(dataUrl);
      dispatch({ type: 'SET_CAMERA_OPEN', payload: false });
  };

  if (state.currentView === 'admin') {
      if (isAdmin) return <AdminDashboard onExit={() => dispatch({ type: 'SET_VIEW', payload: 'welcome' })} />;
      else {
          dispatch({ type: 'SET_VIEW', payload: 'welcome' });
          toast.error("管理者権限がありません");
          return null;
      }
  }

  const Header = () => (
    <header className="bg-white sticky top-0 z-30 w-full border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
                <div className="w-10 h-10 bg-stone-900 rounded-md flex items-center justify-center text-white"><Cylinder size={20} className="text-white" /></div>
                <div className="flex flex-col">
                    <span className="font-serif font-bold text-lg tracking-wider leading-none text-stone-900">EVOLURE</span>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-stone-500 leading-none mt-1">PERSONAL SKIN LAB</span>
                </div>
            </div>
            <div className="flex items-center gap-6 md:gap-8">
                <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'ingredientLab' })} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"><Sparkles size={16} /><span className="hidden md:inline">コスメ鑑定</span></button>
                <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'welcome' })} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"><RefreshCw size={16} /><span className="hidden md:inline">はじめから</span></button>
                <button onClick={() => dispatch({ type: 'TOGGLE_CART', payload: true })} className="relative text-stone-900 hover:text-stone-600 transition-colors">
                    <ShoppingCart size={20} />
                    {state.cart.length > 0 && <span className="absolute -top-2 -right-2 bg-stone-900 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold border-2 border-white">{state.cart.length}</span>}
                </button>
            </div>
        </div>
    </header>
  );

  const publishedSerums = products.serums.filter(s => s.isPublished !== false);
  const publishedFoundationAmpoules = products.foundationAmpoules.filter(a => a.isPublished !== false);
  const publishedPerformanceAmpoules = products.performanceAmpoules.filter(a => a.isPublished !== false);

  return (
    <div className="h-screen overflow-y-auto bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
      <Toaster position="top-center" toastOptions={{ className: 'font-sans text-sm', duration: 3000 }} />
      <CartDrawer isOpen={state.isCartOpen} onClose={() => dispatch({ type: 'TOGGLE_CART', payload: false })} cart={state.cart} onRemoveItem={(index) => dispatch({ type: 'REMOVE_FROM_CART', payload: index })} />
      <GlobalChatModal isOpen={state.isChatOpen} onClose={() => dispatch({ type: 'TOGGLE_CHAT', payload: false })} chatHistory={state.chatHistory} chatInput={state.chatInput} onChatInputChange={(v) => dispatch({ type: 'SET_CHAT_INPUT', payload: v })} onSendChatMessage={handleSendChatMessage} isChatLoading={state.isChatLoading} onSuggestionClick={(q) => dispatch({ type: 'SET_CHAT_INPUT', payload: q })} currentView={state.currentView} selectedSerum={state.selectedSerum} selectedFoundationAmpoules={state.selectedFoundationAmpoules} selectedPerformanceAmpoules={state.selectedPerformanceAmpoules} />
      <ChatFAB onClick={() => { logEvent(currentSessionId, 'CHAT_OPEN'); dispatch({ type: 'TOGGLE_CHAT', payload: true }); }} />
      {state.currentView !== 'ingredientLab' && <Header />}

      {state.currentView === 'welcome' && (
        <main className="max-w-7xl mx-auto px-6 py-20 animate-fade-in-up">
            <div className="text-center mb-24 space-y-6">
                <h1 onClick={handleLogoClick} className="text-6xl md:text-7xl font-serif font-medium text-stone-900 tracking-tight cursor-default select-none leading-tight">Science meets<br/>Personalization.</h1>
                <div className="space-y-2 text-stone-500 font-medium"><p>AIによる多角的な肌分析で、あなただけのスキンケアレシピを。</p><p>EVOLURE Personal Skin Labへようこそ。</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <button onClick={() => handleStartConsultation('concerns')} className="bg-white p-8 rounded-3xl border border-stone-100 shadow-lg shadow-stone-100/50 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-300 text-left group flex flex-col h-full">
                    <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-stone-900 group-hover:text-white transition-colors"><User size={28} strokeWidth={1.5} /></div>
                    <h3 className="text-xl font-bold text-stone-900 mb-3 font-serif">肌悩みから</h3>
                    <p className="text-sm text-stone-500 leading-relaxed mb-8 flex-grow">現在の肌状態やビデオ解析から、<br/>最適なソリューションを導き出します。</p>
                    <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-900 uppercase mt-auto group-hover:gap-3 transition-all">START <ArrowRight size={14} /></div>
                </button>
                <button onClick={() => handleStartConsultation('ideal')} className="bg-white p-8 rounded-3xl border border-stone-100 shadow-lg shadow-stone-100/50 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-300 text-left group flex flex-col h-full">
                    <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-stone-900 group-hover:text-white transition-colors"><Target size={28} strokeWidth={1.5} /></div>
                    <h3 className="text-xl font-bold text-stone-900 mb-3 font-serif">理想の肌から</h3>
                    <p className="text-sm text-stone-500 leading-relaxed mb-8 flex-grow">なりたい肌のイメージとライフスタイルから、未来を見据えたプランを設計します。</p>
                    <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-900 uppercase mt-auto group-hover:gap-3 transition-all">START <ArrowRight size={14} /></div>
                </button>
            </div>
        </main>
      )}
      
      {state.currentView === 'ingredientLab' && (
          <div className="min-h-screen bg-stone-50">
              <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
                  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'welcome' })}>
                          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white font-serif font-bold">E</div>
                          <span className="font-serif font-bold text-xl tracking-tight">EVOLURE</span>
                      </div>
                      <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'welcome' })} className="p-2 text-stone-400 hover:text-stone-900"><X /></button>
                  </div>
              </header>
              <IngredientLab setIsCameraOpen={(open) => dispatch({ type: 'SET_CAMERA_OPEN', payload: open })} setCameraCaptureHandler={(handler) => dispatch({ type: 'SET_CAMERA_HANDLER', payload: handler })} />
          </div>
      )}

      {state.currentView === 'consultation' && (
         <div className="min-h-screen bg-stone-50 flex flex-col">
            <div className="text-center pt-12 pb-8 bg-stone-50">
                <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Personal Consultation</h1>
                <p className="text-stone-500 text-sm">あなたの肌と好みに合わせた最適なレシピを設計します</p>
            </div>

            <main className="flex-grow max-w-3xl mx-auto w-full p-6 md:p-12 pb-80">
                <div className="space-y-12">
                    {/* STEP 1: TELL US ABOUT YOURSELF (INTEGRATED) */}
                    <ConsultationStep step={1} title="お客様について教えてください。">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-4">化粧品に関する知識レベル / 説明の詳細度</label>
                                <div className="space-y-3">
                                    {KNOWLEDGE_SCALE.map(k => (
                                        <button
                                            key={k.level}
                                            onClick={() => dispatch({ type: 'SET_KNOWLEDGE_LEVEL', payload: k.level })}
                                            className={`w-full p-4 rounded-xl border text-left transition-all group ${state.knowledgeLevel === k.level ? 'bg-stone-900 border-stone-900 shadow-lg' : 'bg-white border-stone-200 hover:border-stone-400'}`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className={`font-bold ${state.knowledgeLevel === k.level ? 'text-white' : 'text-stone-900'}`}>{k.label}</h4>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${i <= k.level ? (state.knowledgeLevel === k.level ? 'bg-blue-400' : 'bg-stone-800') : 'bg-stone-200'}`}></div>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className={`text-xs ${state.knowledgeLevel === k.level ? 'text-stone-400' : 'text-stone-500'}`}>{k.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-stone-600 mb-3">年代</label>
                                    <select 
                                        value={state.ageGroup}
                                        onChange={e => dispatch({ type: 'SET_AGE_GROUP', payload: e.target.value })}
                                        className="w-full p-4 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-stone-900 outline-none"
                                    >
                                        <option value="">選択してください</option>
                                        {AGE_GROUPS.map(age => <option key={age} value={age}>{age}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-600 mb-3">肌質</label>
                                    <select 
                                        value={state.skinType}
                                        onChange={e => dispatch({ type: 'SET_SKIN_TYPE', payload: e.target.value })}
                                        className="w-full p-4 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-stone-900 outline-none"
                                    >
                                        <option value="">選択してください</option>
                                        {SKIN_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </ConsultationStep>

                    {/* STEP 2: DYNAMIC CORE */}
                    <ConsultationStep step={2} title={state.consultationType === 'ideal' ? 'なりたい肌の目標' : '現在のお肌の状態'}>
                        {state.consultationType === 'concerns' ? (
                            <div className="space-y-8">
                                <button 
                                    onClick={() => {
                                        dispatch({ type: 'SET_CAMERA_HANDLER', payload: async (url) => {
                                            toast.loading('ビデオを分析中...');
                                            try {
                                                const result = await analyzeSkinFromVideo(url);
                                                Object.entries(result).forEach(([concern, score]) => { if (score > 0) dispatch({ type: 'SET_SKIN_CONCERN', payload: { concern, severity: score } }); });
                                                toast.dismiss(); toast.success('分析が完了しました');
                                            } catch (e) { toast.dismiss(); toast.error('分析に失敗しました'); }
                                        }});
                                        dispatch({ type: 'SET_CAMERA_MODE', payload: 'video' });
                                        dispatch({ type: 'SET_CAMERA_OPEN', payload: true });
                                    }}
                                    className="w-full bg-stone-800 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-900 transition-colors shadow-lg"
                                >
                                    <Video size={20} />ビデオ撮影で自動分析
                                </button>
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-stone-600 mb-3">肌悩みと深刻度 (1-5)</label>
                                    {skinConcernsList.map(concern => (
                                        <div key={concern} className="flex items-center justify-between py-4 border-b border-stone-100 last:border-0">
                                            <label className="font-medium text-stone-900 text-sm">{concern}</label>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map(level => (
                                                    <button key={level} onClick={() => dispatch({ type: 'SET_SKIN_CONCERN', payload: { concern, severity: state.skinConcerns[concern] === level ? 0 : level } })} className={`w-8 h-8 rounded-md font-bold text-xs transition-all ${state.skinConcerns[concern] === level ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>{level}</button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-4">
                                {idealGoalsList.map(goal => (
                                    <button key={goal.id} onClick={() => dispatch({ type: 'SET_IDEAL_GOAL', payload: goal.id })} className={`w-full p-6 rounded-xl border text-left transition-all ${state.selectedIdealGoal === goal.id ? 'bg-stone-900 border-stone-900 shadow-lg text-white' : 'bg-white border-stone-200 hover:border-stone-400'}`}>
                                        <h3 className="text-lg font-bold font-serif mb-1">{goal.label}</h3>
                                        <p className={`text-sm ${state.selectedIdealGoal === goal.id ? 'text-stone-400' : 'text-stone-500'}`}>{goal.description}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ConsultationStep>

                    {/* STEP 3: LIFESTYLE & HISTORY */}
                    <ConsultationStep step={3} title="習慣と履歴">
                         <div className="space-y-8">
                             <div>
                                <label className="block text-sm font-bold text-stone-600 mb-3">気になる生活習慣</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {lifestyleFactorsList.map(factor => (
                                        <button key={factor} onClick={() => dispatch({ type: 'TOGGLE_LIFESTYLE_FACTOR', payload: factor })} className={`p-4 rounded-xl border text-left font-medium transition-all ${state.lifestyleFactors[factor] ? 'bg-stone-100 border-stone-400 text-stone-900 shadow-sm' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'}`}>{factor}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-3">過去の肌トラブル経験</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {troubleHistoryList.map(opt => (
                                        <button key={opt} onClick={() => dispatch({ type: 'SET_TROUBLE_HISTORY', payload: opt })} className={`p-4 rounded-xl border text-left font-medium transition-all ${state.troubleHistory === opt ? 'bg-stone-800 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                         </div>
                    </ConsultationStep>

                    {/* STEP 4: DETAILED CONTEXT (CONDITIONALLY VISIBLE) */}
                    {state.knowledgeLevel >= 3 && (
                        <ConsultationStep step={4} title="追加の分析コンテキスト">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-sm font-bold text-stone-600 mb-3">悩みが気になるタイミング</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{concernTimingsList.map(timing => <button key={timing} onClick={() => dispatch({ type: 'TOGGLE_CONCERN_TIMING', payload: timing })} className={`p-4 rounded-xl border text-left font-medium transition-all ${state.concernTimings[timing] ? 'bg-stone-100 border-stone-400 text-stone-900' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'}`}>{timing}</button>)}</div>
                                    </div>
                                    {state.consultationType === 'ideal' && (
                                        <div>
                                            <label className="block text-sm font-bold text-stone-600 mb-3">現在足りないと感じる要素</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{currentLacksList.map(lack => <button key={lack} onClick={() => dispatch({ type: 'TOGGLE_CURRENT_LACK', payload: lack })} className={`p-4 rounded-xl border text-left font-medium transition-all ${state.currentLacks[lack] ? 'bg-stone-100 border-stone-400 text-stone-900' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'}`}>{lack}</button>)}</div>
                                        </div>
                                    )}
                                </div>
                        </ConsultationStep>
                    )}

                    <div className="h-64"></div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-200 p-4 md:p-6 z-20">
                <div className="max-w-3xl mx-auto flex justify-between gap-4">
                    <button 
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'welcome' })}
                        className="px-6 py-4 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                    >
                        Back to Home
                    </button>
                    <button 
                        onClick={handleFinishConsultation}
                        className="flex-grow bg-stone-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <span>Generate Plan</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </footer>
         </div>
      )}

      {state.currentView === 'dashboard' && (
          <>
            {state.isMedicalChartLoading && !state.selectedSerum ? (
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 animate-fade-in">
                   <LoadingSpinner size="lg" />
                   <h2 className="mt-8 text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight animate-pulse">AI Analysis in Progress...</h2>
                   <p className="mt-4 text-stone-500 text-center max-w-md leading-relaxed">あなたの肌悩み、ライフスタイル、目標を分析し、最適な成分構成とパーソナライズされた処方を設計しています。</p>
               </div>
            ) : state.selectedSerum && (
               <div className="min-h-screen bg-stone-50 pb-20">
                   <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                       <div className="grid md:grid-cols-12 gap-8">
                           <div className="md:col-span-7 space-y-6">
                                <MedicalChartSummary report={state.medicalChartReport} isLoading={state.isMedicalChartLoading} onOpenModal={() => dispatch({ type: 'SET_MEDICAL_CHART_MODAL', payload: true })} onRegenerate={async () => {
                                    if (!state.selectedSerum) return;
                                    dispatch({ type: 'SET_MEDICAL_CHART_LOADING', payload: true });
                                    const allDynamicProducts = [...products.serums, ...products.foundationAmpoules, ...products.performanceAmpoules];
                                    try { if (state.consultationInput) dispatch({ type: 'SET_MEDICAL_CHART_REPORT', payload: await regenerateMedicalChart(state.consultationInput, state.selectedSerum, state.purchaseType === 'subscription' ? [...state.selectedFoundationAmpoules, ...state.selectedPerformanceAmpoules] : [], allDynamicProducts) }); } catch(e) { console.error(e); } finally { dispatch({ type: 'SET_MEDICAL_CHART_LOADING', payload: false }); }
                                }} />
                                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
                                   <div className="absolute top-0 left-0 w-full h-1 bg-stone-100"></div>
                                   <div className="flex justify-between items-center mb-6">
                                       <h3 className="text-2xl font-serif font-bold text-stone-900">Analysis Data</h3>
                                       <div className="flex bg-stone-100 p-1 rounded-lg">
                                           <button onClick={() => setActiveChart('radar')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeChart === 'radar' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Radar</button>
                                           <button onClick={() => setActiveChart('bar')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeChart === 'bar' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Bar</button>
                                       </div>
                                   </div>
                                   <div className="h-[400px]">{state.fullPlanScores && (activeChart === 'radar' ? <RadarChartComponent data={radarChartData} categories={SCORE_CATEGORY_KEYS} /> : <BarChartComponent data={barChartData} hasAmpoules={state.purchaseType === 'subscription' && (state.selectedFoundationAmpoules.length > 0 || state.selectedPerformanceAmpoules.length > 0)} />)}</div>
                               </div>
                           </div>
                           <div className="md:col-span-5 space-y-6">
                               <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl sticky top-24">
                                    <div className="flex items-center gap-3 mb-8"><Cylinder size={24} className="text-stone-900" /><h3 className="text-2xl font-serif font-bold text-stone-900">Your Plan</h3></div>
                                    <div className="mb-6"><p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">BASE SERUM</p><div className="p-4 bg-stone-50 rounded-xl border border-stone-100"><p className="font-bold text-stone-900">{state.selectedSerum.name}</p></div></div>
                                    <div className="mb-8"><p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">AMPOULES</p><div className="p-4 bg-stone-50 rounded-xl border border-stone-100">{state.purchaseType === 'subscription' && [...state.selectedFoundationAmpoules, ...state.selectedPerformanceAmpoules].length > 0 ? <ul className="space-y-2">{[...state.selectedFoundationAmpoules, ...state.selectedPerformanceAmpoules].map(a => <li key={a.id} className="flex items-center gap-2 text-sm font-medium text-stone-700"><div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>{a.name}</li>)}</ul> : <p className="text-sm text-stone-400 italic">{state.purchaseType === 'one-time' ? '都度購入ではアンプルを選択できません' : 'No ampoules selected'}</p>}</div></div>
                                    <button onClick={() => { dispatch({ type: 'SET_PLAN_BEFORE_EDIT', payload: state }); dispatch({ type: 'SET_PLAN_SELECTION_MODAL', payload: true }); }} className="w-full border border-stone-200 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 mb-8"><Edit size={16} />プランを編集</button>
                                    <hr className="border-stone-100 mb-6" />
                                    <div className="flex bg-stone-100 p-1 rounded-xl mb-6"><button onClick={() => dispatch({ type: 'SET_PURCHASE_TYPE', payload: 'subscription' })} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${state.purchaseType === 'subscription' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>定期配送</button><button onClick={() => dispatch({ type: 'SET_PURCHASE_TYPE', payload: 'one-time' })} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${state.purchaseType === 'one-time' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>都度購入</button></div>
                                    <div className="flex flex-col gap-1 mb-6">
                                        <div className="flex justify-between items-end">
                                            <span className="text-stone-500 text-sm">税抜価格</span>
                                            <span className="text-stone-600 font-medium">{(calculateTotal / 1.1).toLocaleString(undefined, { maximumFractionDigits: 0 })} 円</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-stone-500 text-sm">消費税 (10%)</span>
                                            <span className="text-stone-600 font-medium">{(calculateTotal - (calculateTotal / 1.1)).toLocaleString(undefined, { maximumFractionDigits: 0 })} 円</span>
                                        </div>
                                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-100">
                                            <span className="font-bold text-stone-500">合計 (税込)</span>
                                            <span className="text-3xl font-bold text-stone-900">{calculateTotal.toLocaleString()}<span className="text-sm font-normal text-stone-400 ml-1">円</span></span>
                                        </div>
                                    </div>
                                    <button onClick={() => { dispatch({ type: 'SET_CART', payload: createCartFromCurrentState() }); dispatch({ type: 'TOGGLE_CART', payload: true }); toast.success("カートに追加しました"); }} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"><ShoppingCart size={18} />カートに追加</button>
                                </div>
                           </div>
                       </div>
                   </main>
               </div>
            )}
          </>
      )}

      <MedicalChartModal isOpen={state.isMedicalChartModalOpen} onClose={() => dispatch({ type: 'SET_MEDICAL_CHART_MODAL', payload: false })} report={state.medicalChartReport} userInfo={{ ageGroup: state.ageGroup, skinType: state.skinType, skinConcerns: state.skinConcerns, knowledgeLevel: state.knowledgeLevel, consultationType: state.consultationType, idealSkinGoal: IDEAL_SKIN_GOALS.find(g => g.id === state.selectedIdealGoal)?.label || '' }} products={createCartFromCurrentState()} total={calculateTotal} isLoading={state.isMedicalChartLoading} analyzedUserProducts={state.analyzedUserProducts} fullPlanScores={state.fullPlanScores} onAddToCart={() => { dispatch({ type: 'SET_CART', payload: createCartFromCurrentState() }); dispatch({ type: 'TOGGLE_CART', payload: true }); toast.success("追加しました"); }} />
      <PlanSelectionModal isOpen={state.isPlanSelectionModalOpen} onClose={() => dispatch({ type: 'SET_PLAN_SELECTION_MODAL', payload: false })} selectedSerum={state.selectedSerum} onSelectSerum={(s) => dispatch({ type: 'SET_SELECTED_SERUM', payload: s })} selectedFoundationAmpoules={state.selectedFoundationAmpoules} onToggleFoundationAmpoule={(a) => dispatch({ type: 'TOGGLE_FOUNDATION_AMPOULE', payload: a })} selectedPerformanceAmpoules={state.selectedPerformanceAmpoules} onTogglePerformanceAmpoule={(a) => dispatch({ type: 'TOGGLE_PERFORMANCE_AMPOULE', payload: a })} recommendationReasons={state.recommendationReasons} purchaseType={state.purchaseType} onSetPurchaseType={(type) => dispatch({ type: 'SET_PURCHASE_TYPE', payload: type })} availableSerums={publishedSerums} availableFoundationAmpoules={publishedFoundationAmpoules} availablePerformanceAmpoules={publishedPerformanceAmpoules} fullPlanScores={state.fullPlanScores} analyzedUserProducts={state.analyzedUserProducts} />
      <CameraCapture isOpen={state.isCameraOpen} onClose={() => dispatch({ type: 'SET_CAMERA_OPEN', payload: false })} onMediaCaptured={handleCameraCapture} mode={state.cameraMode} />
      <CompetitorReportModal isOpen={state.isCompetitorReportModalOpen} onClose={() => dispatch({ type: 'CLOSE_COMPETITOR_REPORT' })} competitor={state.selectedCompetitorReport} userPlan={state.fullPlanScores ? { name: 'EVOLUREプラン', scores: state.fullPlanScores } : null} />
      
      {/* Footer / Admin Access */}
      <footer className="bg-stone-100 py-12 border-t border-stone-200">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                      <Cylinder size={16} className="text-stone-400" />
                      <span className="font-serif font-bold text-stone-900 tracking-wider">EVOLURE</span>
                  </div>
                  <p className="text-xs text-stone-400">© 2026 EVOLURE Personal Skin Lab. All rights reserved.</p>
              </div>
              
              <div className="flex items-center gap-6">
                  {user ? (
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              {user.photoURL ? (
                                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-stone-200" referrerPolicy="no-referrer" />
                              ) : (
                                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500"><User size={16} /></div>
                              )}
                              <div className="flex flex-col">
                                  <span className="text-xs font-bold text-stone-900">{user.displayName}</span>
                                  <span className="text-[10px] text-stone-400">{isAdmin ? 'Administrator' : 'User'}</span>
                              </div>
                          </div>
                          {isAdmin && (
                              <button 
                                  onClick={() => dispatch({ type: 'SET_VIEW', payload: 'admin' })}
                                  className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors"
                              >
                                  <SlidersHorizontal size={14} />
                                  管理画面
                              </button>
                          )}
                          <button 
                              onClick={logout}
                              className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                          >
                              ログアウト
                          </button>
                      </div>
                  ) : (
                      <button 
                          onClick={login}
                          className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-2 transition-colors"
                      >
                          <Lock size={14} />
                          管理者ログイン
                      </button>
                  )}
              </div>
          </div>
      </footer>
    </div>
  );
};