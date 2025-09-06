# Notification Rules for CareConnectBackend

This document outlines the criteria for sending notifications in `index.js` of the CareConnectBackend project.

---

## 1. Patient Completion Notification

**Trigger:**  
- API endpoint: `POST /sendPatientCompletedNotification`

**Criteria:**  
- The request must include `patientRecordNumber` in the body.
- When a patient completes their tests, a notification is sent to all users with a valid Expo push token.

**Notification Content:**
- **Title:** Patient Has Completed Test
- **Body:** Patient with record id "<patientRecordNumber>" has completed their test!
- **Date:** Current date/time in Puerto Rico timezone

---

## 2. Patients Missing Tests (Daily Notification)

**Trigger:**  
- Scheduled cron jobs at **8:00 AM** and **5:00 PM** (Puerto Rico time) every day.

**Criteria:**  
For each patient, a test is considered "missing" if:
- The test was **ordered** (`<testName>DateTestIsOrdered` is not empty).
- The test was **not delivered** (`<testName>DateTestIsDelivered` is empty).
- The number of days since the test was ordered exceeds a configurable threshold (default: **10 days**, set in Firestore `"NotificationSettings"`, document `"DaysBeforeTestReminder"`).

If any patients have missing tests, a notification is sent to all users with a valid Expo push token.

**Notification Content:**
- **Title:** Patients with missing tests
- **Body:** Lists patients and missing tests, with a reminder to follow up.
- **Date:** Current date/time in Puerto Rico timezone

---

## 3. Patients With Incomplete Tests After One Month (Monthly Notification)

**Trigger:**  
- Scheduled cron job at **8:00 AM** (Puerto Rico time) on the **1st day of each month**.

**Criteria:**  
For each patient:
- `allTestsCompleted` is `"no"`.
- `patientDateAssigned` is more than one month ago.

If any patients meet these criteria, a notification is sent listing their record numbers.

**Notification Content:**
- **Title:** Incomplete Patient Tests
- **Body:** Lists patients assigned over a month ago who have not completed all tests.
- **Date:** Current date/time in Puerto Rico timezone

---

## Notification Recipients

- All notifications are sent to users whose `notificationPushToken` is stored in the "Users" collection and is a valid Expo push token.

---

## Summary Table

| Scenario                                    | Criteria                                                           | Trigger            |
|---------------------------------------------|--------------------------------------------------------------------|--------------------|
| Patient completed tests                     | `patientRecordNumber` provided in POST body                        | Manual API call    |
| Patient missing tests (daily reminder)      | Test ordered, not delivered, days since order > reminder threshold | Daily @ 8 AM, 5 PM |
| Patients incomplete after a month (monthly) | `allTestsCompleted` = "no", assigned > 1 month ago                 | Monthly @ 8 AM     |
