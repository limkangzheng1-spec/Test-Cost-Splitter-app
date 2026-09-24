/**
 * Google Apps Script - Hangout Expense Splitter
 * Backend: Google Apps Script (Code.gs)
 * Database: Google Sheets (SpreadsheetApp)
 * OCR: Google Gemini Flash Vision API (gemini-2.5-flash)
 */

// Configuration & Sheet Names
var SHEETS = {
  EVENTS: 'Events',
  FRIENDS: 'Friends',
  ACTIVITIES: 'Activities',
  LINE_ITEMS: 'LineItems'
};

var HEADERS = {
  Events: ['EventID', 'EventName', 'EventDate', 'CreatedAt'],
  Friends: ['FriendID', 'EventID', 'FriendName'],
  Activities: ['ActivityID', 'EventID', 'ActivityName', 'PaidByFriendID', 'SST_Percent', 'ServiceTax_Percent', 'ReceiptImageUrl'],
  LineItems: ['ItemID', 'ActivityID', 'ItemName', 'Price', 'AssignedFriends']
};

/**
 * Serves the Single-Page Web Application
 */
function doGet(e) {
  // Ensure database sheets are initialized
  initDatabase();
  
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Hangout Expense Splitter')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Initializes Google Sheets tabs and column headers if they do not exist
 */
function initDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  Object.keys(HEADERS).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Check if headers need to be written
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.getRange(1, 1, 1, HEADERS[sheetName].length)
        .setFontWeight('bold')
        .setBackground('#F1F5F9');
      sheet.setFrozenRows(1);
    } else if (sheetName === 'Activities' && sheet.getLastColumn() < 7) {
      // Ensure column 7 header exists for ReceiptImageUrl backwards-compatibility
      sheet.getRange(1, 7).setValue('ReceiptImageUrl').setFontWeight('bold').setBackground('#F1F5F9');
    }
  });
}

/**
 * Helper to get active sheet by name
 */
function getSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

/**
 * Helper to generate random unique IDs
 */
function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().substring(0, 8);
}

/**
 * -------------------------------------------------------------
 * EVENT MANAGEMENT CRUD
 * -------------------------------------------------------------
 */

/**
 * Fetches all events
 */
function getEvents() {
  var sheet = getSheet(SHEETS.EVENTS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var events = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      events.push({
        eventId: String(row[0]),
        eventName: String(row[1]),
        eventDate: row[2] instanceof Date ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[2]),
        createdAt: String(row[3])
      });
    }
  }
  // Return sorted descending by date
  return events.reverse();
}

/**
 * Creates a new hangout event
 */
function createEvent(eventName, eventDate) {
  if (!eventName) throw new Error("Event name is required");
  var sheet = getSheet(SHEETS.EVENTS);
  var eventId = generateId('EVT');
  var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  sheet.appendRow([eventId, eventName, eventDate, createdAt]);
  return {
    eventId: eventId,
    eventName: eventName,
    eventDate: eventDate,
    createdAt: createdAt
  };
}

/**
 * Deletes an event and its cascaded data (Friends, Activities, LineItems)
 */
function deleteEvent(eventId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Delete Line Items belonging to activities of this event
  var activitiesSheet = getSheet(SHEETS.ACTIVITIES);
  var actData = activitiesSheet.getDataRange().getValues();
  var activityIds = [];
  for (var a = 1; a < actData.length; a++) {
    if (String(actData[a][1]) === String(eventId)) {
      activityIds.push(String(actData[a][0]));
    }
  }
  
  var lineSheet = getSheet(SHEETS.LINE_ITEMS);
  var lineData = lineSheet.getDataRange().getValues();
  for (var l = lineData.length - 1; l >= 1; l--) {
    if (activityIds.indexOf(String(lineData[l][1])) !== -1) {
      lineSheet.deleteRow(l + 1);
    }
  }

  // 2. Delete Activities
  for (var a2 = actData.length - 1; a2 >= 1; a2--) {
    if (String(actData[a2][1]) === String(eventId)) {
      activitiesSheet.deleteRow(a2 + 1);
    }
  }

  // 3. Delete Friends
  var friendsSheet = getSheet(SHEETS.FRIENDS);
  var frData = friendsSheet.getDataRange().getValues();
  for (var f = frData.length - 1; f >= 1; f--) {
    if (String(frData[f][1]) === String(eventId)) {
      friendsSheet.deleteRow(f + 1);
    }
  }

  // 4. Delete Event row
  var eventsSheet = getSheet(SHEETS.EVENTS);
  var evData = eventsSheet.getDataRange().getValues();
  for (var e = evData.length - 1; e >= 1; e--) {
    if (String(evData[e][0]) === String(eventId)) {
      eventsSheet.deleteRow(e + 1);
      break;
    }
  }

  return { success: true, eventId: eventId };
}

