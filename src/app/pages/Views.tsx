import { useNavigate, useParams } from "react-router";
import { useState, useEffect } from "react";
import {
    Camera, Sparkles, X, Plus, Minus, Package,
    Trash2, Search, Share2, ChefHat,
    User, Settings, HelpCircle, LogOut, ChevronRight,
    BookOpen, Clock, Users, Loader2
} from "lucide-react";
import { PageHeader } from "../components/Shared";
import { useIngredients } from "../services/IngredientContext";
import { formatRelativeTime } from "../services/timeUtils";
import { useCamera } from "../hooks/useCamera";
import { CameraView } from "../components/scanner/CameraView";

// Use consolidated components from inventory_management
import { DetectionRow } from "../components/inventory_management/DetectionRow";
import { DetectionSummary } from "../components/inventory_management/DetectionSummary";
import { InventoryStats } from "../components/inventory_management/InventoryStats";
import { AddEntryForm } from "../components/inventory_management/AddEntryForm";

import { getRecommendedRecipes, recipeDatabase } from "../data/recipes";
import { llmService } from "../services/llmService";
import { RecipeCard } from "../components/recipes/RecipeCard";
import { IngredientCloud } from "../components/recipes/IngredientCloud";
import { RecipeHero } from "../components/recipes/RecipeHero";
import { IngredientChecklist } from "../components/recipes/IngredientChecklist";
import { CookingProtocol } from "../components/recipes/CookingProtocol";

// --- Scanner Page ---
export function Scanner() {
    const navigate = useNavigate();
    const { scannedItems } = useIngredients();
    const { videoRef } = useCamera();

    return (
        <div className="pb-24">
            <PageHeader title="廚房 AI 掃描" />
            <div className="flex flex-col items-center justify-center px-6 py-4">
                <CameraView videoRef={videoRef} />

                <p className="text-center text-gray-400 text-xs mt-8 px-10 leading-relaxed uppercase tracking-widest font-medium opacity-60">將鏡頭對準食材<br />AI 將自動辨識並同步庫存</p>
            </div>
        </div>
    );
}

// --- Ingredients Page ---
export function Ingredients() {
    const navigate = useNavigate();
    const { scannedItems, updateQuantity, removeItem, clearAll } = useIngredients();
    return (
        <div className="pb-32">
            <PageHeader showBackButton title="最近辨識" rightAction={<button onClick={clearAll} className="p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/10 text-red-500"><Trash2 size={20} className="stroke-[2.5]" /></button>} />
            <div className="px-6 py-6">
                <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-6 px-1 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#00ff88]" />掃描紀錄</h2>
                {scannedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 rounded-[3.5rem] border border-white/5">
                        <div className="relative mb-8 group"><div className="absolute inset-0 bg-[#00ff88]/5 rounded-full blur-3xl" /><div className="relative w-24 h-24 bg-[#1a4d3d]/50 rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl"><Plus size={40} className="text-[#00ff88]/20" /></div></div>
                        <h3 className="text-sm font-black text-white/30 uppercase tracking-widest mb-4">目前無數據暫存</h3>
                        <button onClick={() => navigate("/")} className="flex items-center gap-3 bg-[#00ff88] text-[#0f2e24] px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl">啟動感測器</button>
                    </div>
                ) : (
                    <div className="space-y-3">{scannedItems.slice(0, 10).map((item) => (<DetectionRow key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeItem} />))}</div>
                )}
            </div>
        </div>
    );
}

