import { Outlet, useLocation } from "react-router";
import { BottomNav } from "../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

export function MainLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#0f2e24] text-white overflow-x-hidden">
            {/* 這裡是各個頁面的主內容 */}
            <main className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* 全域底部導航欄 */}
            <BottomNav />
        </div>
    );
}
