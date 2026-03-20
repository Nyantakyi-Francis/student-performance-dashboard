import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { formatSubjectLabel } from '../data/config'

function DataManager({
  students,
  setStudents,
  editingStudent,
  setEditingStudent,
  subjects,
  setSubjects,
  grades,
  setGrades,
}) {
  const buildEmptyScores = () =>
    subjects.reduce((acc, subject) => {
      acc[subject] = ''
      return acc
    }, {})

  const emptyForm = {
    name: '',
    gender: 'Female',
    grade: 'Grade 7',
    scores: buildEmptyScores(),
  }

  const [formData, setFormData] = useState(emptyForm)
  const [uploadMode, setUploadMode] = useState('replace')
  const [newSubject, setNewSubject] = useState('')
  const [newGrade, setNewGrade] = useState('')

  useEffect(() => {
    if (editingStudent) {
      const mergedScores = subjects.reduce((acc, subject) => {
        acc[subject] = editingStudent.scores[subject] ?? ''
        return acc
      }, {})

      setFormData({
        name: editingStudent.name,
        gender: editingStudent.gender,
        grade: editingStudent.grade,
        scores: mergedScores,
      })
    } else {
      setFormData({
        name: '',
        gender: 'Female',
        grade: grades[0] || 'Grade 7',
        scores: buildEmptyScores(),
      })
    }
  }, [editingStudent, subjects, grades])

  const normalizeKey = (value) => {
    const clean = value.trim()
    if (!clean) return ''
    return clean
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('')
  }

  const normalizeStudent = (row, index = 0) => {
    const scoreObject = {}

    subjects.forEach((subject) => {
      scoreObject[subject] = Number(
        row[subject] ??
          row[formatSubjectLabel(subject)] ??
          row[subject.toLowerCase()] ??
          0
      )
    })

    return {
      id: Date.now() + index,
      name: String(row.name || row.Name || '').trim(),
      gender: String(row.gender || row.Gender || '').trim(),
      grade: String(row.grade || row.Grade || '').trim(),
      scores: scoreObject,
    }
  }

  const isValidStudent = (student) => {
    const scoreValues = Object.values(student.scores)

    return (
      student.name &&
      student.gender &&
      student.grade &&
      scoreValues.every((score) => !Number.isNaN(score))
    )
  }

  const applyUploadData = (parsedStudents) => {
    if (parsedStudents.length === 0) {
      alert('No valid student records were found.')
      return
    }

    const uploadedGrades = parsedStudents.map((student) => student.grade)
    setGrades((prev) => [...new Set([...prev, ...uploadedGrades])])

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

  const handleBasicChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleScoreChange = (subject, value) => {
    setFormData((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [subject]: value,
      },
    }))
  }

  const handleManualSubmit = (event) => {
    event.preventDefault()

    const scoreObject = {}
    subjects.forEach((subject) => {
      scoreObject[subject] = Number(formData.scores[subject])
    })

    const scoreValues = Object.values(scoreObject)

    const hasInvalidScore = scoreValues.some(
      (score) => Number.isNaN(score) || score < 0 || score > 100
    )

    const studentRecord = {
      id: editingStudent ? editingStudent.id : Date.now(),
      name: formData.name.trim(),
      gender: formData.gender,
      grade: formData.grade,
      scores: scoreObject,
    }

    if (!studentRecord.name || !studentRecord.grade || hasInvalidScore) {
      alert('Please enter a valid name, grade, and scores between 0 and 100.')
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

    setGrades((prev) => [...new Set([...prev, studentRecord.grade])])

    setFormData({
      name: '',
      gender: 'Female',
      grade: grades[0] || 'Grade 7',
      scores: buildEmptyScores(),
    })
  }

  const handleCancelEdit = () => {
    setEditingStudent(null)
  }

  const handleAddSubject = () => {
    const subjectKey = normalizeKey(newSubject)
    if (!subjectKey) return
    if (subjects.includes(subjectKey)) return

    setSubjects((prev) => [...prev, subjectKey])

    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        scores: {
          ...student.scores,
          [subjectKey]: 0,
        },
      }))
    )

    setNewSubject('')
  }

  const handleAddGrade = () => {
    const gradeValue = newGrade.trim()
    if (!gradeValue) return
    if (grades.includes(gradeValue)) return

    setGrades((prev) => [...prev, gradeValue])
    setNewGrade('')
  }

  const resetToSampleData = async () => {
    const studentsModule = await import('../data/students')
    const configModule = await import('../data/config')
    setStudents(studentsModule.default)
    setSubjects(configModule.defaultSubjects)
    setGrades(configModule.defaultGrades)
    setEditingStudent(null)
  }

  const exportToCsv = () => {
    if (students.length === 0) {
      alert('There is no data to export.')
      return
    }

    const exportData = students.map((student) => {
      const row = {
        name: student.name,
        gender: student.gender,
        grade: student.grade,
      }

      subjects.forEach((subject) => {
        row[formatSubjectLabel(subject)] = student.scores[subject] ?? 0
      })

      return row
    })

    const csv = Papa.unparse(exportData)
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

    const exportData = students.map((student) => {
      const row = {
        name: student.name,
        gender: student.gender,
        grade: student.grade,
      }

      subjects.forEach((subject) => {
        row[formatSubjectLabel(subject)] = student.scores[subject] ?? 0
      })

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'student-performance-data.xlsx')
  }

  return (
    <section className="data-manager">
      <div className="data-manager-card">
        <h2>Manage Student Data</h2>
        <p>
          Upload student records, add new students, edit entries, and expand the
          system with more subjects and grades.
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

        <div className="manual-form" style={{ marginBottom: '1rem' }}>
          <h3>Add More Subjects and Grades</h3>

          <div className="manual-actions">
            <input
              type="text"
              placeholder="Add subject e.g. ICT"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <button type="button" onClick={handleAddSubject}>
              Add Subject
            </button>
          </div>

          <div className="manual-actions">
            <input
              type="text"
              placeholder="Add grade e.g. Grade 10"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
            />
            <button type="button" onClick={handleAddGrade}>
              Add Grade
            </button>
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
              onChange={handleBasicChange}
            />

            <select
              name="gender"
              value={formData.gender}
              onChange={handleBasicChange}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>

            <select
              name="grade"
              value={formData.grade}
              onChange={handleBasicChange}
            >
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            {subjects.map((subject) => (
              <input
                key={subject}
                type="number"
                placeholder={formatSubjectLabel(subject)}
                value={formData.scores[subject] ?? ''}
                onChange={(e) => handleScoreChange(subject, e.target.value)}
              />
            ))}
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