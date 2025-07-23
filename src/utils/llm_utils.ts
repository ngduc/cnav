import { OpenAI } from 'openai';
import chalk from 'chalk';
import { getOpenAIApiKey, getAnthropicApiKey } from './config';

export interface LLMProvider {
  provider: 'openai' | 'anthropic';
  client?: OpenAI;
  apiKey?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMInferenceOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
}

/**
 * Get available LLM provider (OpenAI preferred, fallback to Anthropic)
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  const openaiKey = await getOpenAIApiKey();
  if (openaiKey) {
    return { 
      provider: 'openai', 
      client: new OpenAI({ apiKey: openaiKey }) 
    };
  }
  
  const anthropicKey = await getAnthropicApiKey();
  if (!anthropicKey) {
    console.log(chalk.red('❌ No OpenAI or Anthropic API key found.'));
    console.log(chalk.yellow('To use cnav, you need to set up an API key:'));
    console.log(chalk.cyan('  • OpenAI: Set OPENAI_API_KEY environment variable'));
    console.log(chalk.cyan('  • Anthropic: Set ANTHROPIC_API_KEY environment variable'));
    console.log(chalk.gray('  Example: export OPENAI_API_KEY="sk-your-key-here"'));
    throw new Error('No API key found. Please set up an API key to continue.');
  }
  
  return { 
    provider: 'anthropic', 
    apiKey: anthropicKey 
  };
}

/**
 * Perform LLM inference with unified interface for OpenAI and Anthropic
 */
export async function performLLMInference(
  messages: LLMMessage[],
  options: LLMInferenceOptions = {}
): Promise<string> {
  const provider = await getLLMProvider();
  
  const {
    model,
    maxTokens = 20000,
    temperature = 0.2,
    systemMessage
  } = options;
  
  if (provider.provider === 'openai') {
    if (!provider.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    // Prepare messages for OpenAI
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add system message if provided and not already in messages
    if (systemMessage && !messages.some(m => m.role === 'system')) {
      openaiMessages.push({ role: 'system', content: systemMessage });
    }
    
    // Add all messages
    openaiMessages.push(...messages);
    
    const response = await provider.client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: openaiMessages,
      temperature,
      max_tokens: Math.min(maxTokens, 5000), // OpenAI has token limits
    });
    
    return response.choices[0]?.message?.content || 'No response available';
  } else {
    // Anthropic API call
    if (!provider.apiKey) {
      throw new Error('Anthropic API key not available');
    }
    
    // Prepare messages for Anthropic
    const userMessages = messages.filter(m => m.role !== 'system');
    const systemMessages = messages.filter(m => m.role === 'system');
    
    // Use provided system message or combine system messages
    const finalSystemMessage = systemMessage || 
      systemMessages.map(m => m.content).join('\n') || 
      'You are a helpful assistant.';
    
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: Math.min(maxTokens, 4096), // Anthropic has token limits
        temperature,
        system: finalSystemMessage,
        messages: userMessages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role, // Anthropic doesn't support system in messages array
          content: m.content
        }))
      })
    });
    
    if (!anthropicRes.ok) {
      const errorData = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.statusText} - ${errorData}`);
    }
    
    const data = await anthropicRes.json();
    return (data as any).content?.[0]?.text || 'No response available';
  }
}

/**
 * Convenience function for simple text-based inference
 */
export async function invoke_llm(
  prompt: string,
  systemMessage?: string,
  options: Omit<LLMInferenceOptions, 'systemMessage'> = {}
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'user', content: prompt }
  ];
  
  return performLLMInference(messages, {
    ...options,
    systemMessage
  });
}
