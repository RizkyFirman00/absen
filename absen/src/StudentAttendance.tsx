import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface Student {
  id: string;
  name: string;
  className: string;
  present: boolean;
  absenceReason?: string;
}

const StudentAttendance: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem("students");
    return saved ? JSON.parse(saved) : [];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load data murid dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem("students");
    if (saved) {
      setStudents(JSON.parse(saved));
    }
  }, []);

  // Update localStorage setiap ada perubahan data murid
  useEffect(() => {
    localStorage.setItem("students", JSON.stringify(students));
  }, [students]);

  // Start camera dan scanning
  const startScanner = async () => {
    try {
      setIsScanning(true);
      setCameraError("");

      // Minta izin akses kamera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Mulai proses scanning
      scanQRCode();
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError(
        "Tidak dapat mengakses kamera. Pastikan izin kamera diberikan."
      );
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setCurrentStudent(null);
  };

  // Process QR code scanning (Mock implementation)
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    // Mock QR scanning - untuk demo, kita akan simulasi scan otomatis
    const mockScanInterval = setInterval(() => {
      const availableStudents = students.filter((s) => !s.present);
      if (availableStudents.length > 0 && isScanning) {
        const randomStudent =
          availableStudents[
            Math.floor(Math.random() * availableStudents.length)
          ];
        handleQRScan(randomStudent.id);
        clearInterval(mockScanInterval);
      }
    }, 3000);

    // Cleanup interval jika scanning dihentikan
    setTimeout(() => {
      clearInterval(mockScanInterval);
    }, 10000);
  };

  // Handle hasil scan QR code
  const handleQRScan = (qrData: string) => {
    const student = students.find((s) => s.id === qrData);

    if (student && !student.present) {
      setCurrentStudent(student);

      const updatedStudents = students.map((s) =>
        s.id === qrData ? { ...s, present: true } : s
      );
      setStudents(updatedStudents);

      setTimeout(() => {
        stopScanner();
      }, 2000);
    }
  };

  // // Simulasi scan manual untuk demo
  // const simulateScan = (studentId: string) => {
  //   const student = students.find((s) => s.id === studentId);
  //   if (student && !student.present) {
  //     handleQRScan(studentId);
  //   }
  // };

  // Hitung statistik
  const presentCount = students.filter((s) => s.present).length;
  const absentCount = students.length - presentCount;
  const attendancePercentage = Math.round(
    (presentCount / students.length) * 100
  );

  // Cleanup saat komponen unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <>
      {/* Bootstrap CSS */}
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        rel="stylesheet"
      />

      <div className="min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
        {/* Header */}
        <div className="bg-primary text-white py-4 shadow-sm">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h1 className="display-6 mb-0">
                  <i className="fas fa-graduation-cap me-3"></i>
                  Sistem Absensi Kelas 6 SD
                </h1>
                <p className="mb-0 opacity-75">
                  Kelola kehadiran siswa dengan mudah
                </p>
              </div>
              <div className="col-md-4 text-md-end mt-3 mt-md-0">
                <div className="d-flex justify-content-md-end align-items-center">
                  <div className="text-center me-3">
                    <div className="h4 mb-0">
                      {presentCount}/{students.length}
                    </div>
                    <small>Siswa Hadir</small>
                  </div>
                  <div
                    className="progress"
                    style={{ width: "100px", height: "10px" }}
                  >
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-4">
          {/* Scanner Section */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white justify-content-between">
              <div className="d-flex align-items-center">
                <i className="fas fa-camera text-primary me-3"></i>
                <div>
                  <h5 className="card-title mb-1">Scan QR Code Murid</h5>
                  <small className="text-muted">
                    Gunakan kamera untuk memindai QR code yang dikalungkan murid
                  </small>
                </div>
                <div className="ms-auto">
                  <Link to="/TambahMurid" className="btn btn-dark">
                    <i className="fas fa-user me-2"></i>
                    Dashboard Murid
                  </Link>
                </div>
              </div>
            </div>

            <div className="card-body">
              {!isScanning ? (
                <div className="text-center py-5">
                  <i className="fas fa-qrcode display-1 text-muted mb-3"></i>
                  <div>
                    <button
                      onClick={startScanner}
                      className="btn btn-primary btn-lg mb-3"
                      disabled={students.length === 0}
                    >
                      <i className="fas fa-camera me-2"></i>
                      Mulai Scan QR Code
                    </button>
                  </div>
                  {students.length === 0 ? (
                    <p className="text-danger">
                      Belum ada data murid. Silakan tambahkan murid dulu.
                    </p>
                  ) : (
                    <p className="text-muted">
                      Klik tombol di atas untuk mengaktifkan kamera dan memindai
                      QR code
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="position-relative d-inline-block">
                    <video
                      ref={videoRef}
                      className="rounded border border-primary"
                      style={{
                        width: "100%",
                        maxWidth: "500px",
                        height: "300px",
                        objectFit: "cover",
                      }}
                      muted
                      playsInline
                    />
                    <canvas ref={canvasRef} className="d-none" />

                    {/* Overlay targeting area */}
                    <div
                      className="position-absolute border border-primary rounded"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "200px",
                        height: "200px",
                        borderStyle: "dashed",
                        borderWidth: "3px",
                      }}
                    ></div>
                  </div>

                  <div className="mt-3">
                    <button onClick={stopScanner} className="btn btn-danger">
                      <i className="fas fa-stop me-2"></i>
                      Stop Scanning
                    </button>
                    <p className="text-muted mt-2 mb-0">
                      <i className="fas fa-info-circle me-1"></i>
                      Arahkan kamera ke QR code murid
                    </p>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="alert alert-danger mt-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {cameraError}
                </div>
              )}

              {currentStudent && (
                <div className="alert alert-success mt-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-check-circle text-success me-3 fs-4"></i>
                    <div>
                      <h6 className="alert-heading mb-1">Berhasil diScan!</h6>
                      <p className="mb-0">
                        <strong>{currentStudent.name}</strong> -{" "}
                        {currentStudent.className} telah hadir.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dashboard Kehadiran */}
          <div className="row">
            {/* Statistics Cards */}
            <div className="col-12 mb-4">
              <div className="row">
                <div className="col-md-3 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <div className="rounded-circle bg-success p-3 me-3">
                          <i className="fas fa-user-check text-white"></i>
                        </div>
                        <div>
                          <h3 className="text-success mb-0">{presentCount}</h3>
                          <small className="text-muted">Hadir</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <div className="rounded-circle bg-danger p-3 me-3">
                          <i className="fas fa-user-times text-white"></i>
                        </div>
                        <div>
                          <h3 className="text-danger mb-0">{absentCount}</h3>
                          <small className="text-muted">Tidak Hadir</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <div className="rounded-circle bg-info p-3 me-3">
                          <i className="fas fa-users text-white"></i>
                        </div>
                        <div>
                          <h3 className="text-info mb-0">{students.length}</h3>
                          <small className="text-muted">Total Siswa</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body text-center">
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <div className="rounded-circle bg-warning p-3 me-3">
                          <i className="fas fa-chart-pie text-white"></i>
                        </div>
                        <div>
                          <h3 className="text-warning mb-0">
                            {attendancePercentage}%
                          </h3>
                          <small className="text-muted">Kehadiran</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar Hadir */}
            <div className="col-lg-6 mb-4">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-success text-white">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-check me-2"></i>
                    Murid yang Hadir ({presentCount})
                  </h5>
                </div>
                <div className="card-body">
                  {presentCount > 0 ? (
                    <div className="list-group list-group-flush">
                      {students
                        .filter((s) => s.present)
                        .map((student) => (
                          <div
                            key={student.id}
                            className="list-group-item border-0 px-0"
                          >
                            <div className="d-flex align-items-center">
                              <div
                                className="rounded-circle bg-success me-3"
                                style={{ width: "12px", height: "12px" }}
                              ></div>
                              <div className="flex-grow-1">
                                <h6 className="mb-0">{student.name}</h6>
                                <small className="text-muted">
                                  {student.className} - {student.id}
                                </small>
                              </div>
                              <span className="badge bg-success">
                                <i className="fas fa-check me-1"></i>
                                Hadir
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="fas fa-user-clock display-4 text-muted mb-3"></i>
                      <p className="text-muted">Belum ada murid yang hadir</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daftar Tidak Hadir */}
            <div className="col-lg-6 mb-4">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-warning text-dark">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-clock me-2"></i>
                    Murid yang Tidak Hadir ({absentCount})
                  </h5>
                </div>
                <div className="card-body">
                  {absentCount > 0 ? (
                    <div className="space-y-3">
                      {students
                        .filter((s) => !s.present)
                        .map((student) => (
                          <div
                            key={student.id}
                            className="border rounded p-3 mb-3"
                          >
                            <div className="d-flex align-items-center mb-3">
                              <div
                                className="rounded-circle bg-warning me-3"
                                style={{ width: "12px", height: "12px" }}
                              ></div>
                              <div className="flex-grow-1">
                                <h6 className="mb-0">{student.name}</h6>
                                <small className="text-muted">
                                  {student.className} - {student.id}
                                </small>
                              </div>
                              <span className="badge bg-warning text-dark">
                                <i className="fas fa-clock me-1"></i>
                                Belum Hadir
                              </span>
                            </div>

                            <div>
                              <label className="form-label small">
                                <i className="fas fa-edit me-1"></i>
                                Alasan tidak hadir:
                              </label>
                              <div className="input-group input-group-sm">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Masukkan alasan (sakit, izin, dll)"
                                  value={student.absenceReason || ""}
                                  onChange={(e) => {
                                    const updatedStudents = students.map((s) =>
                                      s.id === student.id
                                        ? {
                                            ...s,
                                            absenceReason: e.target.value,
                                          }
                                        : s
                                    );
                                    setStudents(updatedStudents);
                                  }}
                                />
                                <button
                                  className="btn btn-outline-secondary"
                                  type="button"
                                >
                                  <i className="fas fa-save"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="fas fa-user-check display-4 text-success mb-3"></i>
                      <p className="text-muted">Semua murid hadir! 🎉</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Footer */}
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-4 mb-3 mb-md-0">
                  <div className="h-100 d-flex flex-column justify-content-center">
                    <i className="fas fa-calendar-check text-primary display-6 mb-2"></i>
                    <h5 className="text-primary mb-1">Ringkasan Hari Ini</h5>
                    <p className="text-muted small mb-0">
                      {new Date().toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="col-md-4 mb-3 mb-md-0">
                  <div className="card border-success h-100">
                    <div className="card-body d-flex flex-column justify-content-center">
                      <div className="display-4 text-success fw-bold">
                        {presentCount}
                      </div>
                      <div className="text-muted">
                        <i className="fas fa-user-check me-1"></i>
                        Siswa Hadir
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card border-warning h-100">
                    <div className="card-body d-flex flex-column justify-content-center">
                      <div className="display-4 text-warning fw-bold">
                        {absentCount}
                      </div>
                      <div className="text-muted">
                        <i className="fas fa-user-times me-1"></i>
                        Belum Hadir
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap JS */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js"></script>
    </>
  );
};

export default StudentAttendance;
