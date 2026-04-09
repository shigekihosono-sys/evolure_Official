
// FIX: Replaced deprecated GenerateContentRequest with GenerateContentParameters.
import { GoogleGenAI, Chat, GenerateContentResponse, Type, GenerateContentParameters } from "@google/genai";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, ingredientsCol } from '../firebase';
import { Serum, Ampoule, Score, Product, Competitor, MedicalChartReport, PhotoValidationResult, IngredientAnalysis, IngredientLabAnalysis, AdvancedProductAnalysis, AnalyzedCompetitor, FullConsultationResponse, UserSession, LogEntry, ConsultationInput } from '../types';
import { 
    SCORE_CATEGORY_KEYS, 
    ALL_PRODUCTS, 
    SKIN_CONCERNS, 
    INGREDIENT_DESCRIPTIONS, 
    BENCHMARK_COMPETITORS,
    IDEAL_SKIN_GOALS as IDEAL_GOALS, 
    LIFESTYLE_FACTORS, 
    INVESTIGATION_DISSATISFACTIONS as DISSATISFACTIONS, 
    TROUBLE_HISTORY_OPTIONS as TROUBLE_HISTORY, 
    CONCERN_TIMINGS, 
    CURRENT_LACKS, 
    PRODUCT_USAGE_DURATIONS as USAGE_DURATIONS
} from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to slugify ingredient names for IDs
const slugify = (text: string) => text.toLowerCase().trim().replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-');

/**
 * Robustly extracts JSON from a string that might contain markdown blocks or leading/trailing text.
 */
function extractJson(text: string | undefined | null) {
    if (!text) return {};
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1].trim();
    } else {
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
    }
    
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON parsing failed. Attempting cleanup...", jsonStr);
        const cleaned = jsonStr.replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(cleaned);
    }
}

async function callGeminiWithRetry<T extends GenerateContentResponse>(
    apiCall: () => Promise<T>,
    nonRetriableErrorMessage: string,
    retriableErrorMessage: string
): Promise<T> {
    const maxRetries = 3;
    let delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            const errorString = String(error);
            if (
                errorString.includes('429') || 
                errorString.includes('503') || 
                errorString.includes('500') || 
                errorString.includes('INTERNAL') || 
                errorString.includes('RESOURCE_EXHAUSTED')
            ) {
                if (i === maxRetries - 1) {
                    console.error(`Max retries reached. Last error:`, error);
                    throw new Error(retriableErrorMessage);
                }
                console.warn(`Retriable error hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            } else {
                console.error(`Non-retriable error:`, error);
                throw new Error(nonRetriableErrorMessage);
            }
        }
    }
    throw new Error(nonRetriableErrorMessage);
}

const systemInstructionForChat = `
あなたは、高級スキンケアブランド「EVOLURE」のワールドクラスAIコンシェルジュです。あなたの目標は、このチャットインターフェースを通じて、シームレスで、役に立ち、プレミアムな体験を提供することです。

あなたの役割は2つあります。
1. **スキンケア専門家としての会話:** ユーザーからのスキンケア、美容、化粧品に関する一般的な質問に対して、あなたの豊富な知識を活かして、親切かつ専門的に回答します。
2. **特定アクションの実行:** ユーザーが特定の目的（肌カウンセリング、成分分析など）を希望する場合、後述するJSONコマンドを生成してシステムのアクションをトリガーします。

**【最重要：価格表示の統一ルール】**
- 価格を表示する際は、必ず「円(税込)」の形式で統一してください。
- カタログの価格はすべて税込価格です。

**【最重要：薬機法遵守】**
- 日本の化粧品法規制を遵守し、「治る」「若返る」などの医学的標榜は避け、「健やかに保つ」「乾燥による小ジワを目立たなくする」などの表現を用いてください。
- **【時間軸（timeframe）の記載ルール】** 「○週間で効果が出る」といった断定的な表現は厳禁です。成分の一般的な特性に基づいた期間（例：2週間〜8週間、即効性など）を「目安」として記載してください。その際、「一般的に、うるおいを実感いただくには約○週間程度の継続使用が目安とされています」のように、あくまで一般的な目安であることを示す表現にし、必ず「個人差がある」旨を添えてください。
- **【重要：ご使用方法の記載ルール】** 製品を「混ぜて使う」という表現は厳禁です。必ず以下の手順で説明してください：「アンプルを気になる箇所に塗った上で、美容液を顔全体に馴染ませてください」。

---

**【アクションコマンドと実行フロー】**
ユーザーのリクエストが以下のいずれかに明確に合致する場合に限り、あなたの応答の**一番最後**に、対応するJSONコマンドブロックを出力してください。

**1. 新しい肌カウンセリングの実施:**
   \`\`\`json
   {
     "action": "start_consultation",
     "payload": {
       "type": "concerns",
       "ageGroup": "30代前半",
       "skinConcerns": {"シワ・小ジワ": 4, "ハリ・弾力の低下": 4},
       "knowledgeLevel": 3
     }
   }
   \`\`\`

---
**【要約】**
あなたの主な仕事は、優れた会話パートナーであることです。JSONコマンドは、会話の結果として明確なアクションが必要になった場合にのみ使用するツールです。
`;

export const createChatSession = (): Chat => {
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstructionForChat,
        },
    });
};


