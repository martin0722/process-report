function GetValueFromPercentage(per, min, max)
{
    return min + per * (max - min);
}

function GetPercentageFromValue(val, min, max)
{
    if (val > max)
        return 1;
    if (val < min)
        return 0;
    return (val - min) / (max - min);
}

function GetStringWidth(text)
{
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const textMetrics = context.measureText(text);
    return textMetrics.width;
}

function PlotBar(item, standard, report)
{
    var container = document.createElement('div');
    container.className = 'canvas-container';
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 67;
    var context = canvas.getContext("2d");
    var grd = context.createLinearGradient(0, 0, canvas.width, 0);
    var colors = {
        healthy: 'rgb(64, 171, 5)',
        warning: 'rgb(255, 192, 0)',
        danger: 'rgb(255, 30, 2)'
    };
    const range = standard['max'] - standard['min'];
    const resolution = Math.min(0.1, 0.3 / Math.log(range + 1.0));
    for (let i = 0; i <= 1.0; i += resolution) {
        const value = GetValueFromPercentage(
            i, standard['min'], standard['max']);
        const prevValue = GetValueFromPercentage(
            i - resolution, standard['min'], standard['max']);

        if (standard['healthy'](value))
        {
            if (!standard['healthy'](prevValue) &&
                !standard['warning'](prevValue))
            {
                grd.addColorStop(i - 0.5 * resolution, colors.warning);
            }
            else
            {
                grd.addColorStop(i, colors.healthy);
            }
        }
        else if (standard['warning'](value))
            grd.addColorStop(i, colors.warning);
        else
        {
            if (standard['healthy'](prevValue))
            {
                grd.addColorStop(i + 0.5 * resolution, colors.warning);
            }
            else
            {
                grd.addColorStop(i, colors.danger);
            }
        }
    }

    context.fillStyle = grd;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "black";
    context.beginPath();
    const dotSize = 6;
    var value = report['value'];
    const smallRange = 0.07 * range;
    const smallHealthyRange = 0.1 * standard['healthy_range'];
    if (report['result'] == Status.HEALTHY)
    {
        if (GetHealthyStatus(standard, value + smallRange) !=
            Status.HEALTHY)
            value -= smallHealthyRange;
        else if (GetHealthyStatus(standard, value - smallRange) !=
            Status.HEALTHY)
            value += smallHealthyRange;
    }
    else
    {
        if (GetHealthyStatus(standard, value + smallRange) ==
            Status.HEALTHY)
            value -= smallRange;
        else if (GetHealthyStatus(standard, value - smallRange) ==
            Status.HEALTHY)
            value += smallRange;
    }
    const dotX = canvas.width * GetPercentageFromValue(value,
        standard['min'], standard['max']);
    const dotXAdj = Clamp(dotX, dotSize, canvas.width - dotSize);
    context.arc(dotXAdj, canvas.height / 2, dotSize, 0, 2 * Math.PI);
    context.fill();

    container.appendChild(canvas);
    return container;
}

function PlotBars(standards, report, config)
{
    var container = document.getElementById("barChart");
    while (container.firstChild)
    {
        container.removeChild(container.firstChild);
    }

    const fontSizeLabel = config['label_font'];
    const fontSizeValue = config['value_font'];
    for (const item of Object.keys(standards)) {
        const standard = standards[item];
        var barDiv = PlotBar(item, standard, report[item]);

        var accumulateOffset = 0;
        for (const tag of standard['tags'])
        {
            var label = document.createElement('p');
            label.className = 'label-p';
            label.innerHTML = `${tag}`
            label.style.fontSize = `${fontSizeLabel}px`;
            label.style.position = 'relative';
            label.style.display = 'inline-block';
            const posOffset = -0.5 * fontSizeLabel / 10.0 * GetStringWidth(tag.toString());
            const position = 600 * GetPercentageFromValue(tag,
                standard['min'], standard['max']) + posOffset + accumulateOffset;
            label.style.left = `${position}px`;
            const computedStyle = window.getComputedStyle(label);
            const font = computedStyle.getPropertyValue("font");
            barDiv.appendChild(label);
            accumulateOffset += 1.5 * posOffset;
        }

        var value = document.createElement('p');
        value.className = 'value-p';
        if (standard['unit'].length > 1)
            value.innerHTML = `${report[item]['value']}<br>${standard['unit']}`;
        else
            value.innerHTML = `${report[item]['value']} ${standard['unit']}`;
        value.style.fontSize = `${fontSizeValue}px`;
        if (report[item]['result'] != Status.HEALTHY)
        {
            value.style.fontWeight = "bold";
            value.style.color = "red";
        }
        var valueContainer = document.createElement('div');
        const width = Math.max(50 + fontSizeValue, config['h_space']);
        valueContainer.style.width = `${width}px`;
        valueContainer.appendChild(value);

        var barContainer = document.createElement('div');
        barContainer.className = 'bar-container';
        const height = Math.max(70 + 5 * fontSizeLabel, config['v_space']);
        barContainer.style.height = `${height}px`;
        valueContainer.classList.add('first-column');
        barDiv.classList.add('second-column');
        barContainer.appendChild(valueContainer);
        barContainer.appendChild(barDiv);
        container.appendChild(barContainer);
    }
}
