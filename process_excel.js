function GetColumnFromArray(array, col)
{
    if (col < 0 || col >= array[0].length)
    {
        return null;
    }
    return array.map(function(row) {
        return row[col];
    });
}

function RemoveSpaces(text)
{
    return text.replace(/\s/g, '');
}

function Clamp(value, min, max)
{
    return Math.min(Math.max(value, min), max);
}

function CreateRangeChecker(range)
{
    if (!range) {
        return function() {
            return false;
        };
    }

    if (range.includes("~")) {
        const [min, max] = range.split("~").map(parseFloat);
        return function(value) {
            return value >= min && value <= max;
        };
    } else if (range.startsWith("<")) {
        const threshold = parseFloat(range.substring(1));
        return function(value) {
            return value < threshold;
        };
    } else if (range.startsWith(">")) {
        const threshold = parseFloat(range.substring(1));
        return function(value) {
            return value > threshold;
        };
    } else {
        return function() {
            return false;
        };
    }
}

function GetTag(range)
{
    if (!range)
        return null;

    if (range.includes("~"))
        return range.split("~").map(parseFloat);

    if (range.startsWith("<"))
        return parseFloat(range.substring(1));

    if (range.startsWith(">"))
      return parseFloat(range.substring(1));

    return null;
}

function HandleStandard(standardData)
{
    const fileInput = document.getElementById(`standard`);
    const excelTable = document.getElementById(`standardTable`);

    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const tableHtml = XLSX.utils.sheet_to_html(worksheet);
            excelTable.innerHTML = tableHtml;

            data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const tags = GetColumnFromArray(data, 0);
            for (let i = 1; i < data.length; ++ i)
            {
                const value = {};
                value['min'] = data[i][1];
                value['max'] = data[i][2];
                value['tags'] = [];
                const tag1 = GetTag(data[i][3]);
                if (tag1)
                    value['tags'] = value['tags'].concat(tag1);
                const tag2 = GetTag(data[i][4]);
                if (tag2)
                    value['tags'] = value['tags'].concat(tag2);
                value['tags'] = [...new Set(value['tags'])];
                value['healthy'] = CreateRangeChecker(data[i][3]);
                value['warning'] = CreateRangeChecker(data[i][4]);
                value['unit'] = data[i][6];
                standardData[RemoveSpaces(tags[i])] = value;
            }
        };
        reader.readAsBinaryString(file);
    }
}

function HandleConfig(config)
{
    const fileInput = document.getElementById(`config`);
    const excelTable = document.getElementById(`configTable`);

    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const tableHtml = XLSX.utils.sheet_to_html(worksheet);
            excelTable.innerHTML = tableHtml;

            data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (data.length == 2 && data[1].length == 4)
            {
                config['v_space'] = data[1][0];
                config['h_space'] = data[1][1];
                config['value_font'] = data[1][2];
                config['label_font'] = data[1][3];
            }
            else
            {
                window.alert('config檔案格式錯誤!');
            }
        };
        reader.readAsBinaryString(file);
    }
}

function HandleData(standard, report, config)
{
    const fileInput = document.getElementById('data');
    const excelTable = document.getElementById('dataTable');

    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const tableHtml = XLSX.utils.sheet_to_html(worksheet);
            excelTable.innerHTML = tableHtml;

            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const dataDict = {};
            const tags = GetColumnFromArray(data, 0);
            for (let col = 1; col < data[0].length; ++ col)
            {
                const colData = GetColumnFromArray(data, col);
                const value = {};
                for (let i = 1; i < colData.length; ++ i)
                {
                    value[RemoveSpaces(tags[i])] = colData[i];
                }
                dataDict[colData[0]] = value;

            }
            if (Object.keys(standard).length > 0)
            {
                Object.keys(report).forEach(function(key) {
                    delete report[key];
                });
                for (const person of Object.keys(dataDict))
                {
                    const values = dataDict[person];
                    const personalReport = {};
                    for (const item of Object.keys(values))
                    {
                        const result = {};
                        const itemCriteria = standard[item];
                        let value = values[item];
                        result['value'] = value;
                        result['result'] = Status.DANGEROUS;
                        if (itemCriteria['healthy'](value))
                        {
                            result['result'] = Status.HEALTHY;
                        }
                        else if (itemCriteria['warning'](value))
                        {
                            result['result'] = Status.WARNING;
                        }
                        personalReport[item] = result;

                    }
                    report[person] = personalReport;
                }
                CreateResultPage(report, standard, config);
            }
            else
            {
                window.alert('未讀取standard檔案!');
                location.reload();
            }
        };

        reader.readAsBinaryString(file);
    }
}

function CreateResultPage(report, standard, config)
{
    const dynamicSelect = document.getElementById("people");
    while (dynamicSelect.firstChild)
    {
        dynamicSelect.removeChild(dynamicSelect.firstChild);
    }

    for (const person of Object.keys(report))
    {
        const option = document.createElement("option");
        option.value = person;
        option.textContent = person;
        dynamicSelect.appendChild(option);
    }
    const firstPerson = Object.keys(report)[0];
    PlotBars(standard, report[firstPerson], config);

    dynamicSelect.addEventListener("change", function () {
        const person = dynamicSelect.value;
        PlotBars(standard, report[person], config);
    });
}

function OnCaptureClick(standard, report, config)
{
    for (const person of Object.keys(report))
    {
        PlotBars(standard, report[person], config);

        var captureDiv = document.getElementById("barChart");

        html2canvas(captureDiv).then(function(canvas) {
            var imgData = canvas.toDataURL("image/png");

            var link = document.createElement("a");
            link.href = imgData;
            link.download = `${person}.png`;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    const dynamicSelect = document.getElementById("people");
    const selectedOption = dynamicSelect.options[dynamicSelect.selectedIndex];
    PlotBars(standard, report[selectedOption.value], config);
}