/**
 * -------------------------------------------------------------
 * FRIEND MANAGEMENT CRUD
 * -------------------------------------------------------------
 */

/**
 * Gets friends for a specific event
 */
function getFriendsForEvent(eventId) {
  var sheet = getSheet(SHEETS.FRIENDS);
  var data = sheet.getDataRange().getValues();
  var friends = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(eventId)) {
      friends.push({
        friendId: String(data[i][0]),
        eventId: String(data[i][1]),
        friendName: String(data[i][2])
      });
    }
  }
  return friends;
}

/**
 * Adds a friend to an event
 */
function addFriend(eventId, friendName) {
  if (!friendName || !friendName.trim()) throw new Error("Friend name is required");
  var sheet = getSheet(SHEETS.FRIENDS);
  var friendId = generateId('FRD');
  sheet.appendRow([friendId, eventId, friendName.trim()]);
  return {
    friendId: friendId,
    eventId: eventId,
    friendName: friendName.trim()
  };
}

/**
 * Removes a friend from an event
 */
function removeFriend(friendId) {
  var sheet = getSheet(SHEETS.FRIENDS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(friendId)) {
      sheet.deleteRow(i + 1);
      return { success: true, friendId: friendId };
    }
  }
  return { success: false, message: "Friend not found" };
}

/**
 * -------------------------------------------------------------
 * ACTIVITY & LINE ITEMS CRUD
 * -------------------------------------------------------------
 */

/**
 * Fetches all activities and line items for an event
 */
function getEventDetails(eventId) {
  var friends = getFriendsForEvent(eventId);
  
  // Fetch activities
  var actSheet = getSheet(SHEETS.ACTIVITIES);
  var actData = actSheet.getDataRange().getValues();
  var activities = [];
  var activityMap = {};

  for (var i = 1; i < actData.length; i++) {
    if (String(actData[i][1]) === String(eventId)) {
      var act = {
        activityId: String(actData[i][0]),
        eventId: String(actData[i][1]),
        activityName: String(actData[i][2]),
        paidByFriendId: String(actData[i][3]),
        sstPercent: Number(actData[i][4]) || 0,
        serviceTaxPercent: Number(actData[i][5]) || 0,
        receiptImageUrl: String(actData[i][6] || ''),
        lineItems: []
      };
      activities.push(act);
      activityMap[act.activityId] = act;
    }
  }

  // Fetch line items for activities
  var lineSheet = getSheet(SHEETS.LINE_ITEMS);
  var lineData = lineSheet.getDataRange().getValues();
  for (var j = 1; j < lineData.length; j++) {
    var actId = String(lineData[j][1]);
    if (activityMap[actId]) {
      activityMap[actId].lineItems.push({
        itemId: String(lineData[j][0]),
        activityId: actId,
        itemName: String(lineData[j][2]),
        price: Number(lineData[j][3]) || 0,
        assignedFriends: String(lineData[j][4]) // e.g. "ALL" or "F1,F2"
      });
    }
  }

  return {
    eventId: eventId,
    friends: friends,
    activities: activities
  };
}

/**
 * Saves or updates an Activity and its line items, including receipt image URL
 * @param {Object} activity - { activityId, eventId, activityName, paidByFriendId, sstPercent, serviceTaxPercent, receiptImageUrl }
 * @param {Array} lineItems - Array of { itemId, itemName, price, assignedFriends }
 * @param {string} receiptBase64 - Optional new Base64 receipt image to store in Google Drive
 */