export const sendChatMessageStream = async (chatSession: Chat | null, message: string): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!chatSession) {
    async function* errorStream(): AsyncGenerator<GenerateContentResponse> {
        yield { text: "エラー: チャットセッションがありません。" } as GenerateContentResponse;
    }
    return errorStream();
  }

  try {
    return await chatSession.sendMessageStream({ message });
  } catch (error) {
    async function* errorStream(): AsyncGenerator<GenerateContentResponse> {
        yield { text: "申し訳ありません。メッセージの送信中にエラーが発生しました。" } as GenerateContentResponse;
    }
    return errorStream();
  }
};

export const analyzeCompetitorProduct = async (
    productNames: string[], 
    skinConcerns: string[], 
    evolurePlan?: { name: string; scores: Score }
): Promise<AnalyzedCompetitor[] | null> => {
    
    const evolurePlanString = evolurePlan
        ? `比較対象のEVOLUREプラン: ${evolurePlan.name} (各項目のスコア: ${(SCORE_CATEGORY_KEYS || []).map(key => `${String(key)}: ${evolurePlan.scores[key]}`).join(', ')})`
        : '比較対象のEVOLUREプランはありません。製品単体で分析してください。';

    const productNamesString = (productNames || []).map(name => `- 「${name}」`).join('\n');
    const benchmarkDataString = (BENCHMARK_COMPETITORS || []).map(p => `- ${p.name}: ${(SCORE_CATEGORY_KEYS || []).map(k => `${k} ${p.scores[k]}`).join(', ')}`).join('\n');

    const prompt = `
公平で専門的なスキンケア製品アナリストとして振る舞ってください。

**分析対象製品リスト:**
${productNamesString}

**ユーザー情報:**
- 主な肌悩み: ${skinConcerns.join('、')}
- ${evolurePlanString}

**【重要】** 「分析対象製品リスト」にある製品のみを分析し、結果をJSONの \`analysis\` 配列に含めてください。ベンチマーク基準として提供した製品（ランコム、ポーラ等）は、スコアリングの客観性を保つための基準としてのみ使用し、出力結果には含めないないでください。

各製品について、JSONでスコア(50-100)とMarkdown形式のレポートを返してください。レポート本文には引用番号（[1]など）を含めないでください。

ベンチマーク基準（スコアリング用）:
${benchmarkDataString}
`;

    try {
        const response = await callGeminiWithRetry(
            () => ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            }),
            "AIによる競合製品の分析中に予期せぬエラーが発生しました。",
            "AIサーバーが混み合っています。しばらくしてからもう一度お試しください。"
        );
        
        const parsedData = extractJson(response.text);
        const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map(chunk => ({ uri: chunk.web?.uri || '', title: chunk.web?.title || '引用元情報' }))
            .filter(c => c.uri) ?? [];

        if (parsedData.analysis && Array.isArray(parsedData.analysis)) {
            return parsedData.analysis.map((item: any): AnalyzedCompetitor => ({
                name: item.productName || '名称不明の製品',
                scores: item.scores as Score,
                report: item.report || 'レポートがありません。',
                citations: citations
            }));
        }
        return null;
    } catch (error) {
        console.error("Failed to get competitor analysis from Gemini:", error);
        return null;
    }
};

const ingredientAnalysisItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        timeframe: { type: Type.STRING }
    },
    required: ['name', 'description', 'timeframe']
};

