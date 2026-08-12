import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'omni-project-context';

const readPersistedProject = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && value !== 'all' ? value : null;
};

/**
 * The workspace context: which project the developer is currently operating
 * on. Pages that can be meaningfully scoped (Issues, Activity) read this;
 * the switcher in the shell writes it. Persisted so context survives reloads.
 */
const contextSlice = createSlice({
  name: 'context',
  initialState: {
    selectedProjectId: readPersistedProject(),
  },
  reducers: {
    selectProject: (state, action) => {
      state.selectedProjectId = action.payload || null;
    },
    clearProjectContext: (state) => {
      state.selectedProjectId = null;
    },
  },
});

export const { selectProject, clearProjectContext } = contextSlice.actions;

export const persistProjectContext = (projectId) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, projectId || 'all');
};

export default contextSlice.reducer;
