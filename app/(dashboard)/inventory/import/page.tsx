'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  Server,
  Layers,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'PROCESSING' | 'RESULT';

interface ColumnMapping {
  assetTag: string;
  brand: string;
  model: string;
  deviceType: string;
  category: string;
  location: string;
  serialNumber: string;
  yearAcquired: string;
  status: string;
  condition: string;
  description: string;
}

export default function DeviceImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    assetTag: '',
    brand: '',
    model: '',
    deviceType: '',
    category: '',
    location: '',
    serialNumber: '',
    yearAcquired: '',
    status: '',
    condition: '',
    description: '',
  });

  // Validation Preview Results
  const [previewResult, setPreviewResult] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    duplicateCount: number;
    errors: Array<{ row: number; data: any; reason: string }>;
    preview: any[];
  } | null>(null);

  // Final Execution Result
  const [finalResult, setFinalResult] = useState<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Handle File Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('File is empty');
          return;
        }
        setParsedData(results.data);
        const detectedHeaders = Object.keys(results.data[0] as object);
        setHeaders(detectedHeaders);

        // Auto-match headers by name similarity
        const autoMapping: ColumnMapping = {
          assetTag: detectedHeaders.find((h) => /tag|asset|kode|inventaris/i.test(h)) || detectedHeaders[0] || '',
          brand: detectedHeaders.find((h) => /brand|merk|maker/i.test(h)) || '',
          model: detectedHeaders.find((h) => /model|tipe/i.test(h)) || '',
          deviceType: detectedHeaders.find((h) => /type|jenis|perangkat/i.test(h)) || '',
          category: detectedHeaders.find((h) => /category|kategori/i.test(h)) || '',
          location: detectedHeaders.find((h) => /location|lokasi|ruang|lab/i.test(h)) || '',
          serialNumber: detectedHeaders.find((h) => /serial|sn/i.test(h)) || '',
          yearAcquired: detectedHeaders.find((h) => /year|tahun|beli/i.test(h)) || '',
          status: detectedHeaders.find((h) => /status/i.test(h)) || '',
          condition: detectedHeaders.find((h) => /condition|kondisi/i.test(h)) || '',
          description: detectedHeaders.find((h) => /desc|keterangan|catatan/i.test(h)) || '',
        };
        setMapping(autoMapping);
        setCurrentStep('MAPPING');
      },
      error: (err) => {
        toast.error('Error parsing CSV file: ' + err.message);
      },
    });
  };

  // Convert mapped rows to standardized objects
  const getMappedRows = () => {
    return parsedData.map((row) => ({
      assetTag: row[mapping.assetTag] || '',
      brand: row[mapping.brand] || '',
      model: row[mapping.model] || '',
      deviceType: row[mapping.deviceType] || 'Network Equipment',
      category: row[mapping.category] || '',
      location: row[mapping.location] || '',
      serialNumber: row[mapping.serialNumber] || undefined,
      yearAcquired: row[mapping.yearAcquired] || undefined,
      status: row[mapping.status] || 'AVAILABLE',
      condition: row[mapping.condition] || 'GOOD',
      description: row[mapping.description] || undefined,
    }));
  };

  // Run Dry-Run Validation on Server
  const handleValidate = async () => {
    if (!mapping.assetTag || !mapping.brand || !mapping.model) {
      toast.error('Please map Asset Tag, Brand, and Model fields at minimum.');
      return;
    }

    setIsLoading(true);
    try {
      const rows = getMappedRows();
      const res = await fetch('/api/devices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, dryRun: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Validation failed');
      setPreviewResult(json.data);
      setCurrentStep('PREVIEW');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Real Import
  const handleExecuteImport = async () => {
    setIsLoading(true);
    setCurrentStep('PROCESSING');
    try {
      const rows = getMappedRows();
      const res = await fetch('/api/devices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, dryRun: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Import failed');
      setFinalResult(json.data);
      setCurrentStep('RESULT');
      toast.success(`Successfully imported ${json.data.successCount} devices!`);
    } catch (err: any) {
      toast.error(err.message);
      setCurrentStep('PREVIEW');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Asset Tag,Brand,Model,Device Type,Category,Location,Serial Number,Year Acquired,Status,Condition,Description\n' +
      'RTR-002,MikroTik,hEX S,Router,Router,Lab TKJ 1,SN-HEX-991,2023,AVAILABLE,EXCELLENT,5-port Gigabit Router with SFP\n' +
      'SW-002,Cisco,Catalyst 3560,Switch,Switch,Lab TKJ 2,SN-CISCO-3560,2022,AVAILABLE,GOOD,Layer 3 PoE Switch 24 Ports\n' +
      'AP-001,Ubiquiti,UniFi 6 Lite,Access Point,Access Point,Lab TKJ 1,SN-U6-001,2024,AVAILABLE,EXCELLENT,Wi-Fi 6 Access Point\n' +
      'FW-001,Fortinet,FortiGate 60F,Firewall,Firewall,Server Room Main,SN-FG60F-01,2023,AVAILABLE,EXCELLENT,Enterprise Next-Gen Firewall\n' +
      'SRV-001,Dell,PowerEdge R640,Server,Server,Server Room Main,SN-DELL-R640,2021,AVAILABLE,GOOD,2U Rackmount Virtualization Host\n' +
      'SW-003,TP-Link,JetStream SG3428,Switch,Switch,Lab TKJ 2,SN-TPLINK-3428,2024,AVAILABLE,EXCELLENT,24-Port Gigabit L2+ Managed Switch\n' +
      'AP-002,Ruijie,Reyee RG-RAP2200,Access Point,Access Point,Workshop RPL,SN-RG2200-02,2023,AVAILABLE,GOOD,Dual Band Ceiling Mount AP\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'slims_device_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadErrorReport = () => {
    if (!previewResult?.errors?.length) return;
    const headers = ['Row,Asset Tag,Error Reason'];
    const rows = previewResult.errors.map(
      (e) => `${e.row},"${e.data.assetTag || ''}","${e.reason}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `import_errors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stepsHeader = [
    { id: 'UPLOAD', label: '1. Upload CSV' },
    { id: 'MAPPING', label: '2. Column Mapping' },
    { id: 'PREVIEW', label: '3. Preview & Validate' },
    { id: 'RESULT', label: '4. Summary' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Inventory / Bulk Operations
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Import Devices (CSV / Excel)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Batch-provision equipment into labs and server rooms with auto-validation.
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          ← Back to Inventory
        </Link>
      </div>

      {/* Stepper Progress Bar (DESIGN.md §34) */}
      <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {stepsHeader.map((s) => {
          const isCurrent = currentStep === s.id;
          return (
            <div
              key={s.id}
              className={`text-center py-2 rounded-lg text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD */}
      {currentStep === 'UPLOAD' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs text-center">
          <div className="max-w-md mx-auto border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 transition-colors">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Select or Drop Devices CSV File
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload equipment dataset containing Asset Tags, Brands, Models, and Locations.
            </p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Browse CSV File</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between max-w-md mx-auto text-xs text-slate-500">
            <span>Download pre-formatted sample:</span>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Devices CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {currentStep === 'MAPPING' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Map CSV Columns to Equipment Attributes
              </h3>
              <p className="text-xs text-slate-500">
                Found {parsedData.length} row(s) in{' '}
                <span className="font-semibold text-slate-700">{file?.name}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep('UPLOAD')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Change file
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              { key: 'assetTag', label: 'Asset Tag *' },
              { key: 'brand', label: 'Brand / Maker *' },
              { key: 'model', label: 'Model *' },
              { key: 'deviceType', label: 'Device Type' },
              { key: 'category', label: 'Category Name or ID' },
              { key: 'location', label: 'Location Name or ID' },
              { key: 'serialNumber', label: 'Serial Number' },
              { key: 'yearAcquired', label: 'Year Acquired' },
              { key: 'status', label: 'Status' },
              { key: 'condition', label: 'Condition' },
              { key: 'description', label: 'Description / Notes' },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="font-semibold text-slate-700">{field.label}</label>
                <select
                  value={(mapping as any)[field.key]}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Do not map --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      CSV Column: {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep('UPLOAD')}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Validate & Preview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATE (DESIGN.md §35) */}
      {currentStep === 'PREVIEW' && previewResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Validation & Integrity Preview</h3>
            <p className="text-xs text-slate-500">
              Verify detected equipment and check for duplicate asset tags.
            </p>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ready to Import</span>
              </div>
              <div className="text-xl font-bold mt-1">{previewResult.validCount}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Duplicate Tags</span>
              </div>
              <div className="text-xl font-bold mt-1">{previewResult.duplicateCount}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Errors</span>
              </div>
              <div className="text-xl font-bold mt-1">{previewResult.errorCount}</div>
            </div>
          </div>

          {/* Validation Errors Table with Download Button */}
          {previewResult.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-red-700">
                  Errors / Duplicates ({previewResult.errors.length}):
                </div>
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:text-red-900 font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Error Report</span>
                </button>
              </div>
              <div className="border border-red-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs bg-red-50/40">
                <table className="w-full text-left">
                  <thead className="bg-red-100/70 border-b border-red-200 text-red-900">
                    <tr>
                      <th className="px-3 py-2 w-16">Row</th>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {previewResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono font-semibold">{err.row}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">
                          {err.data.assetTag || JSON.stringify(err.data)}
                        </td>
                        <td className="px-3 py-2 text-red-700 font-medium">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Preview Sample (First {previewResult.preview.length} valid items):
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Asset Tag</th>
                    <th className="px-3 py-2">Equipment</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.preview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono font-bold">{row.assetTag}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.brand} {row.model}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.categoryName || 'Default'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.locationName || 'Default'}</td>
                      <td className="px-3 py-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep('MAPPING')}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
            >
              Back to Mapping
            </button>
            <button
              type="button"
              disabled={previewResult.validCount === 0 || isLoading}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-60"
            >
              <span>Import {previewResult.validCount} Valid Devices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PROCESSING */}
      {currentStep === 'PROCESSING' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">Provisioning Equipment</h3>
          <p className="text-xs text-slate-500">
            Generating immutable QR identifiers and registering hardware...
          </p>
        </div>
      )}

      {/* STEP 5: RESULT */}
      {currentStep === 'RESULT' && finalResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">Import Complete</h3>
            <p className="text-xs text-slate-500 mt-1">
              Successfully provisioned {finalResult.successCount} of {finalResult.totalProcessed} device(s).
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setPreviewResult(null);
                setFinalResult(null);
                setCurrentStep('UPLOAD');
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs"
            >
              Import More
            </button>
            <button
              type="button"
              onClick={() => router.push('/inventory')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              View Inventory Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