const medicalChartSchema = {
    type: Type.OBJECT,
    properties: {
        summaryBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        knowledgeLevelRationale: { type: Type.STRING },
        patientSummary: { type: Type.STRING },
        prescriptionIntent: { type: Type.STRING },
        serumRationale: { type: Type.STRING },
        ampouleRationales: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    ampouleId: { type: Type.STRING },
                    rationale: { type: Type.STRING }
                },
                required: ["ampouleId", "rationale"]
            }
        },
        futureOutlook: { type: Type.STRING },
        usageInstructions: { type: Type.STRING },
        serumIngredientAnalysis: { type: Type.ARRAY, items: ingredientAnalysisItemSchema },
        ampouleIngredientAnalysis: { type: Type.ARRAY, items: ingredientAnalysisItemSchema }
    },
    required: ['summaryBullets', 'knowledgeLevelRationale', 'patientSummary', 'prescriptionIntent', 'serumRationale', 'ampouleRationales', 'futureOutlook', 'usageInstructions', 'serumIngredientAnalysis', 'ampouleIngredientAnalysis']
};

export const analyzeProductsFromPhoto = async (base64Image: string): Promise<string[] | null> => {
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = { text: `画像から化粧品のブランド名と製品名を特定し、'products'キーを持つJSON配列として返してください。` };
    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { products: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['products']
                },
            },
        }),
        "AIによる製品の分析に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    return JSON.parse(response.text).products || null;
};

export const extractIngredientsFromPhoto = async (base64Image: string): Promise<string[]> => {
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = { text: `成分表示ラベルから全ての成分名を抽出し、'ingredients'キーを持つJSON配列として返してください。` };
    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { ingredients: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['ingredients']
                },
            },
        }),
        "成分抽出に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    return JSON.parse(response.text).ingredients || [];
};

export const validateVideoForSkinAnalysis = async (videoDataUrl: string): Promise<PhotoValidationResult> => {
    const matches = videoDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid video data format");
    let mimeType = matches[1];
    const base64Data = matches[2];
    if (mimeType.includes('webm') || mimeType.includes('x-matroska')) mimeType = 'video/webm';
    else if (mimeType.includes('mp4')) mimeType = 'video/mp4';
    else if (mimeType.includes(';')) mimeType = mimeType.split(';')[0];

    const videoPart = { inlineData: { mimeType, data: base64Data } };
    const textPart = { text: `自撮り動画が肌診断に適しているか検証し、isValid(boolean)とreason(string)をJSONで返してください。` };
    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [videoPart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { isValid: { type: Type.BOOLEAN }, reason: { type: Type.STRING } },
                    required: ['isValid', 'reason']
                },
            },
        }),
        "品質検証に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    return JSON.parse(response.text) as PhotoValidationResult;
};

const skinAnalysisSchema = {
    type: Type.OBJECT,
    properties: SKIN_CONCERNS.reduce((acc, concern) => {
        acc[concern] = { type: Type.INTEGER };
        return acc;
    }, {} as {[key: string]: {type: Type}}),
    required: SKIN_CONCERNS
};

export const analyzeSkinFromVideo = async (videoDataUrl: string): Promise<{ [key: string]: number }> => {
    const matches = videoDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid video data format");
    let mimeType = matches[1];
    const base64Data = matches[2];
    if (mimeType.includes('webm') || mimeType.includes('x-matroska')) mimeType = 'video/webm';
    else if (mimeType.includes('mp4')) mimeType = 'video/mp4';
    else if (mimeType.includes(';')) mimeType = mimeType.split(';')[0];

    const videoPart = { inlineData: { mimeType, data: base64Data } };
    const textPart = { text: `プロの皮膚科医としてビデオを分析し、各肌悩みの深刻度(1-5)をJSONで返してください。項目: ${SKIN_CONCERNS.join(', ')}` };
    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [videoPart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: skinAnalysisSchema,
            },
        }),
        "肌分析中に予期せぬエラーが発生しました。",
        "AIサーバーが混み合っています。"
    );
    const result = extractJson(response.text);
    const sanitizedResult: { [key: string]: number } = {};
    for(const key in result) sanitizedResult[key] = Number(result[key]) || 0;
    return sanitizedResult;
};

