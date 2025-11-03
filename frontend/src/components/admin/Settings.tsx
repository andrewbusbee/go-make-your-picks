import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppSettings from './AppSettings';
import TestEmail from './TestEmail';
import AdminsManagement from './AdminsManagement';
import HistoricalChampionsManagement from './HistoricalChampionsManagement';
import DatabaseHealth from './DatabaseHealth';
import {
  tabContainerClasses,
  tabButtonActiveClasses,
  tabButtonInactiveClasses
} from '../../styles/commonClasses';

interface SettingsProps {
  isMainAdmin: boolean;
}

export default function Settings({ isMainAdmin }: SettingsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'customize' | 'email' | 'admins' | 'champions' | 'dbhealth'>('customize');

  // Determine active tab based on URL
  useEffect(() => {
    if (location.pathname.includes('/admin/settings/email')) {
      setActiveTab('email');
    } else if (location.pathname.includes('/admin/settings/admins')) {
      setActiveTab('admins');
    } else if (location.pathname.includes('/admin/settings/champions')) {
      setActiveTab('champions');
    } else if (location.pathname.includes('/admin/settings/db-health')) {
      setActiveTab('dbhealth');
    } else {
      setActiveTab('customize');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'customize' | 'email' | 'admins' | 'champions' | 'dbhealth') => {
    setActiveTab(tab);
    if (tab === 'customize') {
      navigate('/admin/settings');
    } else if (tab === 'dbhealth') {
      navigate('/admin/settings/db-health');
    } else {
      navigate(`/admin/settings/${tab}`);
    }
  };

  const getSubTabClass = (tab: 'customize' | 'email' | 'admins' | 'champions' | 'dbhealth') => {
    return activeTab === tab ? tabButtonActiveClasses : tabButtonInactiveClasses;
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className={tabContainerClasses}>
        <button
          onClick={() => handleTabChange('customize')}
          className={getSubTabClass('customize')}
        >
          Customize App
        </button>
        <button
          onClick={() => handleTabChange('email')}
          className={getSubTabClass('email')}
        >
          Email
        </button>
        <button
          onClick={() => handleTabChange('admins')}
          className={getSubTabClass('admins')}
        >
          Admins
        </button>
        <button
          onClick={() => handleTabChange('champions')}
          className={getSubTabClass('champions')}
        >
          Add Previous Champions
        </button>
        <button
          onClick={() => handleTabChange('dbhealth')}
          className={getSubTabClass('dbhealth')}
        >
          Database Health
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'customize' && <AppSettings />}
        {activeTab === 'email' && <TestEmail isMainAdmin={isMainAdmin} />}
        {activeTab === 'admins' && <AdminsManagement isMainAdmin={isMainAdmin} />}
        {activeTab === 'champions' && <HistoricalChampionsManagement />}
        {activeTab === 'dbhealth' && <DatabaseHealth />}
      </div>
    </div>
  );
}

