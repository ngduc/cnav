import { CommitData, getProjectInfo, getProjectTree } from './git';
import { OpenAI } from 'openai';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { getOpenAIApiKey, setupApiKey, getAnthropicApiKey, setupAnthropicApiKey } from '../utils/config';

// Load environment variables
dotenv.config();

// Analysis options
export interface AnalysisOptions {
  performCodeReview: boolean;
  detailedSummary?: boolean;
}

/**
 * Get LLM client or API key (OpenAI or Anthropic)
 */
async function getLLMProvider(): Promise<
  { provider: 'openai'; client: OpenAI } | { provider: 'anthropic'; apiKey: string }
> {
  let openaiKey = await getOpenAIApiKey();
  if (openaiKey) {
    return { provider: 'openai', client: new OpenAI({ apiKey: openaiKey }) };
  }
  let anthropicKey = await getAnthropicApiKey();
  if (!anthropicKey) {
    console.log(chalk.yellow('No OpenAI or Anthropic API key found. Setting up Anthropic configuration...'));
    anthropicKey = await setupAnthropicApiKey();
  }
  return { provider: 'anthropic', apiKey: anthropicKey };
}

/**
 * Analyze commits using OpenAI or Anthropic
 */
export async function analyzeCommits(
  commits: CommitData[],
  options: AnalysisOptions
): Promise<string> {
  try {
    const projectInfo = await getProjectInfo();
    const projectTree = await getProjectTree();
    const prompt = createAnalysisPrompt(commits, projectInfo, projectTree, options);
    const llm = await getLLMProvider();
    if (llm.provider === 'openai') {
      const response = await llm.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert software developer assistant that helps understand git commits and code changes. Provide clear, concise, and insightful analysis.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 5000, // Reduced from 300000 to a more reasonable size
      });
      return response.choices[0]?.message?.content || 'No analysis available';
    } else {
      // Anthropic API call (Claude)
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': llm.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 3000,
          temperature: 0.2,
          system: 'You are an expert software developer assistant that helps understand git commits and code changes. Provide clear, concise, and insightful analysis.',
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });
      if (!anthropicRes.ok) {
        throw new Error(`Anthropic API error: ${anthropicRes.statusText}`);
      }
      const data = await anthropicRes.json();
      return (data as any).content?.[0]?.text || 'No analysis available';
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing LLM API key. Please check your configuration.');
      }
      throw error;
    }
    throw new Error('An unknown error occurred during analysis');
  }
}

/**
 * Create a prompt for the LLM based on commits and options
 */
function createAnalysisPrompt(
  commits: CommitData[],
  projectInfo: Record<string, any>,
  projectTree: string,
  options: AnalysisOptions
): string {
  // Start with general instruction
  let prompt = `I need you to analyze the following git commit(s) and provide a summary of changes.\n\n`;
  
  // Add context about the analysis type
  if (options.performCodeReview) {
    prompt += `This is a CODE REVIEW request. Please carefully examine the code changes for:
- Potential bugs or issues
- Security vulnerabilities
- Performance concerns
- Code style and best practices
- Architectural considerations
- Suggestions for improvement\n\n`;
  } else {
    prompt += `This is a CHANGE SUMMARY request. Please provide:
- A concise overview of what changed
- Key files and components affected\n\n`;
  }
// - The purpose of the changes (if discernible)
// - Impact of the changes on the project
  
  // Add project information for context
  prompt += `## Project Information\n`;
  
  if (projectInfo.packageJson) {
    prompt += `Project name: ${projectInfo.packageJson.name || 'Unknown'}\n`;
    prompt += `Description: ${projectInfo.packageJson.description || 'N/A'}\n`;
    prompt += `Dependencies: ${Object.keys(projectInfo.packageJson.dependencies || {}).join(', ') || 'None'}\n`;
  }
  
  if (projectInfo.pyproject) {
    prompt += `Python project with pyproject.toml\n`;
  }
  
  if (projectInfo.requirements) {
    prompt += `Python requirements: ${projectInfo.requirements.split('\n').filter((r: string) => r.trim() !== '').join(', ')}\n`;
  }
  
  prompt += `\n## Project Structure\n\`\`\`\n${projectTree}\`\`\`\n\n`;
  
  // Add commit information
  prompt += `## Commits to Analyze (${commits.length})\n\n`;
  
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
    
    if (commit.diff) {
      prompt += `\`\`\`diff\n`;
      prompt += commit.diff.split('\n').slice(0, 5000).join('\n') + '\n... (truncated)\n\`\`\`\n\n';
    }
    // console.log('--- prompt ', prompt.length)
  }
  
  // Add specific instructions based on the analysis type
//   if (options.performCodeReview) {
//     prompt += `
// Please provide a detailed code review of the above changes. Include:
// 1. A high-level summary of what the changes do
// 2. Potential bugs, errors, or issues in the implementation
// 3. Security concerns if applicable
// 4. Architectural impact and design considerations
// 5. Suggestions for improvement
// 6. Any missing tests or documentation
// `;
//   } else {
//     prompt += `
// Please provide a clear summary of the changes including:
// 1. What changed at a high level
// 2. Why the changes were made (best guess based on commit messages and content)
// 3. The impact these changes have on the project
// 4. Key files and components affected
// `;
//   }

  if (options.performCodeReview) {
    prompt += `
  Please provide a detailed code review of the above changes. Include:
  1. A high-level summary of what the changes do
  2. Potential bugs, errors, or issues in the implementation
  3. Security concerns if applicable
  4. Architectural impact and design considerations
  5. Suggestions for improvement
  6. Any missing tests or documentation
  `;
  } else {
    prompt += `
  Please provide a clear summary of the changes including:
  1. What changed at a high level
  2. Key files and components affected
  `;
  }
  
  return prompt;
}