export const analyzeIngredients = async (ingredientNames: string[]): Promise<IngredientLabAnalysis[]> => {
    if (!ingredientNames || ingredientNames.length === 0) return [];

    const results: IngredientLabAnalysis[] = [];
    const missingNames: string[] = [];

    // 1. Check Firestore for existing analyses
    for (const name of ingredientNames) {
        try {
            const id = slugify(name);
            const docRef = doc(ingredientsCol, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                results.push({
                    name: data.name,
                    functions: data.function,
                    evidence: data.evidence,
                    timeframe: data.timeframe
                });
            } else {
                missingNames.push(name);
            }
        } catch (error) {
            console.error(`Error fetching ingredient ${name}:`, error);
            missingNames.push(name);
        }
    }

    // 2. If all found in DB, return
    if (missingNames.length === 0) return results;

    // 3. Analyze missing ingredients with Gemini
    const prompt = `成分リスト「${missingNames.join(', ')}」の詳細な機能、エビデンス、期間をJSON形式で分析してください。
    薬機法に配慮し、断定的な表現（「治る」「消える」など）は避け、「整える」「健やかに保つ」などの表現を使用してください。
    また、期間については「個人差があります」という文言を必ず含めてください。`;

    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    functions: { type: Type.STRING },
                                    evidence: { type: Type.STRING },
                                    timeframe: { type: Type.STRING }
                                },
                                required: ["name", "functions", "evidence", "timeframe"]
                            }
                        }
                    },
                    required: ["analysis"]
                }
            }
        }),
        "成分分析に失敗しました。",
        "AIサーバーが混み合っています。"
    );

    const newAnalyses: any[] = JSON.parse(response.text).analysis || [];

    // 4. Save new analyses to Firestore and add to results
    for (const analysis of newAnalyses) {
        try {
            const id = slugify(analysis.name);
            await setDoc(doc(ingredientsCol, id), {
                id,
                name: analysis.name,
                function: analysis.functions,
                evidence: analysis.evidence,
                timeframe: analysis.timeframe,
                lastAnalyzed: new Date().toISOString()
            });
            results.push(analysis);
        } catch (error) {
            console.error(`Error saving ingredient ${analysis.name}:`, error);
            results.push(analysis); // Still return it even if save fails
        }
    }

    return results;
};

export const analyzeProductAdvanced = async (productName: string): Promise<AdvancedProductAnalysis> => {
    const prompt = `製品「${productName}」の価格(円(税込))、概要、口コミ、成分詳細、総合評価を検索・分析してJSONで返してください。`;
    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        }),
        "製品分析に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    const parsedData = extractJson(response.text);
    const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => ({ uri: chunk.web?.uri || '', title: chunk.web?.title || '引用元情報' }))
        .filter(c => c.uri) ?? [];
    parsedData.citations = citations;
    return parsedData;
};

const buildUserProfileString = (input: ConsultationInput): string => {
    const parts = [
        `- タイプ: ${input.type}`,
        `- 年代: ${input.ageGroup}`,
        `- 肌質: ${input.skinType}`,
        `- 知識レベル: ${input.knowledgeLevel}/5`,
        `- トラブル歴: ${input.troubleHistory || '特になし'}`
    ];

    if (input.skinConcerns && Object.keys(input.skinConcerns).length > 0) {
        const concerns = Object.entries(input.skinConcerns)
            .filter(([_, v]) => (v as number) > 0)
            .map(([k, v]) => `${k}(${v})`)
            .join(', ');
        if (concerns) {
            parts.push(`- 悩み: ${concerns}`);
        }
    }

    if (input.type === 'concerns') {
        if (input.lifestyleFactors && input.lifestyleFactors.length > 0) {
            parts.push(`- 習慣: ${input.lifestyleFactors.join(', ')}`);
        }
    } else if (input.type === 'ideal') {
        parts.push(`- 目標: ${input.idealSkin}`);
    } else if (input.type === 'investigate') {
        parts.push(`- 使用中: ${input.currentUserProducts.join(', ')}`);
        parts.push(`- 不満: ${input.dissatisfactions.join(', ')}`);
    }
    return parts.join('\n');
};

export const getAccumulatedIngredients = async (): Promise<Record<string, string>> => {
    try {
        const querySnapshot = await getDocs(ingredientsCol);
        const accumulated: Record<string, string> = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Store description/function for the AI to use as reference
            accumulated[data.name] = data.function;
        });
        
        // Merge with static descriptions to ensure we have a baseline
        return { ...INGREDIENT_DESCRIPTIONS, ...accumulated };
    } catch (error) {
        console.error('Error fetching accumulated ingredients:', error);
        return INGREDIENT_DESCRIPTIONS;
    }
};

