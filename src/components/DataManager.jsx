import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import sampleStudents from '../data/students'
import {
  defaultGrades,
  defaultSubjects,
  defaultTerms,
  formatSubjectLabel,
} from '../data/config'
import {
  buildStudentExportRows,
  buildTemplateRows,
  createEmptyScores,
  detectSubjectsFromRows,
  downloadBlobFile,
  isValidStudentRecord,
  normalizeKey,
  normalizeStudentRecord,
} from '../utils/studentData'

function DataManager({
  students,
  setStudents,
  editingStudent,
  setEditingStudent,
  subjects,
  setSubjects,
  grades,
  setGrades,
  terms,
  setTerms,
}) {
  const getDefaultFormState = () => ({
    name: '',
    gender: 'Female',
    grade: grades[0] || 'Grade 7',
    term: terms[0] || 'Term 1',
    scores: createEmptyScores(subjects),
  })

  const [formData, setFormData] = useState(getDefaultFormState)
  const [uploadMode, setUploadMode] = useState('replace')
  const [newSubject, setNewSubject] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newTerm, setNewTerm] = useState('')

  useEffect(() => {
    if (editingStudent) {
      const mergedScores = subjects.reduce((accumulator, subject) => {
        accumulator[subject] = editingStudent.scores[subject] ?? ''
        return accumulator
      }, {})

      setFormData({
        name: editingStudent.name,
        gender: editingStudent.gender,
        grade: editingStudent.grade,
        term: editingStudent.term || (terms[0] || 'Term 1'),
        scores: mergedScores,
      })
      return
    }

    setFormData((previous) => ({
      name: previous.name,
      gender: previous.gender || 'Female',
      grade: grades.includes(previous.grade) ? previous.grade : grades[0] || 'Grade 7',
      term: terms.includes(previous.term) ? previous.term : terms[0] || 'Term 1',
      scores: subjects.reduce((accumulator, subject) => {
        accumulator[subject] = previous.scores?.[subject] ?? ''
        return accumulator
      }, {}),
    }))
  }, [editingStudent, grades, subjects, terms])

  const applyUploadData = (parsedStudents, detectedSubjects) => {
    if (parsedStudents.length === 0) {
      alert('No valid student records were found.')
      return
    }

    setSubjects(detectedSubjects)

    const uploadedGrades = parsedStudents.map((student) => student.grade)
    setGrades((previous) => [...new Set([...previous, ...uploadedGrades])])

    const uploadedTerms = parsedStudents.map((student) => student.term)
    setTerms((previous) => [...new Set([...previous, ...uploadedTerms])])

    if (uploadMode === 'append') {
      setStudents((previous) => [...previous, ...parsedStudents])
      return
    }

    setStudents(parsedStudents)
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const detectedSubjects = detectSubjectsFromRows(results.data, subjects)
        const parsedStudents = results.data
          .map((row, index) =>
            normalizeStudentRecord(row, detectedSubjects, terms, index)
          )
          .filter(isValidStudentRecord)

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
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      const detectedSubjects = detectSubjectsFromRows(jsonData, subjects)
      const parsedStudents = jsonData
        .map((row, index) =>
          normalizeStudentRecord(row, detectedSubjects, terms, index)
        )
        .filter(isValidStudentRecord)

      applyUploadData(parsedStudents, detectedSubjects)
    } catch {
      alert('Failed to parse Excel file.')
    }

    event.target.value = ''
  }

  const handleBasicChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleScoreChange = (subject, value) => {
    setFormData((previous) => ({
      ...previous,
      scores: {
        ...previous.scores,
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
      term: formData.term,
      scores: scoreObject,
    }

    if (
      !studentRecord.name ||
      !studentRecord.grade ||
      !studentRecord.term ||
      hasInvalidScore
    ) {
      alert('Please enter a valid name, grade, term, and scores between 0 and 100.')
      return
    }

    if (editingStudent) {
      setStudents((previous) =>
        previous.map((student) =>
          student.id === editingStudent.id ? studentRecord : student
        )
      )
      setEditingStudent(null)
    } else {
      setStudents((previous) => [...previous, studentRecord])
    }

    setGrades((previous) => [...new Set([...previous, studentRecord.grade])])
    setTerms((previous) => [...new Set([...previous, studentRecord.term])])
    setFormData(getDefaultFormState())
  }

  const handleCancelEdit = () => {
    setEditingStudent(null)
    setFormData(getDefaultFormState())
  }

  const handleAddSubject = () => {
    const subjectKey = normalizeKey(newSubject)

    if (!subjectKey || subjects.includes(subjectKey)) return

    setSubjects((previous) => [...previous, subjectKey])
    setStudents((previous) =>
      previous.map((student) => ({
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
    if (!gradeValue || grades.includes(gradeValue)) return

    setGrades((previous) => [...previous, gradeValue])
    setNewGrade('')
  }

  const handleAddTerm = () => {
    const termValue = newTerm.trim()
    if (!termValue || terms.includes(termValue)) return

    setTerms((previous) => [...previous, termValue])
    setNewTerm('')
  }

  const resetToSampleData = () => {
    const resetStudents = sampleStudents.map((student) => ({
      ...student,
      term: student.term || 'Term 1',
    }))

    setStudents(resetStudents)
    setSubjects(defaultSubjects)
    setGrades(defaultGrades)
    setTerms(defaultTerms)
    setEditingStudent(null)
  }

  const exportToCsv = () => {
    if (students.length === 0) {
      alert('There is no data to export.')
      return
    }

    const csv = Papa.unparse(buildStudentExportRows(students, subjects))
    downloadBlobFile(
      csv,
      'student-performance-data.csv',
      'text/csv;charset=utf-8;'
    )
  }

  const exportToExcel = async () => {
    if (students.length === 0) {
      alert('There is no data to export.')
      return
    }

    const XLSX = await import('xlsx')
    const exportData = buildStudentExportRows(students, subjects)
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'student-performance-data.xlsx')
  }

  const downloadTemplateCsv = () => {
    const csv = Papa.unparse(buildTemplateRows(subjects, grades, terms))

    downloadBlobFile(
      csv,
      'student-performance-template.csv',
      'text/csv;charset=utf-8;'
    )
  }

  return (
    <section className="card manager-card">
      <div className="section-heading">
        <h2>Manage Student Data</h2>
        <p>
          Upload student records, add new students, edit entries, and expand the
          system with more subjects, grades, and terms.
        </p>
      </div>

      <div className="manager-actions">
        <label className="upload-mode">
          <span>Upload Mode</span>
          <select value={uploadMode} onChange={(event) => setUploadMode(event.target.value)}>
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

          <button
            type="button"
            className="action-button secondary"
            onClick={downloadTemplateCsv}
          >
            Download CSV Template
          </button>
        </div>
      </div>

      <div className="manager-grid">
        <div className="manager-side">
          <h3>Add More Subjects, Grades and Terms</h3>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Creative Arts"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
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
              onChange={(event) => setNewGrade(event.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddGrade}>
              Add Grade
            </button>
          </div>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Term 4"
              value={newTerm}
              onChange={(event) => setNewTerm(event.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddTerm}>
              Add Term
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

            <select name="term" value={formData.term} onChange={handleBasicChange}>
              {terms.map((term) => (
                <option key={term} value={term}>
                  {term}
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
                onChange={(event) => handleScoreChange(subject, event.target.value)}
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

      <p className="dataset-note">
        Current dataset size: {students.length} records. Changes save automatically
        in this browser.
      </p>
    </section>
  )
}

export default DataManager
