
import { Serum, Ampoule, Competitor, Score, Ingredient } from './types';

// 成分ごとの効果係数定義 (濃度1%あたりのスコア上昇値)
// バランス調整: 基準点 + (濃度 * 係数) = 加算スコア
const ingredientEffects: { [key: string]: { concern: keyof Score; potency: number }[] } = {
  // --- エイジングケア・ハリ・弾力系 (高単価・高機能) ---
  'パルミトイルトリペプチド-38': [{ concern: 'シワ・小ジワ', potency: 8.0 }, { concern: 'ハリ・弾力', potency: 7.0 }, { concern: '保湿持続性', potency: 2.0 }],
  'トリフルオロアセチルトリペプチドー2': [{ concern: 'ハリ・弾力', potency: 7.0 }, { concern: 'シワ・小ジワ', potency: 6.0 }],
  'パルミトイルペンタペプチド-4': [{ concern: 'シワ・小ジワ', potency: 7.5 }, { concern: 'ハリ・弾力', potency: 6.5 }],
  'アセチルヘプタペプチド-4': [{ concern: 'ハリ・弾力', potency: 6.0 }, { concern: 'バリア機能/鎮静', potency: 4.0 }],
  'ヘキサペプチド-33': [{ concern: 'シミ・くすみ', potency: 6.0 }, { concern: 'ハリ・弾力', potency: 4.0 }],
  'オリゴペプチド-24': [{ concern: 'ハリ・弾力', potency: 6.0 }, { concern: '毛穴ケア', potency: 4.0 }],
  'ヒト血液由来ナチュラルキラー細胞順化培養液エキス': [{ concern: '総合評価', potency: 200.0 }, { concern: 'ハリ・弾力', potency: 100.0 }, { concern: 'バリア機能/鎮静', potency: 100.0 }], // 微量でも超強力

  // --- 発酵・肌質改善系 ---
  '乳酸桿菌発酵液': [{ concern: 'バリア機能/鎮静', potency: 3.0 }, { concern: '保湿持続性', potency: 3.0 }, { concern: 'シミ・くすみ', potency: 1.0 }],
  'バチルス発酵物': [{ concern: '毛穴ケア', potency: 4.0 }, { concern: 'ハリ・弾力', potency: 3.0 }],
  'コメ発酵液': [{ concern: '保湿持続性', potency: 3.5 }, { concern: 'シミ・くすみ', potency: 2.5 }],
  '酒粕エキス': [{ concern: '保湿持続性', potency: 3.0 }, { concern: 'シミ・くすみ', potency: 3.0 }],

  // --- 植物エキス・鎮静・バリア系 ---
  'ジャノヒゲ根エキス': [{ concern: 'バリア機能/鎮静', potency: 5.0 }, { concern: '保湿持続性', potency: 3.0 }],
  'ツボクサカルス順化培養液': [{ concern: 'バリア機能/鎮静', potency: 4.0 }, { concern: 'ハリ・弾力', potency: 3.0 }],
  'マデカッソシド': [{ concern: 'バリア機能/鎮静', potency: 5.0 }, { concern: 'シミ・くすみ', potency: 2.0 }],
  'エピロビウムフレイスケリ葉/茎エキス': [{ concern: '毛穴ケア', potency: 4.5 }, { concern: 'バリア機能/鎮静', potency: 2.0 }],
  'ナズナエキス': [{ concern: 'バリア機能/鎮静', potency: 4.0 }],
  'オオアザミ果実エキス': [{ concern: 'バリア機能/鎮静', potency: 3.5 }, { concern: 'シミ・くすみ', potency: 1.0 }],
  'アーチチョーク葉エキス': [{ concern: '毛穴ケア', potency: 5.0 }, { concern: 'ハリ・弾力', potency: 1.0 }],
  'ビワ葉エキス': [{ concern: 'バリア機能/鎮静', potency: 3.0 }, { concern: '毛穴ケア', potency: 2.0 }],
  'チャ葉エキス': [{ concern: '毛穴ケア', potency: 2.5 }, { concern: 'シミ・くすみ', potency: 2.0 }],
  'ミドリハッカエキス': [{ concern: '毛穴ケア', potency: 3.0 }, { concern: 'バリア機能/鎮静', potency: 1.5 }],
  'クロレラエキス': [{ concern: 'ハリ・弾力', potency: 2.5 }, { concern: '保湿持続性', potency: 2.0 }],
  'ローブッシュブルーベリー果実エキス': [{ concern: 'シミ・くすみ', potency: 2.5 }, { concern: 'ハリ・弾力', potency: 1.0 }],
  'ブロッコリーエキス': [{ concern: 'バリア機能/鎮静', potency: 2.0 }],
  'マコンブエキス': [{ concern: '保湿持続性', potency: 3.0 }, { concern: 'ハリ・弾力', potency: 1.5 }],
  'クラミドモナスレインハルドチ小胞': [{ concern: 'バリア機能/鎮静', potency: 3.0 }, { concern: 'ハリ・弾力', potency: 2.0 }],

  // --- 保湿・機能性成分系 ---
  'ジラウロイルグルタミン酸リシンNa': [{ concern: 'バリア機能/鎮静', potency: 8.0 }, { concern: '保湿持続性', potency: 6.0 }], // ペリセア
  'イノシトール': [{ concern: '毛穴ケア', potency: 4.0 }, { concern: '保湿持続性', potency: 2.0 }],
  'イヌリン': [{ concern: 'バリア機能/鎮静', potency: 3.0 }, { concern: '保湿持続性', potency: 2.0 }],
  'ラウロイルグルタミン酸ジ(フィトステリル/オクチルドデシル)': [{ concern: 'バリア機能/鎮静', potency: 4.0 }, { concern: '保湿持続性', potency: 3.0 }],
  'キシリチルグルコシド': [{ concern: '保湿持続性', potency: 4.0 }, { concern: 'バリア機能/鎮静', potency: 1.0 }],
  'ポリグリセリン-3': [{ concern: '保湿持続性', potency: 3.0 }],
  'カルノシン': [{ concern: 'ハリ・弾力', potency: 3.0 }, { concern: 'シワ・小ジワ', potency: 2.0 }],
  'DNA': [{ concern: 'ハリ・弾力', potency: 2.0 }, { concern: '保湿持続性', potency: 2.0 }],
  'セラミド前駆体': [{ concern: 'バリア機能/鎮静', potency: 5.0 }, { concern: '保湿持続性', potency: 3.0 }],
  '水添レシチン': [{ concern: '保湿持続性', potency: 2.0 }, { concern: 'バリア機能/鎮静', potency: 2.0 }],
  'トコフェロール': [{ concern: 'シミ・くすみ', potency: 1.0 }, { concern: 'バリア機能/鎮静', potency: 1.0 }],
};