export const runFullConsultation = async (
    input: ConsultationInput, 
    dynamicProducts: Product[],
    masterConfigs?: Record<string, string[]>
): Promise<FullConsultationResponse> => {
    const userProfileString = buildUserProfileString(input);
    const benchmarkDataString = BENCHMARK_COMPETITORS.map(p => `- ${p.name}: ${SCORE_CATEGORY_KEYS.map(k => `${k} ${p.scores[k]}`).join(', ')}`).join('\n');
    
    // Fetch accumulated ingredient data from Firestore
    const accumulatedIngredients = await getAccumulatedIngredients();

    const isInvestigate = input.type === 'investigate';
    
    // Use dynamic master configs if provided, otherwise fallback to constants
    const skinConcerns = masterConfigs?.skin_concerns || SKIN_CONCERNS;
    const lifestyleFactors = masterConfigs?.lifestyle_factors || LIFESTYLE_FACTORS;
    const dissatisfactions = masterConfigs?.dissatisfactions || DISSATISFACTIONS;
    const schemaStructure = `
{
  "recommendations": { "serumId": "string", "ampouleIds": ["string"] },
  "medicalChartReport": {
    "summaryBullets": ["string"],
    "patientSummary": "string",
    "prescriptionIntent": "string",
    "serumRationale": "string",
    "ampouleRationales": [{ "ampouleId": "string", "rationale": "string" }],
    "futureOutlook": "string",
    "usageInstructions": "string",
    "knowledgeLevelRationale": "string",
    "serumIngredientAnalysis": [{ "name": "string", "description": "string", "timeframe": "string" }],
    "ampouleIngredientAnalysis": [{ "name": "string", "description": "string", "timeframe": "string" }]
  },
  "competitorAnalysis": [{ "productName": "string", "scores": { "シミ・くすみ": 0, "シワ・小ジワ": 0, "ハリ・弾力": 0, "毛穴ケア": 0, "保湿持続性": 0 } }]
}`;

    const prompt = `
高級スキンケアブランド「EVOLURE」のAI診断エンジンとして振る舞ってください。

**【重要ルール】**
1. 美容液（Serum）およびアンプル（Ampoule）の「主要有効成分」は、それぞれすべて漏れなく抽出して記載してください（serumIngredientAnalysis, ampouleIngredientAnalysisにすべて含めること）。
2. 成分の効能効果に関する説明文は、薬機法（医薬品医療機器等法）を厳守し、化粧品として認められる表現（「肌にうるおいを与える」「肌を整える」「健やかに保つ」「乾燥を防ぐ」など）に留めてください。病気の治療や予防、肌構造の根本的な変化を暗示する表現（「ニキビを治す」「シワを消す」「細胞を再生する」など）は絶対に使用しないでください。
3. **【競合分析の制限】** \`competitorAnalysis\` 配列には、ユーザーが現在使用している製品（${isInvestigate ? input.currentUserProducts.join('、') : 'なし'}）のみを含めてください。ベンチマークとして提供した製品（ランコム、ポーラ等）は、スコアリングの基準としてのみ使用し、出力配列には絶対に含めないでください。
4. **【必須出力】** 診断結果には、必ず「製品推奨（recommendations）」と「診断カルテ（medicalChartReport）」の両方を含めてください。特に診断カルテの \`summaryBullets\` は、ダッシュボードの表示に必須です。
5. **【重要：ご使用方法の記載ルール】** 薬機法遵守のため、製品を「混ぜて使う」という表現は厳禁です。必ず以下の手順で説明してください：「アンプルを気になる箇所に塗った上で、美容液を顔全体に馴染ませてください」。この順番と方法を「ご使用方法（usageInstructions）」セクションに明記してください。
6. **【重要：時間軸（timeframe）の記載ルール】** 薬機法遵守のため、「○週間で効果が出る」といった断定的な表現は避け、成分の特性に合わせた一般的な目安（例：2〜8週間など）を「個人差があります」という注釈と共に記載してください。

知識レベル${input.knowledgeLevel}/5に合わせて詳細度を調整した、製品推奨、診断カルテ、および競合分析を含むレポートをJSONで出力してください。
${isInvestigate ? `\n以下のJSONスキーマに厳密に従って出力してください:\n${schemaStructure}\n` : ''}
ユーザー情報:
${userProfileString}

カタログ (最新): ${JSON.stringify(dynamicProducts, null, 2)}
成分辞書 (分析済みデータ): ${JSON.stringify(accumulatedIngredients, null, 2)}
肌悩みの定義: ${JSON.stringify(skinConcerns)}
生活習慣の定義: ${JSON.stringify(lifestyleFactors)}
不満点の定義: ${JSON.stringify(dissatisfactions)}
ベンチマーク（スコアリング基準用）:
${benchmarkDataString}
`;
    const config: GenerateContentParameters['config'] = isInvestigate 
        ? { tools: [{ googleSearch: {} }] } 
        : { responseMimeType: "application/json", responseSchema: {
            type: Type.OBJECT,
            properties: {
                recommendations: { type: Type.OBJECT, properties: { serumId: { type: Type.STRING }, ampouleIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["serumId", "ampouleIds"] },
                medicalChartReport: medicalChartSchema
            },
            required: ["recommendations", "medicalChartReport"]
        }};

    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config }),
        "分析とプラン生成に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    
    let parsedData = isInvestigate ? extractJson(response.text) : JSON.parse(response.text);
    const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => ({ uri: chunk.web?.uri || '', title: chunk.web?.title || '引用元情報' }))
        .filter(c => c.uri) ?? [];
    
    const result: FullConsultationResponse = { ...parsedData, citations };
    if (result.competitorAnalysis) {
        result.competitorAnalysis = result.competitorAnalysis.map((p: any) => ({
            ...p,
            name: `現在: ${p.productName || p.name}`,
            citations: result.citations
        }));
    }
    return result;
};

