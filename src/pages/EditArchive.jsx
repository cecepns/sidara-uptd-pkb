import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  FileText, 
  ArrowLeft,
  Save,
  X
} from 'lucide-react';

const EditArchive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archive, setArchive] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ''
  });
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'kendaraan', label: 'Data Kendaraan & Riwayat Uji' },
    { value: 'staf', label: 'Data Staf/Pegawai' },
    { value: 'inventaris', label: 'Data Inventaris' },
  ];

  useEffect(() => {
    fetchArchive();
  }, [id]);

  const fetchArchive = async () => {
    try {
      const response = await api.get(`/archives/${id}`);
      const archiveData = response.data;
      
      // Check if user has permission to edit
      if (user?.role !== 'admin' && archiveData.uploader_id !== user?.id) {
        alert('Anda tidak memiliki izin untuk mengedit arsip ini');
        navigate('/archives');
        return;
      }

      setArchive(archiveData);
      setFormData({
        title: archiveData.title,
        description: archiveData.description,
        category: archiveData.category
      });
    } catch (error) {
      console.error('Error fetching archive:', error);
      alert('Gagal memuat data arsip');
      navigate('/archives');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Judul tidak boleh kosong';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Deskripsi tidak boleh kosong';
    }

    if (!formData.category) {
      newErrors.category = 'Kategori harus dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      await api.put(`/archives/${id}`, formData);
      alert('Arsip berhasil diperbarui');
      navigate('/archives');
    } catch (error) {
      console.error('Error updating archive:', error);
      alert(error.response?.data?.message || 'Gagal memperbarui arsip');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Arsip</h1>
        </div>
        
        <div className="card animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Arsip</h1>
            <p className="text-gray-600">Perbarui informasi arsip dokumen</p>
          </div>
          <button
            onClick={() => navigate('/archives')}
            className="btn-outline flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Arsip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Archive Info */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Arsip</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File
                </label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-primary-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {archive?.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(archive?.file_size)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uploader
                </label>
                <p className="text-gray-900">{archive?.uploader_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Upload
                </label>
                <p className="text-gray-900">{formatDate(archive?.created_at)}</p>
              </div>

              {archive?.updated_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terakhir Diperbarui
                  </label>
                  <p className="text-gray-900">{formatDate(archive?.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Judul Arsip *
                  </label>
                  <input
                    type="text"
                    className={`input ${errors.title ? 'border-red-500' : ''}`}
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Masukkan judul arsip"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi *
                  </label>
                  <textarea
                    rows={4}
                    className={`input ${errors.description ? 'border-red-500' : ''}`}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Masukkan deskripsi arsip"
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori *
                  </label>
                  <select
                    className={`input ${errors.category ? 'border-red-500' : ''}`}
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => navigate('/archives')}
                    className="btn-outline flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditArchive;

