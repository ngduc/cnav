import { CommitData, getProjectInfo } from './git';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { getOpenAIApiKey, setupApiKey } from '../utils/config';

// Load environment variables
dotenv.config();

// Changelog options
export interface ChangelogOptions {
  format?: 'daily' | 'weekly';
}

/**
 * Get OpenAI API client
 */
async function getOpenAIClient(): Promise<OpenAI> {
  let apiKey = await getOpenAIApiKey();
  
  if (!apiKey) {
    console.log('OpenAI API key not found. Setting up configuration...');
    apiKey = await setupApiKey();
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Generate changelog content from commits
 */
export async function generateChangelog(
  commits: CommitData[],
  options: ChangelogOptions
): Promise<string> {
  try {
    // Get project information for context
    const projectInfo = await getProjectInfo();
    
    // Create OpenAI client
    const openai = await getOpenAIClient();
    
    // Prepare prompt with commit data
    const prompt = createChangelogPrompt(commits, projectInfo, options);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Use a suitable model based on availability
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer assistant that helps create clear, concise, and helpful changelog entries from git commits.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    
    // Extract and return the changelog content
    return response.choices[0]?.message?.content || 'No changelog content generated';
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing OpenAI API key. Please check your configuration.');
      }
      throw error;
    }
    throw new Error('An unknown error occurred during changelog generation');
  }
}

/**
 * Create a prompt for generating changelog content
 */
function createChangelogPrompt(
  commits: CommitData[],
  projectInfo: Record<string, any>,
  options: ChangelogOptions
): string {
  const format = options.format || 'weekly';
  const today = new Date().toISOString().slice(0, 10);
  
  // Start with general instruction
  let prompt = `I need you to generate a changelog entry for the following git commits.\n\n`;
  
  // Add context about the formatting
  prompt += `This changelog follows the Keep a Changelog format (https://keepachangelog.com/).\n`;
  prompt += `The format should be '${format}' (${format === 'daily' ? 'entries for each day' : 'weekly summary'}).\n\n`;
  
  // Add project information for context
  prompt += `## Project Information\n`;
  
  if (projectInfo.packageJson) {
    prompt += `Project name: ${projectInfo.packageJson.name || 'Unknown'}\n`;
    prompt += `Version: ${projectInfo.packageJson.version || '0.1.0'}\n`;
    prompt += `Description: ${projectInfo.packageJson.description || 'N/A'}\n`;
  }
  
  // Add technology context from configFiles
  if (projectInfo.configFiles) {
    const { configFiles } = projectInfo;
    const technologies = Object.keys(configFiles);
    
    if (technologies.length > 0) {
      prompt += `Technologies: ${technologies.join(', ')}\n`;
    }
    
    // Provide specific context for different project types
    if (configFiles.python) {
      prompt += `Python project with relevant dependencies and configuration\n`;
    }
    
    if (configFiles.docker) {
      prompt += `Containerized application with Docker\n`;
    }
    
    if (configFiles.cicd) {
      prompt += `CI/CD pipeline configured for automated deployment/testing\n`;
    }
  }
  
  // Add commit information
  prompt += `\n## Commits to Include in Changelog (${commits.length})\n\n`;
  
  for (const commit of commits) {
    prompt += `### Commit: ${commit.hash}\n`;
    prompt += `Author: ${commit.author_name} <${commit.author_email}>\n`;
    prompt += `Date: ${commit.date}\n`;
    prompt += `Message: ${commit.message}\n\n`;
    
    if (commit.files && commit.files.length > 0) {
      prompt += `Modified files:\n`;
      for (const file of commit.files) {
        prompt += `- ${file}\n`;
      }
      prompt += '\n';
    }
  }
  
  // Add specific instructions for the changelog format
  prompt += `
Please generate a changelog entry with the following format:

## [${projectInfo.packageJson?.version || '0.1.0'}] - ${today}

### Added
- New features or additions

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Features or functionality that has been removed

Only include sections that are relevant. Group similar changes together and write clear, concise descriptions.
`;
  
  return prompt;
}
