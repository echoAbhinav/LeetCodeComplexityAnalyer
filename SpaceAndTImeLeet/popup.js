const GEMINI_API_KEY = ''; // Replace with your Gemini API key

// Dark mode logic
function setDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('leetcode-dark-mode', '1');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('leetcode-dark-mode', '0');
  }
}

function loadDarkMode() {
  const saved = localStorage.getItem('leetcode-dark-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const enabled = saved === '1' || (saved === null && prefersDark);
  setDarkMode(enabled);
  document.getElementById('darkModeToggle').checked = enabled;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDarkMode();
  document.getElementById('darkModeToggle').addEventListener('change', e => {
    setDarkMode(e.target.checked);
  });
});

async function aiComplexityAnalysis(code, language) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analyze the following ${language} code and provide the time and space complexity in Big O notation. 
Be precise and consider all loops, recursive calls, and data structures used.
Only output a JSON object with these exact keys: time, space, optimalTime, optimalSpace.
Example format: {"time": "O(n)", "space": "O(1)", "optimalTime": "O(n)", "optimalSpace": "O(1)"}

Code:
${code}`;

  const body = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 1024,
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'LeetCode-Complexity-Analyzer/1.0'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      
      if (res.status === 400) {
        errorMessage = 'Invalid request format or API key';
      } else if (res.status === 401) {
        errorMessage = 'Invalid or unauthorized Gemini API key';
      } else if (res.status === 403) {
        errorMessage = 'API key lacks necessary permissions';
      } else if (res.status === 404) {
        errorMessage = 'API endpoint not found - check model name';
      } else if (res.status === 429) {
        errorMessage = 'Rate limit exceeded - try again later';
      } else if (res.status === 500) {
        errorMessage = 'Gemini API server error';
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text || '';
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate that required fields exist
        if (!parsed.time || !parsed.space) {
          throw new Error('Missing required complexity fields');
        }
        return {
          time: parsed.time || 'O(1)',
          space: parsed.space || 'O(1)',
          optimalTime: parsed.optimalTime || parsed.time || 'O(1)',
          optimalSpace: parsed.optimalSpace || parsed.space || 'O(1)'
        };
      } catch (parseError) {
        throw new Error('Failed to parse AI response JSON');
      }
    } else {
      // If no JSON found, try to parse the entire response
      try {
        const parsed = JSON.parse(text);
        return {
          time: parsed.time || 'O(1)',
          space: parsed.space || 'O(1)',
          optimalTime: parsed.optimalTime || parsed.time || 'O(1)',
          optimalSpace: parsed.optimalSpace || parsed.space || 'O(1)'
        };
      } catch (parseError) {
        throw new Error('AI response not in expected JSON format');
      }
    }
  } catch (e) {
    console.error('AI Analysis Error:', e);
    return { 
      time: 'N/A', 
      space: 'N/A', 
      optimalTime: 'N/A', 
      optimalSpace: 'N/A', 
      error: e.message || 'AI response error' 
    };
  }
}

function staticComplexityAnalysis(code, language) {
  let time = 'O(1)';
  let space = 'O(1)';
  
  // More sophisticated static analysis
  const lines = code.split('\n');
  let nestedLoops = 0;
  let hasRecursion = false;
  let hasArrays = false;
  let hasHashMap = false;
  
  for (let line of lines) {
    line = line.trim();
    
    // Count nested loops
    if (/for\s*\(|while\s*\(|do\s*\{/.test(line)) {
      nestedLoops++;
    }
    
    // Check for recursion
    if (/return\s+\w+\s*\(/.test(line) || /\w+\s*\(.*\)\s*\+|\w+\s*\(.*\)\s*\*/.test(line)) {
      hasRecursion = true;
    }
    
    // Check for arrays/lists
    if (/\[\]|new\s+Array|List|ArrayList|Vector/.test(line)) {
      hasArrays = true;
    }
    
    // Check for hash maps/sets
    if (/Map|HashMap|Set|HashSet|Dictionary|dict/.test(line)) {
      hasHashMap = true;
    }
  }
  
  // Determine time complexity
  if (hasRecursion && /fibonacci|fib/.test(code.toLowerCase())) {
    time = 'O(2^n)';
  } else if (hasRecursion) {
    time = 'O(n)';
  } else if (nestedLoops >= 3) {
    time = 'O(n^3)';
  } else if (nestedLoops >= 2) {
    time = 'O(n^2)';
  } else if (nestedLoops >= 1) {
    time = 'O(n)';
  } else if (/sort|Sort/.test(code)) {
    time = 'O(n log n)';
  }
  
  // Determine space complexity
  if (hasHashMap || hasArrays) {
    space = 'O(n)';
  } else if (hasRecursion) {
    space = 'O(n)'; // Stack space
  }
  
  return { time, space, optimalTime: time, optimalSpace: space };
}

function showResult(result, aiUsed) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="result-title">
      ${aiUsed && !result.error ? '✓ AI Analysis' : 'Complexity Analysis'}
    </div>
    <div class="result-item">
      <span class="result-label">Time Complexity:</span>
      <span class="result-value">${result.time}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Space Complexity:</span>
      <span class="result-value">${result.space}</span>
    </div>
    ${result.optimalTime && result.optimalTime !== result.time ? `
    <div class="result-item">
      <span class="result-label">Optimal Time:</span>
      <span class="result-value optimal-value">${result.optimalTime}</span>
    </div>` : ''}
    ${result.optimalSpace && result.optimalSpace !== result.space ? `
    <div class="result-item">
      <span class="result-label">Optimal Space:</span>
      <span class="result-value optimal-value">${result.optimalSpace}</span>
    </div>` : ''}
    ${result.error ? `<div class="error-message show">⚠ ${result.error}</div>` : ''}
  `;
  resultDiv.classList.add('show');
}

