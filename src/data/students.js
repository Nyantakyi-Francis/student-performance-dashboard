const studentBlueprints = [
  {
    gender: 'Female',
    grade: 'Grade 7',
    name: 'Ama Mensah',
    terms: {
      'Term 1': {
        english: 85,
        mathematics: 78,
        science: 74,
        socialStudies: 80,
      },
      'Term 2': {
        english: 88,
        mathematics: 82,
        science: 79,
        socialStudies: 84,
      },
      'Term 3': {
        english: 91,
        mathematics: 86,
        science: 83,
        socialStudies: 87,
      },
    },
  },
  {
    gender: 'Male',
    grade: 'Grade 7',
    name: 'Kwame Asare',
    terms: {
      'Term 1': {
        english: 70,
        mathematics: 65,
        science: 60,
        socialStudies: 72,
      },
      'Term 2': {
        english: 69,
        mathematics: 63,
        science: 59,
        socialStudies: 70,
      },
      'Term 3': {
        english: 67,
        mathematics: 61,
        science: 58,
        socialStudies: 69,
      },
    },
  },
  {
    gender: 'Female',
    grade: 'Grade 8',
    name: 'Akosua Boateng',
    terms: {
      'Term 1': {
        english: 91,
        mathematics: 88,
        science: 84,
        socialStudies: 86,
      },
      'Term 2': {
        english: 93,
        mathematics: 90,
        science: 88,
        socialStudies: 89,
      },
      'Term 3': {
        english: 95,
        mathematics: 92,
        science: 90,
        socialStudies: 91,
      },
    },
  },
  {
    gender: 'Male',
    grade: 'Grade 8',
    name: 'Yaw Owusu',
    terms: {
      'Term 1': {
        english: 62,
        mathematics: 55,
        science: 58,
        socialStudies: 64,
      },
      'Term 2': {
        english: 60,
        mathematics: 53,
        science: 56,
        socialStudies: 61,
      },
      'Term 3': {
        english: 66,
        mathematics: 60,
        science: 62,
        socialStudies: 68,
      },
    },
  },
  {
    gender: 'Female',
    grade: 'Grade 9',
    name: 'Efua Koomson',
    terms: {
      'Term 1': {
        english: 87,
        mathematics: 92,
        science: 90,
        socialStudies: 89,
      },
      'Term 2': {
        english: 90,
        mathematics: 94,
        science: 93,
        socialStudies: 91,
      },
      'Term 3': {
        english: 92,
        mathematics: 96,
        science: 95,
        socialStudies: 94,
      },
    },
  },
  {
    gender: 'Male',
    grade: 'Grade 9',
    name: 'Kojo Frimpong',
    terms: {
      'Term 1': {
        english: 55,
        mathematics: 48,
        science: 50,
        socialStudies: 52,
      },
      'Term 2': {
        english: 58,
        mathematics: 54,
        science: 57,
        socialStudies: 55,
      },
      'Term 3': {
        english: 64,
        mathematics: 59,
        science: 61,
        socialStudies: 63,
      },
    },
  },
  {
    gender: 'Female',
    grade: 'Grade 7',
    name: 'Adwoa Serwaa',
    terms: {
      'Term 1': {
        english: 77,
        mathematics: 81,
        science: 79,
        socialStudies: 83,
      },
      'Term 2': {
        english: 80,
        mathematics: 84,
        science: 82,
        socialStudies: 85,
      },
      'Term 3': {
        english: 83,
        mathematics: 86,
        science: 84,
        socialStudies: 88,
      },
    },
  },
  {
    gender: 'Male',
    grade: 'Grade 8',
    name: 'Kofi Badu',
    terms: {
      'Term 1': {
        english: 68,
        mathematics: 73,
        science: 71,
        socialStudies: 69,
      },
      'Term 2': {
        english: 72,
        mathematics: 76,
        science: 74,
        socialStudies: 73,
      },
      'Term 3': {
        english: 75,
        mathematics: 78,
        science: 77,
        socialStudies: 76,
      },
    },
  },
]

const students = studentBlueprints.flatMap((student, studentIndex) => {
  return Object.entries(student.terms).map(([term, scores], termIndex) => ({
    id: studentIndex * 10 + termIndex + 1,
    name: student.name,
    gender: student.gender,
    grade: student.grade,
    term,
    scores,
  }))
})

export default students