// 成分リストからスコアを算出する関数
// ロジック: 主要成分による「基礎点（Floor）」＋ その他の有効成分による「加点（Boost）」＝ 最終スコア
export const calculateScoreFromIngredients = (ingredients: Ingredient[], isBaseSerum: boolean = false): Score => {
    // 全製品の基本スコア（ベースライン）
    const scores: Score = {
        'シミ・くすみ': 50,
        'シワ・小ジワ': 50,
        'ハリ・弾力': 50,
        '毛穴ケア': 50,
        '保湿持続性': 50,
        '総合評価': 50,
        'バリア機能/鎮静': 50
    };

    if (!isBaseSerum) {
        for (const key in scores) {
            (scores as any)[key] = 0;
        }
    }

    // 1. Calculate Key Concentrations
    const p38 = ingredients.find(i => i.name.includes('パルミトイルトリペプチド-38'))?.percentage || 0;
    const bacillus = ingredients.find(i => i.name.includes('バチルス発酵物'))?.percentage || 0;
    const lactobacillus = ingredients.find(i => i.name.includes('乳酸桿菌発酵液'))?.percentage || 0;
    const hexapeptide33 = ingredients.find(i => i.name.includes('ヘキサペプチド-33'))?.percentage || 0;
    const mainFerments = bacillus + lactobacillus;
    
    // 主要5項目のキー
    const mainCategories = ['シミ・くすみ', 'シワ・小ジワ', 'ハリ・弾力', '毛穴ケア', '保湿持続性'];

    // 2. Base Scoring (Floor) based on "Key Ingredient Composition"
    // これにより、製品ランクごとの最低保証スコアを決定する（レポートのスコアより少し低めに設定し、加点余地を作る）
    if (isBaseSerum) {
        // --- Wrinkles (シワ・小ジワ) ---
        // Target: A=97, B=88, C=82
        if (p38 >= 2.0) scores['シワ・小ジワ'] = 90; // +7 from additives needed
        else if (p38 >= 1.0) scores['シワ・小ジワ'] = 84; // +4 from additives needed
        else if (p38 >= 0.5) scores['シワ・小ジワ'] = 79; // +3 from additives needed
        else scores['シワ・小ジワ'] = 70;

        // --- Firmness (ハリ・弾力) ---
        // Target: A=96, B=88, C=82
        if (p38 >= 2.0 && bacillus >= 5.0) scores['ハリ・弾力'] = 89; // +7 from additives
        else if (p38 >= 1.0 && bacillus >= 5.0) scores['ハリ・弾力'] = 84; // +4 from additives
        else if (p38 >= 0.5 && bacillus >= 3.0) scores['ハリ・弾力'] = 79; // +3 from additives
        else scores['ハリ・弾力'] = 70;

        // --- Moisture (保湿持続性) ---
        // Target: A=98, B=96, C=92
        if (mainFerments >= 10.0 && p38 >= 2.0) scores['保湿持続性'] = 93; // +5 from additives
        else if (mainFerments >= 10.0) scores['保湿持続性'] = 92; // +4 from additives
        else if (mainFerments >= 6.0) scores['保湿持続性'] = 88; // +4 from additives
        else scores['保湿持続性'] = 80;

        // --- Spots/Dullness (シミ・くすみ) ---
        // Target: A=90, B=88, C=80
        if (hexapeptide33 >= 1.0) scores['シミ・くすみ'] = 85;
        else if (hexapeptide33 >= 0.3) scores['シミ・くすみ'] = 84;
        else if (hexapeptide33 >= 0.1) scores['シミ・くすみ'] = 78;
        else scores['シミ・くすみ'] = 70;

        // --- Pores (毛穴ケア) ---
        // Target: A=84, B=83, C=82
        if (bacillus >= 5.0 && p38 >= 2.0) scores['毛穴ケア'] = 80;
        else if (bacillus >= 5.0) scores['毛穴ケア'] = 80;
        else if (bacillus >= 3.0) scores['毛穴ケア'] = 79;
        else scores['毛穴ケア'] = 70;
    }

    // 3. Additive Logic for ALL ingredients (Boost)
    // 基礎点を設定した上で、さらに全ての成分の効果を加算する。
    // ただし、BaseSerumの主要成分（P-38など）は基礎点に含まれているため、二重計上を避けるか、微調整に留める。
    
    ingredients.forEach(ing => {
        // BaseSerumの場合、基礎点決定に使用した主要成分の加点はスキップまたは減衰させる
        let multiplier = 1.0;
        if (isBaseSerum) {
            if (ing.name.includes('パルミトイルトリペプチド-38') || 
                ing.name.includes('バチルス発酵物') || 
                ing.name.includes('乳酸桿菌発酵液') ||
                ing.name.includes('ヘキサペプチド-33')) {
                // 主要成分は基礎点で評価済みだが、濃度差を反映させるためわずかに加点
                multiplier = 0.1; 
            }
        }

        const effects = ingredientEffects[ing.name];
        if (effects) {
            effects.forEach(effect => {
                // 濃度(%) * 係数 * 調整係数 = スコア加算
                scores[effect.concern] = (scores[effect.concern] || 0) + (ing.percentage * effect.potency * multiplier);
            });
        }
        
        // 基本的な保湿加点 (グリセリンなど汎用成分用)
        if (ing.percentage > 1.0 && !isBaseSerum) {
             scores['保湿持続性'] = (scores['保湿持続性'] || 0) + (ing.percentage * 0.2);
        }
    });

    // 上限カット (100点満点)
    if (isBaseSerum) {
        for (const key in scores) {
            const k = key as keyof Score;
            // Serum Aの高得点を許容しつつ、100を超えないようにする
            scores[k] = Math.min(100, Math.round(scores[k]!));
        }
    } else {
        for (const key in scores) {
            const k = key as keyof Score;
            // アンプル単体のブースト値は最大30点程度に制限
            scores[k] = Math.min(30, Math.round(scores[k]!));
        }
    }

    return scores;
};


