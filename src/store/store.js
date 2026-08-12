import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import contextReducer from './slices/contextSlice';
import projectReducer from './slices/projectSlice';
import taskReducer from './slices/taskSlice';
import issuesReducer from './slices/issuesSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    context: contextReducer,
    projects: projectReducer,
    tasks: taskReducer,
    issues: issuesReducer,
  },
});

export default store;
