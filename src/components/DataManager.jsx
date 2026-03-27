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
  const normalizeKey = (value) => {
    const clean = String(value || '').trim()
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

  const reservedFields = ['id', 'name', 'gender', 'grade']

  const detectSubjectsFromRows = (rows) => {
    const detectedSubjects = new Set(subjects)

    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const normalized = normalizeKey(key)
        if (!normalized || reservedFields.includes(normalized)) return
        detectedSubjects.add(normalized)
      })
    })

    return Array.from(detectedSubjects)
  }

  const getRowValueByNormalizedKey = (row, targetKey) => {
    const directMatch = row[targetKey]
    if (directMatch !== undefined) return directMatch

    const entry = Object.entries(row).find(([key]) => normalizeKey(key) === targetKey)
    return entry ? entry[1] : undefined
  }

  const normalizeStudent = (row, allSubjects, index = 0) => {
    const scoreObject = {}

    allSubjects.forEach((subject) => {
      const rawValue = getRowValueByNormalizedKey(row, subject)
      scoreObject[subject] = Number(rawValue ?? 0)
    })

    return {
      id: Date.now() + index,
      name: String(
        getRowValueByNormalizedKey(row, 'name') ?? ''
      ).trim(),
      gender: String(
        getRowValueByNormalizedKey(row, 'gender') ?? ''
      ).trim(),
      grade: String(
        getRowValueByNormalizedKey(row, 'grade') ?? ''
      ).trim(),
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

  const applyUploadData = (parsedStudents, detectedSubjects) => {
    if (parsedStudents.length === 0) {
      alert('No valid student records were found.')
      return
    }

    setSubjects(detectedSubjects)

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
        const detectedSubjects = detectSubjectsFromRows(results.data)

        const parsedStudents = results.data
          .map((row, index) => normalizeStudent(row, detectedSubjects, index))
          .filter(isValidStudent)

        applyUploadData(parsedStudents, detectedSubjects)
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

      const detectedSubjects = detectSubjectsFromRows(jsonData)

      const parsedStudents = jsonData
        .map((row, index) => normalizeStudent(row, detectedSubjects, index))
        .filter(isValidStudent)

      applyUploadData(parsedStudents, detectedSubjects)
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
    <section className="card manager-card">
      <div className="section-heading">
        <h2>Manage Student Data</h2>
        <p>
          Upload student records, add new students, edit entries, and expand the system
          with more subjects and grades.
        </p>
      </div>

      <div className="manager-actions">
        <label className="upload-mode">
          <span>Upload Mode</span>
          <select
            value={uploadMode}
            onChange={(e) => setUploadMode(e.target.value)}
          >
            <option value="replace">Replace current dataset</option>
            <option value="append">Append to current dataset</option>
          </select>
        </label>

        <div className="upload-buttons">
          <label className="action-button secondary">
            Upload CSV
            <input type="file" accept=".csv" onChange={handleCsvUpload} hidden />
          </label>

          <label className="action-button secondary">
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              hidden
            />
          </label>
        </div>
      </div>

      <div className="manager-grid">
        <div className="manager-side">
          <h3>Add More Subjects and Grades</h3>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Creative Arts"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddSubject}>
              Add Subject
            </button>
          </div>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Grade 10"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddGrade}>
              Add Grade
            </button>
          </div>
        </div>

        <div className="manager-main">
          <h3>{editingStudent ? 'Edit Student Record' : 'Manual Student Entry'}</h3>

          <form className="student-form" onSubmit={handleManualSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Student name"
              value={formData.name}
              onChange={handleBasicChange}
              required
            />

            <select name="gender" value={formData.gender} onChange={handleBasicChange}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>

            <select name="grade" value={formData.grade} onChange={handleBasicChange}>
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
                min="0"
                max="100"
                placeholder={formatSubjectLabel(subject)}
                value={formData.scores[subject] ?? ''}
                onChange={(e) => handleScoreChange(subject, e.target.value)}
                required
              />
            ))}

            <div className="form-actions">
              <button type="submit" className="action-button">
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>

              {editingStudent && (
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="button"
                className="action-button secondary"
                onClick={resetToSampleData}
              >
                Reset Sample Data
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="export-actions">
        <button type="button" className="action-button secondary" onClick={exportToCsv}>
          Export CSV
        </button>
        <button type="button" className="action-button secondary" onClick={exportToExcel}>
          Export Excel
        </button>
      </div>

      <p className="dataset-note">Current dataset size: {students.length} students</p>
    </section>
  )
}

export default DataManager