export const AGE_GROUPS: string[] = ["20代", "30代前半", "30代後半", "40代", "50代", "60代以上"];

export const SKIN_TYPES: string[] = ["乾燥肌", "脂性肌", "混合肌", "普通肌", "敏感肌"];

export const SKIN_CONCERNS: string[] = ["シミ・くすみ", "シワ・小ジワ", "ハリ・弾力の低下", "毛穴の目立ち", "乾燥・保湿不足", "敏感・肌荒れ"];

export const SEVERITY_SCALE = [
  { level: 1, label: 'ほぼ気にならない' },
  { level: 2, label: '少し気になる' },
  { level: 3, label: '時々気になる' },
  { level: 4, label: '頻繁に気になる' },
  { level: 5, label: '常に悩んでいる' },
];

export const KNOWLEDGE_SCALE = [
  { level: 1, label: 'おまかせしたい', description: '専門家にお任せで、一番良いものを選んでほしい。' },
  { level: 2, label: '基本は知っている', description: '有名な成分や効果は少しわかるので、簡単な理由が知りたい。' },
  { level: 3, label: '比較して選びたい', description: '選択肢の成分や効果を比較して、自分で納得して選びたい。' },
  { level: 4, label: '成分を重視', description: '特定の整肌成分（ペプチド、発酵エキス、ヒトNK細胞順化培養液エキス等）の効果を重視して選びたい。' },
  { level: 5, label: '専門的に探求', description: '成分の特性やメカニズムなど、深い知識に基づいて選びたい。' },
];

export const IDEAL_SKIN_GOALS = [
  { id: 'lift_and_firm', label: '引き締まったフェイスラインと、弾むようなハリ肌', description: '年齢とともに気になる肌の引き締めやハリ不足にアプローチし、上向きの印象へ。' },
  { id: 'ultimate_glow', label: '色ムラ・くすみのない、澄んだ印象の肌', description: '乾燥によるくすみにアプローチし、肌のキメを整え、均一で明るいツヤを与える。' },
  { id: 'wrinkle_smoothing', label: '乾燥小ジワを感じさせない、なめらかな肌', description: '目元や口元の乾燥による小ジワを目立たなくし、ふっくらとキメの整った肌質感へ。' },
  { id: 'total_rejuvenation', label: '複合的な悩みをケアする、生命感あふれる肌', description: 'ハリ、ツヤ、うるおい。年齢に応じたケアを包括的に行い、肌全体の美しさを引き上げる。' },
];

export const LIFESTYLE_FACTORS = [
    '睡眠不足や不規則な生活',
    'ストレスを感じることが多い',
    'PCやスマホを長時間利用する',
    '食生活の乱れが気になる',
    '屋外で過ごす時間が長い',
    'エアコンなど乾燥した環境にいることが多い',
];

export const INVESTIGATION_DISSATISFACTIONS: string[] = [
  "保湿力が足りない",
  "ハリ・弾力への効果が感じられない",
  "シミ・くすみへの効果が実感できない",
  "シワへのアプローチが物足りない",
  "刺激を感じることがある",
  "コストパフォーマンスが悪い"
];

// --- New Questionnaire Constants ---

export const TROUBLE_HISTORY_OPTIONS = [
    "特になし",
    "季節の変わり目にゆらぎやすい",
    "新しい化粧品で赤みが出やすい",
    "生理前に肌荒れしやすい",
    "過去に化粧品かぶれの経験あり"
];

export const CONCERN_TIMINGS = [
    "朝起きた時",
    "日中の乾燥・テカリ",
    "夕方のくすみ・疲れ顔",
    "洗顔後・入浴後",
    "季節の変わり目"
];

export const CURRENT_LACKS = [
    "潤いの持続力",
    "肌の透明感・明るさ",
    "内側からのハリ・弾力",
    "化粧ノリの良さ",
    "肌の柔らかさ"
];

export const PRODUCT_USAGE_DURATIONS = [
    "1ヶ月未満",
    "1〜3ヶ月",
    "3ヶ月〜半年",
    "半年〜1年",
    "1年以上"
];

