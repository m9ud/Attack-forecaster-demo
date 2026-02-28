import { useRef, useState } from 'react';
import { useStore } from '../store';

export default function DatasetUpload() {
  const uploadDataset = useStore((s: any) => s.uploadDataset);
  const resetDataset = useStore((s: any) => s.resetDataset);
  const datasetUploading = useStore((s: any) => s.datasetUploading);
  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);
  const error = useStore((s: any) => s.error);

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please upload a .json file');
      return;
    }
    setFileName(file.name);
    await uploadDataset(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="dataset-upload">
      <div className="dataset-upload-header">
        <span className="dataset-upload-icon">&#128194;</span>
        <h3>Dataset</h3>
      </div>

      {/* Current dataset info */}
      <div className="dataset-info-bar">
        <span className="dataset-info-chip">
          <strong>{nodes.length}</strong> nodes
        </span>
        <span className="dataset-info-chip">
          <strong>{edges.length}</strong> edges
        </span>
        {fileName && (
          <span className="dataset-info-chip dataset-file-chip" title={fileName}>
            &#128196; {fileName.length > 18 ? fileName.slice(0, 15) + '...' : fileName}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`dataset-dropzone ${dragOver ? 'dataset-dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
        {datasetUploading ? (
          <div className="dataset-dropzone-content">
            <span className="loading-pulse">&#9679;</span>
            <span>Loading dataset…</span>
          </div>
        ) : (
          <div className="dataset-dropzone-content">
            <span className="dataset-dropzone-icon">&#8686;</span>
            <span>Drop JSON file here or <strong>click to browse</strong></span>
            <span className="dataset-dropzone-hint">Accepts .json files</span>
          </div>
        )}
      </div>

      {/* Reset button */}
      <button
        className="dataset-reset-btn"
        onClick={resetDataset}
        disabled={datasetUploading}
        title="Reset to the bundled demo dataset"
      >
        &#8634; Reset to Default Dataset
      </button>
    </div>
  );
}
