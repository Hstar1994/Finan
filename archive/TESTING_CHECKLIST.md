# 🧪 TESTING CHECKLIST - Finan Application

**Branch**: `feature/code-review-fixes`  
**Date**: December 14, 2025  
**Tester**: _____________  

---

## ✅ AUTOMATED TESTS

### Backend Unit Tests

Run these tests from the backend directory:

```bash
npm test
```

**Tests Included:**
- [ ] ApiResponse utility tests (5 tests)
- [ ] Validation schemas tests (12+ tests)
- [ ] Number generator tests (2 tests)

**Expected Result**: All tests should pass ✅

---

## 🖥️ MANUAL TESTING CHECKLIST

### Pre-Testing Setup

- [ ] **Start Backend Server**
  ```bash
  npm run dev
  ```
  - Verify: Server starts on port 3000
  - Check: No error messages in console
  - Confirm: Database connection successful

- [ ] **Start Frontend Server**
  ```bash
  cd frontend
  npm run dev
  ```
  - Verify: Vite dev server starts (usually port 5173)
  - Check: No compilation errors
  - Open: http://localhost:5173 in browser

---

## 🔐 WEEK 1 FIXES - CRITICAL SECURITY

### Test 1: JWT Security
- [ ] Check `.env` file has strong JWT_SECRET (128 characters)
- [ ] Verify `.env` is NOT in git repository
- [ ] Check `.env.example` exists with instructions
- [ ] **Expected**: Secure secret, no credentials in version control

### Test 2: Race Condition Fix
- [ ] Create 2-3 invoices rapidly (click Create Invoice multiple times fast)
- [ ] Check invoice numbers are sequential (INV-000001, INV-000002, etc.)
- [ ] Create 2-3 receipts rapidly
- [ ] Check receipt numbers are sequential (REC-000001, REC-000002, etc.)
- [ ] **Expected**: No duplicate numbers, even under concurrent load

### Test 3: Input Validation (Backend)
- [ ] Try to create customer with:
  - [ ] Invalid email format → Should get validation error
  - [ ] Empty name → Should get validation error
  - [ ] Negative credit limit → Should get validation error
- [ ] Try to create invoice with:
  - [ ] No items → Should get validation error
  - [ ] Invalid customer ID → Should get validation error
  - [ ] Past due date → Should get validation error
- [ ] **Expected**: Clear error messages, no data saved

### Test 4: Standardized API Responses
- [ ] Open browser DevTools → Network tab
- [ ] Perform any API action (create customer, get invoices, etc.)
- [ ] Check response format has:
  - [ ] `success`: true/false
  - [ ] `message`: string
  - [ ] `data`: object
  - [ ] `timestamp`: ISO date
- [ ] **Expected**: All responses follow same structure

### Test 5: Environment Variables (Frontend)
- [ ] Check frontend `.env.development` exists
- [ ] Verify `VITE_API_URL=http://localhost:3000/api/v1`
- [ ] Open browser console and check no hardcoded URLs
- [ ] **Expected**: API URL configurable, not hardcoded

### Test 6: Auth Token Validation
- [ ] Login to application
- [ ] Close browser tab
- [ ] Reopen http://localhost:5173
- [ ] **Expected**: Should remain logged in (token validated on app init)
- [ ] Open DevTools → Application → Local Storage
- [ ] Delete `token` entry
- [ ] Refresh page
- [ ] **Expected**: Should redirect to login

### Test 7: Request/Response Logging
- [ ] Perform 3-4 different actions (create customer, view invoices, etc.)
- [ ] Check backend console for logs
- [ ] Verify logs show: Method, URL, Status, Response time
- [ ] Check `logs/` directory created
- [ ] **Expected**: All requests logged with details

---

## ⚡ WEEK 2 FIXES - HIGH PRIORITY

