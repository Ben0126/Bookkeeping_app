import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResponsiveCard, ResponsiveTitle } from '../../../components/ResponsiveLayout';
import type { WelcomeSectionProps } from '../types';

/**
 * 歡迎區塊組件
 * 為新用戶提供友好的歡迎界面和引導
 */
const WelcomeSection: React.FC<WelcomeSectionProps> = ({ 
  onGetStarted,
  onViewSettings 
}) => {
  const { t } = useTranslation();

  const featureCards = [
    {
      title: t('dashboard.welcomeSection.smartCategorization'),
      description: t('dashboard.welcomeSection.smartCategorizationDesc'),
      icon: '🤖',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: t('dashboard.welcomeSection.multiCurrency'),
      description: t('dashboard.welcomeSection.multiCurrencyDesc'),
      icon: '🌍',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: t('dashboard.welcomeSection.offlineSync'),
      description: t('dashboard.welcomeSection.offlineSyncDesc'),
      icon: '📱',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: t('dashboard.welcomeSection.dataSecurity'),
      description: t('dashboard.welcomeSection.dataSecurityDesc'),
      icon: '🔒',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-green-400/10 to-blue-400/10 rounded-full translate-y-32 -translate-x-32"></div>
        
        <div className="relative z-10 px-6 py-12 lg:py-20">
          <div className="max-w-6xl mx-auto text-center">
            {/* Logo and Title */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg mb-6">
                <span className="text-3xl">💰</span>
              </div>
              <ResponsiveTitle level={1} className="mb-4 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                {t('dashboard.welcome')}
              </ResponsiveTitle>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {t('dashboard.welcomeSubtitle')}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">
                {t('home.quickStart')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
                <Link
                  to="/accounts"
                  className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  onClick={onGetStarted}
                >
                  <span className="mr-2">💳</span>
                  {t('dashboard.addAccount')}
                </Link>
                <Link
                  to="/transactions"
                  className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">💰</span>
                  {t('dashboard.addTransaction')}
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                  onClick={onViewSettings}
                >
                  <span className="mr-2">⚙️</span>
                  {t('dashboard.viewSettings')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {t('dashboard.welcomeSection.whyChoose')}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('dashboard.welcomeSection.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((feature, index) => (
              <ResponsiveCard
                key={index}
                className={`${feature.bgColor} ${feature.borderColor} border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className={`text-lg font-bold ${feature.color} mb-2`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ResponsiveCard>
            ))}
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <ResponsiveCard className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="py-8">
              <div className="text-4xl mb-6">🎉</div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                {t('dashboard.welcome')}
              </h2>
              <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                {t('dashboard.welcomeSection.startJourney')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/accounts"
                  className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">💳</span>
                  {t('dashboard.welcomeSection.getStarted')}
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="mr-2">⚙️</span>
                  {t('dashboard.welcomeSection.personalSettings')}
                </Link>
              </div>
            </div>
          </ResponsiveCard>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;
