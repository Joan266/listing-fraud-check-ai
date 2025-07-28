import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleTheme } from '../../store/appSlice';

const ThemeToggle: React.FC = () => {
  const { theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      className={`p-2 rounded-lg transition-colors ${
        theme === 'dark' 
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default ThemeToggle;