const SERUM_A_INGREDIENTS: Ingredient[] = [
    { name: '水', percentage: 50.99, effect: '溶媒' },
    { name: 'BG', percentage: 8.0, effect: '保湿' },
    { name: 'プロパンジオール', percentage: 8.0, effect: '保湿' },
    { name: '乳酸桿菌発酵液', percentage: 5.0, effect: '保湿、整肌' },
    { name: 'ソルビトール', percentage: 5.0, effect: '保湿' },
    { name: 'グリセリン', percentage: 5.0, effect: '保湿' },
    { name: 'バチルス発酵物', percentage: 5.0, effect: '引き締め、キメ' },
    { name: 'ポリグリセリン-3', percentage: 3.0, effect: '高保湿' },
    { name: 'ラウロイルグルタミン酸ジ(フィトステリル/オクチルドデシル)', percentage: 1.0, effect: 'エモリエント、バリア' },
    { name: 'コメ発酵液', percentage: 1.0, effect: '保湿、ツヤ' },
    { name: 'ヘキサペプチド-33', percentage: 1.0, effect: 'ハリ、透明感' },
    { name: 'ジャノヒゲ根エキス', percentage: 0.5, effect: '肌荒れ防止' },
    { name: 'アセチルヘプタペプチド-4', percentage: 1.0, effect: '肌バリア、ハリ' },
    { name: 'パルミトイルトリペプチド-38', percentage: 2.0, effect: 'ハリ、シワ対策' },
    { name: 'オリゴペプチド-24', percentage: 0.5, effect: 'ハリ、キメ' },
    { name: 'ジラウロイルグルタミン酸リシンNa', percentage: 0.3, effect: '浸透促進、修復' },
    { name: 'ヒト血液由来ナチュラルキラー細胞順化培養液エキス', percentage: 0.01, effect: 'エイジングケア' },
    { name: 'イノシトール', percentage: 0.2, effect: '皮脂ケア' },
    { name: 'イヌリン', percentage: 0.2, effect: '整肌' },
    { name: 'ヒドロキシプロピルシクロデキストリン', percentage: 0.1, effect: '包接、安定化' },
    { name: 'マルトデキストリン', percentage: 0.1, effect: '保湿' },
    { name: 'トコフェロール', percentage: 0.1, effect: '抗酸化' },
    { name: '水添レシチン', percentage: 0.2, effect: '乳化、保湿' },
    { name: 'ラウリン酸ポリグリセリル-10', percentage: 0.2, effect: '乳化' },
    { name: 'カルボマー', percentage: 0.2, effect: '増粘' },
    { name: '水酸化Na', percentage: 0.05, effect: 'pH調整' },
    { name: '1,2-ヘキサンジオール', percentage: 0.5, effect: '防腐補助' },
    { name: 'カプリルヒドロキサム酸', percentage: 0.1, effect: '防腐補助' },
    { name: 'カプリリルグリコール', percentage: 0.1, effect: '保湿、防腐補助' },
    { name: 'エチルヘキシルグリセリン', percentage: 0.1, effect: '保湿、防腐補助' },
];

const SERUM_B_INGREDIENTS: Ingredient[] = [
    { name: '水', percentage: 61.89, effect: '溶媒' },
    { name: 'BG', percentage: 6.0, effect: '保湿' },
    { name: 'プロパンジオール', percentage: 6.0, effect: '保湿' },
    { name: '乳酸桿菌発酵液', percentage: 5.0, effect: '保湿、整肌' },
    { name: 'ソルビトール', percentage: 5.0, effect: '保湿' },
    { name: 'バチルス発酵物', percentage: 5.0, effect: '引き締め、キメ' },
    { name: 'ポリグリセリン-3', percentage: 3.0, effect: '高保湿' },
    { name: 'グリセリン', percentage: 2.0, effect: '保湿' },
    { name: 'コメ発酵液', percentage: 1.0, effect: '保湿、ツヤ' },
    { name: 'ラウロイルグルタミン酸ジ(フィトステリル/オクチルドデシル)', percentage: 0.5, effect: 'エモリエント' },
    { name: 'ヘキサペプチド-33', percentage: 0.3, effect: 'ハリ、透明感' },
    { name: 'ジャノヒゲ根エキス', percentage: 0.15, effect: '肌荒れ防止' },
    { name: 'アセチルヘプタペプチド-4', percentage: 0.3, effect: '肌バリア、ハリ' },
    { name: 'パルミトイルトリペプチド-38', percentage: 1.0, effect: 'ハリ、シワ対策' },
    { name: 'オリゴペプチド-24', percentage: 0.15, effect: 'ハリ、キメ' },
    { name: 'ジラウロイルグルタミン酸リシンNa', percentage: 0.1, effect: '浸透促進、修復' },
    { name: 'ヒト血液由来ナチュラルキラー細胞順化培養液エキス', percentage: 0.01, effect: 'エイジングケア' },
    { name: 'イノシトール', percentage: 0.1, effect: '皮脂ケア' },
    { name: 'イヌリン', percentage: 0.1, effect: '整肌' },
    { name: 'ヒドロキシプロピルシクロデキストリン', percentage: 0.1, effect: '包接、安定化' },
    { name: 'マルトデキストリン', percentage: 0.1, effect: '保湿' },
    { name: 'トコフェロール', percentage: 0.05, effect: '抗酸化' },
    { name: '水添レシチン', percentage: 0.1, effect: '乳化、保湿' },
    { name: 'ラウリン酸ポリグリセリル-10', percentage: 0.1, effect: '乳化' },
    { name: 'カルボマー', percentage: 0.2, effect: '増粘' },
    { name: '水酸化Na', percentage: 0.05, effect: 'pH調整' },
    { name: '1,2-ヘキサンジオール', percentage: 0.5, effect: '防腐補助' },
    { name: 'カプリルヒドロキサム酸', percentage: 0.1, effect: '防腐補助' },
    { name: 'カプリリルグリコール', percentage: 0.1, effect: '保湿、防腐補助' },
    { name: 'エチルヘキシルグリセリン', percentage: 0.1, effect: '保湿、防腐補助' },
];

