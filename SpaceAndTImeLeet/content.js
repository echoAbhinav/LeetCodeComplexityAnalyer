function getLeetCodeCode() {
  console.log('Attempting to extract LeetCode code...');
  
  //Monaco Editor
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

  //CodeMirror
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

  //find CodeMirror lines manually
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
  
  try {
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

  try {
    const reactElements = document.querySelectorAll('[data-reactroot] *');
    for (const element of reactElements) {
      if (element._reactInternalFiber || element._reactInternalInstance) {
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

function isLeetCodeProblemPage() {
  const url = window.location.href;
  const isLeetCodeDomain = url.includes('leetcode.com');
  const isProblemPage = url.includes('/problems/') || url.includes('/contest/') || url.includes('/explore/');
  

  const hasEditor = document.querySelector('.CodeMirror') || 
                   document.querySelector('.monaco-editor') ||
                   document.querySelector('[data-testid="code-editor"]') ||
                   document.querySelector('.ace_editor') ||
                   (window.monaco && window.monaco.editor);
  
  return isLeetCodeDomain && (isProblemPage || hasEditor);
}

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

        const code = getLeetCodeCode();
        console.log('Extracted code:', code ? code.length + ' characters' : 'null');
        
        chrome.runtime.sendMessage({ 
          type: 'LEETCODE_CODE', 
          code: code,
          error: code ? null : 'No code found in editor'
        });
      });
      
      sendResponse({ received: true });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('LeetCode Complexity Analyzer content script loaded');
  
  if (isLeetCodeProblemPage()) {
    console.log('Detected LeetCode problem page');
    
    setTimeout(() => {
      const code = getLeetCodeCode();
      if (code) {
        console.log('Code detected on page load:', code.length, 'characters');
      }
    }, 2000);
  }
});

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

if (window.monaco && window.monaco.editor) {
  const checkForEditors = setInterval(() => {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      console.log('Monaco editors detected:', editors.length);
      clearInterval(checkForEditors);
      
      editors.forEach((editor, index) => {
        editor.onDidChangeModelContent(() => {
          console.log(`Monaco editor ${index} content changed`);
        });
      });
    }
  }, 1000);
  
  setTimeout(() => clearInterval(checkForEditors), 30000);
}
