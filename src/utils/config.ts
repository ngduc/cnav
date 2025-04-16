import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Config file location
const CONFIG_DIR = path.join(os.homedir(), '.cnav');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  openaiApiKey: '',
  defaultModel: 'gpt-4-turbo-preview',
  maxDepth: 3,
  colorOutput: true,
};

// Config interface
export interface CNavConfig {
  openaiApiKey: string;
  defaultModel: string;
  maxDepth: number;
  colorOutput: boolean;
}

/**
 * Load configuration from file or create default
 */
export async function loadConfig(): Promise<CNavConfig> {
  try {
    // Ensure config directory exists
    await fs.ensureDir(CONFIG_DIR);

    // Check if config file exists
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      return { ...DEFAULT_CONFIG, ...config };
    }

    // Create default config
    await fs.writeJson(CONFIG_FILE, DEFAULT_CONFIG, { spaces: 2 });
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error(`Error loading config: ${(error as Error).message}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Partial<CNavConfig>): Promise<void> {
  try {
    // Ensure config directory exists
    await fs.ensureDir(CONFIG_DIR);
    
    // Load existing config
    let existingConfig: CNavConfig;
    if (await fs.pathExists(CONFIG_FILE)) {
      existingConfig = await fs.readJson(CONFIG_FILE);
    } else {
      existingConfig = DEFAULT_CONFIG;
    }
    
    // Merge and save updated config
    const updatedConfig = { ...existingConfig, ...config };
    await fs.writeJson(CONFIG_FILE, updatedConfig, { spaces: 2 });
  } catch (error) {
    console.error(`Error saving config: ${(error as Error).message}`);
  }
}

/**
 * Get OpenAI API key from environment or config
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  // First check environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Then check config file
  const config = await loadConfig();
  if (config.openaiApiKey) {
    return config.openaiApiKey;
  }
  
  return null;
}

/**
 * Prompt user to set up OpenAI API key if not found
 */
export async function setupApiKey(): Promise<string> {
  console.log(chalk.yellow('OpenAI API key not found.'));
  console.log('To use cnav, you need to provide an OpenAI API key.');
  console.log('You can get one from https://platform.openai.com/api-keys\n');
  
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Please enter your OpenAI API key:',
      validate: (input) => {
        if (!input) return 'API key cannot be empty';
        if (!input.startsWith('sk-')) return 'Invalid API key format. It should start with "sk-"';
        return true;
      },
    },
  ]);
  
  // Save to config
  await saveConfig({ openaiApiKey: apiKey });
  console.log(chalk.green('API key saved to configuration.'));
  
  return apiKey;
}
