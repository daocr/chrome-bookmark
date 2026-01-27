import { LLMConfig } from "@/langgraph/agents/llm-factory";

const STORAGE_KEY = "llm_config";

const DEFAULT_CONFIG: LLMConfig = {
  model: "ep-20250331114927-lhcpd",
  temperature: 0.9,
  apiKey: "",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
};

/**
 * 从 Chrome Storage 获取 LLM 配置
 */
export async function getLLMConfig(): Promise<LLMConfig> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const config = result[STORAGE_KEY] as LLMConfig;
        resolve(config || DEFAULT_CONFIG);
      });
    } else {
      resolve(DEFAULT_CONFIG);
    }
  });
}

/**
 * 保存 LLM 配置到 Chrome Storage
 */
export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: config }, () => {
        resolve();
      });
    } else {
      console.warn("Chrome storage not available, config not saved");
      resolve();
    }
  });
}

/**
 * 监听配置变化
 */
export function onConfigChange(callback: (config: LLMConfig) => void): void {
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue as LLMConfig);
      }
    });
  }
}
