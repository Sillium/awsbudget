// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: dollar-sign;

const DEBUG = false

const aws_access_key_id = "<aws_access_key_id>"
const aws_secret_access_key = "<aws_secret_access_key>"
const budgetApiEndpoint = "https://<api_gateway_id>.execute-api.eu-central-1.amazonaws.com/prod/api/"

const fontSizeBig = 13
const fontSizeHuge = 30

const log = DEBUG ? console.log.bind(console) : function () { };

// create the widget
const widget = await createWidget(args.widgetParameter)

// preview the widget
if (!config.runsInWidget) {
    await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

/**
 * Create the widget
 * @param {{widgetParameter: string, debug: string}} config widget configuration
 */
async function createWidget(widgetParameter) {
    log(JSON.stringify(widgetParameter, null, 2))

    let param = widgetParameter

    const obiImgFile = await getImage('obi.png', DEBUG)
    const awsImgFile = await getImage('aws.png', DEBUG)

    // expected parameter example: { "accountId": "<account_id>", "budgetName": "<budget_name>", "title1": "<project>", "title2": "<stage>" }
    let params = {};
    if (widgetParameter != null && widgetParameter.length > 0) {
        params = JSON.parse(widgetParameter);
    } else {
        const errorList = new ListWidget()
        errorList.addText("Please configure widget via JSON in widget parameter.")
        return errorList
    }

    let fm = FileManager.local()
    let dir = fm.documentsDirectory()
    //let path = fm.joinPath(dir, "scriptable-aws-budget-" + budget_name + ".json")

    const apiUrl = budgetApiEndpoint + params.accountId + '/' + params.budgetName
    let r = new Request(apiUrl)
    r.headers = {
      "aws_role_name": "BudgetReadRole",
      "aws_access_key_id": aws_access_key_id,
      "aws_secret_access_key": aws_secret_access_key
    }
    
    let data
    //let fresh = 0
    try {
        data = await r.loadJSON()
    } catch (err) {
        const errorList = new ListWidget()
        errorList.addText("Error while fetching data from AWS.")
        return errorList
    }

    console.log(data)

    const widget = new ListWidget()
    widget.setPadding(10, 10, 10, 10)

    // === Name =====================================
    let rowName = addStackTo(widget, 'h')

    rowName.addSpacer()

    const accountNameText = rowName.addText(params.title1)
    accountNameText.centerAlignText()
    accountNameText.font = Font.mediumRoundedSystemFont(fontSizeBig)

    rowName.addSpacer()

    // === Stage =====================================
    let rowStage = addStackTo(widget, 'h')

    rowStage.addSpacer()

    const stageText = rowStage.addText(params.title2)
    stageText.centerAlignText()
    stageText.font = Font.mediumRoundedSystemFont(fontSizeBig)

    rowStage.addSpacer()

    widget.addSpacer(2)

    // === Actual =====================================
    let rowActual = addStackTo(widget, 'h')

    rowActual.addSpacer()

    let actualSpendAmount = data.CalculatedSpend.ActualSpend.Amount
    const actualSpendText = rowActual.addText(formatAmount(actualSpendAmount))
    actualSpendText.centerAlignText()
    actualSpendText.font = Font.heavySystemFont(fontSizeHuge)
    if (parseFloat(actualSpendAmount) <= parseFloat(data.BudgetLimit.Amount)) {
        actualSpendText.textColor = Color.green()
    } else {
        actualSpendText.textColor = Color.red()
    }

    rowActual.addSpacer()

    widget.addSpacer(2)

    // === Forecast =====================================
    let rowForecast = addStackTo(widget, 'h')

    let rowForecastLeft = addStackTo(rowForecast, 'v')
    const forecastLabel = rowForecastLeft.addText("Forecast:")
    forecastLabel.leftAlignText()
    forecastLabel.font = Font.thinRoundedSystemFont(fontSizeBig)

    rowForecast.addSpacer()

    let rowForecastRight = addStackTo(rowForecast, 'v')
    const forecastText = rowForecastRight.addText(formatAmount(data.CalculatedSpend.ForecastedSpend.Amount))
    forecastText.rightAlignText()
    forecastText.font = Font.heavySystemFont(fontSizeBig)
    if (parseFloat(data.CalculatedSpend.ForecastedSpend.Amount) <= parseFloat(data.BudgetLimit.Amount)) {
        forecastText.textColor = Color.green()
    } else {
        forecastText.textColor = Color.red()
    }

    // === Budget Limit =====================================
    let rowBudget = addStackTo(widget, 'h')

    let rowBudgetLeft = addStackTo(rowBudget, 'v')
    const budgetLabel = rowBudgetLeft.addText("Budget:")
    budgetLabel.leftAlignText()
    budgetLabel.font = Font.thinRoundedSystemFont(fontSizeBig)

    rowBudget.addSpacer()

    let rowBudgetRight = addStackTo(rowBudget, 'v')
    const budgetText = rowBudgetRight.addText(formatAmount(data.BudgetLimit.Amount))
    budgetText.rightAlignText()
    budgetText.font = Font.heavySystemFont(fontSizeBig)

    widget.addSpacer()

    // === Last =====================================
    let rowLast = addStackTo(widget, 'h')

    // === Last left ===================================
    let obiIconStack = addStackTo(rowLast, 'v')
    const obiIconImg = obiIconStack.addImage(obiImgFile)
    obiIconImg.imageSize = new Size(30, 25)
    obiIconImg.leftAlignImage()

    rowLast.addSpacer()

    // === Last center ===================================
    let updatedStack = addStackTo(rowLast, 'v')    
    updatedStack.addSpacer(7)
    
    let updated = (data.LastUpdatedTime).split('.')[0]
    console.log(updated)
    let updatedDateObj = parseIsoDatetime(updated)
    let updatedDate = updatedDateObj.toLocaleDateString('de-DE', { day: "numeric", month: "numeric" })
    let updatedTime = updatedDateObj.toLocaleTimeString('de-DE', { hour: "numeric", minute: "numeric" })    

    const updatedDateTimeText = updatedStack.addText(updatedDate + ' ' + updatedTime)
    updatedDateTimeText.centerAlignText()
    updatedDateTimeText.font = Font.thinSystemFont(9)

    rowLast.addSpacer()

    // === Last right ===================================
    let awsIconStack = addStackTo(rowLast, 'v')
    const awsIconImg = awsIconStack.addImage(awsImgFile)
    awsIconImg.imageSize = new Size(30, 25)
    awsIconImg.rightAlignImage()

    return widget
}

// get images from local filestore or download them once
async function getImage(image, forceDownload) {
    let fm = FileManager.local()
    let scriptPath = module.filename
    let scriptDir = scriptPath.replace(fm.fileName(scriptPath, true), '')
    let path = fm.joinPath(scriptDir, image)
    if (fm.fileExists(path) && !forceDownload) {
        let img
        try {
            img = fm.readImage(path)
        } catch (err) {
            fm.downloadFileFromiCloud(path)
            img = fm.readImage(path)
        }
        return img
    } else {
        // download once
        let imageUrl
        switch (image) {
            case 'obi.png':
                imageUrl = "https://i.imgur.com/AWADYfn.png"
                break
            case 'aws.png':
                imageUrl = "https://i.imgur.com/ZgGiTcL.png"
                break
            default:
                console.log(`Sorry, couldn't find ${image}.`);
        }
        let iconImage = await loadImage(imageUrl)
        fm.writeImage(path, iconImage)
        return iconImage
    }
}

// helper function to download an image from a given url
async function loadImage(imgUrl) {
    const req = new Request(imgUrl)
    return await req.loadImage()
}

function parseIsoDatetime(dtstr) {
    var dt = dtstr.split(/[: T-]/).map(parseFloat);
    return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0, 0);
}

function addStackTo(stack, layout) {
    const newStack = stack.addStack()
    if (DEBUG) newStack.backgroundColor = new Color(randomColor(), 1.0)
    if (layout == 'h') {
        newStack.layoutHorizontally()
    } else {
        newStack.layoutVertically()
    }
    return newStack
}

const randomColor = () => {
    let color = '#';
    for (let i = 0; i < 6; i++){
       const random = Math.random();
       const bit = (random * 16) | 0;
       color += (bit).toString(16);
    }
    return color;
 };

function formatAmount(amount) {
    var formatterTwo = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
    });

    var formatterOne = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });

    var formatterNone = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    let amount_str
    
    if (amount >= 10000.0) {
        amount_str = formatterOne.format(amount / 1000) + "k"
    } else if (amount >= 100.0) {
        amount_str = formatterNone.format(amount)
    } else {
        amount_str = formatterTwo.format(amount)
    }
    return amount_str
}
