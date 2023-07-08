// Fetch student profile data

fetch('/student_profile_data')
.then((response) => response.json())
.then((data) => {
    const studentData = data[0];
    document.getElementById('studentID').textContent = studentData.studentID;
    document.getElementById('studentFirstName').textContent = studentData.studentFirstName;
    document.getElementById('studentLastName').textContent = studentData.studentLastName;
    document.getElementById('YearLevelAndSection').textContent = studentData.YearLevelAndSection;
    document.getElementById('studentEmail').textContent = studentData.studentEmail; 
    document.getElementById('studentPassword').textContent = studentData.studentPassword;
})
.catch((error) => console.log(error));