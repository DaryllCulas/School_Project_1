CREATE DATABASE Cvsu_ITS;

CREATE TABLE ITstudent (
    studentID INT IDENTITY(2023001,1) PRIMARY KEY,
    studentFirstName VARCHAR(255) NOT NULL,
    studentLastName VARCHAR(255) NOT NULL,
    studentEmail VARCHAR(255) NOT NULL,
    studentPassword VARCHAR(255) NOT NULL
);

SELECT * FROM ITstudent;

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Daryll','Culas', 
    'coolastthereal99@gmail.com',
    'Iamdaryll9'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tanjiro','Kamado', 
    'tanjirokamado01@gmail.com',
    'demonslayer01'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Nezuko','Kamado', 
    'nezukokamado01@gmail.com',
    'demonslayer02'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'giyuu','tomioka', 
    'giyutomioka03@gmail.com',
    'demonslayer03'
);


INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tengen','Uzui', 
    'tengenuzui11@gmail.com',
    'demonslayer04'
);


INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tiburcio','Kanor', 
    'tiburciokanor69@gmail.com',
    'demonslayer05'
);