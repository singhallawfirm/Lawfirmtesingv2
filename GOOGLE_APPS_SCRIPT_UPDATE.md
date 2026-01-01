# Google Apps Script Update for Phone Number Field

## Important: Update Your Google Apps Script

Since you've added a phone number field to the contact form, you need to update your Google Apps Script to capture this data.

## Your Spreadsheet URLs:
- **Form Response 1**: https://docs.google.com/spreadsheets/d/1IG0awizqlkOC8UXRRBNXwTkr76CSfwtmTBi5Eid6A4A/edit?gid=275130057#gid=275130057
- **Contact Page**: https://docs.google.com/spreadsheets/d/1IG0awizqlkOC8UXRRBNXwTkr76CSfwtmTBi5Eid6A4A/edit?gid=2020789619#gid=2020789619

## Steps to Update:

1. **Open your Google Spreadsheet** (the one linked above)

2. **Go to Extensions > Apps Script**

3. **Update the `doPost` function** to include the phone field. Here's the updated code:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    var sheet = SpreadsheetApp.openById('1IG0awizqlkOC8UXRRBNXwTkr76CSfwtmTBi5Eid6A4A');
    
    // Get the "Form Response 1" sheet by gid
    var formResponseSheet = sheet.getSheets().find(s => s.getSheetId() == 275130057);
    
    if (!formResponseSheet) {
      throw new Error('Form Response 1 sheet not found');
    }
    
    // Extract form data
    var fullName = e.parameter['full-name'] || '';
    var email = e.parameter['email'] || '';
    var phone = e.parameter['phone'] || '';  // NEW: Phone field
    var subject = e.parameter['subject'] || '';
    var message = e.parameter['message'] || '';
    var timestamp = new Date();
    
    // Append data to the sheet
    // Make sure your sheet has these columns: Timestamp, Name, Email, Phone, Subject, Message
    formResponseSheet.appendRow([timestamp, fullName, email, phone, subject, message]);
    
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'message': 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Update your sheet headers** in "Form Response 1":
   - Column A: Timestamp
   - Column B: Name
   - Column C: Email
   - Column D: Phone ← **ADD THIS COLUMN**
   - Column E: Subject
   - Column F: Message

5. **Save and Deploy**:
   - Click **Save** (💾 icon)
   - Click **Deploy > New deployment**
   - Select type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - Copy the Web App URL (it should match the one already in your code)

## Current Configuration:
Your contact form in `contact.html` now includes:
- ✅ Full Name
- ✅ Email Address  
- ✅ Phone Number ← **NEWLY ADDED**
- ✅ Subject
- ✅ Message

The form submission in `main.js` is already configured correctly and will automatically send the phone number to your Google Sheets once you update the Apps Script code.

## Testing:
1. After updating the Apps Script, submit a test form
2. Check the "Form Response 1" sheet to verify the phone number is being captured
3. Make sure the phone column is properly aligned with the data

---

**Note**: The form is already sending all fields correctly. You only need to update the Google Apps Script to handle the phone field in your spreadsheet.
