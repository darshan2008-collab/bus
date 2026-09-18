import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Download,
  Check,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  Users
} from 'lucide-react';

export default function ImportPage({ onNavigateToFaculty }) {
  const { isAdmin, selectedBusId } = useAuth();
  const [targetType, setTargetType] = useState('STUDENTS'); // 'STUDENTS' | 'FACULTY'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [committing, setCommitting] = useState(false);

  // Sample randomized raw CSV string (Students)
  const sampleRandomizedCSV = `Student Name,Register Number,Gender,Bus Number,Bus Stop,Department,Year
Arun Kumar M,24CSE081,Male,BUS 16,Gandhigramam,CSE,I
Priya Dharshini R,24ECE081,Female,BUS 16,Karur Town,ECE,I
Karthik Raja S,24MECH081,Male,BUS 16,Gandhigramam,MECH,I
Meena Kumari T,24IT081,Female,BUS 16,Vennamalai,IT,I
Ravi Chandran K,24CSE082,Male,BUS 16,Gandhigramam,CSE,I
Deepika M,24AIDS081,Female,BUS 16,Gandhigramam,AI&DS,I
Siddharth N,24CIVIL081,Male,BUS 16,Karur Town,CIVIL,I
Bhavani K,24EEE081,Female,BUS 16,Gandhigramam,EEE,I`;

  // Sample Faculty CSV
  const sampleFacultyCSV = `Faculty Name,Department,Faculty ID,Phone,Bus Number
Dr. R. Kavitha,CSE,FAC-CSE-01,9842100011,BUS 16
Mr. M. Suresh,ECE,FAC-ECE-02,9842100012,BUS 16
Mrs. S. Priya,IT,FAC-IT-03,9842100013,BUS 16
Dr. K. Anbarasan,MECH,FAC-MECH-04,9842100014,BUS 16
Mr. P. Vijay,AI&DS,FAC-AIDS-05,9842100015,BUS 16
Mrs. T. Shanthi,ENGLISH,FAC-ENG-06,9842100016,BUS 16`;

  // Sample dataset showcasing smart deduplication
  const sampleDuplicateCSV = `Student Name,AID Number,Gender,Bus Number,Bus Stop,Department,Year
Ramesh R,24CSE101,Male,BUS 16,Gandhigramam,CSE,II
Ramesh R,24MECH101,Male,BUS 16,Gandhigramam,MECH,II
Ramesh R,24CSE101,Male,BUS 16,Gandhigramam,CSE,II
Priya Dharshini R,24ECE081,Female,BUS 16,Karur Town,ECE,I
Priya Dharshini R,24ECE081,Female,BUS 16,Karur Town,ECE,I
Deepika M,24AIDS081,Female,BUS 16,Gandhigramam,AI&DS,I`;

  // Sample scanned text representing OCR output from a photo / roster document
  const sampleOcrText = `DHANALAKSHMI SRINIVASAN UNIVERSITY
CAMPUS BUS TRANSPORT ROSTER - BUS 16
1. Anandhi S - 24CSE091 - Female - Thanthonimalai - CSE - II
2. Vigneshwaran R - 24ECE092 - Male - Gandhigramam - ECE - II
3. Keerthana M - 24IT093 - Female - Karur Town - IT - I
4. Dinesh Kumar P - 24MECH094 - Male - Vennamalai - MECH - III
5. Subashini T - 24AIDS095 - Female - Thanthonimalai - AI&DS - I
6. Praveen Raj V - 24CIVIL096 - Male - Gandhigramam - CIVIL - II`;

  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setLoading(true);
    const isImage = uploadedFile.type?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(uploadedFile.name);
    const isDocx = uploadedFile.name.endsWith('.docx') || uploadedFile.name.endsWith('.doc');
    const isFacultyName = /faculty|staff|prof|teacher/i.test(uploadedFile.name);

    if (isFacultyName && targetType !== 'FACULTY') {
      setTargetType('FACULTY');
    }

    if (isImage) {
      setLoadingStatus('Running OCR Image Engine on Photo / Scan...');
    } else if (isDocx) {
      setLoadingStatus('Parsing Word Document tables & rosters...');
    } else {
      setLoadingStatus('Reading spreadsheet & parsing records...');
    }

    setCommitResult(null);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('targetType', isFacultyName ? 'FACULTY' : targetType);

    try {
      const res = await apiRequest('/import/preview', {
        method: 'POST',
        body: formData
      });
      setPreviewResult(res);
      if (res.target_type === 'FACULTY') {
        setTargetType('FACULTY');
      }
    } catch (err) {
      alert('Import preview failed: ' + err.message);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleTestSampleDataset = async (datasetType = 'csv') => {
    setLoading(true);
    setCommitResult(null);

    let currentTarget = targetType;
    if (datasetType === 'faculty') {
      currentTarget = 'FACULTY';
      setTargetType('FACULTY');
      setFile({ name: 'sample_faculty_roster.csv' });
      setLoadingStatus('Analyzing Faculty Roster dataset...');
    } else if (datasetType === 'ocr') {
      setFile({ name: 'simulated_photo_ocr_roster.txt' });
      setLoadingStatus('Simulating OCR Image Recognition on Dhanalakshmi Srinivasan University Roster...');
    } else if (datasetType === 'duplicate') {
      setFile({ name: 'duplicate_test_roster.csv' });
      setLoadingStatus('Testing smart deduplication...');
    } else {
      setFile({ name: 'randomized_students_sample.csv' });
      setLoadingStatus('Analyzing sample roster...');
    }

    try {
      let textToTest = sampleRandomizedCSV;
      if (datasetType === 'faculty') textToTest = sampleFacultyCSV;
      if (datasetType === 'ocr') textToTest = sampleOcrText;
      if (datasetType === 'duplicate') textToTest = sampleDuplicateCSV;

      const res = await apiRequest('/import/preview', {
        method: 'POST',
        body: JSON.stringify({ textData: textToTest, targetType: currentTarget })
      });
      setPreviewResult(res);
      if (res.target_type === 'FACULTY') {
        setTargetType('FACULTY');
      }
    } catch (err) {
      alert('Sample test failed: ' + err.message);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleLoadOfficialDsecSample = async () => {
    setTargetType('STUDENTS');
    setLoading(true);
    setCommitResult(null);
    setFile({ name: 'DSEC_Bus_07_Boys_Boarding_Details.xlsx' });
    setLoadingStatus('Loading official DSEC Bus No: 07 Boys Boarding Details roster (59 Students)...');
    try {
      const res = await fetch('/DSEC_Bus_07_Boys_Boarding_Details.xlsx');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'DSEC_Bus_07_Boys_Boarding_Details.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      await handleFileUpload(sampleFile);
    } catch (err) {
      alert('Could not load official sample: ' + err.message);
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleCommitToDatabase = async () => {
    if (!previewResult || !previewResult.valid_records || previewResult.valid_records.length === 0) {
      alert('No valid records to commit.');
      return;
    }

    setCommitting(true);
    try {
      const res = await apiRequest('/import/commit', {
        method: 'POST',
        body: JSON.stringify({
          records: previewResult.valid_records,
          targetType: previewResult.target_type || targetType,
          targetBusId: selectedBusId
        })
      });
      setCommitResult(res);
    } catch (err) {
      alert('Failed to commit records: ' + err.message);
    } finally {
      setCommitting(false);
    }
  };

  const summary = previewResult?.summary;
  const isFacultyMode = previewResult?.target_type === 'FACULTY' || targetType === 'FACULTY';
  const buses = previewResult?.buses || [];
  const sourceFormat = previewResult?.source_format;

  const getFormatBadge = (fmt) => {
    switch (fmt) {
      case 'WORD_DOCUMENT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
            <FileText size={12} /> Word Document Table
          </span>
        );
      case 'EXCEL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <FileSpreadsheet size={12} /> Excel Spreadsheet
          </span>
        );
      case 'IMAGE_OCR':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(234,88,12,0.15)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)' }}>
            <ImageIcon size={12} /> OCR Photo Scan
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Layers size={12} /> Structured Roster
          </span>
        );
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={22} color="var(--primary)" />
          <span className="section-label">MULTI-FORMAT ROSTER IMPORT</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
          Import Transportation Roster
        </h2>
      </div>

      {/* Target Roster Switcher: Students vs Faculty */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Select Target Attendance Roster:
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setTargetType('STUDENTS');
              setPreviewResult(null);
              setCommitResult(null);
            }}
            className={`tab-segment-btn ${targetType === 'STUDENTS' ? 'active' : ''}`}
            style={{ flex: 1, padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Users size={16} />
            <span>🎓 Student Attendance Roster</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetType('FACULTY');
              setPreviewResult(null);
              setCommitResult(null);
            }}
            className={`tab-segment-btn ${targetType === 'FACULTY' ? 'active' : ''}`}
            style={{ flex: 1, padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <GraduationCap size={16} />
            <span>👨‍🏫 Faculty Attendance Roster</span>
          </button>
        </div>
      </div>

      {/* Mode explanation banner */}
      {targetType === 'FACULTY' ? (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12.5px',
          color: 'var(--primary)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <GraduationCap size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>FACULTY ATTENDANCE MODE ACTIVE:</strong> Uploaded Word documents (<code>.docx</code> / <code>.doc</code>) or tables will be stored in the <strong>Faculty Attendance Roster</strong> (NOT student attendance). You will take faculty attendance directly in the Faculty section.
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Upload student data in <strong>any format</strong>: Microsoft Word documents (<code>.docx</code>, <code>.doc</code>), Photos / Camera Scans (<code>.png</code>, <code>.jpg</code>), Excel sheets (<code>.xlsx</code>), or CSV.
        </div>
      )}

      {/* Format Badges Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          <FileText size={16} color="#3b82f6" />
          <span>Word (.docx/.doc)</span>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          <ImageIcon size={16} color="#10b981" />
          <span>Photos & OCR Scan</span>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          <FileSpreadsheet size={16} color="#059669" />
          <span>Excel (.xlsx/.xls)</span>
        </div>
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          <Layers size={16} color="#8b5cf6" />
          <span>CSV & Text Roster</span>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '2px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-app)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}
        >
          {loading ? <RefreshCw size={26} className="animate-spin" /> : <Upload size={26} />}
        </div>

        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Choose Word Doc (.docx), Excel, or Image
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {targetType === 'FACULTY' ? 'Target: Faculty Attendance Roster' : 'Target: Student Attendance Roster'} &bull; Supports <code>.docx, .doc, .xlsx, .xls, .csv, .jpg, .png</code>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          <label
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '13.5px', cursor: 'pointer', width: 'auto' }}
          >
            <span>Browse Document</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>

          {/* Test Faculty Sample */}
          <button
            type="button"
            onClick={() => handleTestSampleDataset('faculty')}
            disabled={loading}
            className="btn-secondary"
            style={{
              padding: '9px 14px',
              fontSize: '13px',
              minHeight: 'auto',
              border: targetType === 'FACULTY' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
              backgroundColor: targetType === 'FACULTY' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)'
            }}
          >
            <GraduationCap size={15} color="var(--primary)" />
            <span>Load Sample Faculty Roster</span>
          </button>

          <button
            type="button"
            onClick={handleLoadOfficialDsecSample}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '9px 14px', fontSize: '13px', minHeight: 'auto' }}
          >
            <Sparkles size={15} color="#2563eb" />
            <span>Load DSEC Bus 07 Students (59)</span>
          </button>
        </div>

        {file && (
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Selected: <strong>{file.name}</strong>
            {loading && (
              <div style={{ marginTop: '4px', color: 'var(--primary)', fontWeight: 600 }}>
                {loadingStatus || 'Analyzing & extracting records...'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commit Success Banner */}
      {commitResult && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--status-present-bg)',
            border: '1.5px solid var(--status-present-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            color: 'var(--status-present)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={22} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Import Committed Successfully!</div>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>{commitResult.message}</div>
            </div>
          </div>

          {commitResult.target_type === 'FACULTY' && onNavigateToFaculty && (
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                onClick={onNavigateToFaculty}
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
              >
                <GraduationCap size={16} />
                <span>Go to Faculty Attendance to Mark Attendance &rarr;</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW SUMMARY & TABLES */}
      {previewResult && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="section-label">
                {isFacultyMode ? 'FACULTY ATTENDANCE ROSTER PREVIEW' : 'STUDENT ATTENDANCE ROSTER PREVIEW'}
              </span>
              {getFormatBadge(sourceFormat)}
            </div>

            {!commitResult && (
              <button
                type="button"
                onClick={handleCommitToDatabase}
                disabled={committing || summary.valid_records_count === 0}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: isFacultyMode ? 'var(--primary)' : undefined
                }}
              >
                <Check size={16} />
                <span>
                  {committing
                    ? 'Saving to DB...'
                    : isFacultyMode
                    ? `Save ${summary.valid_records_count} Records to Faculty Attendance`
                    : `Commit ${summary.valid_records_count} Students to Attendance`}
                </span>
              </button>
            )}
          </div>

          {/* Counts */}
          <div className="import-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ROWS</div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>{summary.total_records_read}</div>
            </div>

            <div style={{ backgroundColor: 'var(--status-present-bg)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-present-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--status-present)', fontWeight: 700 }}>
                {isFacultyMode ? 'VALID FACULTY' : 'VALID STUDENTS'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-present)' }}>{summary.valid_records_count}</div>
              <div style={{ fontSize: '10px', color: 'var(--status-present)' }}>
                {isFacultyMode ? `${summary.departments?.length || 0} Depts` : `${summary.total_boys}B • ${summary.total_girls}G`}
              </div>
            </div>

            <div style={{ backgroundColor: summary.duplicate_records_count > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} color="#f59e0b" />
                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>DUPLICATES (SKIPPED)</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>{summary.duplicate_records_count}</div>
              {summary.duplicate_records_count > 0 && (
                <div style={{ fontSize: '10px', color: '#f59e0b' }}>Taken once only</div>
              )}
            </div>

            <div style={{ backgroundColor: summary.invalid_records_count > 0 ? 'var(--status-absent-bg)' : 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--status-absent)', fontWeight: 700 }}>INVALID ROWS</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-absent)' }}>{summary.invalid_records_count}</div>
            </div>
          </div>

          {/* FACULTY PREVIEW TABLE (When target is Faculty) */}
          {isFacultyMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--primary)',
                fontWeight: 600
              }}>
                📌 <strong>Target Verified:</strong> These {summary.valid_records_count} members will be registered in the <strong>Faculty Transport Attendance</strong> table. You can mark their attendance under the <em>Faculty</em> menu.
              </div>

              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                      <th>Faculty ID</th>
                      <th>Faculty Name</th>
                      <th>Department</th>
                      <th>Phone / Mobile</th>
                      <th>Assigned Bus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.valid_records.map((rec, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rec.faculty_id}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.name}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 600 }}>
                            {rec.department}
                          </span>
                        </td>
                        <td>{rec.phone || '—'}</td>
                        <td><strong>{rec.bus_number}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* STUDENT BUS STOP GROUPING INSPECTION */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="section-label">AUTOMATIC GROUPING BY BUS STOP</span>
              {buses.map((b) => (
                <div
                  key={b.bus_number}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {b.bus_number} &bull; <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{b.total_students} students grouped across {b.total_stops} stops</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {b.stops.map((st) => (
                      <div
                        key={st.stop_name}
                        style={{
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {st.stop_name.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Total: <strong>{st.total}</strong> ({st.boys_count} Boys, {st.girls_count} Girls)
                          </span>
                        </div>

                        {/* Boys list */}
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <strong style={{ color: '#60a5fa' }}>BOYS:</strong>{' '}
                          {st.boys.map((boy) => boy.name).join(', ') || 'None'}
                        </div>

                        {/* Girls list */}
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#f472b6' }}>GIRLS:</strong>{' '}
                          {st.girls.map((girl) => girl.name).join(', ') || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Duplicate Records list if any */}
          {summary.duplicate_records_count > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="section-label" style={{ color: '#f59e0b' }}>
                DUPLICATE RECORDS — SKIPPED
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {previewResult.duplicate_records.map((dup, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ color: '#f59e0b', fontWeight: 700, minWidth: '40px' }}>Row {dup.rowNumber}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dup.name}</span>
                    <span style={{
                      padding: '2px 7px',
                      backgroundColor: 'rgba(245,158,11,0.15)',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      color: '#f59e0b',
                      fontSize: '11px'
                    }}>{dup.faculty_id || dup.register_number}</span>
                    {dup.department && (
                      <span style={{
                        padding: '2px 7px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>{dup.department}</span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{dup.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Records notice if any */}
          {summary.invalid_records_count > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="section-label" style={{ color: 'var(--status-absent)' }}>
                INVALID RECORDS NOT IMPORTED
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {previewResult.invalid_records.map((inv, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--status-absent-bg)',
                      border: '1px solid var(--status-absent-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      color: 'var(--status-absent)'
                    }}
                  >
                    Row {inv.rowNumber}: {inv.name} &mdash; {inv.errors?.join(', ') || 'Validation error'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