const SERUM_C_INGREDIENTS: Ingredient[] = [
    { name: '水', percentage: 70.0, effect: '溶媒' },
    { name: 'BG', percentage: 5.0, effect: '保湿' },
    { name: 'プロパンジオール', percentage: 5.0, effect: '保湿' },
    { name: '乳酸桿菌発酵液', percentage: 3.0, effect: '保湿、整肌' },
    { name: 'ソルビトール', percentage: 3.0, effect: '保湿' },
    { name: 'バチルス発酵物', percentage: 3.0, effect: '引き締め' },
    { name: 'ポリグリセリン-3', percentage: 2.0, effect: '高保湿' },
    { name: 'グリセリン', percentage: 2.0, effect: '保湿' },
    { name: 'コメ発酵液', percentage: 0.1, effect: '保湿' },
    { name: 'ラウロイルグルタミン酸ジ(フィトステリル/オクチルドデシル)', percentage: 0.1, effect: 'エモリエント' },
    { name: 'ヘキサペプチド-33', percentage: 0.1, effect: 'ハリ、透明感' },
    { name: 'ジャノヒゲ根エキス', percentage: 0.15, effect: '肌荒れ防止' },
    { name: 'アセチルヘプタペプチド-4', percentage: 0.1, effect: '肌バリア' },
    { name: 'パルミトイルトリペプチド-38', percentage: 0.5, effect: 'ハリ、予防' },
    { name: 'オリゴペプチド-24', percentage: 0.1, effect: 'ハリ、キメ' },
    { name: 'ジラウロイルグルタミン酸リシンNa', percentage: 0.1, effect: '浸透促進、修復' },
    { name: 'ヒト血液由来ナチュラルキラー細胞順化培養液エキス', percentage: 0.01, effect: 'エイジングケア' },
    { name: 'イノシトール', percentage: 0.1, effect: '皮脂ケア' },
    { name: 'イヌリン', percentage: 0.1, effect: '整肌' },
    { name: 'ヒドロキシプロピルシクロデキストリン', percentage: 0.1, effect: '包接、安定化' },
    { name: 'マルトデキストリン', percentage: 0.1, effect: '保湿' },
    { name: 'トコフェロール', percentage: 0.05, effect: '抗酸化' },
    { name: '水添レシチン', percentage: 0.1, effect: '乳化、保湿' },
    { name: 'ラウリン酸ポリグリセリル-10', percentage: 0.1, effect: '乳化' },
    { name: 'カルボマー', percentage: 0.2, effect: '増粘' },
    { name: '水酸化Na', percentage: 0.05, effect: 'pH調整' },
    { name: '1,2-ヘキサンジオール', percentage: 0.5, effect: '防腐補助' },
    { name: 'カプリルヒドロキサム酸', percentage: 0.1, effect: '防腐補助' },
    { name: 'カプリリルグリコール', percentage: 0.1, effect: '保湿、防腐補助' },
    { name: 'エチルヘキシルグリセリン', percentage: 0.1, effect: '保湿、防腐補助' },
];

export const SERUM_A: Serum = {
  id: 'serum-a',
  name: 'EVOLURE CellVital The Serum A (The Masterpiece)',
  type: 'serum',
  price: 17050,
  subscriptionPrice: 14850,
  volume: 30,
  isPublished: true,
  description: '【The Masterpiece】技術的頂点を示すフラッグシップモデル。原価率を度外視し、科学的に実証された有効成分を限界濃度まで配合した、妥協なき最高峰。シワ・ハリへの圧倒的アプローチ。',
  // Report scores: Spots 90, Wrinkles 97, Firmness 96, Pores 84, Moisture 98
  baseScores: calculateScoreFromIngredients(SERUM_A_INGREDIENTS, true),
  mainIngredients: ['乳酸桿菌発酵液', 'パルミトイルトリペプチド-38 (2.0%)', 'バチルス発酵物', 'コメ発酵液', 'ヘキサペプチド-33', 'アセチルヘプタペプチド-4', 'ヒトNK細胞順化培養液エキス'],
  ingredients: SERUM_A_INGREDIENTS,
  totalActiveConcentration: 18.51,
};

export const SERUM_B: Serum = {
  id: 'serum-b',
  name: 'EVOLURE CellVital The Serum B (The Standard)',
  type: 'serum',
  price: 10890,
  subscriptionPrice: 9790,
  volume: 30,
  isPublished: true,
  description: '【The Standard】1万円台の市場におけるカテゴリーキラー。予防と改善のバランスに優れ、全方位的な機能優位性を持つ賢者の選択。',
  // Report scores: Spots 88, Wrinkles 88, Firmness 88, Pores 83, Moisture 96
  baseScores: calculateScoreFromIngredients(SERUM_B_INGREDIENTS, true),
  mainIngredients: ['乳酸桿菌発酵液', 'パルミトイルトリペプチド-38 (1.0%)', 'バチルス発酵物', 'コメ発酵液', 'ヘキサペプチド-33', 'アセチルヘプタペプチド-4', 'ヒトNK細胞順化培養液エキス'],
  ingredients: SERUM_B_INGREDIENTS,
  totalActiveConcentration: 15.71,
};

