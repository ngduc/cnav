import { getProjectInfo, getProjectTree } from '../services/git';
import { invoke_llm } from '../utils/llm_utils';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { promises as fs } from 'fs';

export interface AnalyzeCommandOptions {
  review?: boolean;
  md?: boolean;
  outputContext?: boolean;
}

/**
 * Command handler for 'cnav [path]'
 * Analyzes a project directory or current directory if no path specified
 */
export async function analyzeCommand(projectPath: string = '.', options: AnalyzeCommandOptions = {}): Promise<void> {
  const spinner = ora('Analyzing project...').start();
  
  try {
    // Resolve the path
    const targetPath = path.resolve(projectPath);
    
    // Check if path exists and is accessible
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path ${targetPath} is not a directory`);
      }
    } catch (error) {
      throw new Error(`Cannot access path: ${targetPath}`);
    }
    
    // Change to target directory for analysis
    const originalCwd = process.cwd();
    process.chdir(targetPath);
    
    try {
      spinner.text = 'Gathering project information...';
      
      // Get project information and structure
      const projectInfo = await getProjectInfo();
      const projectTree = await getProjectTree();
      
      // Handle --oc flag for context output only
      if (options.outputContext) {
        spinner.text = 'Generating repository context...';
        
        const context = generateRepositoryContext(projectInfo, projectTree, targetPath);
        
        // Write context to README_context.md
        const contextPath = path.join(targetPath, 'README_context.md');
        await fs.writeFile(contextPath, context, 'utf8');
        
        spinner.succeed('Repository context generated');
        console.log(chalk.green(`\n📄 Repository context saved to: ${contextPath}`));
        
        if (options.md) {
          console.log('\n' + chalk.bold.green('📊 Repository Context (Markdown Output)'));
          console.log(context);
        } else {
          console.log('\n' + chalk.bold.green('📊 Repository Context (Plain Text Output)'));
          console.log(context.replace(/\*\*|\`/g, ''));
        }
        
        return;
      }
      
      spinner.text = 'Analyzing current project...';
      
      // Create analysis prompt for project
      const prompt = createProjectAnalysisPrompt(projectInfo, projectTree, targetPath, options);
      
      // Analyze with LLM
      const systemMessage = 'You are an expert software developer assistant that analyzes codebases and projects. Provide clear, insightful, and actionable analysis.';
      
      const analysis = await invoke_llm(prompt, systemMessage, {
        temperature: 0.2
      });
      
      // Write analysis to README_cnav.md
      spinner.text = 'Writing analysis to README_cnav.md...';
      const readmePath = path.join(targetPath, 'README_cnav.md');
      await fs.writeFile(readmePath, analysis, 'utf8');
      
      spinner.succeed('Analysis complete');
      
      // Display the results
      const title = targetPath === process.cwd() || targetPath.endsWith('.') 
        ? '📊 Current Project Analysis' 
        : `📊 Project Analysis: ${path.basename(targetPath)}`;
      
      console.log(chalk.green(`\n📄 Analysis saved to: ${readmePath}`));
      
      if (options.md) {
        console.log('\n' + chalk.bold.green(`${title} (Markdown Output)`));
        console.log(analysis);
      } else {
        console.log('\n' + chalk.bold.green(`${title} (Plain Text Output)`));
        console.log(analysis.replace(/\*\*|\`/g, ''));
      }
      
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
    
  } catch (error) {
    spinner.fail('Failed to analyze project');
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Generate repository context without analysis instructions
 */
function generateRepositoryContext(
  projectInfo: Record<string, any>,
  projectTree: string,
  projectPath: string
): string {
  let context = `# Repository Context\n\n`;
  
  // Add project information
  context += `## Project Information\n`;
  context += `Path: ${projectPath}\n`;
  
  // Handle Node.js/JavaScript projects
  if (projectInfo.packageJson) {
    context += `Project name: ${projectInfo.packageJson.name || 'Unknown'}\n`;
    context += `Description: ${projectInfo.packageJson.description || 'N/A'}\n`;
    context += `Version: ${projectInfo.packageJson.version || 'N/A'}\n`;
    context += `Dependencies: ${Object.keys(projectInfo.packageJson.dependencies || {}).join(', ') || 'None'}\n`;
    context += `Dev Dependencies: ${Object.keys(projectInfo.packageJson.devDependencies || {}).join(', ') || 'None'}\n`;
    
    if (projectInfo.packageJson.scripts) {
      context += `Scripts: ${Object.keys(projectInfo.packageJson.scripts).join(', ')}\n`;
    }
  }
  
  // Handle configuration files from new structure
  if (projectInfo.configFiles) {
    const { configFiles } = projectInfo;
    
    // Add technology stack information
    const technologies = Object.keys(configFiles);
    if (technologies.length > 0) {
      context += `Technologies detected: ${technologies.join(', ')}\n`;
    }
    
    // Handle Python projects
    if (configFiles.python) {
      if (configFiles.python['pyproject.toml']) {
        context += `Python project with pyproject.toml configuration\n`;
      }
      if (configFiles.python['requirements.txt']) {
        const requirements = configFiles.python['requirements.txt'].content;
        const deps = requirements.split('\n').filter((r: string) => r.trim() !== '' && !r.startsWith('#'));
        context += `Python requirements: ${deps.slice(0, 10).join(', ')}${deps.length > 10 ? ' and more...' : ''}\n`;
      }
      if (configFiles.python['Pipfile']) {
        context += `Python project using Pipenv for dependency management\n`;
      }
    }
    
    // Handle other technology stacks
    if (configFiles.docker) {
      context += `Docker configuration detected\n`;
    }
    
    if (configFiles.cicd) {
      const cicdFiles = Object.keys(configFiles.cicd);
      context += `CI/CD configured: ${cicdFiles.join(', ')}\n`;
    }
    
    if (configFiles.linting) {
      const lintingTools = Object.keys(configFiles.linting);
      context += `Code quality tools: ${lintingTools.join(', ')}\n`;
    }
  }
  
  // Add README files for context
  if (projectInfo.README && Object.keys(projectInfo.README).length > 0) {
    context += `\n## Project Documentation\n`;
    Object.entries(projectInfo.README).forEach(([path, content]) => {
      const truncatedContent = (content as string).length > 3000 
        ? (content as string).substring(0, 3000) + '...\n[README truncated for brevity]'
        : content as string;
      
      context += `### ${path}\n\`\`\`\n${truncatedContent}\n\`\`\`\n\n`;
    });
  }
  
  context += `## Project Structure\n\`\`\`\n${projectTree}\`\`\`\n\n`;
  
  return context;
}

/**
 * Create a prompt for analyzing a project directory
 */
function createProjectAnalysisPrompt(
  projectInfo: Record<string, any>,
  projectTree: string,
  projectPath: string,
  options: AnalyzeCommandOptions
): string {
  let prompt = `I need you to analyze this software project and provide insights.\n\n`;
  
  // Add context about the analysis type
  if (options.review) {
    prompt += `This is a PROJECT REVIEW request. Please analyze the project for:
- Code quality and architecture
- Security considerations
- Performance implications
- Best practices adherence
- Potential improvements
- Missing documentation or tests
- Dependencies and technical debt\n\n`;
  } else {
    prompt += `This is a PROJECT OVERVIEW request. Please provide:
- A summary of what this project does
- Key technologies and frameworks used
- Project structure and organization
- Main features and capabilities\n\n`;
  }
  
  // Reuse the repository context generation
  const repositoryContext = generateRepositoryContext(projectInfo, projectTree, projectPath);
  // Remove the "# Repository Context" header and add the content
  const contextContent = repositoryContext.replace(/^# Repository Context\n\n/, '');
  prompt += contextContent;
  
  // Add specific instructions based on analysis type
  if (options.review) {
    prompt += `
Please provide a comprehensive project review including:
1. **Project Overview**: What this project does and its main objectives, key features, and results
2. **Architecture Analysis**: Code organization and structure assessment
3. **Technology Stack**: Evaluation of chosen technologies and dependencies
4. **Code Quality**: Assessment of coding practices and patterns
5. **Security Considerations**: Potential security issues or concerns
6. **Performance Analysis**: Performance implications and optimizations
7. **Best Practices**: Adherence to industry standards and conventions
8. **Recommendations**: Specific suggestions for improvements
9. **Technical Debt**: Areas that need refactoring or cleanup
10. **Testing & Documentation**: Assessment of test coverage and documentation quality
`;
  } else {
    prompt += `
Please provide a clear project overview including:
1. **Project Purpose**: What this project does and its main objectives, key features, and results
2. **Architecture & Technology Stack**: Key technologies, frameworks, and tools used
3. **Project Structure**: How the code is organized and key directories/files
4. **Main Features**: Core functionality and capabilities
5. **Getting Started**: How someone would typically run or use this project
6. **Dependencies**: Major or important libraries and external dependencies, sorted by importance
7. **Architecture Diagrams**: Mermaid diagrams of the project structure, architecture
8. **Dependencies Diagrams**: Mermaid diagrams of the dependencies between the project and its dependencies
`;
  }
  
  return prompt;
}

 