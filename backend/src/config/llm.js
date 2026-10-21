import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { config } from './env.js';

let llmInstance = null;
let embeddingsInstance = null;

export function isLlmConfigured() {
  return Boolean(config.llmApiKey && config.llmApiKey.trim().length > 0 && config.llmApiKey !== 'your_llm_api_key_here');
}

export function isEmbeddingsConfigured() {
  const key = config.embeddingApiKey || config.llmApiKey;
  return Boolean(key && key.trim().length > 0 && key !== 'your_llm_api_key_here');
}

export function getLLM(options = {}) {
  if (!isLlmConfigured()) {
    return null;
  }

  const modelName = options.model || config.llmModel;
  const temperature = options.temperature !== undefined ? options.temperature : 0.2;

  const clientConfig = {
    apiKey: config.llmApiKey,
    model: modelName,
    temperature,
  };

  if (config.llmBaseUrl) {
    clientConfig.configuration = {
      baseURL: config.llmBaseUrl,
    };
  }

  return new ChatOpenAI(clientConfig);
}

export function getEmbeddings() {
  if (!isEmbeddingsConfigured()) {
    return null;
  }

  const apiKey = config.embeddingApiKey || config.llmApiKey;
  const clientConfig = {
    apiKey,
    model: config.embeddingModel,
  };

  if (config.llmBaseUrl) {
    clientConfig.configuration = {
      baseURL: config.llmBaseUrl,
    };
  }

  return new OpenAIEmbeddings(clientConfig);
}