export const regenerateMedicalChart = async (
    consultationInput: ConsultationInput, 
    selectedSerum: Serum, 
    selectedAmpoules: Ampoule[],
    dynamicProducts: Product[]
): Promise<MedicalChartReport> => {
    const userProfileString = buildUserProfileString(consultationInput);
    const productsString = [`- 美容液: ${selectedSerum.name}`, ...selectedAmpoules.map(a => `- アンプル: ${a.name}`)].join('\n');
    
    // Fetch accumulated ingredient data from Firestore
    const accumulatedIngredients = await getAccumulatedIngredients();

    const prompt = `確定した製品プランに基づき、知識レベル${consultationInput.knowledgeLevel}/5に合わせて診断カルテをJSONで再生成してください。価格表記は「円(税込)」で統一してください。

**【重要ルール】**
1. 美容液（Serum）およびアンプル（Ampoule）の「主要有効成分」は、それぞれすべて漏れなく抽出して記載してください（serumIngredientAnalysis, ampouleIngredientAnalysisにすべて含めること）。
2. 成分の効能効果に関する説明文は、薬機法（医薬品医療機器等法）を厳守し、化粧品として認められる表現（「肌にうるおいを与える」「肌を整える」「健やかに保つ」「乾燥を防ぐ」など）に留めてください。病気の治療や予防、肌構造の根本的な変化を暗示する表現（「ニキビを治す」「シワを消す」「細胞を再生する」など）は絶対に使用しないでください。
3. **【重要：ご使用方法の記載ルール】** 薬機法遵守のため、製品を「混ぜて使う」という表現は厳禁です。必ず以下の手順で説明してください：「アンプルを気になる箇所に塗った上で、美容液を顔全体に馴染ませてください」。この順番と方法を「ご使用方法（usageInstructions）」セクションに明記してください。

プロフィール: ${userProfileString}
プラン: ${productsString}
カタログ (最新): ${JSON.stringify(dynamicProducts, null, 2)}
成分辞書 (分析済みデータ): ${JSON.stringify(accumulatedIngredients, null, 2)}
`;

    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: medicalChartSchema },
        }),
        "カルテの再生成に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    return JSON.parse(response.text) as MedicalChartReport;
};

