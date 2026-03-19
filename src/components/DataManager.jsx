import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function DataManager({
  students,
  setStudents,
  editingStudent,
  setEditingStudent,
}) {
  const emptyForm = {
    name: '',
    gender: 'Female',
    class: 'Form 1',
    mathematics: '',
    english: '',
    science: '',
    socialStudies: '',
  }

  const [formData, setFormData] = useState(emptyForm)
  const [uploadMode, setUploadMode] = useState('replace')

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        name: editingStudent.name,
        gender: editingStudent.gender,
        class: editingStudent.class,
        mathematics: editingStudent.mathematics,
        english: editingStudent.english,
        science: editingStudent.science,
        socialStudies: editingStudent.socialStudies,
      })
    } else {
      setFormData(emptyForm)
    }
  }, [editingStudent])

  const normalizeStudent = (row, index = 0) => {
    return {
      id: Date.now() + index,
      name: String(row.name || row.Name || '').trim(),
      gender: String(row.gender || row.Gender || '').trim(),
      class: String(row.class || row.Class || '').trim(),
      mathematics: Number(row.mathematics || row.Mathematics || 0),
      english: Number(row.english || row.English || 0),
      science: Number(row.science || row.Science || 0),
      socialStudies: Number(
        row.socialStudies ||
          row['Social Studies'] ||
          row.social_studies ||
          row.SocialStudies ||
          0
      ),
    }
  }

  const isValidStudent = (student) => {
    return (
      student.name &&
      student.gender &&
      student.class &&
      !Number.isNaN(student.mathematics) &&
      !Number.isNaN(student.english) &&
      !Number.isNaN(student.science) &&
      !Number.isNaN(student.socialStudies)
    )
  }

  const applyUploadData = (parsedStudents) => {
    if (parsedStudents.length === 0) {
      alert('No valid student records were found.')
      return
    }

    if (uploadMode === 'append') {
      setStudents((prev) => [...prev, ...parsedStudents])
    } else {
      setStudents(parsedStudents)
    }
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents = results.data
          .map((row, index) => normalizeStudent(row, index))
          .filter(isValidStudent)

        applyUploadData(parsedStudents)
      },
      error: () => {
        alert('Failed to parse CSV file.')
      },
    })

    event.target.value = ''
  }

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const parsedStudents = jsonData
        .map((row, index) => normalizeStudent(row, index))
        .filter(isValidStudent)

      applyUploadData(parsedStudents)
    } catch (error) {
      alert('Failed to parse Excel file.')
    }

    event.target.value = ''
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleManualSubmit = (event) => {
    event.preventDefault()

    const studentRecord = {
      id: editingStudent ? editingStudent.id : Date.now(),
      name: formData.name.trim(),
      gender: formData.gender,
      class: formData.class,
      mathematics: Number(formData.mathematics),
      english: Number(formData.english),
      science: Number(formData.science),
      socialStudies: Number(formData.socialStudies),
    }

    const scores = [
      studentRecord.mathematics,
      studentRecord.english,
      studentRecord.science,
      studentRecord.socialStudies,
    ]

    const hasInvalidScore = scores.some(
      (score) => Number.isNaN(score) || score < 0 || score > 100
    )

    if (!studentRecord.name || hasInvalidScore) {
      alert('Please enter a valid name and scores between 0 and 100.')
      return
    }

    if (editingStudent) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === editingStudent.id ? studentRecord : student
        )
      )
      setEditingStudent(null)
    } else {
      setStudents((prev) => [...prev, studentRecord])
    }

    setFormData(emptyForm)
  }

  const handleCancelEdit = () => {
    setEditingStudent(null)
    setFormData(emptyForm)
  }

  const resetToSampleData = async () => {
    const module = await import('../data/students')
    setStudents(module.default)
    setEditingStudent(null)
    setFormData(emptyForm)
  }

  const exportToCsv = () => {
    if (students.length === 0) {
      alert('There is no data to export.')
      return
    }

    const csv = Papa.unparse(students)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', 'student-performance-data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = () => {
    if (students.length === 0) {
      alert('There is no data to export.')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(students)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'student-performance-data.xlsx')
  }

  return (
    <section className="data-manager">
      <div className="data-manager-card">
        <h2>Manage Student Data</h2>
        <p>
          Upload student records, add new students, edit existing entries, and
          export your dataset.
        </p>

        <div className="upload-mode-box">
          <label htmlFor="uploadMode">Upload Mode</label>
          <select
            id="uploadMode"
            value={uploadMode}
            onChange={(e) => setUploadMode(e.target.value)}
          >
            <option value="replace">Replace current dataset</option>
            <option value="append">Append to current dataset</option>
          </select>
        </div>

        <div className="upload-grid">
          <div className="upload-box">
            <label htmlFor="csvUpload">Upload CSV</label>
            <input
              id="csvUpload"
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
            />
          </div>

          <div className="upload-box">
            <label htmlFor="excelUpload">Upload Excel</label>
            <input
              id="excelUpload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
            />
          </div>
        </div>

        <form className="manual-form" onSubmit={handleManualSubmit}>
          <h3>{editingStudent ? 'Edit Student Record' : 'Manual Student Entry'}</h3>

          <div className="manual-grid">
            <input
              type="text"
              name="name"
              placeholder="Student name"
              value={formData.name}
              onChange={handleChange}
            />

            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>

            <select name="class" value={formData.class} onChange={handleChange}>
              <option value="Form 1">Form 1</option>
              <option value="Form 2">Form 2</option>
              <option value="Form 3">Form 3</option>
            </select>

            <input
              type="number"
              name="mathematics"
              placeholder="Mathematics"
              value={formData.mathematics}
              onChange={handleChange}
            />

            <input
              type="number"
              name="english"
              placeholder="English"
              value={formData.english}
              onChange={handleChange}
            />

            <input
              type="number"
              name="science"
              placeholder="Science"
              value={formData.science}
              onChange={handleChange}
            />

            <input
              type="number"
              name="socialStudies"
              placeholder="Social Studies"
              value={formData.socialStudies}
              onChange={handleChange}
            />
          </div>

          <div className="manual-actions">
            <button type="submit">
              {editingStudent ? 'Update Student' : 'Add Student'}
            </button>

            {editingStudent && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={resetToSampleData}
            >
              Reset Sample Data
            </button>
          </div>
        </form>

        <div className="export-actions">
          <button type="button" onClick={exportToCsv}>
            Export CSV
          </button>
          <button type="button" onClick={exportToExcel}>
            Export Excel
          </button>
        </div>

        <div className="data-summary">
          <strong>Current dataset size:</strong> {students.length} students
        </div>
      </div>
    </section>
  )
}

export default DataManager