export const SERUM_C: Serum = {
  id: 'serum-c',
  name: 'EVOLURE CellVital The Serum C (The Foundation)',
  type: 'serum',
  price: 8250,
  subscriptionPrice: 7645,
  volume: 30,
  isPublished: true,
  description: '【The Foundation】肌の基礎体力（保湿・バリア・常在菌バランス）を高めることに特化した基盤美容液。予防ケアや、まず肌の土台を整えたい方へのゲートウェイ。',
  // Report scores (Final): Spots 80, Wrinkles 82, Firmness 82, Pores 82, Moisture 92
  baseScores: calculateScoreFromIngredients(SERUM_C_INGREDIENTS, true),
  mainIngredients: ['乳酸桿菌発酵液', 'バチルス発酵物', 'パルミトイルトリペプチド-38 (0.5%)', 'ポリグリセリン-3', 'セラミド前駆体'],
  ingredients: SERUM_C_INGREDIENTS,
  totalActiveConcentration: 8.91,
};

// --- New Ampoules Data ---

const WOUND_HEALING_AMPOULE_INGREDIENTS: Ingredient[] = [
    { name: 'エピロビウムフレイスケリ葉/茎エキス', percentage: 3, effect: '肌の引き締め、皮脂ケア' },
    { name: 'カルノシン', percentage: 1.5, effect: 'ハリ、健やかな肌へ' },
    { name: 'ナズナエキス', percentage: 1.5, effect: '肌荒れ防止' },
    { name: 'パルミトイルペンタペプチド-4', percentage: 1, effect: 'ハリ、弾力' },
    { name: 'オオアザミ果実エキス', percentage: 1.5, effect: '肌を保護、整える' },
    { name: 'DNA', percentage: 1, effect: '保湿、キメを整える' },
];

const WHITENING_AMPOULE_INGREDIENTS: Ingredient[] = [
    { name: 'ビワ葉エキス', percentage: 1, effect: '肌荒れ防止、キメ' },
    { name: 'マデカッソシド', percentage: 2, effect: '肌荒れ防止、バリア機能サポート' },
    { name: '酒粕エキス', percentage: 1.5, effect: '保湿、ツヤ' },
    { name: 'ミドリハッカエキス', percentage: 1, effect: '肌の引き締め、清涼感' },
    { name: 'チャ葉エキス', percentage: 1.5, effect: '肌の引き締め、ツヤ' },
];

const ANTI_WRINKLE_AMPOULE_INGREDIENTS: Ingredient[] = [
    { name: 'クロレラエキス', percentage: 4, effect: 'ハリ、弾力' },
    { name: 'キシリチルグルコシド', percentage: 5, effect: '高保湿、うるおいバリア' },
    { name: '乳酸桿菌発酵液', percentage: 2, effect: '肌環境を整える' },
    { name: 'ローブッシュブルーベリー果実エキス', percentage: 2, effect: '肌のキメ、エイジングケア' },
    { name: 'ブロッコリーエキス', percentage: 2, effect: '肌の保護' },
    { name: 'アーチチョーク葉エキス', percentage: 2, effect: '毛穴ケア、引き締め' },
];

const REJUVENATION_AMPOULE_INGREDIENTS: Ingredient[] = [
    { name: 'ツボクサカルス順化培養液', percentage: 2, effect: 'ハリ、ツヤ' },
    { name: 'マコンブエキス', percentage: 4, effect: '高保湿、ハリ' },
    { name: 'クラミドモナスレインハルドチ小胞', percentage: 2, effect: '肌の保護、エイジングケア' },
    { name: 'トリフルオロアセチルトリペプチドー2', percentage: 4, effect: '引き締め、ハリ' },
];


export const FOUNDATION_AMPOULES: Ampoule[] = [
    { 
        id: 'amp-wound-healing', 
        name: 'バリアケアアンプル', 
        type: 'foundation', 
        price: 1089, 
        volume: 10, 
        isPublished: true,
        description: '肌の水分バランスを整え、乾燥などの外的刺激から守る、お守りのような一本。', 
        function: '肌荒れ防止、保護、バリア機能サポート', 
        target: '乾燥、肌荒れを防ぎたい方', 
        mainIngredients: ['エピロビウムフレイスケリ葉/茎エキス', 'カルノシン', 'ナズナエキス', 'パルミトイルペンタペプチド-4'], 
        boosts: calculateScoreFromIngredients(WOUND_HEALING_AMPOULE_INGREDIENTS, false),
        totalActiveConcentration: 9.5
    },
    { 
        id: 'amp-whitening', 
        name: 'ブライトニングアンプル', 
        type: 'foundation', 
        price: 1089, 
        volume: 10, 
        isPublished: true,
        description: '植物由来のエキスが肌にうるおいを与え、キメの整った明るい印象の肌へ導きます。', 
        function: '乾燥によるくすみケア、ツヤ', 
        target: 'ツヤ不足、キメの乱れ', 
        mainIngredients: ['マデカッソシド', '酒粕エキス', 'チャ葉エキス', 'ビワ葉エキス'], 
        boosts: calculateScoreFromIngredients(WHITENING_AMPOULE_INGREDIENTS, false),
        totalActiveConcentration: 7.0
    },
];

