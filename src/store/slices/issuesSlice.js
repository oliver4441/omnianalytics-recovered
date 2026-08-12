import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  issues: [],
  loading: false,
  error: null,
};

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setIssues: (state, action) => {
      state.issues = action.payload;
      state.error = null;
    },
    upsertIssue: (state, action) => {
      const index = state.issues.findIndex((issue) => issue.id === action.payload.id);
      if (index === -1) state.issues.unshift(action.payload);
      else state.issues[index] = action.payload;
    },
    removeIssue: (state, action) => {
      state.issues = state.issues.filter((issue) => issue.id !== action.payload);
    },
    setIssuesLoading: (state, action) => {
      state.loading = action.payload;
    },
    setIssuesError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setIssues,
  upsertIssue,
  removeIssue,
  setIssuesLoading,
  setIssuesError,
} = issuesSlice.actions;
export default issuesSlice.reducer;
