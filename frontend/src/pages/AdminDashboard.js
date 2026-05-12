import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../utils/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStudents();
      setStudents(response.data.data.students);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }

      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminAPI.uploadStudents(formData);
      const result = response.data.data;
      
      setUploadResult(result);
      toast.success(`Successfully uploaded ${result.successful} students`);
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} records failed to upload`);
      }

      setFile(null);
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload file';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (studentId) => {
    if (!window.confirm('Are you sure you want to generate a certificate for this student?')) {
      return;
    }

    try {
      setLoading(true);
      await adminAPI.generateCertificate(studentId);
      toast.success('Certificate generated successfully!');
      fetchStudents();
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate certificate';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Manage students and certificates</p>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Students</h3>
              <div className="stat-value">{stats.totalStudents}</div>
            </div>
            <div className="stat-card">
              <h3>Certificates Issued</h3>
              <div className="stat-value">{stats.certificatesIssued}</div>
            </div>
            <div className="stat-card">
              <h3>Pending Certificates</h3>
              <div className="stat-value">{stats.pendingCertificates}</div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Students
          </button>
          <button
            className={`tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Manage Students
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="table-container">
            <h3>Upload Student Data</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Upload an Excel file with columns: studentId, name, email, phone, internshipDomain, startDate, endDate
            </p>
            
            <form onSubmit={handleUpload}>
              <div className="file-upload">
                <input
                  type="file"
                  id="file-input"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-input" className="file-upload-label">
                  {file ? file.name : '📁 Click to select Excel file'}
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !file}
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Uploading...' : 'Upload Students'}
              </button>
            </form>

            {uploadResult && (
              <div style={{ marginTop: '2rem' }}>
                <div className="success-container">
                  <strong>Upload Summary:</strong>
                  <p>Successfully uploaded: {uploadResult.successful}</p>
                  <p>Failed: {uploadResult.failed}</p>
                </div>

                {uploadResult.failedUploads.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4>Failed Records:</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Student ID</th>
                          <th>Name</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.failedUploads.slice(0, 10).map((fail, index) => (
                          <tr key={index}>
                            <td>{fail.row}</td>
                            <td>{fail.data?.studentId || '-'}</td>
                            <td>{fail.data?.name || '-'}</td>
                            <td style={{ color: '#ff4757' }}>{fail.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadResult.failedUploads.length > 10 && (
                      <p style={{ marginTop: '1rem', color: '#666' }}>
                        ...and {uploadResult.failedUploads.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="table-container">
            <h3>Student List</h3>
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : students.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                No students found. Upload student data to get started.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Domain</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id}>
                        <td>{student.studentId}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.internshipDomain}</td>
                        <td>{new Date(student.startDate).toLocaleDateString()}</td>
                        <td>{new Date(student.endDate).toLocaleDateString()}</td>
                        <td>
                          {student.certificateIssued ? (
                            <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                              ✓ Issued
                            </span>
                          ) : (
                            <span style={{ color: '#f39c12', fontWeight: 'bold' }}>
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td>
                          {!student.certificateIssued && (
                            <button
                              onClick={() => handleGenerateCertificate(student.studentId)}
                              className="btn btn-primary"
                              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                              disabled={loading}
                            >
                              {loading ? "Generating..." : "Generate Certificate"}
                            </button>
                          )}
                          {student.certificateIssued && (
                            <span style={{ color: '#666', fontSize: '0.9rem' }}>
                              ID: {student.certificateId}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
