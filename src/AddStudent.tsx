import React, { useState, useEffect, useRef, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { saveAs as fileSaveAs } from "file-saver";
import JSZip from "jszip";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  name: string;
  className: string;
  present: boolean;
  absenceReason?: string;
}

interface QRCodeSVGProps {
  value: string;
  size: number;
  className?: string;
}

const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem("students");
    return saved ? JSON.parse(saved) : [];
  });
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [newStudent, setNewStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock QR Code component
  const QRCodeSVG = forwardRef<HTMLDivElement, QRCodeSVGProps>(
    ({ value, size, className }, ref) => (
      <div ref={ref} className={className}>
        <QRCodeCanvas value={value} size={size} includeMargin={true} />
      </div>
    )
  );

  const qrRef = useRef<HTMLDivElement | null>(null);
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load data dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem("students");
    if (saved) {
      setStudents(JSON.parse(saved));
    }
  }, []);

  // Simpan data ke localStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem("students", JSON.stringify(students));
  }, [students]);

  // Generate ID otomatis
  const generateId = (students: Student[]) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 25
    const month = (now.getMonth() + 1).toString().padStart(2, "0"); // 09
    const prefix = `S${year}${month}`;
    const filtered = students.filter((s) => s.id.startsWith(prefix));
    const lastNum = Math.max(
      0,
      ...filtered.map((s) => parseInt(s.id.slice(prefix.length), 10) || 0)
    );
    const nextNum = (lastNum + 1).toString().padStart(3, "0");

    return `${prefix}${nextNum}`;
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name || !className) return;

    if (editId) {
      // Update murid
      const updated = students.map((s) =>
        s.id === editId ? { ...s, name, className } : s
      );
      setStudents(updated);
      setEditId(null);
    } else {
      // Tambah murid baru
      const newS: Student = {
        id: generateId(students),
        name,
        className,
        present: false,
      };
      setStudents([...students, newS]);
      setNewStudent(newS);
    }

    // reset input
    setName("");
    setClassName("");
  };

  const handleDelete = (id: string) => {
    const filtered = students.filter((s) => s.id !== id);
    setStudents(filtered);
    if (selectedStudent?.id === id) setSelectedStudent(null);
    if (newStudent?.id === id) setNewStudent(null);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const filtered = students.filter((s) => !selectedIds.includes(s.id));
    setStudents(filtered);
    setSelectedIds([]);
  };

  const handleEdit = (student: Student) => {
    setName(student.name);
    setClassName(student.className);
    setEditId(student.id);
    setSelectedStudent(null);
    setNewStudent(null);
  };

  const handleView = (student: Student) => {
    setSelectedStudent(student);
    setNewStudent(null);
  };

  const handleCancel = () => {
    setEditId(null);
    setSelectedStudent(null);
    setNewStudent(null);
    setName("");
    setClassName("");
  };

  // Convert SVG div to PNG and download
  const downloadCanvasAsPNG = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob((blob) => {
      if (blob) fileSaveAs(blob, filename);
    }, "image/png");
  };

  // individual QR
  const handleDownloadQR = (student?: Student) => {
    const target = student || newStudent || selectedStudent;
    if (!target) return;

    const qrElement = qrRefs.current[target.id] || qrRef.current;
    if (!qrElement) return;

    const canvas = qrElement.querySelector("canvas") as HTMLCanvasElement;
    if (canvas) {
      downloadCanvasAsPNG(canvas, `QR_${target.id}_${target.name}.png`);
    }
  };

  const handleDownloadSelectedQR = async () => {
    if (selectedIds.length === 0) return;
    const zip = new JSZip();

    for (const id of selectedIds) {
      const s = students.find((stu) => stu.id === id);
      if (!s) continue;

      const qrElement = qrRefs.current[s.id];
      if (!qrElement) continue;

      const canvas = qrElement.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) continue;

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) zip.file(`QR_${s.id}_${s.name}.png`, blob);
          resolve();
        }, "image/png");
      });
    }

    const content = await zip.generateAsync({ type: "blob" });
    fileSaveAs(content, "Selected_QR_Codes.zip");
  };

  // all QR
  const handleDownloadAllQR = async () => {
    if (students.length === 0) return;
    const zip = new JSZip();

    for (const s of students) {
      const qrElement = qrRefs.current[s.id];
      if (!qrElement) continue;

      const canvas = qrElement.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) continue;

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) zip.file(`QR_${s.id}_${s.name}.png`, blob);
          resolve();
        }, "image/png");
      });
    }

    const content = await zip.generateAsync({ type: "blob" });
    fileSaveAs(content, "All_QR_Codes.zip");
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows: { Nama: string; Kelas: string }[] =
        XLSX.utils.sheet_to_json(sheet);

      setStudents((prev) => {
        const current = [...prev];
        const imported: Student[] = [];

        rows.forEach((row) => {
          const newStudent: Student = {
            id: generateId(current),
            name: row.Nama,
            className: row.Kelas,
            present: false,
          };
          current.push(newStudent);
          imported.push(newStudent);
        });

        // gabung semua lalu sort berdasarkan nama
        const allStudents = [...prev, ...imported].sort((a, b) =>
          a.name.localeCompare(b.name, "id", { sensitivity: "base" })
        );

        return allStudents;
      });
    };
    reader.readAsBinaryString(file);

    e.target.value = "";
  };

  // Toggle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const isAllSelected =
    filteredStudents.length > 0 &&
    selectedIds.length === filteredStudents.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredStudents.length;

  return (
    <>
      {/* Bootstrap & FontAwesome CSS */}
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        rel="stylesheet"
      />

      <div className="container py-5">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="mb-1">
              <i className="fas fa-user-graduate text-primary me-2"></i>
              Manajemen Data Murid
            </h2>
            <p className="text-muted mb-0">
              Tambah, edit, dan kelola data siswa
            </p>
          </div>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/")}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back ke Dashboard
          </button>
        </div>

        {/* Form Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="fas fa-plus-circle me-2"></i>
              {editId ? "Edit Data Murid" : "Tambah Murid Baru"}
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-lg-4 col-md-6">
                <label className="form-label fw-semibold">
                  <i className="fas fa-user me-1 text-primary"></i>
                  Nama Murid
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ahmad Saputra"
                  required
                />
              </div>
              <div className="col-lg-3 col-md-4">
                <label className="form-label fw-semibold">
                  <i className="fas fa-school me-1 text-primary"></i>
                  Kelas
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Contoh: 6A"
                  required
                />
              </div>
              <div className="col-lg-5 col-md-12 d-flex align-items-end">
                <div className="d-flex flex-wrap gap-2 w-100">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    disabled={!name || !className}
                  >
                    <i
                      className={`fas ${editId ? "fa-save" : "fa-plus"} me-2`}
                    ></i>
                    {editId ? "Update Murid" : "Tambah Murid"}
                  </button>

                  {(editId || selectedStudent) && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCancel}
                    >
                      <i className="fas fa-times me-1"></i>
                      Batal
                    </button>
                  )}

                  <div className="ms-auto">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleImportExcel}
                      className="d-none"
                      id="importFile"
                    />
                    <label
                      htmlFor="importFile"
                      className="btn btn-outline-success mb-0"
                      style={{ cursor: "pointer" }}
                    >
                      <i className="fas fa-file-excel me-2"></i>
                      Import Excel
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Student QR Section */}
        {(newStudent || selectedStudent) && (
          <div className="card shadow-sm mb-4 border-success">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="fas fa-qrcode me-2"></i>
                Detail QR Code:{" "}
                {newStudent ? newStudent.name : selectedStudent?.name}
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center g-3">
                <div className="col-md-3 text-center">
                  <div className="p-3 bg-light rounded">
                    <QRCodeSVG
                      ref={qrRef}
                      value={JSON.stringify(newStudent || selectedStudent)}
                      size={150}
                      className="border border-success rounded p-2 bg-white"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">Informasi Murid:</h6>
                  <div className="row g-2">
                    <div className="col-12">
                      <p className="mb-2">
                        <i className="fas fa-id-card text-primary me-2"></i>
                        <strong>ID:</strong>{" "}
                        {newStudent?.id || selectedStudent?.id}
                      </p>
                    </div>
                    <div className="col-12">
                      <p className="mb-2">
                        <i className="fas fa-user text-primary me-2"></i>
                        <strong>Nama:</strong>{" "}
                        {newStudent?.name || selectedStudent?.name}
                      </p>
                    </div>
                    <div className="col-12">
                      <p className="mb-0">
                        <i className="fas fa-school text-primary me-2"></i>
                        <strong>Kelas:</strong>{" "}
                        {newStudent?.className || selectedStudent?.className}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 text-center">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => handleDownloadQR()}
                  >
                    <i className="fas fa-download me-2"></i>
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students List Section */}
        <div className="card shadow-sm">
          <div className="card-header bg-white border-bottom">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
              <div>
                <h4 className="mb-1">
                  <i className="fas fa-users text-primary me-2"></i>
                  Daftar Murid
                </h4>
                <small className="text-muted">
                  Total: {students.length} siswa terdaftar
                </small>
              </div>

              <div className="d-flex flex-column flex-md-row gap-2 w-100 w-lg-auto">
                <div className="input-group" style={{ minWidth: "250px" }}>
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari nama atau kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {students.length > 0 && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={handleDownloadAllQR}
                  >
                    <i className="fas fa-download me-2"></i>
                    Download All QR
                  </button>
                )}
              </div>
            </div>

            {/* Selection Actions */}
            {selectedIds.length > 0 && (
              <div className="mt-3 d-flex flex-wrap gap-2">
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={handleDownloadSelectedQR}
                >
                  <i className="fas fa-download me-1"></i>
                  Download QR Terpilih ({selectedIds.length})
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleDeleteSelected}
                >
                  <i className="fas fa-trash me-1"></i>
                  Hapus Terpilih ({selectedIds.length})
                </button>
              </div>
            )}
          </div>

          <div className="card-body p-0">
            {students.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-user-plus display-1 text-muted mb-3"></i>
                <h5 className="text-muted">Belum ada data murid</h5>
                <p className="text-muted">
                  Tambahkan murid pertama atau import dari Excel
                </p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                {filteredStudents.length > 0 && (
                  <div className="border-bottom p-3 bg-light">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="selectAll"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeSelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="selectAll">
                        <strong>
                          {isAllSelected
                            ? "Batalkan Pilihan Semua"
                            : "Pilih Semua"}
                          {filteredStudents.length !== students.length &&
                            ` (${filteredStudents.length} ditampilkan)`}
                        </strong>
                      </label>
                    </div>
                  </div>
                )}

                {/* Student List */}
                <div className="list-group list-group-flush">
                  {filteredStudents.map((s) => (
                    <div key={s.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center flex-grow-1">
                          <div className="form-check me-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, s.id]);
                                } else {
                                  setSelectedIds(
                                    selectedIds.filter((id) => id !== s.id)
                                  );
                                }
                              }}
                            />
                          </div>

                          <div className="me-3">
                            <span className="badge bg-primary">{s.id}</span>
                          </div>

                          <div className="flex-grow-1">
                            <h6 className="mb-1">{s.name}</h6>
                            <small className="text-muted">
                              Kelas: {s.className}
                            </small>
                          </div>

                          <div className="me-3">
                            <div className="p-2 bg-light rounded">
                              <QRCodeSVG
                                ref={(el) => {
                                  qrRefs.current[s.id] = el;
                                }}
                                value={JSON.stringify(s)}
                                size={40}
                                className="border rounded bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap gap-1">
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleView(s)}
                            title="Lihat Detail"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleEdit(s)}
                            title="Edit Data"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleDownloadQR(s)}
                            title="Download QR Code"
                          >
                            <i className="fas fa-download"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(s.id)}
                            title="Hapus Data"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* No results message */}
                {filteredStudents.length === 0 && searchQuery && (
                  <div className="text-center py-4">
                    <i className="fas fa-search display-4 text-muted mb-3"></i>
                    <h5 className="text-muted">Tidak ditemukan</h5>
                    <p className="text-muted">
                      Tidak ada siswa yang cocok dengan pencarian "{searchQuery}
                      "
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddStudent;
