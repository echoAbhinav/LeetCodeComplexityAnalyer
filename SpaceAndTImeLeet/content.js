// Enhanced LeetCode code extraction for both old and new interfaces
function getLeetCodeCode() {
  console.log('Attempting to extract LeetCode code...');
  
  // Method 1: Try Monaco Editor (New LeetCode interface)
  try {
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        const code = editors[0].getValue();
        if (code && code.trim()) {
          console.log('Code extracted from Monaco editor:', code.length, 'characters');
          return code;
        }
      }
    }
  } catch (e) {
    console.log('Monaco editor extraction failed:', e);
  }

  // Method 2: Try CodeMirror (Classic LeetCode interface)
  try {
    const codeMirrorElement = document.querySelector('.CodeMirror');
    if (codeMirrorElement && codeMirrorElement.CodeMirror) {
      const code = codeMirrorElement.CodeMirror.getValue();
      if (code && code.trim()) {
        console.log('Code extracted from CodeMirror instance:', code.length, 'characters');
        return code;
      }
    }
  } catch (e) {
    console.log('CodeMirror instance extraction failed:', e);
  }

  // Method 3: Try to find CodeMirror lines manually
  try {
    const codeMirrorLines = document.querySelectorAll('.CodeMirror-line');
    if (codeMirrorLines.length > 0) {
      const code = Array.from(codeMirrorLines)
        .map(line => line.textContent || '')
        .join('\n');
      if (code && code.trim()) {
        console.log('Code extracted from CodeMirror lines:', code.length, 'characters');
        return code;
      }
    }
  } catch (e) {
    console.log('CodeMirror lines extraction failed:', e);
  }

  // Method 4: Try React-based editor (newer LeetCode versions)
  try {
    // Look for textarea or contenteditable elements
    const textareas = document.querySelectorAll('textarea, [contenteditable="true"]');
    for (const textarea of textareas) {
      const code = textarea.value || textarea.textContent || textarea.innerText;
      if (code && code.trim() && code.length > 10) {
        console.log('Code extracted from textarea/contenteditable:', code.length, 'characters');
        return code;
      }
    }
  } catch (e) {
    console.log('Textarea extraction failed:', e);
  }

  // Method 5: Try to find editor by class names (various LeetCode versions)
  try {
    const editorSelectors = [
      '.monaco-editor .view-lines',
      '.ace_editor .ace_text-input',
      '.editor-wrapper textarea',
      '.code-editor textarea',
      '.editor-container textarea',
      '[data-testid="code-editor"] textarea',
      '.cm-editor .cm-content',
      '.cm-scroller .cm-content'
    ];

    for (const selector of editorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const code = element.value || element.textContent || element.innerText;
        if (code && code.trim() && code.length > 10) {
          console.log('Code extracted using selector:', selector, code.length, 'characters');
          return code;
        }
      }
    }
  } catch (e) {
    console.log('Selector-based extraction failed:', e);
  }

  // Method 6: Try to find any pre or code elements with substantial content
  try {
    const codeElements = document.querySelectorAll('pre, code, .ace_text-layer');
    for (const element of codeElements) {
      const code = element.textContent || element.innerText;
      if (code && code.trim() && code.length > 20 && 
          (code.includes('function') || code.includes('class') || code.includes('def') || code.includes('public'))) {
        console.log('Code extracted from pre/code element:', code.length, 'characters');
        return code;
      }
    }
  } catch (e) {
    console.log('Pre/code element extraction failed:', e);
  }

  // Method 7: Try to access via React fiber (advanced method)
  try {
    const reactElements = document.querySelectorAll('[data-reactroot] *');
    for (const element of reactElements) {
      if (element._reactInternalFiber || element._reactInternalInstance) {
        // This is a React element, try to find editor state
        const fiber = element._reactInternalFiber || element._reactInternalInstance;
        if (fiber && fiber.memoizedProps && fiber.memoizedProps.value) {
          const code = fiber.memoizedProps.value;
          if (code && code.trim() && code.length > 10) {
            console.log('Code extracted from React fiber:', code.length, 'characters');
            return code;
          }
        }
      }
    }
  } catch (e) {
    console.log('React fiber extraction failed:', e);
  }

  console.log('No code found using any extraction method');
  return null;
}