// --- Recipes Page ---
export function Recipes() {
    const navigate = useNavigate();
    const { scannedItems, recommendedRecipes, setRecipes } = useIngredients();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (scannedItems.length > 0 && recommendedRecipes.length === 0) {
            const fetchRecipes = async () => {
                setIsLoading(true);
                try {
                    const res = await llmService.generateRecipes({ ingredients: scannedItems.map(i => i.name) });
                    setRecipes(res);
                } catch (error) {
                    setRecipes(getRecommendedRecipes(scannedItems)); // Local fallback
                } finally { setIsLoading(false); }
            };
            fetchRecipes();
        } else { setIsLoading(false); }
    }, [scannedItems, recommendedRecipes, setRecipes]);

    return (
        <div className="pb-24">
            <PageHeader showBackButton title="AI 推薦食譜" rightAction={<button className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10"><Share2 size={20} className="text-white" /></button>} />
            <div className="px-6 py-4">
                <IngredientCloud items={scannedItems} onAddMore={() => navigate("/inventory")} />
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-6 bg-white/5 rounded-[3rem] border border-white/10"><div className="relative w-16 h-16"><div className="absolute inset-0 border-2 border-[#00ff88]/20 rounded-full" /><div className="absolute inset-0 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" /><Sparkles className="absolute inset-0 m-auto text-[#00ff88] animate-pulse" size={20} /></div><div className="text-center"><h3 className="text-[#00ff88] font-black text-xs uppercase animate-pulse mb-1">運算中...</h3><p className="text-gray-500 text-[9px] font-bold uppercase">正在分析口味分佈</p></div></div>
                ) : recommendedRecipes.length > 0 ? (
                    <div className="space-y-8"><div className="bg-[#1a4d3d]/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-[#00ff88]/20 flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-[#00ff88] flex items-center justify-center flex-shrink-0 shadow-lg"><ChefHat size={24} className="text-[#0f2e24]" strokeWidth={2.5} /></div><div><h3 className="font-black text-xs text-white uppercase mb-1">AI 神經網路推薦</h3><p className="text-[10px] text-gray-400 font-bold uppercase leading-tight">已優化 <span className="text-[#00ff88]">{recommendedRecipes.length} 個相容節點</span> <br />惜食減廢協議已啟動</p></div></div><div className="grid grid-cols-1 gap-10">{recommendedRecipes.map((r) => (<RecipeCard key={r.id} recipe={r} onClick={() => navigate(`/recipe/${r.id}`)} getCategoryLabel={(c) => c === "vegetable" ? "蔬菜" : c === "fruit" ? "水果" : c === "meat" ? "肉類" : "綜合"} />))}</div></div>
                ) : (
                    <div className="text-center py-24 px-8 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5"><div className="w-20 h-20 mx-auto mb-6 bg-[#00ff88]/5 rounded-full flex items-center justify-center"><ChefHat size={40} className="text-[#00ff88]/20" /></div><h4 className="text-white font-black text-sm uppercase mb-2">未發現相容方案</h4><button onClick={() => navigate("/")} className="inline-flex items-center gap-3 px-8 py-4 bg-[#00ff88] text-[#0f2e24] rounded-2xl font-black uppercase text-[10px]">返回掃描</button></div>
                )}
            </div>
        </div>
    );
}