function showError(msg) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = msg;
  errorDiv.classList.add('show');
  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 5000);
}

function clearError() {
  document.getElementById('error').classList.remove('show');
}

function setLoading(isLoading) {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const fetchBtn = document.getElementById('fetchBtn');
  if (isLoading) {
    analyzeBtn.disabled = true;
    fetchBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner"></span> Analyzing...`;
  } else {
    analyzeBtn.disabled = false;
    fetchBtn.disabled = false;
    analyzeBtn.innerHTML = `<span class="btn-icon">🔍</span> Analyze Complexity`;
  }
}

document.getElementById('analyzeBtn').onclick = async function() {
  clearError();
  document.getElementById('result').classList.remove('show');
  
  const code = document.getElementById('code').value;
  const language = document.getElementById('language').value;
  const useAI = document.getElementById('aiToggle').checked;
  
  if (!code.trim()) {
    showError('Please enter or fetch some code first.');
    return;
  }
  
  // Validate API key if AI is enabled
  if (useAI && (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your-api-key'))) {
    showError('Please set your Gemini API key in the code.');
    return;
  }
  
  setLoading(true);
  let result;
  let aiUsed = false;
  
  try {
    if (useAI) {
      result = await aiComplexityAnalysis(code, language);
      aiUsed = !result.error && result.time !== 'N/A';
      
      if (result.error || result.time === 'N/A') {
        console.warn('AI analysis failed:', result.error);
        showError(`AI failed: ${result.error}. Using static analysis instead.`);
        result = staticComplexityAnalysis(code, language);
        aiUsed = false;
      }
    } else {
      result = staticComplexityAnalysis(code, language);
    }
    
    showResult(result, aiUsed);
  } catch (e) {
    console.error('Analysis error:', e);
    showError('Analysis failed: ' + (e.message || 'Unknown error'));
    
    // Fallback to static analysis
    try {
      result = staticComplexityAnalysis(code, language);
      showResult(result, false);
    } catch (fallbackError) {
      showError('Both AI and static analysis failed.');
    }
  }
  
  setLoading(false);
};

document.getElementById('fetchBtn').onclick = function() {
  clearError();
  
  // Show loading state for fetch button
  const fetchBtn = document.getElementById('fetchBtn');
  const originalText = fetchBtn.textContent;
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = `<span class="btn-icon">⏳</span> Fetching...`;
  
  // Send message to content script to get code
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        showError('Chrome extension error: ' + chrome.runtime.lastError.message);
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalText;
        return;
      }
      
      if (tabs[0]?.id) {
        // Check if tab URL is LeetCode
        const tab = tabs[0];
        if (!tab.url || !tab.url.includes('leetcode.com')) {
          showError('Please navigate to a LeetCode problem page first.');
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = originalText;
          return;
        }
        
        chrome.tabs.sendMessage(tab.id, { type: 'GET_LEETCODE_CODE' }, function(response) {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = originalText;
          
          if (chrome.runtime.lastError) {
            showError('Failed to connect to LeetCode page. Try refreshing the page and make sure you\'re on a LeetCode problem page.');
          } else if (response && response.received) {
            // Message was received, wait for the code response
            setTimeout(() => {
              if (document.getElementById('code').value.trim() === '') {
                showError('No code found. Make sure there\'s code in the LeetCode editor.');
              }
            }, 2000);
          }
        });
      } else {
        showError('No active tab found.');
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalText;
      }
    });
  } else {
    showError('Chrome extension APIs not available.');
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = originalText;
  }
};

// Listen for code from content script
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log('Popup received message:', msg);
    
    if (msg.type === 'LEETCODE_CODE') {
      const code = msg.code;
      const error = msg.error;
      
      if (error) {
        showError(error);
        return;
      }
      
      document.getElementById('code').value = code || '';
      
      if (!code || code.trim() === '') {
        showError('No code found in the editor. Make sure you have code written in the LeetCode editor.');
      } else {
        clearError();
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message show';
        successMsg.textContent = `✓ Code fetched successfully (${code.length} chars)`;
        
        const codeTextarea = document.getElementById('code');
        if (codeTextarea.nextSibling && codeTextarea.nextSibling.classList && codeTextarea.nextSibling.classList.contains('success-message')) {
          codeTextarea.nextSibling.remove();
        }
        
        codeTextarea.parentNode.insertBefore(successMsg, codeTextarea.nextSibling);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
          if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
          }
        }, 3000);
        
        // Auto-analyze if AI is enabled
        if (document.getElementById('aiToggle')?.checked) {
          setTimeout(() => {
            document.getElementById('analyzeBtn').click();
          }, 500);
        }
      }
    }
  });
}

