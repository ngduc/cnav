declare module 'marked-terminal' {
  import { marked } from 'marked';
  
  interface TerminalRendererOptions {
    code?: any;
    blockquote?: any;
    table?: any;
    tableOptions?: any;
    [key: string]: any;
  }
  
  class TerminalRenderer {
    constructor(options?: TerminalRendererOptions);
  }
  
  export default TerminalRenderer;
}
