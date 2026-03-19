import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function DataManager({ students, setStudents }) {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Female',
    class: 'Form 1',
    mathematics: '',
    english: '',
    science: '',
    socialStudies: '',
  })

  const normalizeStudent = (row, index = 0) => {
    const normalized = {
      id: Date.now() + index,
      name: row.name || row.Name || '',
      gender: row.gender || row.Gender || '',
      class: row.class || row.Class || '',
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

    return normalized
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

        if (parsedStudents.length > 0) {
          setStudents(parsedStudents)
        } else {
          alert('No valid CSV data found. Please check your column names.')
        }
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

      if (parsedStudents.length > 0) {
        setStudents(parsedStudents)
      } else {
        alert('No valid Excel data found. Please check your column names.')
      }
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

    const newStudent = {
      id: Date.now(),
      name: formData.name.trim(),
      gender: formData.gender,
      class: formData.class,
      mathematics: Number(formData.mathematics),
      english: Number(formData.english),
      science: Number(formData.science),
      socialStudies: Number(formData.socialStudies),
    }

    if (
      !newStudent.name ||
      Number.isNaN(newStudent.mathematics) ||
      Number.isNaN(newStudent.english) ||
      Number.isNaN(newStudent.science) ||
      Number.isNaN(newStudent.socialStudies)
    ) {
      alert('Please complete all fields correctly.')
      return
    }

    setStudents((prev) => [...prev, newStudent])

    setFormData({
      name: '',
      gender: 'Female',
      class: 'Form 1',
      mathematics: '',
      english: '',
      science: '',
      socialStudies: '',
    })
  }

  const resetToSampleData = async () => {
    const module = await import('../data/students')
    setStudents(module.default)
  }

  return (
    <section className="data-manager">
      <div className="data-manager-card">
        <h2>Import Student Data</h2>
        <p>
          Upload a CSV file, an Excel file, or add a student manually.
        </p>

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
          <h3>Manual Student Entry</h3>

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
            <button type="submit">Add Student</button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetToSampleData}
            >
              Reset Sample Data
            </button>
          </div>
        </form>

        <div className="data-summary">
          <strong>Current dataset size:</strong> {students.length} students
        </div>
      </div>
    </section>
  )
}

export default DataManager