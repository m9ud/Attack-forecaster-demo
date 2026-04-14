import { useRef, useState } from 'react';
import { useStore } from '../store';
import { LoaderIcon } from './Icons';
import { API } from '../api';

// Inline SVGs
const UploadIcon  = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
const FileIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const FolderIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const ResetIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;

export default function DatasetUpload() {
  const uploadDataset    = useStore((s) => s.uploadDataset);
  const resetDataset     = useStore((s) => s.resetDataset);
  const datasetUploading = useStore((s) => s.datasetUploading);
  const nodes            = useStore((s) => s.nodes);
  const edges            = useStore((s) => s.edges);

  const fileRef = useRef(null);
  const [dragOver, setDragOver]   = useState(false);
  const [fileName, setFileName]   = useState(null);

  const handleFile = async (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.json') && !name.endsWith('.zip')) {
      alert('Please upload a .json or .zip file');
      return;
    }
    setFileName(file.name);
    await uploadDataset(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="dataset-upload">
      <div className="dataset-upload-header">
        <FolderIcon />
        <h3>Dataset</h3>
      </div>

      {/* Current dataset info */}
      {nodes.length > 0 && (
        <div className="dataset-info-bar">
          <span className="dataset-info-chip"><strong>{nodes.length}</strong> nodes</span>
          <span className="dataset-info-chip"><strong>{edges.length}</strong> edges</span>
          {fileName && (
            <span className="dataset-info-chip dataset-file-chip" title={fileName}>
              <FileIcon /> {fileName.length > 18 ? fileName.slice(0, 15) + '…' : fileName}
            </span>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`dataset-dropzone ${dragOver ? 'dataset-dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".json,.zip" onChange={onFileChange} style={{ display: 'none' }} />
        {datasetUploading ? (
          <div className="dataset-dropzone-content">
            <LoaderIcon size={14} className="spin-icon" />
            <span>Loading dataset…</span>
          </div>
        ) : (
          <div className="dataset-dropzone-content">
            <span className="dataset-dropzone-icon"><UploadIcon /></span>
            <span>Drop file here or <strong>click to browse</strong></span>
            <span className="dataset-dropzone-hint">Accepts .json or SharpHound .zip</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="dataset-actions">
        <button
          className="dataset-reset-btn"
          onClick={resetDataset}
          disabled={datasetUploading}
          title="Reset to the bundled demo dataset (39 nodes)"
        >
          <ResetIcon /> Reset to Default Dataset
        </button>
      </div>
    </div>
  );
}
