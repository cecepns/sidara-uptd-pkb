import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Upload, Users, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalArchives: 0,
    myArchives: 0,
    totalUsers: 0,
    categories: {
      kendaraan: 0,
      staf: 0,
      inventaris: 0,
    },
  });
  const [recentArchives, setRecentArchives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-archives'),
      ]);
      
      setStats(statsResponse.data);
      setRecentArchives(recentResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Selamat datang, {user?.name}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Arsip',
      value: stats.totalArchives,
      icon: FileText,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      title: 'Arsip Saya',
      value: stats.myArchives,
      icon: Upload,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-100',
    },
    ...(isAdmin ? [{
      title: 'Total User',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-accent-600',
      bgColor: 'bg-accent-100',
    }] : []),
    {
      title: 'Arsip Bulan Ini',
      value: stats.thisMonth || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Selamat datang, {user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Arsip per Kategori</h3>
          <div className="space-y-3">
            {Object.entries(stats.categories).map(([key, value]) => {
              const categoryNames = {
                kendaraan: 'Data Kendaraan & Riwayat Uji',
                staf: 'Data Staf/Pegawai',
                inventaris: 'Data Inventaris',
              };
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 capitalize">{categoryNames[key]}</span>
                  <span className="font-bold text-primary-600">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Archives */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Arsip Terbaru</h3>
          {recentArchives.length > 0 ? (
            <div className="space-y-3">
              {recentArchives.slice(0, 5).map((archive) => (
                <div key={archive.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{archive.title}</p>
                    <p className="text-sm text-gray-500">{archive.uploader_name}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                      {archive.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Belum ada arsip yang diupload</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;