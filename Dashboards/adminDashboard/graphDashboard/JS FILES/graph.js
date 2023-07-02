google.charts.load('current', { packages: ['corechart', 'bar'] });
google.charts.setOnLoadCallback(drawRightY);

function drawRightY() {
    var data = google.visualization.arrayToDataTable([
        ['IT Students', 'Population', { role: 'style' }],
        ['No. IT Student registered', 1300, '#053615'], // RGB value
        ['No. IT Student not registered', 200, '#053615'], // English color name
        ['Total BSIT Students', 1500, '#053615'],
    ]);

    var materialOptions = {
        chart: {
            title: 'Estimation of CvSU IT Students',
            subtitle: 'Based on most recent and previous census data'
        },
        hAxis: {
            title: 'Total IT Students',
            minValue: 0,
        },
        vAxis: {
            title: 'Estimmated'
        },
        bars: 'horizontal',
        axes: {
            y: {
                0: { side: 'right' }
            }
        }
    };
    var materialChart = new google.charts.Bar(document.getElementById('chart_div'));
    materialChart.draw(data, materialOptions);
}