### Test 8: Foreign Key Cascades
- [ ] Create a customer
- [ ] Create invoice for that customer
- [ ] Try to delete the customer
- [ ] **Expected**: Should get error (RESTRICT - can't delete customer with invoices)
- [ ] Create an invoice with line items
- [ ] Delete the invoice
- [ ] Check database: invoice items should be auto-deleted (CASCADE)
- [ ] **Expected**: Orphaned records prevented, dependent records auto-cleaned

### Test 9: Customer Balance Validation
- [ ] Create customer with credit limit: $1000
- [ ] Try to create invoice for $1500
- [ ] **Expected**: Should get error "Credit limit exceeded" with details
- [ ] Create invoice for $500
- [ ] **Expected**: Should succeed
- [ ] Try to create another invoice for $600
- [ ] **Expected**: Should get error (total would be $1100 > $1000)
- [ ] Set customer credit limit to 0 (unlimited)
- [ ] Create invoice for any amount
- [ ] **Expected**: Should succeed (0 = unlimited)

### Test 10: Frontend Memory Leaks
- [ ] Navigate to Customers page
- [ ] Click "Create Customer" button
- [ ] While modal is loading data, quickly click Cancel
- [ ] Check browser console
- [ ] **Expected**: No "setState on unmounted component" warnings
- [ ] Repeat for Invoices and Users pages
- [ ] **Expected**: No memory leak warnings

### Test 11: Database Indexes (Performance)
- [ ] Open database tool (pgAdmin, DBeaver, etc.)
- [ ] Run query: 
  ```sql
  SELECT * FROM pg_indexes WHERE tablename IN ('Customers', 'Invoices', 'Receipts');
  ```
- [ ] **Expected**: Should see 25+ indexes on foreign keys, status, dates
- [ ] Note: Performance improvement visible with large datasets (1000+ records)

### Test 12: API Versioning
- [ ] Open browser DevTools → Network tab
- [ ] Perform any action (get customers, create invoice, etc.)
- [ ] Check Request URL
- [ ] **Expected**: All API calls use `/api/v1/` prefix
- [ ] Try old unversioned endpoint: http://localhost:3000/api/customers
- [ ] **Expected**: Should still work but log deprecation warning in backend console
- [ ] Visit Swagger docs: http://localhost:3000/api-docs
- [ ] **Expected**: Should show v1 endpoints

### Test 13: API Interceptor (Axios)
- [ ] Login to application
- [ ] Open browser DevTools → Console
- [ ] Navigate to different pages (Customers, Invoices, etc.)
- [ ] **Expected**: Should see request/response logs in console (development mode)
- [ ] In DevTools → Network, check request headers
- [ ] **Expected**: All requests have `Authorization: Bearer <token>` header
- [ ] Logout, try to access protected page
- [ ] **Expected**: Auto-redirect to login (401 handled by interceptor)

---

## 🎨 WEEK 3 FIXES - MEDIUM PRIORITY

### Test 14: Client-Side Form Validation
- [ ] Navigate to Customers page → Click "Create Customer"
- [ ] Try to submit with:
  - [ ] Empty name → Should show error "Name is required"
  - [ ] Invalid email "test@test" → Should show error "Must be valid email"
  - [ ] Name "A" (1 char) → Should show error "Name must be at least 2 characters"
- [ ] Fill valid data, submit
- [ ] **Expected**: Form validates before sending to server
- [ ] Check browser Network tab - should see POST request only after validation passes
- [ ] Test same for Invoice creation, User creation
- [ ] **Expected**: All forms validate client-side first

### Test 15: Reusable Hooks

**Test usePagination:**
- [ ] Navigate to Customers page
- [ ] Click "Next Page" button
- [ ] **Expected**: Page number changes, new data loads
- [ ] Click "Previous Page"
- [ ] **Expected**: Returns to previous page

**Test useAlert:**
- [ ] Create a new customer
- [ ] **Expected**: Success message appears (green)
- [ ] Auto-dismisses after 5 seconds
- [ ] Try to create customer with duplicate email
- [ ] **Expected**: Error message appears (red)

**Test useModal:**
- [ ] Click "Create Customer" button
- [ ] **Expected**: Modal opens
- [ ] Click Cancel or backdrop
- [ ] **Expected**: Modal closes, data cleared
- [ ] Click "Edit" on existing customer
- [ ] **Expected**: Modal opens with customer data pre-filled

**Test useDebounce:**
- [ ] Navigate to Customers or Items page
- [ ] Type in search box quickly: "John Doe"
- [ ] Watch Network tab
- [ ] **Expected**: Search request only fires AFTER you stop typing (500ms delay)
- [ ] Should see only 1 request, not 8 requests (1 per character)

### Test 16: Soft Delete (Paranoid Mode)
- [ ] Create a test customer
- [ ] Create a test item
- [ ] Delete the customer
- [ ] Go to database and run:
  ```sql
  SELECT * FROM "Customers" WHERE "deletedAt" IS NOT NULL;
  ```
- [ ] **Expected**: Customer record still exists with `deletedAt` timestamp
- [ ] In application, deleted customer should NOT appear in list
- [ ] **Expected**: Soft-deleted records hidden from UI
- [ ] To restore (via database):
  ```sql
  UPDATE "Customers" SET "deletedAt" = NULL WHERE id = '<customer-id>';
  ```
- [ ] **Expected**: Customer reappears in application

### Test 17: CORS Configuration
- [ ] Backend should be running on http://localhost:3000
- [ ] Frontend should be running on http://localhost:5173
- [ ] **Expected**: Requests work normally (5173 is whitelisted)
- [ ] Try to access API from different origin:
  - Open http://localhost:8080 (if you have another server)
  - Try to call API from browser console
- [ ] **Expected**: Should work if 8080 is in CORS_ORIGIN whitelist
- [ ] Check backend console for CORS logs
- [ ] Try from unauthorized origin (e.g., http://localhost:9999)
- [ ] **Expected**: Should be blocked, logged in console

### Test 18: Swagger Documentation
- [ ] Open http://localhost:3000/api-docs
- [ ] **Expected**: Swagger UI loads
- [ ] Check "Schemas" section
- [ ] **Expected**: Should see Customer, Invoice, User, Item, Receipt schemas
- [ ] Expand any endpoint (e.g., GET /api/v1/customers)
- [ ] **Expected**: Should see:
  - Parameters documented (page, limit, search)
  - Response schema with examples
  - Try it out button works
- [ ] Click "Authorize" button
- [ ] Enter JWT token from login
- [ ] Try "Try it out" on protected endpoint
- [ ] **Expected**: Request succeeds with your token

---

## 🌐 INTEGRATION TESTS

### End-to-End Workflow: Create Invoice

- [ ] **Step 1**: Login with demo credentials
- [ ] **Step 2**: Create a customer
  - Name: Test Customer
  - Email: test@example.com
  - Credit Limit: $5000
- [ ] **Step 3**: Create an item
  - Name: Test Product
  - SKU: TEST-001
  - Unit Price: $100
- [ ] **Step 4**: Create an invoice
  - Select the customer
  - Add the item (quantity: 5)
  - Set due date: Next week
- [ ] **Step 5**: Verify invoice created
  - Invoice number generated (INV-XXXXXX)
  - Total amount: $500
  - Status: draft
- [ ] **Step 6**: Create a receipt/payment
  - Select the customer
  - Amount: $500
  - Link to invoice
- [ ] **Step 7**: Check invoice status changed to "paid"
- [ ] **Step 8**: Check customer balance updated

**Expected Result**: Complete flow works without errors ✅

---

## 🐛 ERROR HANDLING TESTS

### Test Error Scenarios:

- [ ] **Network Error**: Stop backend server, try to create customer
  - **Expected**: "Network error" message, no crash

- [ ] **Invalid Data**: Submit form with all invalid fields
  - **Expected**: All fields show error messages

- [ ] **Session Expiry**: Wait 24+ hours (or manually delete token), try action
  - **Expected**: Auto-redirect to login

- [ ] **Rate Limiting**: Make 100+ rapid requests to same endpoint
  - **Expected**: Should get 429 error after limit

- [ ] **Server Error**: Cause a 500 error (delete required table column temporarily)
  - **Expected**: User-friendly error message, logged to backend

---

## 📊 PERFORMANCE CHECKS

- [ ] **Page Load Time**: Homepage should load < 2 seconds
- [ ] **API Response Time**: Most endpoints should respond < 500ms
- [ ] **Search Debounce**: Search only fires after typing stops
- [ ] **Pagination**: Large datasets load in pages, not all at once
- [ ] **Memory Usage**: No console warnings after 10+ minutes of use

---

## 🔍 BROWSER COMPATIBILITY

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)

**Expected**: All features work consistently

---

## 📱 MOBILE RESPONSIVENESS

- [ ] Open in mobile view (DevTools → Toggle device toolbar)
- [ ] **Expected**: 
  - Sidebar collapses to hamburger menu
  - Tables scroll horizontally
  - Forms are usable on small screens
  - Buttons are touch-friendly

---

## ✅ FINAL VERIFICATION

Before merging to main:

- [ ] All automated tests pass
- [ ] All critical manual tests pass
- [ ] No console errors in browser
- [ ] No error logs in backend (except expected validation errors)
- [ ] Application works end-to-end
- [ ] Documentation is up to date
- [ ] All commits pushed to GitHub

---

## 📝 ISSUES FOUND

**Record any bugs or issues discovered during testing:**

| # | Issue Description | Severity | Steps to Reproduce | Status |
|---|-------------------|----------|-------------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## 🎯 TESTING SUMMARY

**Total Tests**: 60+  
**Tests Passed**: _____ / _____  
**Tests Failed**: _____ / _____  
**Critical Issues**: _____  
**Minor Issues**: _____  

**Overall Status**: 🟢 PASS / 🔴 FAIL / 🟡 NEEDS REVIEW

**Tested By**: _____________  
**Date**: _____________  
**Sign-off**: _____________

---

## 📌 QUICK START TESTING GUIDE

**For quick smoke test (15 minutes):**

1. ✅ Start backend and frontend servers
2. ✅ Run automated tests: `npm test`
3. ✅ Login to application
4. ✅ Create a customer
5. ✅ Create an item
6. ✅ Create an invoice
7. ✅ Create a payment
8. ✅ Check Swagger docs work
9. ✅ Test form validation (submit empty form)
10. ✅ Check browser console for errors

**If all pass → Good to go! 🚀**

---

*Last Updated: December 14, 2025*
