import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StudentAttendance from "./StudentAttendance";
import AddStudent from "./AddStudent";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentAttendance />} />
        <Route path="/TambahMurid" element={<AddStudent />} />
      </Routes>
    </Router>
  );
}

export default App;