export const analyzeUserLogs = async (logs: LogEntry[], sessions: UserSession[]): Promise<string> => {
    // Summarize data for AI to avoid token limits
    const sessionSummary = (sessions || []).map(s => ({
        id: s.sessionId,
        step: s.currentStep,
        age: s.demographics?.ageGroup,
        skin: s.demographics?.skinType,
        concerns: s.demographics?.skinConcerns,
        currentProducts: s.currentProducts,
        dissatisfactions: s.dissatisfactions,
        serum: s.selectedSerumId,
        ampoules: [...(s.selectedFoundationAmpouleIds || []), ...(s.selectedPerformanceAmpouleIds || [])]
    }));

    const logSummary = (logs || []).slice(-100).map(l => ({
        type: l.type,
        payload: l.payload,
        timestamp: l.timestamp
    }));

    const prompt = `
        あなたは、高級パーソナライズスキンケアブランド「EVOLURE」のシニアデータサイエンティスト兼R&D戦略担当です。
        以下のユーザーセッションとログデータを分析し、製品開発とマーケティングのための戦略的な洞察を提供してください。

        ユーザーセッション（要約）:
        ${JSON.stringify(sessionSummary)}

        最近のログ（直近100件）:
        ${JSON.stringify(logSummary)}

        レポートは必ず**日本語**で、以下のセクションを含むMarkdown形式で作成してください：
        
        1. ## エグゼクティブサマリー
           - 現在のユーザーエンゲージメントの概要と主要な発見事項。
        
        2. ## ユーザー行動とコンバージョン分析
           - カウンセリングのファネル分析。ユーザーはどこで離脱していますか？
           - アプリの中で最もエンゲージメントが高い部分はどこですか？
        
        3. ## 肌の悩みとデモグラフィックトレンド
           - どの年齢層が最もアクティブですか？
           - 年齢層ごとの肌の悩みトップ3は何ですか？
           - 肌質と悩みの間に予想外の相関関係はありますか？
        
        4. ## 製品パフォーマンスとR&Dギャップ
           - どの美容液とアンプルが最も頻繁に推奨されていますか？
           - ユーザーの悩みに基づき、EVOLUREが開発すべき「欠けている」成分や製品はありますか？
           - 「平均的な悩み」の指標を分析してください。ユーザーは悩みが多岐にわたるのか、それとも非常に特定的ですか？
        
        5. ## 戦略的推奨事項
           - マーケティングチーム向けの実行可能なステップ3つ。
           - R&D/製品チーム向けの実行可能なステップ3つ。

        専門的で分析的なトーンを使用してください。重要な指標には太字を使用してください。
    `;

    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt }),
        "ログ分析に失敗しました。",
        "AIサーバーが混み合っています。"
    );
    return response.text;
};

export const extractScoresFromText = (productName: string, text: string): Partial<Score> => {
    const extractedScores: Partial<Score> = {};
    const cleanProductName = productName.replace(/^現在:\s*/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scoreRegex = new RegExp(`(?:「?${cleanProductName}」?|同製品|この製品).*?(?:「(${SCORE_CATEGORY_KEYS.join('|')})」).*?(?:スコアは?|評価は?|スコア|評価)\\s*[:：]?\\s*(\\d{2,3})`, 'g');
    let match;
    while ((match = scoreRegex.exec(text)) !== null) {
        const category = match[1] as keyof Score;
        const score = parseInt(match[2], 10);
        if (category && !isNaN(score) && score >= 50 && score <= 100) extractedScores[category] = score;
    }
    return extractedScores;
};

export const extractProductFromDocument = async (fileBase64: string, mimeType: string): Promise<any> => {
    const filePart = { inlineData: { mimeType, data: fileBase64.split(',')[1] } };
    const textPart = { text: `
        提供されたドキュメント（PDFまたは画像）から製品情報を抽出してください。
        以下のJSON形式で返却してください。不明な項目はnullまたは空文字にしてください。
        
        {
          "type": "serum" | "foundation" | "performance",
          "name": "製品名",
          "description": "製品の説明",
          "price": 0,
          "ingredients": [
            { "name": "成分名", "percentage": 0, "isKey": boolean }
          ],
          "category": "製品のカテゴリー",
          "targetConcerns": ["悩み1", "悩み2"]
        }
        
        価格は数値（円(税込)）で抽出してください。
        成分のパーセンテージが不明な場合は、配合順序から推測するか、0にしてください。
    ` };

    const response = await callGeminiWithRetry(
        () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, textPart] },
            config: {
                responseMimeType: "application/json",
            },
        }),
        "ドキュメントからの製品抽出に失敗しました。",
        "AIサーバーが混み合っています。"
    );

    return extractJson(response.text);
};