// Enhanced function to detect if we're on a LeetCode problem page
function isLeetCodeProblemPage() {
  const url = window.location.href;
  const isLeetCodeDomain = url.includes('leetcode.com');
  const isProblemPage = url.includes('/problems/') || url.includes('/contest/') || url.includes('/explore/');
  
  // Also check for editor presence
  const hasEditor = document.querySelector('.CodeMirror') || 
                   document.querySelector('.monaco-editor') ||
                   document.querySelector('[data-testid="code-editor"]') ||
                   document.querySelector('.ace_editor') ||
                   (window.monaco && window.monaco.editor);
  
  return isLeetCodeDomain && (isProblemPage || hasEditor);
}

// Wait for page to load and editor to be ready
function waitForEditor(maxAttempts = 10, attempt = 0) {
  return new Promise((resolve) => {
    if (attempt >= maxAttempts) {
      resolve(false);
      return;
    }

    const hasEditor = document.querySelector('.CodeMirror') || 
                     document.querySelector('.monaco-editor') ||
                     document.querySelector('[data-testid="code-editor"]') ||
                     (window.monaco && window.monaco.editor);
    
    if (hasEditor) {
      resolve(true);
    } else {
      setTimeout(() => {
        waitForEditor(maxAttempts, attempt + 1).then(resolve);
      }, 1000);
    }
  });
}

// Message listener for extension communication
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Content script received message:', msg);
    
    if (msg.type === 'GET_LEETCODE_CODE') {
      if (!isLeetCodeProblemPage()) {
        console.log('Not on a LeetCode problem page');
        chrome.runtime.sendMessage({ 
          type: 'LEETCODE_CODE', 
          code: null, 
          error: 'Not on a LeetCode problem page' 
        });
        return;
      }

      // Wait for editor to be ready, then extract code
      waitForEditor().then((editorReady) => {
        if (!editorReady) {
          console.log('Editor not ready after waiting');
          chrome.runtime.sendMessage({ 
            type: 'LEETCODE_CODE', 
            code: null, 
            error: 'Editor not found or not ready' 
          });
          return;
        }

        // Try to extract code
        const code = getLeetCodeCode();
        console.log('Extracted code:', code ? code.length + ' characters' : 'null');
        
        chrome.runtime.sendMessage({ 
          type: 'LEETCODE_CODE', 
          code: code,
          error: code ? null : 'No code found in editor'
        });
      });
      
      // Send response to keep the message channel open
      sendResponse({ received: true });
    }
  });
}

// Auto-inject detection on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('LeetCode Complexity Analyzer content script loaded');
  
  if (isLeetCodeProblemPage()) {
    console.log('Detected LeetCode problem page');
    
    // Wait a bit for dynamic content to load
    setTimeout(() => {
      const code = getLeetCodeCode();
      if (code) {
        console.log('Code detected on page load:', code.length, 'characters');
      }
    }, 2000);
  }
});

// Also try when page changes (for SPA navigation)
let currentUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log('Page changed to:', currentUrl);
    
    if (isLeetCodeProblemPage()) {
      console.log('Detected LeetCode problem page after navigation');
    }
  }
}, 1000);

// Listen for editor changes (Monaco editor)
if (window.monaco && window.monaco.editor) {
  const checkForEditors = setInterval(() => {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      console.log('Monaco editors detected:', editors.length);
      clearInterval(checkForEditors);
      
      // Add listeners to editors
      editors.forEach((editor, index) => {
        editor.onDidChangeModelContent(() => {
          console.log(`Monaco editor ${index} content changed`);
        });
      });
    }
  }, 1000);
  
  // Clear interval after 30 seconds
  setTimeout(() => clearInterval(checkForEditors), 30000);
}