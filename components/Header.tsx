import React from 'react';
import { AppView } from '../types';
import { DashboardIcon, AiIcon, BrainIcon, OrganizationIcon } from './icons';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: AppView;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-md ${
      isActive
        ? 'text-white bg-gray-800'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="bg-black border-b border-gray-800 flex items-center justify-between px-6 h-16 flex-shrink-0">
      <div className="flex items-center">
        <h1 className="text-2xl font-black text-white">
          LeadGenius <span className="text-orange-500">AI</span>
        </h1>
      </div>
      <nav className="flex items-center gap-2">
        <NavItem
          icon={<DashboardIcon className="w-5 h-5" />}
          label={AppView.Dashboard}
          isActive={currentView === AppView.Dashboard}
          onClick={() => setView(AppView.Dashboard)}
        />
        <NavItem
          icon={<OrganizationIcon className="w-5 h-5" />}
          label={AppView.Organization}
          isActive={currentView === AppView.Organization}
          onClick={() => setView(AppView.Organization)}
        />
        <NavItem
          icon={<BrainIcon className="w-5 h-5" />}
          label={AppView.Brain}
          isActive={currentView === AppView.Brain}
          onClick={() => setView(AppView.Brain)}
        />
        <NavItem
          icon={<AiIcon className="w-5 h-5" />}
          label={AppView.AIAssistant}
          isActive={currentView === AppView.AIAssistant}
          onClick={() => setView(AppView.AIAssistant)}
        />
      </nav>
      <div className="w-40"></div> {/* Spacer to balance the nav */}
    </header>
  );
};

export default Header;