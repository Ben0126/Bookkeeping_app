import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveCard, ResponsiveGrid, ResponsiveTitle } from '../../components/ResponsiveLayout';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const quickActionCards = [
    {
      title: t('home.manageAccounts'),
      description: t('home.manageAccountsDesc'),
      icon: '💳',
      link: '/accounts',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
      textColor: 'text-white',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: t('home.startTracking'),
      description: t('home.startTrackingDesc'),
      icon: '💰',
      link: '/transactions',
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'from-green-600 to-green-700',
      textColor: 'text-white',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: t('statistics.title'),
      description: t('statistics.incomeExpense'),
      icon: '📊',
      link: '/statistics',
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'from-purple-600 to-purple-700',
      textColor: 'text-white',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const featureCards = [
    {
      title: '智能分類',
      description: '自動識別交易類型，節省記錄時間',
      icon: '🤖',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: '多幣種支持',
      description: '支持全球主要貨幣，適合留學生使用',
      icon: '🌍',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: '離線同步',
      description: '無網絡時也能記錄，自動同步數據',
      icon: '📱',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: '數據安全',
      description: '本地存儲，隱私保護，數據安全可靠',
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
                {t('common.appName')}
              </ResponsiveTitle>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {t('home.subtitle') || 'Your personal budgeting companion for studying abroad'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">
                {t('home.quickStart')}
              </h2>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} className="max-w-5xl mx-auto">
                {quickActionCards.map((card, index) => (
                  <Link
                    key={index}
                    to={card.link}
                    className="group block transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                  >
                    <ResponsiveCard className={`relative overflow-hidden border-2 ${card.borderColor} ${card.bgColor} group-hover:shadow-xl group-hover:shadow-blue-500/20`}>
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                      
                      <div className="relative z-10 text-center">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                          {card.icon}
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors duration-300">
                          {card.title}
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                          {card.description}
                        </p>
                      </div>
                      
                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </ResponsiveCard>
                  </Link>
                ))}
              </ResponsiveGrid>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              為什麼選擇 StudyBudget Pro？
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              專為留學生設計的智能記帳工具，讓您的財務管理更簡單、更安全
            </p>
          </div>

          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }} className="gap-6">
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
          </ResponsiveGrid>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <ResponsiveCard className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="py-8">
              <div className="text-4xl mb-6">🎉</div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                {t('home.welcome')}
              </h2>
              <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                開始您的智能記帳之旅，讓每一筆支出都有意義，讓財務管理變得輕鬆愉快！
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/accounts"
                  className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">💳</span>
                  開始使用
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="mr-2">⚙️</span>
                  個人設定
                </Link>
              </div>
            </div>
          </ResponsiveCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
