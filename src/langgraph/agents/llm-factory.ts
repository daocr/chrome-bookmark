import {ChatOpenAI} from "@langchain/openai";
import {getLLMConfig} from "@/lib/storage";

export interface LLMConfig {
    model?: string;
    temperature?: number;
    apiKey?: string;
    baseURL?: string;
}

const DEFAULT_CONFIG: LLMConfig = {
    model: "ep-20260123150254-4nmxz",
    temperature: 0.9,
    apiKey: "fa012c3c-4429-4ab0-b786-62e074a6d52c",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
};

/**
 * 获取配置（优先从存储读取，否则使用默认值）
 */
async function getConfig(config?: Partial<LLMConfig>): Promise<LLMConfig> {
    const storedConfig = await getLLMConfig();
    return {...DEFAULT_CONFIG, ...storedConfig, ...config};
}

export class LLMFactory {
    private static instance: ChatOpenAI | null = null;

    /**
     * 创建或获取 ChatOpenAI 实例（单例模式）
     */
    static async createLLM(config?: Partial<LLMConfig>): Promise<ChatOpenAI> {
        if (this.instance && !config) {
            return this.instance;
        }

        const mergedConfig = await getConfig(config);

        this.instance = new ChatOpenAI({
            model: mergedConfig.model,
            temperature: mergedConfig.temperature,
            apiKey: mergedConfig.apiKey,
            streaming: true,
            configuration: {
                baseURL: mergedConfig.baseURL,
            },
        });

        return this.instance;
    }

    /**
     * 创建新的 LLM 实例（非单例）
     */
    static async createFreshLLM(config?: Partial<LLMConfig>): Promise<ChatOpenAI> {
        const mergedConfig = await getConfig(config);

        return new ChatOpenAI({
            model: mergedConfig.model,
            temperature: mergedConfig.temperature,
            apiKey: mergedConfig.apiKey,
            streaming: true,
            configuration: {
                baseURL: mergedConfig.baseURL,
            },
        });
    }

    /**
     * 重置单例实例
     */
    static reset(): void {
        this.instance = null;
    }
}

// 导出便捷函数
export const getLLM = (config?: Partial<LLMConfig>) => LLMFactory.createLLM(config);
