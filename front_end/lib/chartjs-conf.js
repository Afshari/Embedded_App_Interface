var Script = function () {



    var lineChartData = {
        labels: [],
        datasets: [
            {
                fillColor : "rgba(220,220,220,0.0)",
                strokeColor : "rgba(220,220,220,1)",
                pointColor : "rgba(220,220,220,1)",
                pointStrokeColor : "#fff",
                data : []
            },
            {
                fillColor : "rgba(151,187,205,0.0)",
                strokeColor : "rgba(151,187,205,1)",
                pointColor : "rgba(151,187,205,1)",
                pointStrokeColor : "#fff",
                data : []
            }
        ],
				options: {
					scales: {
						xAxes: [{
							ticks: {
									min: 0,
									max: 20
							},
						}]
					}
				}
    };

		var electron = require('electron');
		const { ipcRenderer } = electron;
		var chartOptions = { 
			animation: false,
			scales: {
				xAxes: [{
					ticks: {
							min: 0,
							max: 20
					},
				}]
			}
		};


		ipcRenderer.on('x-data', function (event, x) {
			if(typeof lineChartData.labels !== "undefined" && lineChartData.labels.length < 10) {
				var labels = [];
				for(var i = 0; i < 100; i++)
					labels.push("");
				lineChartData.labels = labels;
			}
			lineChartData.datasets[0].data.push(x[0]);
			lineChartData.datasets[1].data.push(x[1]);
			new Chart(document.getElementById("line").getContext("2d"), $("#line").parent().width(), 300).Line(lineChartData, chartOptions);

		});

}();
