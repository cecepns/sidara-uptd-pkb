import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  FileText, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  User
} from 'lucide-react';

const Archives = () => {
  const { user } = useAuth();
  const [archives, setArchives] = useState([]);
  const [filteredArchives, setFilteredArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);

  const categories = [
    { value: '', label: 'Semua Kategori' },
    { value: 'kendaraan', label: 'Data Kendaraan & Riwayat Uji' },
    { value: 'staf', label: 'Data Staf/Pegawai' },
    { value: 'inventaris', label: 'Data Inventaris' },
  ];

  useEffect(() => {
    fetchArchives();
  }, []);

  useEffect(() => {
    filterArchives();
  }, [archives, searchQuery, selectedCategory]);

  const fetchArchives = async () => {
    try {
      const response = await api.get('/archives');
      setArchives(response.data);
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterArchives = () => {
    let filtered = archives;

    if (searchQuery) {
      filtered = filtered.filter(archive =>
        archive.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        archive.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        archive.uploader_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(archive => archive.category === selectedCategory);
    }

    setFilteredArchives(filtered);
  };

  const handleDownload = async (archive) => {
    try {
      const response = await api.get(`/archives/${archive.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', archive.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Gagal mengunduh file');
    }
  };

  const handleDelete = async () => {
    if (!selectedArchive) return;

    try {
      await api.delete(`/archives/${selectedArchive.id}`);
      setArchives(archives.filter(archive => archive.id !== selectedArchive.id));
      setShowDeleteModal(false);
      setSelectedArchive(null);
    } catch (error) {
      console.error('Error deleting archive:', error);
      alert('Gagal menghapus arsip');
    }
  };

  const canEdit = (archive) => {
    return user?.role === 'admin' || archive.uploader_id === user?.id;
  };

  const canDelete = (archive) => {
    return user?.role === 'admin' || archive.uploader_id === user?.id;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Arsip Dokumen</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">Arsip Dokumen</h1>
        <p className="text-gray-600">Kelola dan akses semua dokumen arsip</p>
      </div>

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari arsip..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-64">
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Archives Grid */}
      {filteredArchives.length > 0 ? (
        <div className="grid gap-6">
          {filteredArchives.map((archive) => (
            <div key={archive.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {archive.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                      {archive.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">{archive.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{archive.uploader_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(archive.created_at)}</span>
                    </div>
                    <span>{formatFileSize(archive.file_size)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(archive)}
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {canEdit(archive) && (
                    <Link
                      to={`/archives/${archive.id}/edit`}
                      className="p-2 text-gray-400 hover:text-secondary-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  )}
                  
                  {canDelete(archive) && (
                    <button
                      onClick={() => {
                        setSelectedArchive(archive);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada arsip ditemukan</h3>
          <p className="text-gray-500">
            {searchQuery || selectedCategory 
              ? 'Coba ubah kriteria pencarian atau filter' 
              : 'Mulai dengan mengupload dokumen pertama Anda'
            }
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Hapus Arsip</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Apakah Anda yakin ingin menghapus arsip "{selectedArchive?.title}"? 
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="items-center px-4 py-3 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedArchive(null);
                  }}
                  className="flex-1 btn-outline"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archives;