import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {getLLMConfig, saveLLMConfig} from "@/lib/storage";
import {LLMConfig} from "@/langgraph/agents/llm-factory";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onSave?: (config: LLMConfig) => void;
}

export function SettingsDialog({open, onClose, onSave}: SettingsDialogProps) {
    const [config, setConfig] = useState<LLMConfig>({
        model: "",
        apiKey: "",
        baseURL: "",
        temperature: 0.9,
    });

    useEffect(() => {
        if (open) {
            getLLMConfig().then(setConfig);
        }
    }, [open]);

    const handleSave = async () => {
        await saveLLMConfig(config);
        onSave?.(config);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 border">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">模型设置</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Model</label>
                        <input
                            type="text"
                            value={config.model}
                            onChange={(e) => setConfig({...config, model: e.target.value})}
                            placeholder="ep-20250331114927-lhcpd"
                            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <input
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Base URL</label>
                        <input
                            type="text"
                            value={config.baseURL}
                            onChange={(e) => setConfig({...config, baseURL: e.target.value})}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Temperature</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={config.temperature}
                            onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        取消
                    </Button>
                    <Button onClick={handleSave}>
                        保存
                    </Button>
                </div>
            </div>
        </div>
    );
}