// --- Inventory Page ---
export function Inventory() {
    const navigate = useNavigate();
    const { scannedItems, addItem, updateQuantity, removeIngredient, selectedIds, toggleSelection, generateRecipe } = useIngredients();
    const [isGenerating, setIsGenerating] = useState(false);
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("全部");
    const [showForm, setShowForm] = useState(false);
    const filtered = scannedItems.filter(i => (cat === "全部" || i.category === cat) && i.name.toLowerCase().includes(search.toLowerCase()));
    const total = scannedItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="pb-24">
            <PageHeader showBackButton title="食材清單" rightAction={<button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-[#00ff88] rounded-xl shadow-lg"><Plus size={20} className="text-[#0f2e24] stroke-[3]" /></button>} />
            <div className="bg-[#0f2e24] sticky top-[64px] z-20 pb-4 px-6 py-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="搜尋食材..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-[#00ff88] text-sm font-bold" /></div><div className="flex gap-2 overflow-x-auto no-scrollbar mt-4">{["全部", "蔬菜", "水果", "乳製品", "肉類", "五穀", "其他"].map(c => (<button key={c} onClick={() => setCat(c)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border ${cat === c ? "bg-[#00ff88] text-[#0f2e24] border-[#00ff88]" : "bg-white/5 text-gray-500 border-white/10"}`}>{c}</button>))}</div></div>
            <div className="px-6 mb-2">
                <button
                    onClick={async () => {
                        setIsGenerating(true);
                        try {
                            await generateRecipe();
                            navigate("/recipes");
                        } catch (e: any) {
                            alert(e.message);
                        } finally {
                            setIsGenerating(false);
                        }
                    }}
                    disabled={isGenerating || selectedIds.length === 0}
                    className="w-full bg-[#00ff88] text-[#0f2e24] py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(0,255,136,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGenerating ? "Synthesizing..." : "生成 AI 食譜方案"}
                </button>
            </div>

            <InventoryStats totalItems={total} freshItems={scannedItems.length} />
            {showForm && (<AddEntryForm onAdd={addItem} onDismiss={() => setShowForm(false)} categories={["全部", "蔬菜", "水果", "乳製品", "肉類", "五穀", "其他"]} />)}
            <div className="px-6 py-4"><h3 className="font-black text-xs uppercase text-white/30 mb-4 px-2">存貨紀錄 ({filtered.length})</h3>{filtered.length === 0 ? (<div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/5"><Package size={48} className="mx-auto mb-4 text-[#00ff88]/10" /></div>) : (<div className="space-y-3">{filtered.map(i => (<div key={i.id} className="bg-[#1a4d3d]/30 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                <button
                    onClick={() => toggleSelection(i.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.includes(i.id) ? 'bg-[#00ff88] border-[#00ff88]' : 'bg-transparent border-white/20'}`}
                >
                    {selectedIds.includes(i.id) && <div className="w-3 h-3 bg-[#0f2e24] rounded-sm" />}
                </button>
                <div className="w-12 h-12 rounded-xl bg-[#0f2e24] flex items-center justify-center flex-shrink-0"><Package size={20} className="text-[#00ff88]" /></div><div className="flex-1 min-w-0"><h4 className="font-black text-white text-sm truncate uppercase">{i.name}</h4><span className="text-[8px] font-black uppercase text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-md">{i.category || "其他"}</span></div><div className="flex items-center gap-2"><div className="flex items-center bg-[#0f2e24]/80 rounded-full p-1 border border-white/10"><button onClick={() => updateQuantity(i.id, -1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#00ff88]"><Minus size={12} strokeWidth={3} /></button><span className="w-8 text-center font-black text-white text-xs">{i.quantity}</span><button onClick={() => updateQuantity(i.id, 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#00ff88]"><Plus size={12} strokeWidth={3} /></button></div><button onClick={() => removeIngredient(i.id)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><X size={14} strokeWidth={3} /></button></div></div>))}</div>)}</div>
        </div>
    );
}

// --- Profile & Saved & Detail (Simplified Combined) ---
export function Profile() {
    return (
        <div className="pb-24 px-6 py-8"><PageHeader title="Profile" />
            <div className="flex flex-col items-center mb-10"><div className="w-28 h-28 rounded-full bg-[#1a4d3d] border-4 border-[#00ff88]/20 flex items-center justify-center shadow-2xl mb-6"><User size={48} className="text-[#00ff88]" strokeWidth={1} /></div><h2 className="text-lg font-black text-white uppercase mb-2">AI Chef Protocol</h2></div>
            <div className="grid grid-cols-3 gap-3 mb-10 bg-[#1a4d3d]/20 p-5 rounded-[2rem] border border-white/5">{[{ v: 12, l: "Recipes" }, { v: "45%", l: "Waste Saved" }, { v: 8, l: "Days Active" }].map(s => (<div key={s.l} className="text-center"><div className="text-xl font-black text-[#00ff88]">{s.v}</div><div className="text-[7px] font-black text-white/40 uppercase">{s.l}</div></div>))}</div>
            <div className="space-y-2">{["Settings", "Help & Support", "Log Out"].map(l => (<button key={l} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] border border-white/5 hover:border-[#00ff88]/20 text-[10px] font-black text-white uppercase tracking-widest"><span>{l}</span><ChevronRight size={16} className="ml-auto" /></button>))}</div>
        </div>
    );
}

export function Saved() {
    const nav = useNavigate();
    return (
        <div className="pb-24 flex flex-col items-center justify-center px-8 py-24 text-center"><PageHeader showBackButton title="Saved" /><div className="w-28 h-28 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center mb-10"><BookOpen size={48} className="text-[#00ff88]/20" /></div><h2 className="text-sm font-black text-white uppercase mb-4 opacity-50">Archive Empty</h2><button onClick={() => nav("/")} className="bg-[#00ff88] text-[#0f2e24] px-10 py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg">Execute Scanner</button></div>
    );
}

export function RecipeDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const { recommendedRecipes, scannedItems, setRecipes } = useIngredients();

    // 優先從全域推薦中找，找不到才去靜態庫 (Search context first, then static DB)
    const [recipe] = useState(() =>
        recommendedRecipes.find(r => r.id === id) ||
        recipeDatabase.find(r => r.id === id) ||
        {
            name: "AI 合成食譜",
            image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
            time: "15 分鐘",
            difficulty: "簡單",
            requiredIngredients: ["番茄", "菠菜"],
            optionalIngredients: [],
            description: "智慧生成食譜。"
        }
    );
    const [checked, setChecked] = useState<boolean[]>(new Array(recipe.requiredIngredients.length).fill(false));

    return (
        <div className="pb-32"><PageHeader showBackButton title="烹飪指南" /><RecipeHero image={recipe.image} name={recipe.name} />
            <div className="px-6 py-8"><div className="grid grid-cols-3 gap-3 mb-10">{[{ i: Clock, v: recipe.time }, { i: ChefHat, v: recipe.difficulty }, { i: Users, v: "2-3人份" }].map((s, i) => (<div key={i} className="bg-white/5 rounded-2xl p-4 text-center"><s.i className="w-4 h-4 mx-auto mb-2 text-[#00ff88]" /><div className="text-xs font-black text-white">{s.v}</div></div>))}</div>
                <IngredientChecklist ingredients={recipe.requiredIngredients} checkedItems={checked} onToggle={(i) => { const n = [...checked]; n[i] = !n[i]; setChecked(n); }} progress={Math.round((checked.filter(Boolean).length / recipe.requiredIngredients.length) * 100)} />
                <CookingProtocol steps={recipe.steps || [{ title: "初始化", description: "準備食材。" }, { title: "執行", description: "標準烹飪。" }]} />

                {/* 重新分析按鈕放置於最底部 */}
                <div className="mt-12 mb-8 px-2">
                    <button
                        onClick={async () => {
                            try {
                                const ingredientsToUse = scannedItems.map(i => i.name);
                                const res = await llmService.generateRecipes({ ingredients: ingredientsToUse });
                                setRecipes(res);
                                alert("AI 食譜已重新合成！");
                            } catch (e: any) {
                                alert("更新食譜失敗");
                            }
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-5 rounded-2xl text-[10px] font-black text-[#00ff88] uppercase tracking-[0.2em] hover:bg-[#00ff88]/10 transition-all shadow-lg text-center"
                    >
                        <Sparkles size={18} />
                        重新分析並合成新方案
                    </button>
                </div>

                <button onClick={() => nav("/")} className="w-full bg-[#00ff88] text-[#0f2e24] py-5 rounded-2xl font-black text-sm uppercase shadow-lg flex items-center justify-center gap-3 mt-4"><Sparkles size={20} />完成並存檔</button>
            </div>
        </div>
    );
}