export const PERFORMANCE_AMPOULES: Ampoule[] = [
    { 
        id: 'amp-anti-wrinkle', 
        name: 'ハリ・弾力アンプル', 
        type: 'performance', 
        price: 2750, 
        volume: 10, 
        isPublished: true,
        description: '保湿成分を豊富に配合し、乾燥による小ジワを目立たなくし、ふっくらとしたハリを与えます。', 
        function: 'ハリ・弾力ケア、乾燥小ジワ対策', 
        target: 'ハリ不足、乾燥による年齢サイン', 
        mainIngredients: ['キシリチルグルコシド', 'クロレラエキス', 'アーチチョーク葉エキス'], 
        boosts: calculateScoreFromIngredients(ANTI_WRINKLE_AMPOULE_INGREDIENTS, false),
        totalActiveConcentration: 17.0
    },
    { 
        id: 'amp-rejuvenate', 
        name: 'エイジングケアアンプル', 
        type: 'performance', 
        price: 2750, 
        volume: 10, 
        isPublished: true,
        description: '先進のペプチドと整肌成分が、年齢に応じたお手入れをサポートし、美しく健やかな肌を保ちます。', 
        function: 'エイジングケア、肌の引き締め', 
        target: '年齢肌、ハリ・ツヤ不足', 
        mainIngredients: ['トリフルオロアセチルトリペプチドー2', 'ツボクサカルス順化培養液', 'マコンブエキス'], 
        boosts: calculateScoreFromIngredients(REJUVENATION_AMPOULE_INGREDIENTS, false),
        totalActiveConcentration: 12.0
    },
];

export const ALL_PRODUCTS = [SERUM_A, SERUM_B, SERUM_C, ...FOUNDATION_AMPOULES, ...PERFORMANCE_AMPOULES];

export const SCORE_CATEGORY_KEYS: (keyof Score)[] = ['シミ・くすみ', 'シワ・小ジワ', 'ハリ・弾力', '毛穴ケア', '保湿持続性'];

export const INGREDIENT_DESCRIPTIONS: { [key: string]: string } = {
  // New Foundation Ampoules
  'エピロビウムフレイスケリ葉/茎エキス': 'アルプス地方の植物エキス。肌の水分と油分のバランスを整え、キメの整ったなめらかな肌へ導きます。テカリが気になる肌を穏やかに整えます。',
  'カルノシン': 'アミノ酸の一種。肌にハリを与え、健やかなコンディションを保ちます。年齢に応じたうるおいケアに適した成分です。',
  'ナズナエキス': '古くから親しまれてきた植物エキス。肌荒れを防ぎ、デリケートな肌を穏やかに整えます。',
  'パルミトイルペンタペプチド-4': '「マトリキシル」として知られるペプチド。角層まで浸透し、肌に弾むようなハリを与え、なめらかな肌へ導きます。',
  'オオアザミ果実エキス': 'シリマリンを含む植物エキス。肌を保護し、乾燥などの外的ストレスから守り、健やかに保ちます。',
  'DNA': 'DNA-Naとも表記される成分。肌のキメを整え、うるおいを保つことで、健やかな肌状態をサポートします。',
  'マデカッソシド': 'CICA(ツボクサ)由来の成分。肌荒れを防ぎ、敏感に傾きがちな肌を保護し、健やかに整えます。',
  '酒粕エキス': '日本酒由来の保湿成分。アミノ酸などを豊富に含み、肌にしっとりとしたうるおいと、ツヤを与えます。',
  'チャ葉エキス': '緑茶由来のエキス。肌を引き締め、キメを整えるとともに、みずみずしい肌印象へ導きます。',
  'ビワ葉エキス': '肌荒れを防ぎ、キメの整ったなめらかな肌へ導く植物エキスです。',
  'ミドリハッカエキス': '肌を清涼感とともに引き締め、すこやかに保ちます。',
  
  // New Performance Ampoules
  'クロレラエキス': '藻類由来のエキス。肌にうるおいとハリを与え、健やかな肌を保ちます。',
  'キシリチルグルコシド': '白樺由来の保湿成分。角層の水分を保ち、うるおいを与えることで、乾燥を防ぎます。',
  '乳酸桿菌発酵液': '発酵エキス。肌にうるおいを与え、健やかな肌環境を保ちます。',
  'ローブッシュブルーベリー果実エキス': 'アントシアニンを含む果実エキス。肌のキメを整え、ツヤ肌を保ちます。',
  'ブロッコリーエキス': '肌を保護し、乾燥などの外的ダメージから守り、健やかに保つ植物エキスです。',
  'アーチチョーク葉エキス': '肌を引き締め、キメの整ったなめらかな肌へ導きます。',
  'ツボクサカルス順化培養液': 'ツボクサの幹細胞を培養して得られるエキス。植物の力で肌にハリとツヤを与え、健やかな状態へ導きます。',
  'マコンブエキス': '海藻由来のエキス。肌表面にうるおいを与え、水分を保ち、しっとりとした肌へ導きます。',
  'クラミドモナスレインハルドチ小胞': '微細藻類由来の成分。肌にうるおいを与え、保護します。',
  'トリフルオロアセチルトリペプチドー2': '「プロジェリン」として知られるペプチド。肌を引き締め、ハリを与えます。',
  
  // Serums
  'パルミトイルトリペプチド-38': '「マトリキシルシンセ6」と呼ばれるペプチド。肌にハリとツヤを与え、なめらかに整えます。',
  'バチルス発酵物': '海洋性プランクトン由来の発酵エキス。肌を引き締め、キメを整えます。',
  'ヘキサペプチド-33': '肌のキメを整え、明るい印象のツヤ肌へ導くペプチドです。',
  'アセチルヘプタペプチド-4': 'ペプチド成分。肌を保護し、健やかな状態を保ちます。',
  'ヒト血液由来ナチュラルキラー細胞順化培養液エキス': '肌にうるおいとハリを与え、年齢に応じたケアをサポートします。',
  'ポリグリセリン-3': '植物由来の保湿成分。肌にうるおいを与え、しっとりとした肌を保ちます。',
  'ジャノヒゲ根エキス': '乾燥などの外的ダメージから肌を守り、肌荒れを防いで健やかな状態へ導きます。',
  'ジラウロイルグルタミン酸リシンNa': '「ペリセア」として知られる成分。角層まで浸透し、肌を保護します。',
  'イノシトール': 'コメ由来の成分。肌の水分と油分を補い保ち、乾燥を防ぎます。'
};