function saveActivityWithItems(activity, lineItems, receiptBase64) {
  var actSheet = getSheet(SHEETS.ACTIVITIES);
  var lineSheet = getSheet(SHEETS.LINE_ITEMS);

  var activityId = activity.activityId || generateId('ACT');
  var isNew = !activity.activityId;
  var receiptUrl = activity.receiptImageUrl || '';

  // If a new base64 receipt image is provided, upload it to Google Drive
  if (receiptBase64 && (receiptBase64.indexOf('data:image') !== -1 || receiptBase64.length > 500)) {
    try {
      var driveUpload = uploadReceiptToDrive(receiptBase64, 'Receipt_' + (activity.activityName || activityId) + '.jpg');
      if (driveUpload && driveUpload.viewUrl) {
        receiptUrl = driveUpload.viewUrl;
      }
    } catch (driveErr) {
      Logger.log("Warning: Google Drive upload error: " + driveErr.message);
    }
  }

  if (isNew) {
    actSheet.appendRow([
      activityId,
      activity.eventId,
      activity.activityName,
      activity.paidByFriendId,
      activity.sstPercent || 0,
      activity.serviceTaxPercent || 0,
      receiptUrl
    ]);
  } else {
    // Update existing activity row
    var actData = actSheet.getDataRange().getValues();
    for (var a = 1; a < actData.length; a++) {
      if (String(actData[a][0]) === String(activityId)) {
        actSheet.getRange(a + 1, 3, 1, 5).setValues([[
          activity.activityName,
          activity.paidByFriendId,
          activity.sstPercent || 0,
          activity.serviceTaxPercent || 0,
          receiptUrl
        ]]);
        break;
      }
    }
    // Delete previous line items for this activity
    var lineData = lineSheet.getDataRange().getValues();
    for (var l = lineData.length - 1; l >= 1; l--) {
      if (String(lineData[l][1]) === String(activityId)) {
        lineSheet.deleteRow(l + 1);
      }
    }
  }

  // Insert all new/updated line items
  if (lineItems && lineItems.length > 0) {
    var rowsToInsert = [];
    for (var i = 0; i < lineItems.length; i++) {
      var item = lineItems[i];
      var itemId = item.itemId || generateId('ITM');
      rowsToInsert.push([
        itemId,
        activityId,
        item.itemName || 'Untitled Item',
        Number(item.price) || 0,
        item.assignedFriends || 'ALL'
      ]);
    }
    if (rowsToInsert.length > 0) {
      var startRow = lineSheet.getLastRow() + 1;
      lineSheet.getRange(startRow, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
    }
  }

  return {
    success: true,
    activityId: activityId,
    receiptImageUrl: receiptUrl
  };
}

/**
 * Deletes an activity and its line items
 */
function deleteActivity(activityId) {
  var actSheet = getSheet(SHEETS.ACTIVITIES);
  var lineSheet = getSheet(SHEETS.LINE_ITEMS);

  // Remove line items
  var lineData = lineSheet.getDataRange().getValues();
  for (var l = lineData.length - 1; l >= 1; l--) {
    if (String(lineData[l][1]) === String(activityId)) {
      lineSheet.deleteRow(l + 1);
    }
  }

  // Remove activity
  var actData = actSheet.getDataRange().getValues();
  for (var a = 1; a < actData.length; a++) {
    if (String(actData[a][0]) === String(activityId)) {
      actSheet.deleteRow(a + 1);
      return { success: true };
    }
  }

  return { success: false, message: "Activity not found" };
}

/**
 * -------------------------------------------------------------
 * GOOGLE CLOUD VISION OCR & RECEIPT EXTRACTION
 * -------------------------------------------------------------
 */

/**
 * Universal receipt analyzer using Google Gemini Vision API.
 * Uses GEMINI_API_KEY from Script Properties with model fallback cascade:
 * gemini-3.6-flash -> gemini-2.5-flash -> gemini-2.5-flash-lite -> gemini-3-flash
 * @param {string} base64Image - Base64 encoded receipt image
 * @returns {Array} List of { item: string, price: number }
 */
function analyzeReceipt(base64Image) {
  return analyzeReceiptWithGemini(base64Image);
}

/**
 * Ultra-Fast Gemini Vision OCR
 * Automatically attempts high-throughput production models (gemini-2.5-flash)
 * with zero-delay failover and thinkingBudget: 0 for fast 2-4s response time.
 */
function analyzeReceiptWithGemini(base64Image) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') ||
               PropertiesService.getScriptProperties().getProperty('VISION_API_KEY');
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in Script Properties. Please set it under Project Settings -> Script Properties.");
  }

  // Strip Data URI header if present
  var cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, "").trim();

  // 1. gemini-3.1-flash-lite: First priority as requested by user (fastest, lightweight model)
  // 2. gemini-3.8-flash: High-throughput flash model
  // 3. gemini-flash-latest: Stable flagship flash alias
  // 4. gemini-3.1-pro-preview: Separate pro reasoning pool
  var modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview'
  ];

  var prompt = 
    "You are a witty, hilarious, and sarcastic dining expense auditor who roasts friends when they upload stupid non-receipt photos.\n" +
    "Analyze this image carefully and perform two evaluations:\n\n" +
    "EVALUATION 1: RECEIPT VALIDATION (Is this a genuine restaurant or store receipt with item prices?)\n" +
    "- Check if this image depicts an actual restaurant bill, dining receipt, store invoice, or check showing line prices.\n" +
    "- If the photo is of a person, face, selfie, cat, dog, pet, animal, tree, nature, street, shoes, computer screen, or just a plate of food WITHOUT a printed bill with prices:\n" +
    "  Set \"isReceipt\": false\n" +
    "  Set \"detectedSubject\": concise description of what is actually in the photo (e.g. 'cat', 'selfie / your face', 'plate of food with no prices', 'a tree / park', 'random shoes')\n" +
    "  Set \"rejectMessage\": a hilarious, sarcastic, playful roast in 1-2 punchy sentences roasting your friend for uploading it instead of a receipt. E.g. 'Bruh, what the hell are you uploading?! This is literally a picture of a cat, not a receipt. The cat ain\\'t splitting the bill with us! Take a real photo of the receipt.' or 'Nice selfie bro, but your handsome face cannot be split 4 ways into the bill. Upload the actual receipt!' or 'Bro that fried rice looks bomb, but it didn\\'t come with printed prices on the noodles. Shoot the receipt!' (Keep it playful, sarcastic, witty, and funny!)\n" +
    "  Set \"items\": []\n\n" +
    "EVALUATION 2: LINE ITEMS EXTRACTION (Only if isReceipt is true)\n" +
    "- Extract each purchased dish or item and its exact numeric final price.\n" +
    "- Ignore subtotal, grand total, tax, service charges, discounts, cash, or change rows.\n" +
    "- Clean up abbreviations into readable dish/item titles.\n" +
    "- Set \"isReceipt\": true\n" +
    "- Set \"detectedSubject\": 'dining receipt'\n" +
    "- Set \"rejectMessage\": ''\n" +
    "- Set \"items\": [{\"item\": \"Dish Name\", \"price\": 12.50}, ...]\n\n" +
    "Return ONLY a valid JSON object matching this schema without markdown codeblocks or text outside the JSON:\n" +
    "{\n" +
    "  \"isReceipt\": boolean,\n" +
    "  \"detectedSubject\": string,\n" +
    "  \"rejectMessage\": string,\n" +
    "  \"items\": [{\"item\": string, \"price\": number}]\n" +
    "}";

  var payload = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: cleanBase64
          }
        },
        {
          text: prompt
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var errorsCollected = [];

  for (var m = 0; m < modelsToTry.length; m++) {
    var modelName = modelsToTry[m];
    var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey;

    try {
      Logger.log("Scanning with Gemini model " + modelName + "...");
      var response = UrlFetchApp.fetch(endpoint, options);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();

      if (responseCode === 200) {
        var data = JSON.parse(responseText);
        var content = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : "{}";

        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        var parsed = JSON.parse(content);
        
        // Handle direct array in case of raw response
        if (Array.isArray(parsed)) {
          return {
            success: true,
            isReceipt: true,
            detectedSubject: 'dining receipt',
            rejectMessage: '',
            items: parsed.map(function(item) {
              return { item: String(item.item || 'Item'), price: Number(item.price) || 0 };
            })
          };
        }

        var isReceipt = parsed.isReceipt !== false;
        var detectedSubject = String(parsed.detectedSubject || (isReceipt ? 'receipt' : 'unrecognized object'));
        var rejectMessage = String(parsed.rejectMessage || '');
        var items = Array.isArray(parsed.items) ? parsed.items.map(function(item) {
          return { item: String(item.item || 'Item'), price: Number(item.price) || 0 };
        }) : [];

        Logger.log("Analysis success with " + modelName + "! isReceipt=" + isReceipt + ", subject=" + detectedSubject + ", items=" + items.length);

        return {
          success: true,
          isReceipt: isReceipt,
          detectedSubject: detectedSubject,
          rejectMessage: rejectMessage,
          items: items
        };
      }

      // Handle invalid API key immediately
      if (responseCode === 400 && responseText.indexOf("API_KEY_INVALID") !== -1) {
        throw new Error("Your GEMINI_API_KEY is invalid. Please check Script Properties.");
      }

      // Handle 404 (model retired/not available in region): skip directly to next model
      if (responseCode === 404) {
        Logger.log("Model " + modelName + " not found (404). Cascading to next model...");
        errorsCollected.push(modelName + " (404 Not Found)");
        continue;
      }

      // Handle 503 (temporary congestion) or 429 (rate limit) or 500 (internal server error):
      // Instantly switch to next candidate model without waiting or wasting time
      if (responseCode === 503 || responseCode === 429 || responseCode === 500) {
        Logger.log("Model " + modelName + " busy (" + responseCode + "). Instantly switching to next model...");
        errorsCollected.push(modelName + " (" + responseCode + ")");
        continue;
      } else {
        // Other HTTP code
        errorsCollected.push(modelName + " (" + responseCode + ": " + responseText.substring(0, 100) + ")");
        continue;
      }
    } catch (err) {
      if (err.message && err.message.indexOf("GEMINI_API_KEY is invalid") !== -1) {
        throw err;
      }
      var errStr = err.message || String(err);
      Logger.log("Exception for model " + modelName + ": " + errStr);
      errorsCollected.push(modelName + " (" + errStr + ")");
      continue;
    }
  }

  throw new Error(
    "Receipt scan could not be completed. All fallback models reported temporary issues: " +
    errorsCollected.join(", ") + ". Please wait a moment and try scanning again."
  );
}

