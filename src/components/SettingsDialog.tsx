import { useState, useEffect } from "react";
import { getLLMConfig, saveLLMConfig } from "@/lib/storage";
import { LLMConfig } from "@/langgraph/agents/llm-factory";

const MODEL_OPTIONS = [
    { value: "gpt-4o", label: "gpt-4o" },
    { value: "gpt-4-turbo", label: "gpt-4-turbo" },
    { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
    { value: "claude-3-opus", label: "claude-3-opus" },
    { value: "claude-3-sonnet", label: "claude-3-sonnet" },
    { value: "local-llama-3", label: "local-llama-3" },
];

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onSave?: (config: LLMConfig) => void;
}

export function SettingsDialog({ open, onClose, onSave }: SettingsDialogProps) {
    const [config, setConfig] = useState<LLMConfig>({
        model: "gpt-4o",
        apiKey: "",
        baseURL: "",
        temperature: 0.7,
    });
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (open) {
            getLLMConfig().then((savedConfig) => {
                setConfig({
                    model: savedConfig.model || "gpt-4o",
                    apiKey: savedConfig.apiKey || "",
                    baseURL: savedConfig.baseURL || "",
                    temperature: savedConfig.temperature ?? 0.7,
                });
            });
        }
    }, [open]);

    const handleSave = async () => {
        await saveLLMConfig(config);
        onSave?.(config);
        onClose();
    };

    const handleReset = () => {
        setConfig({
            model: "gpt-4o",
            apiKey: "",
            baseURL: "",
            temperature: 0.7,
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Dialog Content */}
            <div className="relative flex h-screen w-full max-w-[420px] flex-col overflow-hidden bg-background-light dark:bg-background-dark shadow-xl z-10">
                {/* Header */}
                <header className="flex items-center gap-3 border-b border-solid border-slate-200 dark:border-slate-800 px-4 py-4 shrink-0 bg-background-light dark:bg-background-dark z-10 sticky top-0">
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">AI Settings</h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Model Configuration</span>
                    </div>
                </header>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                    <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                        {/* Model Provider Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">dns</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Model Provider</h3>
                            </div>

                            {/* Model ID Input with Dropdown */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="model-id">Model ID</label>
                                <div className="relative">
                                    <input
                                        list="model-options"
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-900 dark:text-white text-sm py-2.5 pl-3 pr-10 focus:ring-primary focus:border-primary shadow-sm cursor-pointer"
                                        id="model-id"
                                        value={config.model}
                                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                        placeholder="Select or enter model ID"
                                    />
                                    <datalist id="model-options">
                                        {MODEL_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </datalist>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500">Select from the list or type a custom model ID.</p>
                            </div>

                            {/* Base URL Input */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="base-url">Base URL</label>
                                <div className="relative">
                                    <input
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-900 dark:text-white text-sm py-2.5 pl-9 pr-3 focus:ring-primary focus:border-primary shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                        id="base-url"
                                        placeholder="https://api.openai.com/v1"
                                        type="text"
                                        value={config.baseURL}
                                        onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                                        <span className="material-symbols-outlined text-[18px]">link</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-800" />

                        {/* Authentication Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">vpn_key</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Authentication</h3>
                            </div>

                            {/* API Key Input */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="api-key">API Key</label>
                                <div className="relative group">
                                    <input
                                        className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-900 dark:text-white text-sm py-2.5 pl-9 pr-10 focus:ring-primary focus:border-primary shadow-sm tracking-widest"
                                        id="api-key"
                                        type={showApiKey ? "text" : "password"}
                                        value={config.apiKey}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                        placeholder="Enter your API key"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                                        <span className="material-symbols-outlined text-[18px]">key</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {showApiKey ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500 flex gap-1 items-center">
                                    <span className="material-symbols-outlined text-[12px]">lock</span>
                                    Your key is stored locally and encrypted.
                                </p>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-800" />

                        {/* Parameters Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parameters</h3>
                            </div>

                            {/* Temperature Slider */}
                            <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="temperature">Temperature</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-primary px-2 py-0.5 rounded text-center min-w-[3rem]">
                                        {(config.temperature ?? 0.7).toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
                                    id="temperature"
                                    max="1"
                                    min="0"
                                    step="0.1"
                                    type="range"
                                    value={config.temperature ?? 0.7}
                                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                />
                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                                    <span>Precise</span>
                                    <span>Balanced</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-4"></div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 shrink-0 z-20">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        Save Configuration
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full mt-2 py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
