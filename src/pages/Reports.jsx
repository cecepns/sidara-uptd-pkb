import { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  FileText, 
  Users, 
  Calendar,
  Download
} from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/archives?period=${selectedPeriod}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      // Show user-friendly error message
      if (error.response?.status === 500) {
        alert('Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.');
      } else if (error.response?.status === 403) {
        alert('Anda tidak memiliki akses untuk melihat laporan. Hanya admin yang dapat mengakses fitur ini.');
      } else if (error.response?.status === 401) {
        alert('Sesi Anda telah berakhir. Silakan login ulang.');
      } else {
        alert('Terjadi kesalahan saat memuat data laporan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      kendaraan: 'Data Kendaraan & Riwayat Uji',
      staf: 'Data Staf/Pegawai',
      inventaris: 'Data Inventaris'
    };
    return labels[category] || category;
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = ['Judul', 'Deskripsi', 'Kategori', 'Uploader', 'Tanggal Upload', 'Ukuran File'];
    const csvContent = [
      headers.join(','),
      ...reportData.archives.map(archive => [
        `"${archive.title}"`,
        `"${archive.description}"`,
        `"${getCategoryLabel(archive.category)}"`,
        `"${archive.uploader_name}"`,
        `"${formatDate(archive.created_at)}"`,
        `"${formatFileSize(archive.file_size)}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_arsip_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        </div>
        
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
            <p className="text-gray-600">Statistik dan laporan arsip dokumen</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <select
              className="input"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
            </select>
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Arsip</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.archives.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Uploader</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.uploaderStats.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Periode</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {selectedPeriod === 'month' ? 'Bulan Ini' : 'Tahun Ini'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik Kategori</h3>
              {reportData.categoryStats.length > 0 ? (
                <div className="space-y-4">
                  {reportData.categoryStats.map((stat) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-primary-500 mr-3"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {getCategoryLabel(stat.category)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{stat.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada data kategori</p>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Uploader</h3>
              {reportData.uploaderStats.length > 0 ? (
                <div className="space-y-4">
                  {reportData.uploaderStats.slice(0, 5).map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-primary-600">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {stat.uploader_name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{stat.upload_count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada data uploader</p>
              )}
            </div>
          </div>

          {/* Recent Archives */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Arsip Terbaru</h3>
              <span className="text-sm text-gray-500">
                {reportData.archives.length} arsip ditemukan
              </span>
            </div>
            
            {reportData.archives.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Judul
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploader
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ukuran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.archives.slice(0, 10).map((archive) => (
                      <tr key={archive.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {archive.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {archive.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                            {archive.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {archive.uploader_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(archive.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(archive.file_size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada arsip</h3>
                <p className="text-gray-500">
                  Belum ada arsip yang diupload dalam periode ini
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;

