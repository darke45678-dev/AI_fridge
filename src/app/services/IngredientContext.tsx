import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { llmService } from "./llmService";

export interface ScannedItem {
    id: string;
    name: string;
    quantity: number;
    timestamp: number;
    category?: string;
    freshness?: number; // 0-10
    expiryDays?: number; // Days until expiry
}

interface IngredientContextType {
    scannedItems: ScannedItem[];
    recommendedRecipes: any[];
    tempDetections: ScannedItem[];
    selectedIds: string[];
    addItem: (item: Partial<ScannedItem>) => void;
    updateQuantity: (id: string, delta: number) => void;
    removeItem: (id: string) => void;
    removeIngredient: (id: string) => void;
    toggleSelection: (id: string) => void;
    generateRecipe: () => Promise<void>;
    clearAll: () => void;
    setRecipes: (recipes: any[]) => void;
    clearTempDetections: () => void;
}

const IngredientContext = createContext<IngredientContextType | undefined>(undefined);

export function IngredientProvider({ children }: { children: ReactNode }) {
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [recommendedRecipes, setRecommendedRecipes] = useState<any[]>([]);
    const [tempDetections, setTempDetections] = useState<ScannedItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("scannedIngredients");
        const savedRecipes = localStorage.getItem("recommendedRecipes");
        if (saved) try { setScannedItems(JSON.parse(saved)); } catch (e) { }
        if (savedRecipes) try { setRecommendedRecipes(JSON.parse(savedRecipes)); } catch (e) { }
    }, []);

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem("scannedIngredients", JSON.stringify(scannedItems));
    }, [scannedItems]);

    useEffect(() => {
        localStorage.setItem("recommendedRecipes", JSON.stringify(recommendedRecipes));
    }, [recommendedRecipes]);

    const addItem = (item: Partial<ScannedItem>) => {
        const now = Date.now();
        // 使用隨機數確保 ID 唯一，避免在循環中快速調用產生重複 ID
        const uniqueId = item.id || `${now}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: ScannedItem = {
            id: uniqueId,
            name: item.name || "未知食材",
            quantity: item.quantity || 1,
            timestamp: now,
            category: item.category || "其他",
            ...item
        };

        // Update inventory and get target ID for selection
        let targetId = uniqueId;
        setScannedItems(prev => {
            const existing = prev.find(i => i.name.toLowerCase() === newItem.name.toLowerCase());
            if (existing) {
                targetId = existing.id;
                return prev.map(i =>
                    i.id === existing.id
                        ? { ...i, quantity: i.quantity + newItem.quantity, timestamp: now }
                        : i
                );
            }
            return [...prev, newItem];
        });

        // Update temp detections (real-time preview)
        setTempDetections(prev => {
            const existing = prev.find(i => i.name.toLowerCase() === newItem.name.toLowerCase());
            if (existing) {
                return prev.map(i =>
                    i.id === existing.id
                        ? { ...i, quantity: i.quantity + newItem.quantity, timestamp: now }
                        : i
                );
            }
            return [...prev, newItem];
        });

        // 預設選中該食材 (Ensure target item is selected)
        setSelectedIds(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
    };

    const clearTempDetections = () => setTempDetections([]);

    const updateQuantity = (id: string, delta: number) => {
        const updater = (prev: ScannedItem[]) =>
            prev.map(item =>
                item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
            ).filter(item => item.quantity > 0);

        setScannedItems(updater);
        setTempDetections(updater);
    };

    const removeItem = (id: string) => {
        if (!id) return;
        setScannedItems(prev => prev.filter(item => item.id !== id));
        setTempDetections(prev => prev.filter(item => item.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const removeIngredient = removeItem;

    const generateRecipe = async () => {
        const selectedIngredients = scannedItems
            .filter(item => selectedIds.includes(item.id))
            .map(item => item.name);

        if (selectedIngredients.length === 0) {
            throw new Error("請至少選擇一項食材進行合成！");
        }

        const recipes = await llmService.generateRecipes({ ingredients: selectedIngredients });
        setRecommendedRecipes(recipes);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const clearAll = () => {
        setScannedItems([]);
        setRecommendedRecipes([]);
        setTempDetections([]);
    };

    return (
        <IngredientContext.Provider value={{
            scannedItems,
            recommendedRecipes,
            tempDetections,
            selectedIds,
            addItem,
            updateQuantity,
            removeItem,
            removeIngredient,
            toggleSelection,
            generateRecipe,
            clearAll,
            setRecipes: setRecommendedRecipes,
            clearTempDetections
        }}>
            {children}
        </IngredientContext.Provider>
    );
}

export function useIngredients() {
    const context = useContext(IngredientContext);
    if (context === undefined) {
        throw new Error("useIngredients must be used within an IngredientProvider");
    }
    return context;
}