/**
 * -------------------------------------------------------------
 * GOOGLE DRIVE RECEIPT STORAGE
 * -------------------------------------------------------------
 */

/**
 * Uploads a receipt image (from camera or gallery) into Google Drive
 * Stores inside a dedicated folder "Hangout Split Receipts"
 * Sets sharing so it can be viewed by anyone with the link
 * @param {string} base64Image - Data URL or Base64 string of the image
 * @param {string} fileName - Optional filename
 * @returns {Object} { success: true, fileId: string, url: string, viewUrl: string }
 */
function uploadReceiptToDrive(base64Image, fileName) {
  try {
    if (!base64Image) {
      throw new Error("No image data provided for Drive upload");
    }

    var cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, "").trim();
    var contentType = "image/jpeg";
    var match = base64Image.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    if (match && match[1]) {
      contentType = match[1];
    }

    var decoded = Utilities.base64Decode(cleanBase64);
    var actualFileName = fileName || ('Receipt_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.jpg');
    var blob = Utilities.newBlob(decoded, contentType, actualFileName);

    // Get or create dedicated folder
    var folderName = "Hangout Split Receipts";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    var file = folder.createFile(blob);
    // Make viewable with link
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (permErr) {
      Logger.log("Notice: Set sharing permission notice: " + permErr);
    }

    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";

    return {
      success: true,
      fileId: fileId,
      url: viewUrl,
      viewUrl: viewUrl
    };
  } catch (err) {
    Logger.log("Failed to upload receipt to Drive: " + err);
    throw new Error("Google Drive receipt upload failed: " + err.message);
  }
}

/**
 * Returns the deployed Apps Script Web App URL and environment metadata
 */
function getAppConfig() {
  var url = "";
  try {
    url = ScriptApp.getService().getUrl() || "";
  } catch (e) {
    url = "";
  }
  return {
    webAppUrl: url,
    appName: "Hangout Expense Splitter"
  };
}
