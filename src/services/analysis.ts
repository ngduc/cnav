import { CommitData, getProjectInfo, getProjectTree } from './git';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { invoke_llm } from '../utils/llm_utils';

// Load environment variables
dotenv.config();

// Analysis options
export interface AnalysisOptions {
  performCodeReview: boolean;
  detailedSummary?: boolean;
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
    
    const systemMessage = 'You are an expert software developer assistant that helps understand git commits and code changes. Provide clear, concise, and insightful analysis.';
    
    return await invoke_llm(prompt, systemMessage, {
      temperature: 0.2
    });
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
  
  // Handle Node.js/JavaScript projects
  if (projectInfo.packageJson) {
    prompt += `Project name: ${projectInfo.packageJson.name || 'Unknown'}\n`;
    prompt += `Description: ${projectInfo.packageJson.description || 'N/A'}\n`;
    prompt += `Dependencies: ${Object.keys(projectInfo.packageJson.dependencies || {}).join(', ') || 'None'}\n`;
  }
  
  // Handle configuration files from new structure
  if (projectInfo.configFiles) {
    const { configFiles } = projectInfo;
    
    // Add technology stack information
    const technologies = Object.keys(configFiles);
    if (technologies.length > 0) {
      prompt += `Technologies detected: ${technologies.join(', ')}\n`;
    }
    
    // Handle Python projects
    if (configFiles.python) {
      if (configFiles.python['pyproject.toml']) {
        prompt += `Python project with pyproject.toml configuration\n`;
      }
      if (configFiles.python['requirements.txt']) {
        const requirements = configFiles.python['requirements.txt'].content;
        const deps = requirements.split('\n').filter((r: string) => r.trim() !== '' && !r.startsWith('#'));
        prompt += `Python requirements: ${deps.slice(0, 8).join(', ')}${deps.length > 8 ? ' and more...' : ''}\n`;
      }
    }
    
    // Handle other key technologies for context
    if (configFiles.docker) {
      prompt += `Containerized with Docker\n`;
    }
    
    if (configFiles.cicd) {
      prompt += `CI/CD pipeline configured\n`;
    }
  }
  
  // Add README files for project context
  if (projectInfo.README && Object.keys(projectInfo.README).length > 0) {
    prompt += `\n## Project Documentation\n`;
    Object.entries(projectInfo.README).forEach(([path, content]) => {
      // Limit README content to avoid prompt bloat (first 2000 characters)
      const truncatedContent = (content as string).length > 2000 
        ? (content as string).substring(0, 2000) + '...\n[README truncated for brevity]'
        : content as string;
      
      prompt += `### ${path}\n\`\`\`\n${truncatedContent}\n\`\`\`\n\n`;
    });
  }
  
  prompt += `## Project Structure\n\`\`\`\n${projectTree}\`\`\`\n\n`;
  
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
