import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import logger from '../../utils/logger';
import {
  headingClasses,
  subheadingClasses,
  bodyTextClasses,
  historicalChampionsTableClasses,
  historicalChampionsTableHeaderClasses,
  historicalChampionsTableHeaderRowClasses,
  historicalChampionsTableBodyClasses,
  historicalChampionsTableRowClasses,
  historicalChampionsNameCellClasses,
  historicalChampionsYearCellClasses,
  historicalChampionsActionsCellClasses,
  historicalChampionsEditButtonClasses,
  historicalChampionsDeleteButtonClasses,
  historicalChampionsAddButtonClasses,
  historicalChampionsModalClasses,
  historicalChampionsModalContentClasses,
  historicalChampionsModalHeaderClasses,
  historicalChampionsModalBodyClasses,
  historicalChampionsModalFooterClasses,
  historicalChampionsFormGroupClasses,
  historicalChampionsLabelClasses,
  historicalChampionsInputClasses,
  historicalChampionsErrorClasses,
  historicalChampionsEmptyStateClasses,
  buttonPrimaryClasses,
  buttonSecondaryClasses
} from '../../styles/commonClasses';

interface HistoricalChampion {
  id: number;
  name: string;
  end_year: number;
  created_at: string;
  updated_at: string;
}

export default function HistoricalChampionsManagement() {
  const [champions, setChampions] = useState<HistoricalChampion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChampion, setEditingChampion] = useState<HistoricalChampion | null>(null);
  const [name, setName] = useState('');
  const [endYear, setEndYear] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChampions();
  }, []);

  const loadChampions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/historical-champions');
      setChampions(response.data);
    } catch (error) {
      logger.error('Error loading historical champions:', error);
      setError('Failed to load historical champions');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingChampion(null);
    setName('');
    setEndYear('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (champion: HistoricalChampion) => {
    setEditingChampion(champion);
    setName(champion.name);
    setEndYear(champion.end_year.toString());
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChampion(null);
    setName('');
    setEndYear('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !endYear.trim()) {
      setError('Name and end year are required');
      return;
    }

    const year = parseInt(endYear);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      setError('End year must be between 1900 and next year');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingChampion) {
        // Update existing champion
        await api.put(`/admin/historical-champions/${editingChampion.id}`, {
          name: name.trim(),
          endYear: year
        });
      } else {
        // Create new champion
        await api.post('/admin/historical-champions', {
          name: name.trim(),
          endYear: year
        });
      }

      await loadChampions();
      closeModal();
    } catch (error: any) {
      logger.error('Error saving historical champion:', error);
      setError(error.response?.data?.error || 'Failed to save historical champion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (champion: HistoricalChampion) => {
    if (!confirm(`Are you sure you want to delete "${champion.name}" (${champion.end_year})?`)) {
      return;
    }

    try {
      await api.delete(`/admin/historical-champions/${champion.id}`);
      await loadChampions();
    } catch (error: any) {
      logger.error('Error deleting historical champion:', error);
      alert(error.response?.data?.error || 'Failed to delete historical champion');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Loading historical champions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className={headingClasses}>Manually add a Champion</h2>
        <p className={`${bodyTextClasses} mt-1`}>
          Add historical champions that will appear on the champions page alongside season winners.
        </p>
      </div>

      <button
        onClick={openAddModal}
        className={historicalChampionsAddButtonClasses}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add historical champion
      </button>

      {champions.length === 0 ? (
        <div className={historicalChampionsEmptyStateClasses}>
          No historical champions added yet. Click "Add historical champion" to get started.
        </div>
      ) : (
        <div className={historicalChampionsTableClasses}>
          <div className={historicalChampionsTableHeaderClasses}>
            <div className={historicalChampionsTableHeaderRowClasses}>
              <div className={historicalChampionsNameCellClasses}>Name</div>
              <div className={historicalChampionsYearCellClasses}>End Year</div>
              <div className={historicalChampionsActionsCellClasses}>Actions</div>
            </div>
          </div>
          <div className={historicalChampionsTableBodyClasses}>
            {champions.map((champion) => (
              <div key={champion.id} className={historicalChampionsTableRowClasses}>
                <div className={historicalChampionsNameCellClasses}>
                  {champion.name}
                </div>
                <div className={historicalChampionsYearCellClasses}>
                  {champion.end_year}
                </div>
                <div className={historicalChampionsActionsCellClasses}>
                  <button
                    onClick={() => openEditModal(champion)}
                    className={historicalChampionsEditButtonClasses}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(champion)}
                    className={historicalChampionsDeleteButtonClasses}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className={historicalChampionsModalClasses}>
          <div className={historicalChampionsModalContentClasses}>
            <div className={historicalChampionsModalHeaderClasses}>
              <h3 className={subheadingClasses}>
                {editingChampion ? 'Edit Historical Champion' : 'Add Historical Champion'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className={historicalChampionsModalBodyClasses}>
                <div className={historicalChampionsFormGroupClasses}>
                  <label className={historicalChampionsLabelClasses}>
                    Champion Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={historicalChampionsInputClasses}
                    placeholder="Enter champion name"
                    required
                  />
                </div>
                
                <div className={historicalChampionsFormGroupClasses}>
                  <label className={historicalChampionsLabelClasses}>
                    End Year
                  </label>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className={historicalChampionsInputClasses}
                    placeholder="Enter end year (e.g., 2020)"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                {error && (
                  <div className={historicalChampionsErrorClasses}>
                    {error}
                  </div>
                )}
              </div>
              
              <div className={historicalChampionsModalFooterClasses}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={buttonSecondaryClasses}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={buttonPrimaryClasses}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingChampion ? 'Update Champion' : 'Add Champion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
