// Mock implementation of the "sup" object and its methods
const sup = {
  ai: {
    prompt: (input, options) => {
      console.log("Mock sup.ai.prompt called with:", { input, options });
      return "{}"; // Default mock response
    },
    image: {
      create: (prompt, options) => {
        console.log("Mock sup.ai.image.create called with:", { prompt, options });
        return { url: "mock-image-url" }; // Default mock image response
      }
    }
  },
  chat: {
    get: (key) => {
      console.log("Mock sup.chat.get called with key:", key);
      return null; // Default mock response
    },
    set: (key, value) => {
      console.log("Mock sup.chat.set called with:", { key, value });
    }
  },
  global: {
    get: (key) => {
      console.log("Mock sup.global.get called with key:", key);
      return null; // Default mock response
    },
    set: (key, value) => {
      console.log("Mock sup.global.set called with:", { key, value });
    }
  },
  get: (key) => {
    console.log("Mock sup.get called with key:", key);
    return null; // Default mock response
  },
  set: (key, value) => {
    console.log("Mock sup.set called with:", { key, value });
  },
  html: (html, options) => {
    console.log("Mock sup.html called with:", { html, options });

    // Inject the HTML into a mock DOM element for testing purposes
    const mockElement = {
      innerHTML: html,
      options,
      render: () => console.log("Rendered HTML:", html)
    };

    mockElement.render();
    return mockElement; // Return the mock element for further inspection
  },
  input: {
    text: '', // Internal storage for the text value
  },
};

// Internal state management
sup._mockData = new Map();
sup._data = new Map();
sup._lastInjectedHtml = null;
sup._lastInjectedElement = null;

sup.mock = (method, mockResponse) => {
  if (method === sup.input.text) {
    sup.input.text = mockResponse;
    console.log(`Mocked sup.input.text with: ${mockResponse}`);
    return;
  }

  if (!sup._mockData.has(method)) {
    sup._mockData.set(method, []);
  }
  sup._mockData.get(method).push(mockResponse);
};

const getMockResponse = (method) => {
  const responses = sup._mockData.get(method) || [];
  return responses.length > 0 ? responses.shift() : undefined;
};

// Wrap existing methods to use mock responses
sup.ai.prompt = (input, options) => {
  const mockResponse = getMockResponse(sup.ai.prompt);
  if (mockResponse !== undefined) {
    console.log("Mock sup.ai.prompt returning mocked response:", mockResponse);
    return mockResponse;
  }
  console.log("Mock sup.ai.prompt called with:", { input, options });
  return "{}"; // Default mock response
};

sup.ai.image.create = (prompt, options) => {
  const mockResponse = getMockResponse(sup.ai.image.create);
  if (mockResponse !== undefined) {
    console.log("Mock sup.ai.image.create returning mocked response:", mockResponse);
    return mockResponse;
  }
  console.log("Mock sup.ai.image.create called with:", { prompt, options });
  return { url: "mock-image-url" }; // Default mock image response
};

sup.chat.get = (key) => {
  const mockResponse = getMockResponse(sup.chat.get);
  if (mockResponse !== undefined) {
    console.log("Mock sup.chat.get returning mocked response:", mockResponse);
    return mockResponse;
  }
  console.log("Mock sup.chat.get called with key:", key);
  return null; // Default mock response
};

sup.chat.set = (key, value) => {
  console.log("Mock sup.chat.set called with:", { key, value });
};

sup.get = (key) => {
  console.log("Mock sup.get called with key:", key);
  return sup._data.get(key);
};

sup.set = (key, value) => {
  sup._data.set(key, value);
};

// Simple user-scoped storage helpers
sup.global = {
  set: (key, value) => {
    try {
      sup._data.set(`global:${key}`, value);
      console.log(`Mock sup.global.set called with: global:${key}`, value);
    } catch (e) {
      console.error('sup.global.set error', e);
    }
  },
  get: (key) => {
    try {
      const v = sup._data.get(`global:${key}`);
      console.log(`Mock sup.global.get called for global:${key} ->`, v);
      return v === undefined ? null : v;
    } catch (e) {
      console.error('sup.global.get error', e);
      return null;
    }
  }
};


// Simple user-scoped storage helpers
sup.user = {
  set: (key, value) => {
    try {
      sup._data.set(`user:${key}`, value);
      console.log(`Mock sup.user.set called with: user:${key}`, value);
    } catch (e) {
      console.error('sup.user.set error', e);
    }
  },
  get: (key) => {
    try {
      const v = sup._data.get(`user:${key}`);
      console.log(`Mock sup.user.get called for user:${key} ->`, v);
      return v === undefined ? null : v;
    } catch (e) {
      console.error('sup.user.get error', e);
      return null;
    }
  },
  id: "",
  displayName: ""
};

sup.html = (html, options) => {
  // Capture last injected HTML so server can return it
  sup._lastInjectedHtml = String(html || '');

  // Preserve prior behavior and keep the full element
  const mockElement = {
    innerHTML: html,
    options,
    render: () => console.log("Rendered HTML:", html)
  };
  mockElement.render();

  // store the whole mock element
  sup._lastInjectedElement = mockElement;
  return mockElement;
};