import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { analyzeUserLogs, analyzeIngredients, extractProductFromDocument } from '../../services/geminiService';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Settings, BarChart2, Database, ArrowLeft, Loader2, Sparkles, PlusCircle, EyeOff, LogOut, Filter, Download, TrendingUp, Users, Target, Activity, X, Upload, FileText, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ProductFormModal } from './ProductFormModal';
import { MasterConfigTab } from './MasterConfigTab';
import { calculateScoreFromIngredients } from '../../constants';
import { Serum, Ampoule, UserSession } from '../../types';

interface AdminDashboardProps {
    onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const { products, sessions, logs, masterConfigs, addMasterConfig, updateMasterConfig, deleteMasterConfig, addProduct, updateProduct, deleteProduct, isAdmin, isAuthLoading, login, logout, user } = useAdmin();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'ai' | 'master'>('dashboard');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isDashboardAnalyzing, setIsDashboardAnalyzing] = useState(false);
    const [dashboardAiReport, setDashboardAiReport] = useState<string | null>(null);

    // Filter State
    const [filters, setFilters] = useState({
        dateRange: 'all', // 'today', '7d', '30d', 'all'
        ageGroup: 'all',
        skinType: 'all'
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Serum | Ampoule | null>(null);
    const [modalType, setModalType] = useState<'serum' | 'foundation' | 'performance'>('serum');

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importType, setImportType] = useState<'csv' | 'pdf'>('csv');
    const [importData, setImportData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const handleConnect = async () => {
        try {
            await login();
        } catch (error) {
            console.error('OAuth error:', error);
            alert('Failed to initiate login. Please check your configuration.');
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center">
                <Loader2 className="animate-spin text-stone-400" size={48} />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Admin Access</h2>
                    <p className="text-stone-500 mb-8 text-sm">
                        {user 
                            ? `Access denied. Your account (${user.email}) is not authorized. Please use a @kaian.jp account.` 
                            : 'Please sign in with your Google account (@kaian.jp) to access the dashboard.'}
                    </p>
                    
                    {!user ? (
                        <button 
                            onClick={handleConnect}
                            className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    ) : (
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-stone-200 text-stone-900 font-bold py-4 rounded-xl hover:bg-stone-300 transition-colors flex items-center justify-center gap-2"
                        >
                            Switch Account / Logout
                        </button>
                    )}
                    <button onClick={onExit} className="w-full mt-4 text-stone-500 hover:text-stone-900 text-sm font-medium">Back to App</button>
                </div>
            </div>
        );
    }

    // Filtered Data Logic
    const filteredSessions = React.useMemo(() => {
        return (sessions || []).filter(s => {
            // Date Filter
            if (filters.dateRange !== 'all') {
                const now = Date.now();
                const sessionTime = Number(s.startTime);
                const diff = now - sessionTime;
                if (filters.dateRange === 'today' && diff > 86400000) return false;
                if (filters.dateRange === '7d' && diff > 604800000) return false;
                if (filters.dateRange === '30d' && diff > 2592000000) return false;
            }
            // Age Filter
            if (filters.ageGroup !== 'all' && s.demographics?.ageGroup !== filters.ageGroup) return false;
            // Skin Type Filter
            if (filters.skinType !== 'all' && s.demographics?.skinType !== filters.skinType) return false;
            
            return true;
        });
    }, [sessions, filters]);

    const generateReport = async () => {
        setIsAnalyzing(true);
        try {
            const report = await analyzeUserLogs(logs, filteredSessions);
            setAiReport(report);
        } catch (error) {
            console.error(error);
            alert('Failed to generate report');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateDashboardInsights = async () => {
        setIsDashboardAnalyzing(true);
        try {
            const report = await analyzeUserLogs(logs, filteredSessions);
            setDashboardAiReport(report);
        } catch (error) {
            console.error(error);
            alert('Failed to generate insights');
        } finally {
            setIsDashboardAnalyzing(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Session ID', 'Start Time', 'Status', 'Step', 'Age Group', 'Skin Type', 'Concerns'];
        const rows = (filteredSessions || []).map(s => [
            s.sessionId,
            new Date(s.startTime).toLocaleString(),
            s.status,
            s.currentStep,
            s.demographics?.ageGroup || 'N/A',
            s.demographics?.skinType || 'N/A',
            (s.demographics?.skinConcerns || []).join(';')
        ]);
        
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `evolure_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditProduct = (type: 'serum' | 'foundation' | 'performance', product: Serum | Ampoule) => {
        setEditingProduct(product);
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleAddProduct = (type: 'serum' | 'foundation' | 'performance') => {
        setEditingProduct(null);
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleSaveProduct = async (product: Serum | Ampoule) => {
        // Calculate scores and concentrations automatically based on ingredients
        const ingredients = (product as any).ingredients || [];
        
        // Trigger ingredient analysis to accumulate data in Firestore
        if (ingredients.length > 0) {
            try {
                const ingredientNames = ingredients.map((ing: any) => ing.name).filter(Boolean);
                if (ingredientNames.length > 0) {
                    await analyzeIngredients(ingredientNames);
                }
            } catch (error) {
                console.error('Failed to pre-analyze ingredients:', error);
            }
        }
        
        let processedProduct = { ...product };
        // FIX: Explicitly cast percentage to number to avoid type errors in arithmetic
        const totalConcentration = ingredients.reduce((sum: number, ing: any) => sum + (Number(ing.percentage) || 0), 0);
        
        if (modalType === 'serum') {
            const serum = processedProduct as Serum;
            serum.baseScores = calculateScoreFromIngredients(ingredients, true);
            serum.totalActiveConcentration = totalConcentration;
            
            if (editingProduct) await updateProduct('serum', serum);
            else await addProduct('serum', serum);
        } else {
            const ampoule = processedProduct as Ampoule;
            ampoule.boosts = calculateScoreFromIngredients(ingredients, false);
            ampoule.totalActiveConcentration = totalConcentration;
            
            if (editingProduct) await updateProduct(modalType, ampoule);
            else await addProduct(modalType, ampoule);
        }
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setImportData(results.data);
                setIsImporting(false);
            },
            error: (error) => {
                setImportError(error.message);
                setIsImporting(false);
            }
        });
    };

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
                const result = await extractProductFromDocument(base64, file.type);
                setImportData([result]);
            } catch (error) {
                setImportError(String(error));
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const processImport = async () => {
        setIsImporting(true);
        try {
            for (const item of importData) {
                const type = item.type || 'serum';
                const product: any = {
                    id: item.id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: item.name || 'Unnamed Product',
                    description: item.description || '',
                    price: Number(item.price) || 0,
                    ingredients: item.ingredients || [],
                    category: item.category || '',
                    targetConcerns: item.targetConcerns || [],
                    isPublished: false,
                    isNew: true,
                    image: item.image || 'https://picsum.photos/seed/product/400/400'
                };

                // Auto-calculate scores
                const ingredients = product.ingredients || [];
                const totalConcentration = ingredients.reduce((sum: number, ing: any) => sum + (Number(ing.percentage) || 0), 0);
                
                if (type === 'serum') {
                    product.baseScores = calculateScoreFromIngredients(ingredients, true);
                    product.totalActiveConcentration = totalConcentration;
                    await addProduct('serum', product as Serum);
                } else {
                    product.boosts = calculateScoreFromIngredients(ingredients, false);
                    product.totalActiveConcentration = totalConcentration;
                    await addProduct(type as 'foundation' | 'performance', product as Ampoule);
                }
            }
            setIsImportModalOpen(false);
            setImportData([]);
            alert('Import completed successfully');
        } catch (error) {
            setImportError(String(error));
        } finally {
            setIsImporting(false);
        }
    };

    // Analytics Data Prep
    const completedSessions = (filteredSessions || []).filter(s => s.currentStep === 'dashboard' || s.currentStep === 'completed').length;
    const startedSessions = (filteredSessions || []).filter(s => s.currentStep !== 'welcome').length;
    const completionRate = startedSessions > 0 ? (completedSessions / startedSessions * 100).toFixed(1) : "0";
    
    // Step Drop-off Data (Funnel)
    const stepDropoffData = React.useMemo(() => {
        const steps = ['welcome', 'consultation', 'camera', 'dashboard'];
        return steps.map(step => ({
            name: step.charAt(0).toUpperCase() + step.slice(1),
            users: (filteredSessions || []).filter(s => {
                // If they reached a later step, they must have passed this one
                const stepOrder = ['welcome', 'consultation', 'camera', 'dashboard'];
                const currentIdx = stepOrder.indexOf(s.currentStep as string);
                const targetIdx = stepOrder.indexOf(step);
                return currentIdx >= targetIdx;
            }).length
        }));
    }, [filteredSessions]);

    // Top Products Data
    const topProductsData = React.useMemo(() => {
        const productCounts: Record<string, number> = {};
        (filteredSessions || []).forEach(s => {
            if (s.selectedSerumId) productCounts[s.selectedSerumId] = (productCounts[s.selectedSerumId] || 0) + 1;
            (s.selectedFoundationAmpouleIds || []).forEach(id => productCounts[id] = (productCounts[id] || 0) + 1);
            (s.selectedPerformanceAmpouleIds || []).forEach(id => productCounts[id] = (productCounts[id] || 0) + 1);
        });

        return Object.entries(productCounts || {})
            .map(([id, count]) => {
                const product = [...(products?.serums || []), ...(products?.foundationAmpoules || []), ...(products?.performanceAmpoules || [])].find(p => p.id === id);
                return { name: product?.name || id, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredSessions, products]);

    // Trend Data (Last 7 days)
    const trendData = React.useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return days.map(date => ({
            name: date.split('-').slice(1).join('/'),
            sessions: (filteredSessions || []).filter(s => new Date(s.startTime).toISOString().split('T')[0] === date).length
        }));
    }, [filteredSessions]);
    
    const ageDistribution = (filteredSessions || []).reduce((acc, s) => {
        const age = s.demographics?.ageGroup || 'Unknown';
        acc[age] = (acc[age] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const ageChartData = Object.entries(ageDistribution || {}).map(([name, value]) => ({ name, value }));

    const concernDistribution = (filteredSessions || []).reduce((acc, s) => {
        (s.demographics?.skinConcerns || []).forEach(c => {
            acc[c] = (acc[c] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);
    
    const concernChartData = Object.entries(concernDistribution || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 8);

    // Correlation: Age vs Concerns
    const correlationData = React.useMemo(() => {
        const ages = ['20s', '30s', '40s', '50s+'];
        const topConcerns = (concernChartData || []).slice(0, 3).map(c => c.name);
        
        return ages.map(age => {
            const ageSessions = (filteredSessions || []).filter(s => s.demographics?.ageGroup === age);
            const data: any = { name: age };
            topConcerns.forEach(concern => {
                data[concern] = ageSessions.filter(s => (s.demographics?.skinConcerns || []).includes(concern)).length;
            });
            return data;
        });
    }, [filteredSessions, concernChartData]);
    
    // Current Product Analysis
    const currentProductData = React.useMemo(() => {
        const counts: Record<string, number> = {};
        (filteredSessions || []).forEach(s => {
            (s.currentProducts || []).forEach(p => {
                counts[p] = (counts[p] || 0) + 1;
            });
        });
        return Object.entries(counts || {})
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 10);
    }, [filteredSessions]);

    // Dissatisfaction Analysis
    const dissatisfactionData = React.useMemo(() => {
        const counts: Record<string, number> = {};
        (filteredSessions || []).forEach(s => {
            (s.dissatisfactions || []).forEach(d => {
                counts[d] = (counts[d] || 0) + 1;
            });
        });
        return Object.entries(counts || {})
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 10);
    }, [filteredSessions]);

    const COLORS = ['#1c1917', '#44403c', '#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4'];

    return (
        <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
                    <div className="p-6 border-b border-stone-100">
                        <h1 className="font-serif font-bold text-xl text-stone-900">EVOLURE<br/><span className="text-sm font-sans font-normal text-stone-500">Admin Dashboard</span></h1>
                    </div>
                    <nav className="flex-grow p-4 space-y-2">
                        <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                            <TrendingUp size={20} /> Analytics
                        </button>
                        <button onClick={() => setActiveTab('products')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'products' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                            <Database size={20} /> Products (CMS)
                        </button>
                        <button onClick={() => setActiveTab('master')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'master' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                            <Settings size={20} /> Master Config
                        </button>
                        <button onClick={() => setActiveTab('ai')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeTab === 'ai' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                            <Sparkles size={20} /> AI R&D Insights
                        </button>
                    </nav>
                    <div className="p-4 border-t border-stone-100 space-y-2">
                        <button onClick={handleLogout} className="w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold text-stone-500 hover:bg-stone-100 transition-colors">
                            <LogOut size={20} /> Logout
                        </button>
                        <button onClick={onExit} className="w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold text-stone-500 hover:bg-stone-100 transition-colors">
                            <ArrowLeft size={20} /> Exit Admin
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-grow overflow-y-auto p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Filter Bar */}
                            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center gap-6 sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <Filter size={16} className="text-stone-400" />
                                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Filters</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select 
                                        value={filters.dateRange} 
                                        onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                                        className="text-sm bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="30d">Last 30 Days</option>
                                    </select>
                                    <select 
                                        value={filters.ageGroup} 
                                        onChange={(e) => setFilters({...filters, ageGroup: e.target.value})}
                                        className="text-sm bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                    >
                                        <option value="all">All Ages</option>
                                        <option value="20s">20s</option>
                                        <option value="30s">30s</option>
                                        <option value="40s">40s</option>
                                        <option value="50s+">50s+</option>
                                    </select>
                                    <select 
                                        value={filters.skinType} 
                                        onChange={(e) => setFilters({...filters, skinType: e.target.value})}
                                        className="text-sm bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                    >
                                        <option value="all">All Skin Types</option>
                                        <option value="dry">Dry</option>
                                        <option value="oily">Oily</option>
                                        <option value="combination">Combination</option>
                                        <option value="normal">Normal</option>
                                    </select>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <button 
                                        onClick={generateDashboardInsights}
                                        disabled={isDashboardAnalyzing}
                                        className="flex items-center gap-2 text-xs font-bold bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
                                    >
                                        {isDashboardAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                        AI Insights
                                    </button>
                                    <button 
                                        onClick={exportToCSV}
                                        className="flex items-center gap-2 text-xs font-bold bg-stone-50 text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                                    >
                                        <Download size={14} /> Export CSV
                                    </button>
                                </div>
                            </div>

                            {dashboardAiReport && (
                                <div className="bg-stone-900 text-white p-8 rounded-3xl border border-stone-800 shadow-xl relative overflow-hidden group animate-fade-in">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Sparkles size={120} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                                    <Sparkles size={20} className="text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-serif font-bold">AI Analytics Insights</h3>
                                                    <p className="text-xs text-stone-400 font-medium tracking-widest uppercase mt-1">Generated based on current filters</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setDashboardAiReport(null)}
                                                className="text-stone-400 hover:text-white transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="prose prose-invert prose-stone max-w-none">
                                            <ReactMarkdown>{dashboardAiReport}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-stone-100 rounded-lg"><Users size={18} className="text-stone-600" /></div>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
                                    </div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Total Sessions</p>
                                    <p className="text-3xl font-serif font-bold text-stone-900">{(filteredSessions || []).length}</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-stone-100 rounded-lg"><Target size={18} className="text-stone-600" /></div>
                                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">Stable</span>
                                    </div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Completion Rate</p>
                                    <p className="text-3xl font-serif font-bold text-stone-900">{completionRate}%</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-stone-100 rounded-lg"><Activity size={18} className="text-stone-600" /></div>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Attention</span>
                                    </div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Avg Concerns</p>
                                    <p className="text-3xl font-serif font-bold text-stone-900">
                                        {((filteredSessions || []).reduce((sum, s) => sum + (s.demographics?.skinConcerns?.length || 0), 0) / ((filteredSessions || []).length || 1)).toFixed(1)}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-stone-100 rounded-lg"><Database size={18} className="text-stone-600" /></div>
                                        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">CMS</span>
                                    </div>
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Active SKUs</p>
                                    <p className="text-3xl font-serif font-bold text-stone-900">
                                        {(products?.serums || []).filter(p => p.isPublished).length + (products?.foundationAmpoules || []).filter(p => p.isPublished).length + (products?.performanceAmpoules || []).filter(p => p.isPublished).length}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-stone-900 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-stone-400" /> Session Trend (Last 7 Days)
                                        </h3>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-stone-900"></div><span className="text-[10px] text-stone-500">Sessions</span></div>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <AreaChart data={trendData}>
                                            <defs>
                                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1c1917" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e'}} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey="sessions" stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6">Consultation Funnel</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={stepDropoffData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e'}} width={100} />
                                            <Tooltip cursor={{fill: 'transparent'}} />
                                            <Bar dataKey="users" fill="#1c1917" radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right', fontSize: 10, fill: '#1c1917' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6">Age vs Top Concerns</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={correlationData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                                            {(concernChartData || []).slice(0, 3).map((c, i) => (
                                                <Bar key={c.name} dataKey={c.name} stackId="a" fill={COLORS[i]} radius={i === 2 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6">Skin Concern Prevalence</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={concernChartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#1c1917" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6">Top Recommended Products</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={topProductsData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#78716c" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
                                        <Database size={16} className="text-stone-400" /> Currently Used Products
                                    </h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={currentProductData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#1c1917" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-96">
                                    <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
                                        <Activity size={16} className="text-stone-400" /> Current Product Dissatisfactions
                                    </h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={dissatisfactionData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#78716c" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-serif font-bold text-stone-900">Product Management (CMS)</h2>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setImportType('csv'); setIsImportModalOpen(true); }}
                                        className="text-xs font-bold bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-50 flex items-center gap-2"
                                    >
                                        <Upload size={14} /> Import CSV
                                    </button>
                                    <button 
                                        onClick={() => { setImportType('pdf'); setIsImportModalOpen(true); }}
                                        className="text-xs font-bold bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-50 flex items-center gap-2"
                                    >
                                        <FileText size={14} /> Import PDF/Image
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Serums</h3>
                                    <button 
                                        onClick={() => handleAddProduct('serum')}
                                        className="text-xs font-bold bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-black flex items-center gap-1"
                                    >
                                        <PlusCircle size={14}/> Add Serum
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {(products?.serums || []).map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                                            <div>
                                                <p className="font-bold flex items-center gap-2">
                                                    {p.name}
                                                    {!p.isPublished && <span className="bg-stone-200 text-stone-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff size={10}/> Hidden</span>}
                                                </p>
                                                <p className="text-sm text-stone-500">{p.price.toLocaleString()} JPY</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditProduct('serum', p)} className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-lg hover:bg-stone-100">Edit</button>
                                                <button onClick={() => deleteProduct('serum', p.id)} className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg hover:bg-red-100">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Foundation Ampoules</h3>
                                    <button 
                                        onClick={() => handleAddProduct('foundation')}
                                        className="text-xs font-bold bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-black flex items-center gap-1"
                                    >
                                        <PlusCircle size={14}/> Add Foundation
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {(products?.foundationAmpoules || []).map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                                            <div>
                                                <p className="font-bold flex items-center gap-2">
                                                    {p.name}
                                                    {!p.isPublished && <span className="bg-stone-200 text-stone-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff size={10}/> Hidden</span>}
                                                </p>
                                                <p className="text-sm text-stone-500">{p.price.toLocaleString()} JPY</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditProduct('foundation', p)} className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-lg hover:bg-stone-100">Edit</button>
                                                <button onClick={() => deleteProduct('foundation', p.id)} className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg hover:bg-red-100">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Performance Ampoules</h3>
                                    <button 
                                        onClick={() => handleAddProduct('performance')}
                                        className="text-xs font-bold bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-black flex items-center gap-1"
                                    >
                                        <PlusCircle size={14}/> Add Performance
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {(products?.performanceAmpoules || []).map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                                            <div>
                                                <p className="font-bold flex items-center gap-2">
                                                    {p.name}
                                                    {!p.isPublished && <span className="bg-stone-200 text-stone-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff size={10}/> Hidden</span>}
                                                </p>
                                                <p className="text-sm text-stone-500">{p.price.toLocaleString()} JPY</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditProduct('performance', p)} className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-lg hover:bg-stone-100">Edit</button>
                                                <button onClick={() => deleteProduct('performance', p.id)} className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg hover:bg-red-100">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'master' && (
                        <MasterConfigTab />
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-serif font-bold text-stone-900">AI R&D Insights</h2>
                                <button 
                                    onClick={generateReport}
                                    disabled={isAnalyzing}
                                    className="bg-stone-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 className="animate-spin"/> : <Sparkles size={18} />}
                                    Generate New Report
                                </button>
                            </div>

                            {isAnalyzing && (
                                <div className="text-center py-20">
                                    <Loader2 size={48} className="animate-spin mx-auto text-stone-300 mb-4" />
                                    <p className="text-stone-500">Analyzing thousands of data points...</p>
                                </div>
                            )}

                            {aiReport && !isAnalyzing && (
                                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm prose prose-stone max-w-none">
                                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
            
            <ProductFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProduct}
                initialData={editingProduct}
                type={modalType}
            />

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-serif font-bold text-stone-900">
                                    {importType === 'csv' ? 'CSV Import' : 'AI PDF/Image Import'}
                                </h3>
                                <p className="text-sm text-stone-500">
                                    {importType === 'csv' ? 'Upload a CSV file to bulk import products' : 'Upload a PDF or image to extract product data using AI'}
                                </p>
                            </div>
                            <button onClick={() => { setIsImportModalOpen(false); setImportData([]); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8">
                            {importData.length === 0 ? (
                                <div className="border-2 border-dashed border-stone-200 rounded-3xl p-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
                                        {importType === 'csv' ? <Upload className="text-stone-400" /> : <FileText className="text-stone-400" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900">Click to upload or drag and drop</p>
                                        <p className="text-sm text-stone-500">
                                            {importType === 'csv' ? 'CSV files only' : 'PDF, JPG, PNG files'}
                                        </p>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept={importType === 'csv' ? '.csv' : '.pdf,image/*'} 
                                        onChange={importType === 'csv' ? handleCSVUpload : handlePDFUpload}
                                        className="hidden" 
                                        id="import-upload" 
                                    />
                                    <label 
                                        htmlFor="import-upload"
                                        className="inline-block bg-stone-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-black cursor-pointer transition-colors"
                                    >
                                        Select File
                                    </label>
                                    {isImporting && (
                                        <div className="flex items-center justify-center gap-2 text-stone-500 mt-4">
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>Processing file...</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-stone-900">Preview ({importData.length} items)</h4>
                                        <button onClick={() => setImportData([])} className="text-xs font-bold text-stone-500 hover:text-stone-900">Clear and re-upload</button>
                                    </div>
                                    <div className="border border-stone-200 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-stone-50 border-b border-stone-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-stone-600">Type</th>
                                                    <th className="px-4 py-3 font-bold text-stone-600">Name</th>
                                                    <th className="px-4 py-3 font-bold text-stone-600">Price</th>
                                                    <th className="px-4 py-3 font-bold text-stone-600">Ingredients</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {importData.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 capitalize">{item.type || 'serum'}</td>
                                                        <td className="px-4 py-3 font-medium">{item.name}</td>
                                                        <td className="px-4 py-3">{Number(item.price).toLocaleString()}円</td>
                                                        <td className="px-4 py-3 text-xs text-stone-500">
                                                            {Array.isArray(item.ingredients) ? item.ingredients.length : 0} ingredients
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {importError && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-medium">{importError}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                            <button 
                                onClick={() => { setIsImportModalOpen(false); setImportData([]); }}
                                className="px-6 py-3 font-bold text-stone-500 hover:text-stone-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={processImport}
                                disabled={importData.length === 0 || isImporting}
                                className="bg-stone-900 text-white font-bold py-3 px-10 rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                Confirm and Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};