export const BENCHMARK_COMPETITORS: Competitor[] = [
  { name: 'ポーラ B.A グランラグゼ IV', priceTier: '3万円以上', scores: { 'シミ・くすみ': 86, 'シワ・小ジワ': 91, 'ハリ・弾力': 94, '毛穴ケア': 83, '保湿持続性': 92 } },
  { name: 'Lancôme アプソリュ インテンシブ', priceTier: '3万円以上', scores: { 'シミ・くすみ': 88, 'シワ・小ジワ': 92, 'ハリ・弾力': 93, '毛穴ケア': 82, '保湿持続性': 90 } },
  { name: 'Dior プレステージ ユイル ド ローズ', priceTier: '3万円以上', scores: { 'シミ・くすみ': 85, 'シワ・小ジワ': 90, 'ハリ・弾力': 95, '毛穴ケア': 80, '保湿持続性': 92 } },
  { name: 'コスメデコルテ AQ ミリオリティ', priceTier: '3万円以上', scores: { 'シミ・くすみ': 85, 'シワ・小ジワ': 90, 'ハリ・弾力': 93, '毛穴ケア': 80, '保湿持続性': 90 } },
  { name: 'Guerlain オーキデ アンペリアル', priceTier: '3万円以上', scores: { 'シミ・くすみ': 80, 'シワ・小ジワ': 88, 'ハリ・弾力': 96, '毛穴ケア': 78, '保湿持続性': 90 } },
  { name: 'HR リプラスティ プロフィラー', priceTier: '3万円以上', scores: { 'シミ・くすみ': 78, 'シワ・小ジワ': 94, 'ハリ・弾力': 92, '毛穴ケア': 78, '保湿持続性': 88 } },
  { name: 'Cle de Peau セラムラフェルミサンS n', priceTier: '3万円以上', scores: { 'シミ・くすみ': 82, 'シワ・小ジワ': 85, 'ハリ・弾力': 94, '毛穴ケア': 80, '保湿持続性': 88 } },
  { name: 'SK-II LXP アルティメイト', priceTier: '3万円以上', scores: { 'シミ・くすみ': 80, 'シワ・小ジワ': 85, 'ハリ・弾力': 90, '毛穴ケア': 78, '保湿持続性': 95 } },
  { name: 'ラ・プレリー SC リキッドリフト', priceTier: '3万円以上', scores: { 'シミ・くすみ': 75, 'シワ・小ジワ': 90, 'ハリ・弾力': 97, '毛穴ケア': 75, '保湿持続性': 88 } },
  { name: 'エピステーム ステムサイエンス RX', priceTier: '3万円以上', scores: { 'シミ・くすみ': 75, 'シワ・小ジワ': 88, 'ハリ・弾力': 92, '毛穴ケア': 75, '保湿持続性': 85 } },
  { name: 'コスメデコルテ リポソーム アドバンスト', priceTier: '1万円以上', scores: { 'シミ・くすみ': 75, 'シワ・小ジワ': 85, 'ハリ・弾力': 88, '毛穴ケア': 80, '保湿持続性': 98 } },
  { name: 'ランコム ジェニフィック アドバンスト N', priceTier: '1万円以上', scores: { 'シミ・くすみ': 82, 'シワ・小ジワ': 85, 'ハリ・弾力': 86, '毛穴ケア': 80, '保湿持続性': 93 } },
  { name: 'オバジ C25セラム ネオ', priceTier: '1万円以上', scores: { 'シミ・くすみ': 92, 'シワ・小ジワ': 80, 'ハリ・弾力': 82, '毛穴ケア': 90, '保湿持続性': 78 } },
  { name: 'エスティ ローダー ナイトリペア SMR', priceTier: '1万円以上', scores: { 'シミ・くすみ': 78, 'シワ・小ジワ': 88, 'ハリ・弾力': 87, '毛穴ケア': 75, '保湿持続性': 92 } },
  { name: 'キールズ DS RTN リニューイング', priceTier: '1万円以上', scores: { 'シミ・くすみ': 70, 'シワ・小ジワ': 93, 'ハリ・弾力': 88, '毛穴ケア': 85, '保湿持続性': 80 } },
  { name: 'SHISEIDO アルティミューン III', priceTier: '1万円以上', scores: { 'シミ・くすみ': 80, 'シワ・小ジワ': 82, 'ハリ・弾力': 85, '毛穴ケア': 78, '保湿持続性': 90 } },
  { name: 'SK-II ジェノプティクス ウルトオーラ', priceTier: '1万円以上', scores: { 'シミ・くすみ': 96, 'シワ・小ジワ': 70, 'ハリ・弾力': 78, '毛穴ケア': 75, '保湿持続性': 88 } },
  { name: 'Cle de Peau セラムコンサントレ', priceTier: '1万円以上', scores: { 'シミ・くすみ': 94, 'シワ・小ジワ': 75, 'ハリ・弾力': 80, '毛穴ケア': 72, '保湿持続性': 86 } },
  { name: 'HAKU メラノフォーカスEV', priceTier: '1万円以上', scores: { 'シミ・くすみ': 95, 'シワ・小ジワ': 70, 'ハリ・弾力': 75, '毛穴ケア': 70, '保湿持続性': 85 } },
  { name: 'ポーラ リンクルショット メディカル N', priceTier: '1万円以上', scores: { 'シミ・くすみ': 60, 'シワ・小ジワ': 96, 'ハリ・弾力': 80, '毛穴ケア': 65, '保湿持続性': 75 } },
];
